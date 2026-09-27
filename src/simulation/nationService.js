const { SimulationNation, SimulationCity, PnwLink } = require('../database/models');
const config = require('../config');
const pnwService = require('../services/pnwService');
const { recordAudit } = require('../services/auditService');

/** A member's ONE normal (non-scenario) simulation nation, if any. */
async function getNormalNation(userId) {
  return SimulationNation.findOne({
    where: { userId, scenarioId: null, isActive: true },
    order: [['createdAt', 'ASC']],
  });
}

async function createSandboxNation(userId, { name } = {}) {
  const existing = await getNormalNation(userId);
  if (existing) throw new Error('You already have a simulation nation. Use `/sim nation` to view it.');

  const nation = await SimulationNation.create({
    userId,
    mode: 'sandbox',
    name: name || 'Unnamed Nation',
    cities: config.simulation.startingCities,
    infrastructureTotal: config.simulation.startingInfraPerCity * config.simulation.startingCities,
    treasury: config.simulation.startingTreasury,
    resources: { food: config.simulation.startingFood, coal: 0, oil: 0, uranium: 0, lead: 0, iron: 0, bauxite: 0, gasoline: 0, munitions: 0, steel: 0, aluminum: 0 },
    soldiers: config.simulation.startingSoldiers,
    tanks: config.simulation.startingTanks,
    aircraft: config.simulation.startingAircraft,
    ships: config.simulation.startingShips,
  });

  await SimulationCity.create({
    nationId: nation.id,
    name: 'Capital City',
    infrastructure: config.simulation.startingInfraPerCity,
  });

  return nation;
}

/**
 * Link a real PnW nation via API key (never persisted) and create the
 * member's initial "linked" simulation nation from the imported snapshot.
 */
async function linkAndImportNation(userId, apiKey) {
  const existingLink = await PnwLink.findOne({ where: { userId } });
  if (existingLink) throw new Error('You already have a linked Politics & War nation.');

  const imported = await pnwService.fetchOwnNation(apiKey);

  const dupeLink = await PnwLink.findOne({ where: { pnwNationId: imported.pnwNationId } });
  if (dupeLink) throw new Error('That Politics & War nation is already linked to a different Discord member.');

  await PnwLink.create({
    userId,
    pnwNationId: imported.pnwNationId,
    pnwNationName: imported.nationName,
    pnwLeaderName: imported.leaderName,
    lastRefreshedAt: new Date(),
  });

  const existingNormal = await getNormalNation(userId);
  if (existingNormal) return existingNormal; // identity linked, simulator untouched by design

  const nation = await SimulationNation.create({
    userId,
    mode: 'linked',
    name: imported.nationName,
    leaderName: imported.leaderName,
    cities: imported.cities,
    infrastructureTotal: imported.infrastructureTotal,
    treasury: imported.treasury,
    resources: imported.resources,
    soldiers: imported.soldiers,
    tanks: imported.tanks,
    aircraft: imported.aircraft,
    ships: imported.ships,
    missiles: imported.missiles,
    nukes: imported.nukes,
    score: imported.score,
  });

  for (const city of imported.cityDetails) {
    await SimulationCity.create({
      nationId: nation.id,
      name: city.name,
      infrastructure: city.infrastructure,
      land: city.land,
    });
  }

  return nation;
}

/**
 * Refresh selected attributes from PnW into the EXISTING simulation nation.
 * Caller must have already shown the user an explicit confirmation warning
 * (spec section 8: "Refreshing must clearly warn the user before overwriting").
 */
async function refreshNationFromPnw(userId, apiKey, fields) {
  const link = await PnwLink.findOne({ where: { userId } });
  if (!link) throw new Error('You have not linked a Politics & War nation yet. Use `/sim link` first.');

  const imported = await pnwService.fetchOwnNation(apiKey);
  if (imported.pnwNationId !== link.pnwNationId) {
    throw new Error('That API key belongs to a different nation than the one linked to your account.');
  }

  const nation = await getNormalNation(userId);
  if (!nation) throw new Error('No simulation nation found to refresh.');

  const allowedFields = ['cities', 'infrastructureTotal', 'treasury', 'resources', 'soldiers', 'tanks', 'aircraft', 'ships', 'missiles', 'nukes', 'score'];
  const fieldsToApply = fields && fields.length ? fields.filter((f) => allowedFields.includes(f)) : allowedFields;

  for (const field of fieldsToApply) {
    nation[field] = imported[field];
  }
  await nation.save();

  link.lastRefreshedAt = new Date();
  await link.save();

  await recordAudit({
    actorId: userId,
    action: 'nation.refresh_from_pnw',
    targetType: 'SimulationNation',
    targetId: nation.id,
    details: { fields: fieldsToApply },
  });

  return nation;
}

module.exports = { getNormalNation, createSandboxNation, linkAndImportNation, refreshNationFromPnw };
