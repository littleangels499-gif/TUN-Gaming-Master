const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationCity = sequelize.define('SimulationCity', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nationId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'City' },
    infrastructure: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 500 },
    land: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 500 },
    improvements: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  }, {
    tableName: 'simulation_cities',
    timestamps: true,
  });

  return SimulationCity;
};
