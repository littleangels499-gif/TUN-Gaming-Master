const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');
const { errorEmbed, successEmbed } = require('../utils/embeds');

function seatOf(session, userId) {
  const player = (session.players || []).find((p) => p.userId === userId);
  return player ? player.seat : null;
}

function fenTurnIsWhite(fen) {
  return fen.split(' ')[1] === 'w';
}

/**
 * Applies a move for `userId` in game `gameId`. Shared by the /chess move
 * slash command and the button+modal flow so behavior never diverges.
 */
async function handleChessMove(interactionLike, gameId, moveInput) {
  const reply = (payload) => interactionLike.reply(payload);

  const session = await sessionService.getSessionWithPlayers(gameId);
  if (!session || session.gameType !== 'chess') {
    return reply({ embeds: [errorEmbed('Chess game not found.')], ephemeral: true });
  }
  if (session.status !== 'active') {
    return reply({ embeds: [errorEmbed('This game is not active.')], ephemeral: true });
  }

  const seat = seatOf(session, interactionLike.user.id);
  const isVsAI = session.vsAI;
  if (seat === null && !isVsAI) {
    return reply({ embeds: [errorEmbed('You are not a player in this game.')], ephemeral: true });
  }

  const whiteToMove = fenTurnIsWhite(session.state.fen);
  const expectedSeat = whiteToMove ? 0 : 1;
  if (!isVsAI && seat !== expectedSeat) {
    return reply({ embeds: [errorEmbed('It is not your turn.')], ephemeral: true });
  }

  let result;
  try {
    result = chessGame.applyMove(session.state.fen, moveInput);
  } catch (err) {
    return reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }

  session.state = { ...session.state, fen: result.fen };

  if (result.isGameOver) {
    session.status = 'finished';
    session.result = { summary: result.isCheckmate ? `Checkmate — ${whiteToMove ? 'White' : 'Black'} wins!` : result.isStalemate ? 'Stalemate — draw.' : 'Draw.' };
  } else if (isVsAI) {
    // Immediately play the AI's reply move so the human doesn't have to poll.
    const aiMove = chessGame.pickAiMove(result.fen, session.aiDifficulty || 'easy');
    if (aiMove) {
      const aiResult = chessGame.applyMove(result.fen, aiMove);
      session.state = { ...session.state, fen: aiResult.fen };
      if (aiResult.isGameOver) {
        session.status = 'finished';
        session.result = { summary: aiResult.isCheckmate ? 'Checkmate — AI wins!' : aiResult.isStalemate ? 'Stalemate — draw.' : 'Draw.' };
      }
    }
  }

  await session.save();
  const full = await sessionService.getSessionWithPlayers(session.id);
  await dashboardService.updateDashboard(interactionLike.client, full);

  await reply({ embeds: [successEmbed(`Move played: ${result.san}`)], ephemeral: true });
}

module.exports = { handleChessMove };
