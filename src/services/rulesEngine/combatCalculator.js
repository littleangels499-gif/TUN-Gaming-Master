/**
 * Combat Calculator
 * ──────────────────
 * An INDEPENDENT implementation inspired by the general shape of
 * Politics & War's warfare (ground/air/naval fights resolved by comparing
 * committed strength with a randomness factor, four outcome tiers, and
 * casualties/resistance scaling with the result). These are NOT PnW's
 * real formulas — they are original, documented, testable numbers tuned
 * for a training simulator. Adjust the constants below freely; nothing
 * elsewhere in the codebase hardcodes them.
 *
 * This file has zero Discord/DB dependencies on purpose (spec section 13:
 * "the rules engine must be separate from Discord command handling") so it
 * can be unit tested in isolation — see test/combatCalculator.test.js.
 */

const RESULT_TIERS = {
  IMMENSE_TRIUMPH: 'immense_triumph',
  MODERATE_SUCCESS: 'moderate_success',
  PYRRHIC_VICTORY: 'pyrrhic_victory',
  UTTER_FAILURE: 'utter_failure',
};

// Roll a random multiplier in [min, max) — stands in for PnW's "randomness roll".
function roll(min = 0.4, max = 1.6, rng = Math.random) {
  return min + rng() * (max - min);
}

/**
 * Resolve a strength-vs-strength engagement (used by ground/air/naval).
 * @param {number} attackerStrength
 * @param {number} defenderStrength
 * @param {Function} [rng] injectable RNG for deterministic tests
 * @returns {{ result: string, ratio: number, attackerRoll: number, defenderRoll: number }}
 */
function resolveEngagement(attackerStrength, defenderStrength, rng = Math.random) {
  const attackerRoll = attackerStrength * roll(0.4, 1.6, rng);
  const defenderRoll = defenderStrength * roll(0.4, 1.6, rng);

  // Avoid divide-by-zero: a defender with 0 strength is trivially crushed.
  const ratio = defenderRoll === 0 ? Infinity : attackerRoll / defenderRoll;

  let result;
  if (ratio >= 1.75) result = RESULT_TIERS.IMMENSE_TRIUMPH;
  else if (ratio >= 1.0) result = RESULT_TIERS.MODERATE_SUCCESS;
  else if (ratio >= 0.6) result = RESULT_TIERS.PYRRHIC_VICTORY;
  else result = RESULT_TIERS.UTTER_FAILURE;

  return { result, ratio, attackerRoll, defenderRoll };
}

// Casualty rate (fraction of committed units lost) per result tier.
const CASUALTY_RATES = {
  [RESULT_TIERS.IMMENSE_TRIUMPH]: { attacker: 0.03, defender: 0.20 },
  [RESULT_TIERS.MODERATE_SUCCESS]: { attacker: 0.08, defender: 0.14 },
  [RESULT_TIERS.PYRRHIC_VICTORY]: { attacker: 0.16, defender: 0.10 },
  [RESULT_TIERS.UTTER_FAILURE]: { attacker: 0.22, defender: 0.02 },
};

// Resistance damage dealt to the defender per result tier.
const RESISTANCE_DAMAGE = {
  [RESULT_TIERS.IMMENSE_TRIUMPH]: 12,
  [RESULT_TIERS.MODERATE_SUCCESS]: 8,
  [RESULT_TIERS.PYRRHIC_VICTORY]: 4,
  [RESULT_TIERS.UTTER_FAILURE]: 0,
};

function applyCasualties(unitsCommitted, result, side) {
  const rate = CASUALTY_RATES[result][side];
  const casualties = {};
  for (const [unit, count] of Object.entries(unitsCommitted)) {
    casualties[unit] = Math.min(count, Math.round(count * rate));
  }
  return casualties;
}

/**
 * Ground attack: soldiers + tanks vs soldiers + tanks (+ fortify/improvement bonuses).
 */
