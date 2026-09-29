const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const chessLauncher = require('../games/chess/chessLauncher');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chess')
    .setDescription('Chess')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new chess game in its own thread')
        .addBooleanOption((opt) => opt.setName('vs_ai').setDescription('Play against the bot'))
        .addStringOption((opt) =>
          opt
            .setName('difficulty')
            .setDescription('AI difficulty (only used with vs_ai)')
            .addChoices({ name: 'Easy', value: 'easy' }, { name: 'Medium', value: 'medium' }, { name: 'Hard', value: 'hard' })
        )
        .addBooleanOption((opt) => opt.setName('private').setDescription('Only an invited opponent can join'))
        .addUserOption((opt) => opt.setName('opponent').setDescription('Invite a specific member (only they will be able to join)'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('move')
        .setDescription('Make a move in an active chess game')
        .addIntegerOption((opt) => opt.setName('game_id').setDescription('Game ID').setRequired(true))
        .addStringOption((opt) => opt.setName('move').setDescription('e.g. e4, Nf3, Qxe7, O-O').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      // Private reply: the game itself lives in its own thread, so nothing
      // extra is posted in the games channel.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const { session, thread, fallbackReason } = await chessLauncher.launchChess(interaction, {
          vsAI: interaction.options.getBoolean('vs_ai') || false,
          difficulty: interaction.options.getString('difficulty') || 'easy',
          isPrivate: interaction.options.getBoolean('private') || false,
          opponent: interaction.options.getUser('opponent'),
        });
        await interaction.editReply({ content: chessLauncher.describeLaunch(session, thread, fallbackReason) });
      } catch (err) {
        await interaction.editReply({ embeds: [errorEmbed(err.message)] });
      }
      return;
    }

    if (sub === 'move') {
      const gameId = interaction.options.getInteger('game_id');
      const moveInput = interaction.options.getString('move');
      const { handleChessMove } = require('../interactions/chessHandlers');
      await handleChessMove(interaction, gameId, moveInput);
      return;
    }
  },
};
