const { DataTypes } = require('sequelize');

// The unified session that EVERY game type (chess, scrabble, minesweeper,
// racing, future games...) is built on top of. Individual games store their
// game-specific state in `state` (JSON) and reuse everything else:
// invites, readiness, turn order, timeouts, resign/rematch, results.
module.exports = (sequelize) => {
  const GameSession = sequelize.define('GameSession', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gameType: { type: DataTypes.STRING, allowNull: false }, // 'chess', 'lottery', 'minesweeper', ...
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'finished', 'cancelled'),
      defaultValue: 'waiting',
    },
    guildId: { type: DataTypes.STRING, allowNull: true },
    channelId: { type: DataTypes.STRING, allowNull: true },
    threadId: { type: DataTypes.STRING, allowNull: true },
    messageId: { type: DataTypes.STRING, allowNull: true }, // the live dashboard embed message
    hostId: { type: DataTypes.STRING, allowNull: false },
    isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
    isSolo: { type: DataTypes.BOOLEAN, defaultValue: false },
    vsAI: { type: DataTypes.BOOLEAN, defaultValue: false },
    aiDifficulty: { type: DataTypes.STRING, allowNull: true },
    settings: { type: DataTypes.JSON, defaultValue: {} }, // per-game configurable options
    state: { type: DataTypes.JSON, defaultValue: {} }, // per-game live state (e.g. chess FEN)
    turnUserId: { type: DataTypes.STRING, allowNull: true },
    turnExpiresAt: { type: DataTypes.DATE, allowNull: true },
    result: { type: DataTypes.JSON, allowNull: true }, // final outcome, winner(s), scores
  }, {
    tableName: 'game_sessions',
    timestamps: true,
  });

  return GameSession;
};