function groundAttack({ attackerUnits, defenderUnits, rng = Math.random }) {
  const attackerStrength = attackerUnits.soldiers * 1 + attackerUnits.tanks * 4;
  const defenderStrength = defenderUnits.soldiers * 1 + defenderUnits.tanks * 4;

  const engagement = resolveEngagement(attackerStrength, defenderStrength, rng);
  const attackerCasualties = applyCasualties(
    { soldiers: attackerUnits.soldiers, tanks: attackerUnits.tanks },
    engagement.result,
    'attacker'
  );
  const defenderCasualties = applyCasualties(
    { soldiers: defenderUnits.soldiers, tanks: defenderUnits.tanks },
    engagement.result,
    'defender'
  );

  return {
    ...engagement,
    attackerCasualties,
    defenderCasualties,
    resistanceChange: -RESISTANCE_DAMAGE[engagement.result],
  };
}

/**
 * Air attack: aircraft dogfight, winner may also strike infrastructure/soldiers.
 */
function airAttack({ attackerUnits, defenderUnits, rng = Math.random }) {
  const attackerStrength = attackerUnits.aircraft * 3;
  const defenderStrength = defenderUnits.aircraft * 3;

  const engagement = resolveEngagement(attackerStrength, defenderStrength, rng);
  const attackerCasualties = applyCasualties({ aircraft: attackerUnits.aircraft }, engagement.result, 'attacker');
  const defenderCasualties = applyCasualties({ aircraft: defenderUnits.aircraft }, engagement.result, 'defender');

  // A won dogfight also inflicts some soldier casualties on the ground (air support).
  const groundSupportCasualties =
    engagement.result === RESULT_TIERS.IMMENSE_TRIUMPH || engagement.result === RESULT_TIERS.MODERATE_SUCCESS
      ? Math.round(defenderUnits.soldiers * 0.02)
      : 0;

  return {
    ...engagement,
    attackerCasualties,
    defenderCasualties: { ...defenderCasualties, soldiers: groundSupportCasualties },
    resistanceChange: -RESISTANCE_DAMAGE[engagement.result],
  };
}

/**
 * Naval attack: ships vs ships. A won engagement can also "blockade"
 * (handled by the caller by checking `result`).
 */
function navalAttack({ attackerUnits, defenderUnits, rng = Math.random }) {
  const attackerStrength = attackerUnits.ships * 4;
  const defenderStrength = defenderUnits.ships * 4;

  const engagement = resolveEngagement(attackerStrength, defenderStrength, rng);
  const attackerCasualties = applyCasualties({ ships: attackerUnits.ships }, engagement.result, 'attacker');
  const defenderCasualties = applyCasualties({ ships: defenderUnits.ships }, engagement.result, 'defender');

  return {
    ...engagement,
    attackerCasualties,
    defenderCasualties,
    resistanceChange: -RESISTANCE_DAMAGE[engagement.result],
  };
}

/**
 * Missile strike: consumes 1 missile, deals a flat resistance + infrastructure
 * hit unless the defender has aircraft available to intercept.
 */
function missileStrike({ defenderUnits, rng = Math.random }) {
  const interceptChance = Math.min(0.5, defenderUnits.aircraft / 200);
  const intercepted = rng() < interceptChance;

  return {
    intercepted,
    resistanceChange: intercepted ? 0 : -15,
    infrastructureDamage: intercepted ? 0 : 150,
    result: intercepted ? RESULT_TIERS.UTTER_FAILURE : RESULT_TIERS.IMMENSE_TRIUMPH,
  };
}

/**
 * Nuclear strike: consumes 1 nuke + a large amount of uranium (checked by
 * the caller). Only usable when the active scenario/war explicitly enables it.
 */
function nuclearStrike({ defenderUnits, rng = Math.random }) {
  const interceptChance = Math.min(0.25, defenderUnits.aircraft / 400);
  const intercepted = rng() < interceptChance;

  return {
    intercepted,
    resistanceChange: intercepted ? -10 : -40,
    infrastructureDamage: intercepted ? 300 : 2000,
    populationLossPercent: intercepted ? 0.05 : 0.35,
    result: intercepted ? RESULT_TIERS.PYRRHIC_VICTORY : RESULT_TIERS.IMMENSE_TRIUMPH,
  };
}

module.exports = {
  RESULT_TIERS,
  resolveEngagement,
  groundAttack,
  airAttack,
  navalAttack,
  missileStrike,
  nuclearStrike,
};
