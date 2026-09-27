const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    discordId: { type: DataTypes.STRING, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    lastDailyRewardAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
};
