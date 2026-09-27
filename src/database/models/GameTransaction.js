const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GameTransaction = sequelize.define('GameTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false }, // positive = credit, negative = debit
    reason: { type: DataTypes.STRING, allowNull: false }, // e.g. 'daily_reward', 'lottery_ticket', 'game_winnings'
    metadata: { type: DataTypes.JSON, allowNull: true },
  }, {
    tableName: 'game_transactions',
    timestamps: true,
    updatedAt: false,
  });

  return GameTransaction;
};
