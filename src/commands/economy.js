const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { ensureUser, getOrCreateBalance, claimDailyReward } = require('../utils/economy');
const { successEmbed, errorEmbed, baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily gaming-currency reward'),

  async execute(interaction) {
    await ensureUser(interaction.user);
    const result = await claimDailyReward(interaction.user.id);
    if (!result.claimed) {
      await interaction.reply({ embeds: [errorEmbed(`You've already claimed today's reward. Try again in ${result.hoursLeft}h.`)], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ embeds: [successEmbed(`You claimed **${result.amount}** coins! New balance: **${result.newBalance}**.`)] });
  },
};
