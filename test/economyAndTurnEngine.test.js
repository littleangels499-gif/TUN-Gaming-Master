const test = require('node:test');
const assert = require('node:assert/strict');
const economyEngine = require('../src/services/rulesEngine/economyEngine');
const turnEngine = require('../src/services/rulesEngine/turnEngine');

test('applyEconomicTurn: treasury grows with positive income and low upkeep', () => {
  const nation = {
    cities: 3,
    infrastructureTotal: 1500,
    treasury: 10000,
    resources: { food: 10000, coal: 0, oil: 0, iron: 0, bauxite: 0, munitions: 0, gasoline: 0 },
    soldiers: 0,
    tanks: 0,
    aircraft: 0,
    ships: 0,
  };
  const result = economyEngine.applyEconomicTurn(nation);
  assert.ok(result.treasury > nation.treasury);
  assert.equal(result.starving, false);
});

test('applyEconomicTurn: food never goes negative', () => {
  const nation = {
    cities: 1,
    infrastructureTotal: 500,
    treasury: 0,
    resources: { food: 10, coal: 0, oil: 0, iron: 0, bauxite: 0, munitions: 0, gasoline: 0 },
    soldiers: 100000,
    tanks: 0,
    aircraft: 0,
    ships: 0,
  };
  const result = economyEngine.applyEconomicTurn(nation);
  assert.ok(result.resources.food >= 0);
});

test('turnEngine.isWarOver: defender resistance at 0 means attacker wins', () => {
  const { over, winner } = turnEngine.isWarOver({ turnsRemaining: 10, attackerResistance: 80, defenderResistance: 0 });
  assert.equal(over, true);
  assert.equal(winner, 'attacker');
});

test('turnEngine.isWarOver: turns exhausted with both sides alive -> expired', () => {
  const { over, winner } = turnEngine.isWarOver({ turnsRemaining: 0, attackerResistance: 50, defenderResistance: 50 });
  assert.equal(over, true);
  assert.equal(winner, 'expired');
});

test('turnEngine.turnsRemainingAfter: never goes below zero', () => {
  assert.equal(turnEngine.turnsRemainingAfter(0), 0);
  assert.equal(turnEngine.turnsRemainingAfter(1), 0);
  assert.equal(turnEngine.turnsRemainingAfter(5, 2), 3);
});
