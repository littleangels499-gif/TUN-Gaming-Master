const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationWar = sequelize.define('SimulationWar', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    attackerNationId: { type: DataTypes.INTEGER, allowNull: false },
    defenderNationId: { type: DataTypes.INTEGER, allowNull: false },
    warType: {
      type: DataTypes.ENUM('raid', 'ordinary', 'attrition'),
      allowNull: false,
      defaultValue: 'ordinary',
    },
    status: {
      type: DataTypes.ENUM('active', 'won_attacker', 'won_defender', 'expired', 'ended_by_admin'),
      defaultValue: 'active',
    },
    scenarioId: { type: DataTypes.INTEGER, allowNull: true },
    turnsRemaining: { type: DataTypes.INTEGER, allowNull: false },
    threadId: { type: DataTypes.STRING, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    endedAt: { type: DataTypes.DATE, allowNull: true },
    result: { type: DataTypes.JSON, allowNull: true },
  }, {
    tableName: 'simulation_wars',
    timestamps: true,
  });

  return SimulationWar;
};
