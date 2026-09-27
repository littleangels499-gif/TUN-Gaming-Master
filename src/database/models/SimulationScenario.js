const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationScenario = sequelize.define('SimulationScenario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    createdBy: { type: DataTypes.STRING, allowNull: false }, // instructor's Discord ID
    status: {
      type: DataTypes.ENUM('draft', 'active', 'ended'),
      defaultValue: 'draft',
    },
    // Free-form ruleset covering everything section 10 lists that isn't a
    // per-player nation stat: victory conditions, attack restrictions, turn
    // duration, multipliers, AI difficulty, war type, etc.
    rules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        turnDurationMinutes: 10,
        warType: 'ordinary',
        attackRestrictions: [],
        victoryConditions: 'eliminate_resistance',
        resourceConsumptionMultiplier: 1,
        economicMultiplier: 1,
        aiDifficulty: null,
      },
    },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    endedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'simulation_scenarios',
    timestamps: true,
  });

  return SimulationScenario;
};
