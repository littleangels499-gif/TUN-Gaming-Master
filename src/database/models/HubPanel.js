const { DataTypes } = require('sequelize');

// One row per channel that has a "sticky" Gaming Hub panel. The panel is
// kept pinned to the bottom of the channel (see services/hubPanelService.js)
// by deleting and reposting it whenever something else gets posted there.
module.exports = (sequelize) => {
  const HubPanel = sequelize.define('HubPanel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    channelId: { type: DataTypes.STRING, allowNull: false, unique: true },
    messageId: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'hub_panels',
    timestamps: true,
  });

  return HubPanel;
};
