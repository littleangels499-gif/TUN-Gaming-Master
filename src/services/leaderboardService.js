const { sequelize, GameBalance, SimulationNation, GamePlayer, GameSession } = require('../database/models');

const LIMIT = 10;

function medal(rank) {
  return ['🥇', '🥈', '🥉'][rank] || `${rank + 1}.`;
}

async function coinsLeaderboard() {
  const rows = await GameBalance.findAll({ order: [['balance', 'DESC']], limit: LIMIT });
  if (!rows.length) return null;
  return rows.map((r, i) => `${medal(i)} <@${r.userId}> — **${r.balance}** coins`).join('\n');
}

async function warLeaderboard() {
  const rows = await SimulationNation.findAll({
    where: { scenarioId: null, isActive: true },
    order: [['score', 'DESC']],
    limit: LIMIT,
  });
  if (!rows.length) return null;
  return rows.map((r, i) => `${medal(i)} <@${r.userId}> — **${r.name}** (score ${r.score.toFixed(1)})`).join('\n');
}

async function chessLeaderboard() {
  const rows = await GamePlayer.findAll({
    attributes: ['userId', [sequelize.fn('COUNT', sequelize.col('GamePlayer.id')), 'wins']],
    include: [{ model: GameSession, attributes: [], where: { gameType: 'chess' } }],
    where: { outcome: 'win' },
    group: ['GamePlayer.userId'],
    order: [[sequelize.fn('COUNT', sequelize.col('GamePlayer.id')), 'DESC']],
    limit: LIMIT,
    raw: true,
  });
  if (!rows.length) return null;
  return rows.map((r, i) => `${medal(i)} <@${r.userId}> — **${r.wins}** win(s)`).join('\n');
}

const TITLES = { coins: '💰 Coin Leaderboard', war: '⚔️ War Simulator Leaderboard', chess: '♟️ Chess Leaderboard' };
const BUILDERS = { coins: coinsLeaderboard, war: warLeaderboard, chess: chessLeaderboard };

module.exports = { TITLES, BUILDERS };
