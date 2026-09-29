const sessionService = require('../../services/sessionService');
const dashboardService = require('../../services/dashboardService');
const gameThreadService = require('../../services/gameThreadService');
const chessGame = require('./chessGame');

const TITLE = '♟️ Chess';

/** Text for the private "your game is ready" reply. */
function describeLaunch(session, thread, fallbackReason, label = 'Your game') {
  if (thread) return `♟️ ${label} is ready: <#${thread.id}>`;
  return `♟️ ${label} (#${session.id}) was created. ⚠️ ${fallbackReason}`;
}

async function launchChess(interaction, { vsAI = false, difficulty = 'easy', isPrivate = false, opponent = null } = {}) {
  gameThreadService.assertCanStartNewGame(interaction);

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

  try {
    session.state = { fen: chessGame.newGameFen() };
    if (vsAI) {
      session.status = 'active';
      session.turnUserId = interaction.user.id; // host is always White
    }
    await session.save();

    const { channel, thread, fallbackReason } = await gameThreadService.openSessionSpace(interaction, session, {
      title: TITLE,
      inviteUserIds: opponent ? [opponent.id] : [],
    });

    const full = await sessionService.getSessionWithPlayers(session.id);
    await dashboardService.postDashboard(channel, full);
    return { session, thread, fallbackReason };
  } catch (err) {
    session.status = 'cancelled';
    await session.save().catch(() => {});
    throw err;
  }
}

async function launchChessRematch(interaction, oldSessionId) {
  const old = await sessionService.getSessionWithPlayers(oldSessionId);
  if (!old || old.gameType !== 'chess') throw new Error('Rematch is only available for finished chess games.');
  if (old.status !== 'finished') throw new Error('You can only start a rematch after the game has finished.');
  if (!old.players.some((p) => p.userId === interaction.user.id)) {
    throw new Error('Only players from that game can start a rematch.');
  }
  if (old.result?.rematchId) throw new Error('A rematch for this game was already started.');

  const rematch = await sessionService.createRematch(oldSessionId);

  try {
    rematch.state = { fen: chessGame.newGameFen() };
    await rematch.save();

    const { channel, thread, fallbackReason } = await gameThreadService.openSessionSpace(interaction, rematch, {
      title: TITLE,
      reuseThreadOf: oldSessionId,
    });

    const full = await sessionService.getSessionWithPlayers(rematch.id);
    await dashboardService.postDashboard(channel, full);

    // Remember it so double-clicking Rematch can't start two games.
    const oldFresh = await sessionService.getSessionWithPlayers(oldSessionId);
    oldFresh.result = { ...(oldFresh.result || {}), rematchId: rematch.id };
    await oldFresh.save();

    return { session: rematch, thread, fallbackReason };
  } catch (err) {
    rematch.status = 'cancelled';
    await rematch.save().catch(() => {});
    throw err;
  }
}

module.exports = { launchChess, launchChessRematch, describeLaunch };
