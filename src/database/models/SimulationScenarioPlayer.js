const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationScenarioPlayer = sequelize.define('SimulationScenarioPlayer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.STRING, allowNull: false },
    scenarioNationId: { type: DataTypes.INTEGER, allowNull: false }, // the clone
    originalNationId: { type: DataTypes.INTEGER, allowNull: false }, // the member's normal nation (untouched)
    team: { type: DataTypes.STRING, allowNull: true }, // e.g. 'A' / 'B' for coalition exercises
  }, {
    tableName: 'simulation_scenario_players',
    timestamps: true,
  });

  return SimulationScenarioPlayer;
};
