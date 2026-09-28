const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { ensureUser, getOrCreateBalance } = require('../utils/economy');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your gaming-currency balance'),

  async execute(interaction) {
    await ensureUser(interaction.user);
    const balance = await getOrCreateBalance(interaction.user.id);
    await interaction.reply({
      embeds: [baseEmbed({ title: '💰 Your Balance', description: `**${balance.balance}** coins`, color: COLORS.primary })],
      flags: MessageFlags.Ephemeral,
    });
  },
};
