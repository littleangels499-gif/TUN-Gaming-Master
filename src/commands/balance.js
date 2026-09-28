const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildBalanceEmbed } = require('../ui/economyUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your gaming-currency balance'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply({ embeds: [await buildBalanceEmbed(interaction.user)] });
  },
};
