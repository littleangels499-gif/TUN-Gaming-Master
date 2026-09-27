/**
 * Turn Engine
 * ───────────
 * Shared helpers for turn-based bookkeeping (wars, scenarios). Configurable
 * turn duration lets an instructor run a scenario in real time (e.g. 10
 * minutes/turn) or compress it for a quick classroom exercise.
 */

function turnsRemainingAfter(turnsRemaining, decrementBy = 1) {
  return Math.max(0, turnsRemaining - decrementBy);
}

function isWarOver({ turnsRemaining, attackerResistance, defenderResistance }) {
  if (attackerResistance <= 0) return { over: true, winner: 'defender' };
  if (defenderResistance <= 0) return { over: true, winner: 'attacker' };
  if (turnsRemaining <= 0) return { over: true, winner: 'expired' };
  return { over: false, winner: null };
}

function nextTurnExpiry(turnDurationMinutes = 120) {
  return new Date(Date.now() + turnDurationMinutes * 60_000);
}

module.exports = { turnsRemainingAfter, isWarOver, nextTurnExpiry };
