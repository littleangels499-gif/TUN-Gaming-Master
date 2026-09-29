const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');
const chessGame = require('../games/chess/chessGame');
const config = require('../config');

function threadNote(session) {
  if (!session.threadId) return null;
  const s = config.games.threadDeleteDelaySeconds;
  const when = s >= 60 ? `${Math.round(s / 60)} minute(s)` : `${s} seconds`;
  return `🧹 This thread will be deleted about ${when} after the game ends.`;
}

function buildChessEmbed(session, whiteDisplay, blackDisplay) {
  const fen = session.state.fen;
  const board = chessGame.renderBoardText(fen);
  const turn = fen.split(' ')[1] === 'w' ? 'White' : 'Black';

  const lines = [
    `⚪ White: ${whiteDisplay || '_waiting..._'}`,
    `⚫ Black: ${blackDisplay || '_waiting..._'}`,
    '',
    board,
  ];

  if (session.status === 'active') {
    lines.push(`**Turn:** ${turn}`);
  } else if (session.status === 'finished') {
    lines.push(`**Result:** ${session.result?.summary || 'Game over'}`);
    if (threadNote(session)) lines.push(`${threadNote(session)} Press **Rematch** to keep playing.`);
  } else if (session.status === 'cancelled') {
    lines.push('_This game was cancelled._');
    if (threadNote(session)) lines.push(threadNote(session));
  } else {
    lines.push('_Waiting for players..._');
  }

  return baseEmbed({
    title: '♟️ Chess',
    description: lines.join('\n'),
    color: session.status === 'finished' || session.status === 'cancelled' ? COLORS.neutral : COLORS.primary,
    footer: `Game #${session.id}`,
  });
}

function buildChessComponents(session) {
  if (session.status === 'waiting') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`chess:join:${session.id}`).setLabel('Join').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`chess:ready:${session.id}`).setLabel('Ready').setEmoji('✅').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`chess:ai:${session.id}`).setLabel('Play vs AI').setEmoji('🤖').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`chess:cancel:${session.id}`).setLabel('Cancel').setEmoji('✖️').setStyle(ButtonStyle.Danger),
    );
    return [row];
  }

  if (session.status === 'active') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`chess:move:${session.id}`).setLabel('Make Move').setEmoji('♟️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`chess:resign:${session.id}`).setLabel('Resign').setEmoji('🏳️').setStyle(ButtonStyle.Danger),
    );
    return [row];
  }

  if (session.status === 'cancelled') {
    return [];
  }

  // finished
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`chess:rematch:${session.id}`).setLabel('Rematch').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
  );
  return [row];
}

function buildMoveModal(sessionId) {
  const modal = new ModalBuilder().setCustomId(`chess:move_modal:${sessionId}`).setTitle('Enter your move');
  const input = new TextInputBuilder()
    .setCustomId('move')
    .setLabel('Move (e.g. e4, Nf3, Qxe7, O-O)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

module.exports = { buildChessEmbed, buildChessComponents, buildMoveModal };
