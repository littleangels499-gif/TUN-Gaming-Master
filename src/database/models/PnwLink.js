const { DataTypes } = require('sequelize');

// Establishes identity ONLY: which real PnW nation a Discord member owns.
// Deliberately does NOT store the member's PnW API key — it is used
// transiently during /sim link and /sim refresh to prove ownership, then
// discarded. See services/pnwService.js.
module.exports = (sequelize) => {
  const PnwLink = sequelize.define('PnwLink', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    pnwNationId: { type: DataTypes.STRING, allowNull: false, unique: true },
    pnwNationName: { type: DataTypes.STRING, allowNull: true },
    pnwLeaderName: { type: DataTypes.STRING, allowNull: true },
    linkedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    lastRefreshedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'pnw_links',
    timestamps: true,
  });

  return PnwLink;
};
