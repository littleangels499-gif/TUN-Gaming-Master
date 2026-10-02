const sessionService = require('../../services/sessionService');
const dashboardService = require('../../services/dashboardService');
const gameThreadService = require('../../services/gameThreadService');
const { ensureUser, adjustBalance, getOrCreateBalance } = require('../../utils/economy');
const minesweeperGame = require('./minesweeperGame');

const TITLE = '🟪 Minesweeper';

function describeLaunch(session, thread, fallbackReason) {
  if (thread) return `🟪 Your game is ready: <#${thread.id}>`;
  return `🟪 Your game (#${session.id}) was created. ⚠️ ${fallbackReason}`;
}

async function launchMinesweeper(interaction, { mineCount, bet }) {
  gameThreadService.assertCanStartNewGame(interaction);

  await ensureUser(interaction.user);
  if (bet > 0) {
    const balance = await getOrCreateBalance(interaction.user.id);
    if (balance.balance < bet) {
      throw new Error(`You only have **${balance.balance}** coins — you can't bet **${bet}**.`);
    }
    await adjustBalance(interaction.user.id, -bet, 'minesweeper_bet');
  }

  const session = await sessionService.createSession({
    gameType: 'minesweeper',
    hostId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    isSolo: true,
  });

  try {
    session.status = 'active';
    session.state = { ...minesweeperGame.createEmptyState(mineCount), bet };
    await session.save();

    const { channel, thread, fallbackReason } = await gameThreadService.openSessionSpace(interaction, session, { title: TITLE });
    const full = await sessionService.getSessionWithPlayers(session.id);
    await dashboardService.postDashboard(channel, full);
    return { session, thread, fallbackReason };
  } catch (err) {
    // Refund the bet if we failed to actually set the game up.
    if (bet > 0) await adjustBalance(interaction.user.id, bet, 'minesweeper_bet_refund').catch(() => {});
    session.status = 'cancelled';
    await session.save().catch(() => {});
    throw err;
  }
}

module.exports = { launchMinesweeper, describeLaunch };
