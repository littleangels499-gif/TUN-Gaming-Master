const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildDailyClaimEmbed } = require('../ui/economyUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily gaming-currency reward'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply({ embeds: [await buildDailyClaimEmbed(interaction.user)] });
  },
};
