const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SimulationTrainingScore = sequelize.define('SimulationTrainingScore', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.STRING, allowNull: false },
    overallScore: { type: DataTypes.FLOAT, defaultValue: 0 },
    militaryEfficiency: { type: DataTypes.FLOAT, defaultValue: 0 },
    casualtyEfficiency: { type: DataTypes.FLOAT, defaultValue: 0 },
    airManagement: { type: DataTypes.FLOAT, defaultValue: 0 },
    groundManagement: { type: DataTypes.FLOAT, defaultValue: 0 },
    navalManagement: { type: DataTypes.FLOAT, defaultValue: 0 },
    resourceManagement: { type: DataTypes.FLOAT, defaultValue: 0 },
    economicEfficiency: { type: DataTypes.FLOAT, defaultValue: 0 },
    timing: { type: DataTypes.FLOAT, defaultValue: 0 },
    strategicDecisions: { type: DataTypes.FLOAT, defaultValue: 0 },
    objectiveCompletion: { type: DataTypes.FLOAT, defaultValue: 0 },
    instructorNotes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'simulation_training_scores',
    timestamps: true,
  });

  return SimulationTrainingScore;
};
