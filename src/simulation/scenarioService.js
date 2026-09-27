const {
  SimulationScenario,
  SimulationScenarioPlayer,
  SimulationNation,
  SimulationTrainingScore,
} = require('../database/models');
const { getNormalNation } = require('./nationService');
const { recordAudit } = require('../services/auditService');

// The core guarantee from spec section 10: overrides are TEMPORARY. The
// member's normal nation is copied into a scenario instance; the instructor
// only ever edits the copy; the normal nation is never touched, so it's
// automatically "restored" the instant the scenario ends.

async function createScenario(guildId, createdBy, { name, rules }) {
  return SimulationScenario.create({ guildId, createdBy, name, rules: rules || undefined });
}

async function addParticipant(scenarioId, userId, { team } = {}) {
  const scenario = await SimulationScenario.findByPk(scenarioId);
  if (!scenario) throw new Error('Scenario not found.');
  if (scenario.status !== 'draft') throw new Error('Cannot add participants after the scenario has started.');

  const original = await getNormalNation(userId);
  if (!original) throw new Error('That member has no simulation nation yet (they must run /sim nation create or /sim link first).');

  const existing = await SimulationScenarioPlayer.findOne({ where: { scenarioId, userId } });
  if (existing) throw new Error('That member is already in this scenario.');

  // Clone every relevant field into a brand-new nation row scoped to this scenario.
  const clone = await SimulationNation.create({
    userId,
    mode: 'scenario',
    baseNationId: original.id,
    scenarioId,
    name: `${original.name} (Scenario Copy)`,
    leaderName: original.leaderName,
    cities: original.cities,
    infrastructureTotal: original.infrastructureTotal,
    treasury: original.treasury,
    resources: original.resources,
    soldiers: original.soldiers,
    tanks: original.tanks,
    aircraft: original.aircraft,
    ships: original.ships,
    missiles: original.missiles,
    nukes: original.nukes,
    militaryImprovements: original.militaryImprovements,
    economicImprovements: original.economicImprovements,
  });

  return SimulationScenarioPlayer.create({
    scenarioId,
    userId,
    scenarioNationId: clone.id,
    originalNationId: original.id,
    team: team || null,
  });
}

// The full list of overridable fields from spec section 10.
const OVERRIDABLE_FIELDS = new Set([
  'cities', 'infrastructureTotal', 'treasury', 'resources',
  'soldiers', 'tanks', 'aircraft', 'ships', 'missiles', 'nukes',
  'militaryImprovements', 'economicImprovements', 'resistance',
]);

/**
 * Apply an instructor override to ONE participant's scenario nation clone.
 * Never touches the participant's normal nation.
 */
async function applyOverride(scenarioId, userId, overrides, instructorId) {
  const participant = await SimulationScenarioPlayer.findOne({ where: { scenarioId, userId } });
  if (!participant) throw new Error('That member is not part of this scenario.');

  const nation = await SimulationNation.findByPk(participant.scenarioNationId);
  if (!nation) throw new Error('Scenario nation record missing — data integrity issue.');

  const applied = {};
  for (const [field, value] of Object.entries(overrides)) {
    if (!OVERRIDABLE_FIELDS.has(field)) continue;
    nation[field] = value;
    applied[field] = value;
  }
  await nation.save();

  await recordAudit({
    actorId: instructorId,
    action: 'scenario.override',
    targetType: 'SimulationNation',
    targetId: nation.id,
    details: { scenarioId, userId, applied },
  });

  return nation;
}

async function startScenario(scenarioId) {
  const scenario = await SimulationScenario.findByPk(scenarioId);
  if (!scenario) throw new Error('Scenario not found.');
  const participantCount = await SimulationScenarioPlayer.count({ where: { scenarioId } });
  if (participantCount < 1) throw new Error('Add at least one participant before starting the scenario.');

  scenario.status = 'active';
  scenario.startedAt = new Date();
  await scenario.save();
  return scenario;
}

/**
 * End a scenario. Because overrides only ever touched the clones, ending
 * the scenario is safe by construction — nothing needs to be "undone" on
 * the member's normal nation. We deactivate the clones so they stop
 * appearing in `/sim nation`.
 */
async function endScenario(scenarioId, endedBy) {
  const scenario = await SimulationScenario.findByPk(scenarioId);
  if (!scenario) throw new Error('Scenario not found.');

  const participants = await SimulationScenarioPlayer.findAll({ where: { scenarioId } });
  for (const p of participants) {
    await SimulationNation.update({ isActive: false }, { where: { id: p.scenarioNationId } });
  }

  scenario.status = 'ended';
  scenario.endedAt = new Date();
  await scenario.save();

  await recordAudit({ actorId: endedBy, action: 'scenario.end', targetType: 'SimulationScenario', targetId: scenarioId });

  return scenario;
}

async function recordTrainingScore(scenarioId, userId, scoreFields) {
  return SimulationTrainingScore.create({ scenarioId, userId, ...scoreFields });
}

/** Convenience wrapper: override a single resource amount without clobbering the rest. */
async function applyResourceOverride(scenarioId, userId, resource, amount, instructorId) {
  const participant = await SimulationScenarioPlayer.findOne({ where: { scenarioId, userId } });
  if (!participant) throw new Error('That member is not part of this scenario.');

  const nation = await SimulationNation.findByPk(participant.scenarioNationId);
  if (!nation) throw new Error('Scenario nation record missing — data integrity issue.');

  const newResources = { ...nation.resources, [resource]: amount };
  return applyOverride(scenarioId, userId, { resources: newResources }, instructorId);
}

module.exports = {
  createScenario,
  addParticipant,
  applyOverride,
  applyResourceOverride,
  startScenario,
  endScenario,
  recordTrainingScore,
  OVERRIDABLE_FIELDS,
};
