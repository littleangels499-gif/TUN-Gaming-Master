const { DataTypes } = require('sequelize');

// One row per battle event. This is what powers battle logs, replay,
// instructor review and statistical analysis (spec section 21).
module.exports = (sequelize) => {
  const SimulationAttack = sequelize.define('SimulationAttack', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    warId: { type: DataTypes.INTEGER, allowNull: false },
    turn: { type: DataTypes.INTEGER, allowNull: false },
    actorNationId: { type: DataTypes.INTEGER, allowNull: false },
    targetNationId: { type: DataTypes.INTEGER, allowNull: false },
    actionType: {
      type: DataTypes.ENUM('ground', 'air', 'naval', 'missile', 'nuke'),
      allowNull: false,
    },
    unitsCommitted: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    casualties: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    resourcesConsumed: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    result: {
      type: DataTypes.ENUM(
        'immense_triumph', 'moderate_success', 'pyrrhic_victory', 'utter_failure'
      ),
      allowNull: false,
    },
    resistanceChange: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    scenarioId: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'simulation_attacks',
    timestamps: true,
    updatedAt: false,
  });

  return SimulationAttack;
};
