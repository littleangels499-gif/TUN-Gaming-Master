const { GameBalance, GameTransaction, User } = require('../database/models');
const config = require('../config');
const logger = require('../utils/logger');

// This is the CASUAL gaming currency only (lottery, daily reward, game
// winnings) — never touches the war simulator's economy.

async function ensureUser(discordUser) {
  const [user] = await User.findOrCreate({
    where: { discordId: discordUser.id },
    defaults: { username: discordUser.username },
  });
  if (user.username !== discordUser.username) {
    user.username = discordUser.username;
    await user.save();
  }
  return user;
}

async function getOrCreateBalance(userId) {
  const [balance] = await GameBalance.findOrCreate({
    where: { userId },
    defaults: { balance: config.economy.startingCurrency },
  });
  return balance;
}

/**
 * Adjust a user's balance atomically-ish and log the transaction.
 * amount may be negative (a debit). Throws if a debit would go negative.
 */
async function adjustBalance(userId, amount, reason, metadata = {}) {
  const balance = await getOrCreateBalance(userId);

  if (amount < 0 && balance.balance + amount < 0) {
    throw new Error('Insufficient balance.');
  }

  balance.balance += amount;
  await balance.save();

  await GameTransaction.create({ userId, amount, reason, metadata });
  logger.debug(`Balance adjusted for ${userId}: ${amount} (${reason}). New balance: ${balance.balance}`);

  return balance;
}

async function claimDailyReward(userId) {
  const user = await User.findByPk(userId);
  const now = new Date();

  if (user.lastDailyRewardAt) {
    const hoursSince = (now - user.lastDailyRewardAt) / 36e5;
    if (hoursSince < config.economy.dailyRewardCooldownHours) {
      const hoursLeft = (config.economy.dailyRewardCooldownHours - hoursSince).toFixed(1);
      return { claimed: false, hoursLeft };
    }
  }

  user.lastDailyRewardAt = now;
  await user.save();
  const balance = await adjustBalance(userId, config.economy.dailyRewardAmount, 'daily_reward');

  return { claimed: true, amount: config.economy.dailyRewardAmount, newBalance: balance.balance };
}

module.exports = { ensureUser, getOrCreateBalance, adjustBalance, claimDailyReward };
