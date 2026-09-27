const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lottery = sequelize.define('Lottery', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('open', 'drawn', 'cancelled'), defaultValue: 'open' },
    ticketPrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 25 },
    prizePool: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    winnerUserId: { type: DataTypes.STRING, allowNull: true },
    drawnAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'lotteries',
    timestamps: true,
  });

  return Lottery;
};
