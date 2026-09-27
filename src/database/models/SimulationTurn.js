const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationTurn = sequelize.define('SimulationTurn', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    warId: { type: DataTypes.INTEGER, allowNull: false },
    turnNumber: { type: DataTypes.INTEGER, allowNull: false },
    processedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'simulation_turns',
    timestamps: true,
    updatedAt: false,
  });

  return SimulationTurn;
};
