const { SimulationWar, SimulationAttack, SimulationNation } = require('../database/models');
const combat = require('../services/rulesEngine/combatCalculator');
const turnEngine = require('../services/rulesEngine/turnEngine');
const config = require('../config');

async function declareWar(attackerNationId, defenderNationId, { warType = 'ordinary', scenarioId = null, turns } = {}) {
  if (attackerNationId === defenderNationId) throw new Error('A nation cannot declare war on itself.');

  const [attacker, defender] = await Promise.all([
    SimulationNation.findByPk(attackerNationId),
    SimulationNation.findByPk(defenderNationId),
  ]);
  if (!attacker || !defender) throw new Error('One of the nations could not be found.');

  const existingWar = await SimulationWar.findOne({
    where: { status: 'active', attackerNationId, defenderNationId },
  });
  if (existingWar) throw new Error('There is already an active war between these two nations.');

  return SimulationWar.create({
    attackerNationId,
    defenderNationId,
    warType,
    scenarioId,
    turnsRemaining: turns || config.simulation.warTurnsDefault,
  });
}

function unitsOf(nation) {
  return {
    soldiers: nation.soldiers,
    tanks: nation.tanks,
    aircraft: nation.aircraft,
    ships: nation.ships,
    missiles: nation.missiles,
    nukes: nation.nukes,
  };
}

async function subtractCasualties(nation, casualties) {
  for (const [unit, lost] of Object.entries(casualties)) {
    if (typeof nation[unit] === 'number') {
      nation[unit] = Math.max(0, nation[unit] - lost);
    }
  }
  await nation.save();
}

/**
 * Execute one attack action of the given type in an active war, initiated
 * by whichever side (attacker or defender nation ID) currently holds the
 * initiative. Persists casualties, resistance change, and a battle log row.
 */
async function executeAttack({ warId, actingNationId, actionType, nukesEnabled = false }) {
  const war = await SimulationWar.findByPk(warId);
  if (!war) throw new Error('War not found.');
  if (war.status !== 'active') throw new Error('This war has already ended.');

  const isAttackerActing = actingNationId === war.attackerNationId;
  const isDefenderActing = actingNationId === war.defenderNationId;
  if (!isAttackerActing && !isDefenderActing) throw new Error('That nation is not part of this war.');

  const actorNationId = actingNationId;
  const targetNationId = isAttackerActing ? war.defenderNationId : war.attackerNationId;

  const [actor, target] = await Promise.all([
    SimulationNation.findByPk(actorNationId),
    SimulationNation.findByPk(targetNationId),
  ]);

  let outcome;
  let unitsCommitted;

  switch (actionType) {
    case 'ground':
      unitsCommitted = { soldiers: actor.soldiers, tanks: actor.tanks };
      outcome = combat.groundAttack({ attackerUnits: unitsOf(actor), defenderUnits: unitsOf(target) });
      break;
    case 'air':
      unitsCommitted = { aircraft: actor.aircraft };
      outcome = combat.airAttack({ attackerUnits: unitsOf(actor), defenderUnits: unitsOf(target) });
      break;
    case 'naval':
      unitsCommitted = { ships: actor.ships };
      outcome = combat.navalAttack({ attackerUnits: unitsOf(actor), defenderUnits: unitsOf(target) });
      break;
    case 'missile': {
      if (actor.missiles < 1) throw new Error('No missiles available.');
      unitsCommitted = { missiles: 1 };
      outcome = combat.missileStrike({ defenderUnits: unitsOf(target) });
      actor.missiles -= 1;
      await actor.save();
      break;
    }
    case 'nuke': {
      if (!nukesEnabled) throw new Error('Nuclear weapons are not enabled for this war/scenario.');
      if (actor.nukes < 1) throw new Error('No nukes available.');
      if ((actor.resources.uranium || 0) < 500) throw new Error('Not enough uranium to launch a nuclear strike (need 500).');
      unitsCommitted = { nukes: 1 };
      outcome = combat.nuclearStrike({ defenderUnits: unitsOf(target) });
      actor.nukes -= 1;
      actor.resources = { ...actor.resources, uranium: actor.resources.uranium - 500 };
      await actor.save();
      break;
    }
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }

  // Apply casualties for engagement-style attacks (ground/air/naval).
  if (outcome.attackerCasualties) await subtractCasualties(actor, outcome.attackerCasualties);
  if (outcome.defenderCasualties) await subtractCasualties(target, outcome.defenderCasualties);

  // Apply resistance change to whichever side is the target of this action.
  const targetIsWarDefender = targetNationId === war.defenderNationId;
  target.resistance = Math.max(
    0,
    Math.min(config.simulation.resistanceMax, target.resistance + outcome.resistanceChange)
  );
  await target.save();

  const attackerResistance = targetIsWarDefender ? (await SimulationNation.findByPk(war.attackerNationId)).resistance : target.resistance;
  const defenderResistance = targetIsWarDefender ? target.resistance : (await SimulationNation.findByPk(war.defenderNationId)).resistance;

  war.turnsRemaining = turnEngine.turnsRemainingAfter(war.turnsRemaining);
  const { over, winner } = turnEngine.isWarOver({
    turnsRemaining: war.turnsRemaining,
    attackerResistance,
    defenderResistance,
  });

  if (over) {
    war.status = winner === 'attacker' ? 'won_attacker' : winner === 'defender' ? 'won_defender' : 'expired';
    war.endedAt = new Date();
    war.result = { winner, attackerResistance, defenderResistance };
  }
  await war.save();

  const previousAttackCount = await SimulationAttack.count({ where: { warId: war.id } });

  const attackLog = await SimulationAttack.create({
    warId: war.id,
    turn: previousAttackCount + 1,
    actorNationId,
    targetNationId,
    actionType,
    unitsCommitted,
    casualties: { actor: outcome.attackerCasualties || {}, target: outcome.defenderCasualties || {} },
    resourcesConsumed: {},
    result: outcome.result,
    resistanceChange: outcome.resistanceChange,
    scenarioId: war.scenarioId,
  });

  return { war, outcome, attackLog, actor, target };
}

async function getBattleLog(warId, limit = 10) {
  return SimulationAttack.findAll({ where: { warId }, order: [['createdAt', 'DESC']], limit });
}

module.exports = { declareWar, executeAttack, getBattleLog };
