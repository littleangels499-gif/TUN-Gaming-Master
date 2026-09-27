const { SlashCommandBuilder } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chess')
    .setDescription('Chess')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new chess game')
        .addBooleanOption((opt) => opt.setName('vs_ai').setDescription('Play against the bot'))
        .addStringOption((opt) =>
          opt
            .setName('difficulty')
            .setDescription('AI difficulty (only used with vs_ai)')
            .addChoices({ name: 'Easy', value: 'easy' }, { name: 'Medium', value: 'medium' }, { name: 'Hard', value: 'hard' })
        )
        .addBooleanOption((opt) => opt.setName('private').setDescription('Only you can join (default: public)'))
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
      const vsAI = interaction.options.getBoolean('vs_ai') || false;
      const difficulty = interaction.options.getString('difficulty') || 'easy';
      const isPrivate = interaction.options.getBoolean('private') || false;
      const opponent = interaction.options.getUser('opponent');

      const session = await sessionService.createSession({
        gameType: 'chess',
        hostId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        isPrivate: isPrivate || Boolean(opponent),
        isSolo: vsAI,
        vsAI,
        aiDifficulty: vsAI ? difficulty : null,
        settings: { maxPlayers: 2, allowedJoinerId: opponent ? opponent.id : null },
      });
      session.state = { fen: chessGame.newGameFen() };

      if (vsAI) {
        session.status = 'active';
        session.turnUserId = interaction.user.id; // host is always White
      }
      await session.save();

      await interaction.reply({ content: `Chess game #${session.id} created.` });
      const full = await sessionService.getSessionWithPlayers(session.id);
      await dashboardService.postDashboard(interaction.channel, full);
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
