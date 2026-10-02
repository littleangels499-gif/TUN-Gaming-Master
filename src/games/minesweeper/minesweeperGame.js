// Fixed 5x5 board: exactly 25 cells, which is Discord's hard limit of 25
// buttons (5 rows x 5) per message — so the whole board is always real,
// clickable buttons, never a menu.
const SIZE = 5;
const TOTAL_CELLS = SIZE * SIZE;

function neighborsOf(index) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) out.push(r * SIZE + c);
    }
  }
  return out;
}

function createEmptyState(mineCount) {
  return {
    size: SIZE,
    mineCount,
    grid: null, // built lazily on the first reveal, so it's never a mine
    revealed: new Array(TOTAL_CELLS).fill(false),
    gameOver: false,
    won: false,
  };
}

/** Builds the mine layout, guaranteeing `safeIndex` (the first click) is never a mine. */
function buildGrid(mineCount, safeIndex, rng = Math.random) {
  const candidates = [];
  for (let i = 0; i < TOTAL_CELLS; i++) if (i !== safeIndex) candidates.push(i);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mineSet = new Set(candidates.slice(0, mineCount));

  const grid = new Array(TOTAL_CELLS);
  for (let i = 0; i < TOTAL_CELLS; i++) grid[i] = { mine: mineSet.has(i), adjacent: 0 };
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (grid[i].mine) continue;
    grid[i].adjacent = neighborsOf(i).filter((n) => grid[n].mine).length;
  }
  return grid;
}

/**
 * Reveals `index`. Mutates and returns `state`. Flood-fills outward from
 * any 0-adjacent cell, exactly like classic Minesweeper. Sets
 * `state.gameOver`/`state.won` when the game ends.
 */
function reveal(state, index, rng = Math.random) {
  if (state.gameOver || state.revealed[index]) return state;

  if (!state.grid) {
    state.grid = buildGrid(state.mineCount, index, rng);
  }

  if (state.grid[index].mine) {
    state.revealed[index] = true;
    state.gameOver = true;
    state.won = false;
    return state;
  }

  const stack = [index];
  while (stack.length) {
    const i = stack.pop();
    if (state.revealed[i]) continue;
    state.revealed[i] = true;
    if (state.grid[i].adjacent === 0) {
      for (const n of neighborsOf(i)) {
        if (!state.revealed[n] && !state.grid[n].mine) stack.push(n);
      }
    }
  }

  const safeCells = TOTAL_CELLS - state.mineCount;
  const revealedSafeCells = state.revealed.filter((r, i) => r && !state.grid[i].mine).length;
  if (revealedSafeCells >= safeCells) {
    state.gameOver = true;
    state.won = true;
  }

  return state;
}

/** Simple risk-based payout: more mines survived = bigger multiplier. */
function calculatePayout(bet, mineCount) {
  if (!bet) return 0;
  return Math.round(bet * (1 + mineCount * 0.2));
}

module.exports = { SIZE, TOTAL_CELLS, createEmptyState, buildGrid, reveal, calculatePayout, neighborsOf };
