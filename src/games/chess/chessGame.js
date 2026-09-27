const { Chess } = require('chess.js');

// Wraps chess.js so all chess-specific logic lives in one place. Rendering
// is plain Unicode text in an embed (Discord-native, no external image
// generation needed) per spec section 17's preference for Discord-native visuals.

const UNICODE_PIECES = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
};

function newGameFen() {
  return new Chess().fen();
}

function loadGame(fen) {
  return new Chess(fen);
}

/**
 * Attempt a move in SAN or UCI-ish form (chess.js accepts both loosely).
 * Returns the resulting state or throws a user-friendly error.
 */
function applyMove(fen, moveInput) {
  const game = loadGame(fen);
  let move;
  try {
    move = game.move(moveInput, { strict: false });
  } catch (err) {
    move = null;
  }

  if (!move) {
    throw new Error(`"${moveInput}" is not a legal move. Try algebraic notation like \`e4\`, \`Nf3\`, or \`Qxe7\`.`);
  }

  return {
    fen: game.fen(),
    san: move.san,
    isGameOver: game.isGameOver(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isCheck: game.isCheck(),
    turn: game.turn(), // 'w' or 'b'
  };
}

function renderBoardText(fen) {
  const game = loadGame(fen);
  const board = game.board(); // 8x8 array, board[0] = rank 8
  const lines = [];
  for (let rank = 0; rank < 8; rank++) {
    const rankNumber = 8 - rank;
    const squares = board[rank].map((square) => {
      if (!square) return '·';
      const symbol = square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase();
      return UNICODE_PIECES[symbol] || symbol;
    });
    lines.push(`${rankNumber} ${squares.join(' ')}`);
  }
  lines.push('  a b c d e f g h');
  return '```\n' + lines.join('\n') + '\n```';
}

function isLegalPosition(fen) {
  try {
    loadGame(fen);
    return true;
  } catch {
    return false;
  }
}

/** Very simple AI: picks a random legal move. Swap for a real engine later. */
function pickRandomMove(fen) {
  const game = loadGame(fen);
  const moves = game.moves();
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Slightly-less-simple AI: prefers captures and checks over quiet moves.
 * Still not a real engine, but noticeably better than random for "medium".
 */
function pickHeuristicMove(fen) {
  const game = loadGame(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;

  const scored = moves.map((m) => {
    let score = Math.random(); // tie-breaker
    if (m.captured) score += 5;
    if (m.san.includes('+')) score += 2;
    if (m.san.includes('#')) score += 100;
    return { move: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move.san;
}

function pickAiMove(fen, difficulty = 'easy') {
  if (difficulty === 'hard') return pickHeuristicMove(fen);
  if (difficulty === 'medium') return Math.random() < 0.6 ? pickHeuristicMove(fen) : pickRandomMove(fen);
  return pickRandomMove(fen);
}

module.exports = {
  newGameFen,
  applyMove,
  renderBoardText,
  isLegalPosition,
  pickAiMove,
};
