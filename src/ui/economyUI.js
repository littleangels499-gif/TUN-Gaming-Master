const { ensureUser, claimDailyReward, getOrCreateBalance } = require('../utils/economy');
const { baseEmbed, COLORS } = require('../utils/embeds');

// One implementation shared by the hub buttons, the hub menu and the
// /daily and /balance slash commands, so they can never drift apart.

async function buildDailyClaimEmbed(discordUser) {
  await ensureUser(discordUser);
  const result = await claimDailyReward(discordUser.id);

  if (!result.claimed) {
    return baseEmbed({
      title: '⏳ Daily reward already claimed',
      description: `Come back in about **${result.hoursLeft} hour(s)**.`,
      color: COLORS.warning,
    });
  }

  return baseEmbed({
    title: '🎁 Daily reward claimed!',
    description: `You received **${result.amount}** coins.\nNew balance: **${result.newBalance}** coins.`,
    color: COLORS.success,
  });
}

async function buildBalanceEmbed(discordUser) {
  await ensureUser(discordUser);
  const balance = await getOrCreateBalance(discordUser.id);
  return baseEmbed({
    title: '💰 Your Balance',
    description: `**${balance.balance}** coins`,
    color: COLORS.primary,
  });
}

module.exports = { buildDailyClaimEmbed, buildBalanceEmbed };
