const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    actorId: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // e.g. 'scenario.override', 'war.force_end'
    targetType: { type: DataTypes.STRING, allowNull: true }, // e.g. 'SimulationNation'
    targetId: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
  });

  return AuditLog;
};
