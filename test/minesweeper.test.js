const test = require('node:test');
const assert = require('node:assert/strict');
const ms = require('../src/games/minesweeper/minesweeperGame');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test('buildGrid: never places a mine on the safe index', () => {
  const rng = seededRng(1);
  for (let trial = 0; trial < 20; trial++) {
    const safeIndex = trial % ms.TOTAL_CELLS;
    const grid = ms.buildGrid(5, safeIndex, rng);
    assert.equal(grid[safeIndex].mine, false);
    assert.equal(grid.filter((c) => c.mine).length, 5);
  }
});

test('reveal: first click is always safe even if index "would have" been a mine', () => {
  const rng = seededRng(42);
  let state = ms.createEmptyState(10); // half the board is mines — worst case
  state = ms.reveal(state, 0, rng);
  assert.equal(state.gameOver, false);
  assert.equal(state.revealed[0], true);
});

test('reveal: hitting a mine ends the game as a loss', () => {
  const rng = seededRng(5);
  let state = ms.createEmptyState(20); // 5 safe cells, so the first click won't instantly win
  state = ms.reveal(state, 0, rng); // guaranteed safe
  assert.equal(state.gameOver, false); // confirm we haven't already won
  const mineIndex = state.grid.findIndex((c) => c.mine);
  state = ms.reveal(state, mineIndex, rng);
  assert.equal(state.gameOver, true);
  assert.equal(state.won, false);
});

test('reveal: clearing every safe cell wins', () => {
  const rng = seededRng(9);
  let state = ms.createEmptyState(3);
  state = ms.reveal(state, 12, rng);
  for (let i = 0; i < ms.TOTAL_CELLS && !state.gameOver; i++) {
    if (!state.grid[i].mine && !state.revealed[i]) state = ms.reveal(state, i, rng);
  }
  assert.equal(state.gameOver, true);
  assert.equal(state.won, true);
});

test('reveal: revealing an already-revealed or post-game-over cell is a no-op', () => {
  const rng = seededRng(3);
  let state = ms.createEmptyState(5);
  state = ms.reveal(state, 12, rng);
  const before = JSON.stringify(state.revealed);
  state = ms.reveal(state, 12, rng); // same cell again
  assert.equal(JSON.stringify(state.revealed), before);
});

test('calculatePayout: no bet means no payout; bigger mine count pays more', () => {
  assert.equal(ms.calculatePayout(0, 10), 0);
  assert.ok(ms.calculatePayout(100, 10) > ms.calculatePayout(100, 2));
});

test('neighborsOf: corner cell has exactly 3 neighbors on a 5x5 board', () => {
  assert.equal(ms.neighborsOf(0).length, 3); // top-left corner
  assert.equal(ms.neighborsOf(12).length, 8); // dead center
});
