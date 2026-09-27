const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LotteryTicket = sequelize.define('LotteryTicket', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lotteryId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  }, {
    tableName: 'lottery_tickets',
    timestamps: true,
    updatedAt: false,
  });

  return LotteryTicket;
};
