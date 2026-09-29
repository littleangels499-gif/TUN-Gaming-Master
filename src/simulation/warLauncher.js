const warSimulator = require('./warSimulator');
const gameThreadService = require('../services/gameThreadService');
const { buildWarEmbed, buildWarComponents } = require('../ui/warDashboard');

const TITLE = '⚔️ War';

/** Text for the private "your war thread is ready" reply. */
function describeWarLaunch(war, thread, fallbackReason) {
  if (thread) return `⚔️ War #${war.id} declared! Follow it here: <#${thread.id}>`;
  return `⚔️ War #${war.id} declared. ⚠️ ${fallbackReason}`;
}

/**
 * Declares a war and gives it its own thread, same pattern as chess games —
 * so multiple simultaneous wars don't clutter the games channel.
 */
async function declareWarWithThread(interaction, { attackerNation, defenderNation, warType }) {
  gameThreadService.assertCanStartNewGame(interaction);

  const war = await warSimulator.declareWar(attackerNation.id, defenderNation.id, { warType });

  try {
    const { channel, thread, fallbackReason } = await gameThreadService.openSessionSpace(interaction, war, {
      title: TITLE,
      inviteUserIds: [defenderNation.userId],
    });

    await channel.send({
      embeds: [buildWarEmbed(war, attackerNation, defenderNation)],
      components: buildWarComponents(war),
    });

    return { war, thread, fallbackReason };
  } catch (err) {
    war.status = 'ended_by_admin';
    war.result = { winner: null, reason: 'Failed to set up the war thread.' };
    await war.save().catch(() => {});
    throw err;
  }
}

module.exports = { declareWarWithThread, describeWarLaunch };
