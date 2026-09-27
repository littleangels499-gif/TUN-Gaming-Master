const test = require('node:test');
const assert = require('node:assert/strict');
const combat = require('../src/services/rulesEngine/combatCalculator');

// Deterministic RNG for reproducible tests.
function fixedRng(value) {
  return () => value;
}

test('resolveEngagement: overwhelming attacker force wins immense triumph', () => {
  const { result, ratio } = combat.resolveEngagement(10000, 100, fixedRng(1));
  assert.equal(result, combat.RESULT_TIERS.IMMENSE_TRIUMPH);
  assert.ok(ratio > 1.75);
});

test('resolveEngagement: overwhelming defender force -> attacker utter failure', () => {
  const { result } = combat.resolveEngagement(100, 10000, fixedRng(1));
  assert.equal(result, combat.RESULT_TIERS.UTTER_FAILURE);
});

test('resolveEngagement: zero defender strength is trivially crushed', () => {
  const { result, ratio } = combat.resolveEngagement(500, 0, fixedRng(0.5));
  assert.equal(result, combat.RESULT_TIERS.IMMENSE_TRIUMPH);
  assert.equal(ratio, Infinity);
});

test('groundAttack: casualties never exceed committed units', () => {
  const outcome = combat.groundAttack({
    attackerUnits: { soldiers: 100, tanks: 10 },
    defenderUnits: { soldiers: 5000, tanks: 500 },
    rng: fixedRng(0.01), // worst possible roll for attacker
  });
  assert.ok(outcome.attackerCasualties.soldiers <= 100);
  assert.ok(outcome.attackerCasualties.tanks <= 10);
});

test('missileStrike: consumes no ammo tracking here, but resistance change is 0 when intercepted', () => {
  // With very high defender aircraft, interception chance caps at 0.5, so
  // force interception deterministically by using an rng that always returns 0.
  const outcome = combat.missileStrike({ defenderUnits: { aircraft: 500 }, rng: fixedRng(0) });
  assert.equal(outcome.intercepted, true);
  assert.equal(outcome.resistanceChange, 0);
});

test('nuclearStrike: uninterceped strike deals heavy damage', () => {
  const outcome = combat.nuclearStrike({ defenderUnits: { aircraft: 0 }, rng: fixedRng(0.9) });
  assert.equal(outcome.intercepted, false);
  assert.equal(outcome.resistanceChange, -40);
  assert.equal(outcome.infrastructureDamage, 2000);
});
