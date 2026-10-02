const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const minesweeperLauncher = require('../games/minesweeper/minesweeperLauncher');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('Play a round of Minesweeper on a 5x5 board')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new game in its own thread')
        .addIntegerOption((o) => o.setName('mines').setDescription('Number of mines (default 5)').setMinValue(1).setMaxValue(20))
        .addIntegerOption((o) => o.setName('bet').setDescription('Coins to wager (default 0 — just for fun)').setMinValue(0))
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const { session, thread, fallbackReason } = await minesweeperLauncher.launchMinesweeper(interaction, {
        mineCount: interaction.options.getInteger('mines') || 5,
        bet: interaction.options.getInteger('bet') || 0,
      });
      await interaction.editReply({ content: minesweeperLauncher.describeLaunch(session, thread, fallbackReason) });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] });
    }
  },
};
