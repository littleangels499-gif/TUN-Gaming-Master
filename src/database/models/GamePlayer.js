const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GamePlayer = sequelize.define('GamePlayer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sessionId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.STRING, allowNull: false },
    seat: { type: DataTypes.INTEGER, allowNull: true }, // turn order / side (0, 1, ...)
    isReady: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasResigned: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasLeft: { type: DataTypes.BOOLEAN, defaultValue: false },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
    outcome: { type: DataTypes.ENUM('win', 'loss', 'draw'), allowNull: true },
  }, {
    tableName: 'game_players',
    timestamps: true,
    indexes: [{ unique: true, fields: ['sessionId', 'userId'] }],
  });

  return GamePlayer;
};
