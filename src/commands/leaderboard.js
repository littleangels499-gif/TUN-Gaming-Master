const { SlashCommandBuilder } = require('discord.js');
const { TITLES, BUILDERS } = require('../services/leaderboardService');
const { baseEmbed, COLORS, errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See who is on top')
    .addStringOption((o) =>
      o
        .setName('board')
        .setDescription('Which leaderboard')
        .setRequired(true)
        .addChoices(
          { name: 'Coins', value: 'coins' },
          { name: 'War Simulator (score)', value: 'war' },
          { name: 'Chess (wins)', value: 'chess' },
        )
    ),

  async execute(interaction) {
    const board = interaction.options.getString('board');
    await interaction.deferReply();

    try {
      const description = await BUILDERS[board]();
      if (!description) {
        await interaction.editReply({ embeds: [errorEmbed('Nobody has any data for this leaderboard yet.')] });
        return;
      }
      await interaction.editReply({ embeds: [baseEmbed({ title: TITLES[board], description, color: COLORS.primary })] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] }).catch(() => {});
    }
  },
};
