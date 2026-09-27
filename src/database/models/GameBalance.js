const { DataTypes } = require('sequelize');

// This is the CASUAL GAMING currency (lottery tickets, daily rewards, game
// winnings). It is intentionally a completely separate ledger from the
// war simulator's simulated PnW-style economy (see SimulationNation).
module.exports = (sequelize) => {
  const GameBalance = sequelize.define('GameBalance', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'game_balances',
    timestamps: true,
  });

  return GameBalance;
};
