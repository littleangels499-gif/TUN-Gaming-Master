const { DataTypes } = require('sequelize');

// A SimulationNation is 100% independent from the member's real PnW nation.
// A member normally has ONE "normal" nation (scenarioId = null). When an
// instructor runs a scenario, the normal nation is CLONED into a new
// SimulationNation row with scenarioId + baseNationId set; the instructor's
// overrides only ever touch that clone. The normal nation is restored by
// simply going back to using the baseNationId row once the scenario ends —
// it was never touched. See simulation/scenarioService.js.
module.exports = (sequelize) => {
  const SimulationNation = sequelize.define('SimulationNation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },

    mode: {
      type: DataTypes.ENUM('linked', 'sandbox', 'scenario', 'competitive', 'tournament'),
      allowNull: false,
      defaultValue: 'sandbox',
    },

    // Set only on scenario-clone rows. Points back at the member's normal nation.
    baseNationId: { type: DataTypes.INTEGER, allowNull: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: true },

    name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Unnamed Nation' },
    leaderName: { type: DataTypes.STRING, allowNull: true },

    cities: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    infrastructureTotal: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 500 },

    treasury: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // simulated "money"
    resources: {
      // food, coal, oil, uranium, lead, iron, bauxite, gasoline, munitions, steel, aluminum
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        food: 0, coal: 0, oil: 0, uranium: 0, lead: 0, iron: 0,
        bauxite: 0, gasoline: 0, munitions: 0, steel: 0, aluminum: 0,
      },
    },

    soldiers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tanks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aircraft: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ships: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    missiles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    nukes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    militaryImprovements: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    economicImprovements: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },

    resistance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 }, // 0-100, simplified nation-wide value
    score: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'simulation_nations',
    timestamps: true,
  });

  return SimulationNation;
};
