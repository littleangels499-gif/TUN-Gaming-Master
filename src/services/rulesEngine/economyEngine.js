/**
 * Economy Engine
 * ──────────────
 * Handles simulated-nation income, resource production and upkeep. Entirely
 * independent of the casual gaming currency (GameBalance) and entirely
 * independent of any real PnW economy. Pure functions, no DB/Discord deps.
 */

// Very small, tunable production model: each city produces a base income
// plus a small amount of raw resources per turn, scaled by infrastructure.
function calculateTurnIncome(nation, { economicMultiplier = 1 } = {}) {
  const baseIncomePerCity = 750;
  const infraBonus = (nation.infrastructureTotal / Math.max(nation.cities, 1)) * 0.5;
  const income = Math.round(nation.cities * (baseIncomePerCity + infraBonus) * economicMultiplier);

  const resourceGain = {
    coal: nation.cities * 20,
    oil: nation.cities * 15,
    iron: nation.cities * 18,
    bauxite: nation.cities * 15,
    food: nation.cities * 500,
  };

  return { income, resourceGain };
}

// Upkeep: military units and population consume food/resources every turn.
function calculateUpkeep(nation, { resourceConsumptionMultiplier = 1 } = {}) {
  const foodConsumed = Math.round(
    (nation.soldiers * 0.01 + nation.cities * 200) * resourceConsumptionMultiplier
  );
  const munitionsConsumed = Math.round(nation.soldiers * 0.001 * resourceConsumptionMultiplier);
  const gasolineConsumed = Math.round(
    (nation.tanks * 0.05 + nation.aircraft * 0.2 + nation.ships * 0.3) * resourceConsumptionMultiplier
  );
  const upkeepCost = Math.round(
    nation.soldiers * 1.25 + nation.tanks * 40 + nation.aircraft * 350 + nation.ships * 1000
  );

  return { foodConsumed, munitionsConsumed, gasolineConsumed, upkeepCost };
}

/**
 * Apply one full economic turn to a plain nation-data object and return the
 * new field values (does not mutate DB models directly — callers persist
 * the returned deltas so this stays testable and DB-agnostic).
 */
function applyEconomicTurn(nation, options = {}) {
  const { income, resourceGain } = calculateTurnIncome(nation, options);
  const upkeep = calculateUpkeep(nation, options);

  const newTreasury = nation.treasury + income - upkeep.upkeepCost;
  const newResources = { ...nation.resources };
  for (const [key, gain] of Object.entries(resourceGain)) {
    newResources[key] = (newResources[key] || 0) + gain;
  }
  newResources.food = Math.max(0, newResources.food - upkeep.foodConsumed);
  newResources.munitions = Math.max(0, (newResources.munitions || 0) - upkeep.munitionsConsumed);
  newResources.gasoline = Math.max(0, (newResources.gasoline || 0) - upkeep.gasolineConsumed);

  return {
    treasury: newTreasury,
    resources: newResources,
    incomeThisTurn: income,
    upkeepThisTurn: upkeep.upkeepCost,
    starving: newResources.food <= 0,
  };
}

module.exports = { calculateTurnIncome, calculateUpkeep, applyEconomicTurn };
