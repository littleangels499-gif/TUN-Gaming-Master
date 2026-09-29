const { ChannelType, ThreadAutoArchiveDuration } = require('discord.js');
const { Op } = require('sequelize');
const { GameSession } = require('../database/models');
const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');
const dashboardService = require('./dashboardService');

// Every game gets its own thread so the main games channel never fills up
// with boards and buttons from different games. A background sweeper (below)
// deletes the thread shortly after the game ends. It works from the
// database, so cleanup still happens if the bot restarts mid-game.

/** Games must be started from the games channel, never from inside another game's thread. */
function assertCanStartNewGame(interaction) {
  if (interaction.channel?.isThread?.()) {
    throw new Error('Start new games from the games channel, not from inside a game thread.');
  }
}

/**
 * Finds or creates the place where a session's dashboard should live.
 * Returns { channel, thread, fallbackReason }. If a thread can't be made
 * (missing permissions), falls back to the current channel and says why.
 */
async function openSessionSpace(interaction, session, { title, inviteUserIds = [], reuseThreadOf = null } = {}) {
  // Rematch: keep using the thread the previous game was in.
  if (reuseThreadOf) {
    const old = await GameSession.findByPk(reuseThreadOf);
    if (old && old.threadId) {
      const existing = await interaction.client.channels.fetch(old.threadId).catch(() => null);
      if (existing) {
        session.threadId = existing.id;
        await session.save();
        old.threadId = null; // so the sweeper doesn't delete the thread we're still using
        await old.save();
        return { channel: existing, thread: existing, fallbackReason: null };
      }
    }
  }

  // Already inside a thread (only reachable for rematches): just use it.
  if (interaction.channel?.isThread?.()) {
    session.threadId = interaction.channelId;
    await session.save();
    return { channel: interaction.channel, thread: interaction.channel, fallbackReason: null };
  }

  const parent = interaction.channel;
  const permissionHint =
    'I could not create a thread here, so the game was posted in the channel instead. ' +
    'Give the bot the "Create Public Threads", "Send Messages in Threads" and "Manage Threads" permissions.';

  if (!parent?.threads?.create) {
    return { channel: parent, thread: null, fallbackReason: permissionHint };
  }

  try {
    const owner = interaction.member?.displayName || interaction.user.username;
    const thread = await parent.threads.create({
      name: `${title} #${session.id} • ${owner}`.slice(0, 100),
      type: ChannelType.PublicThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      reason: `Game session #${session.id}`,
    });

    session.threadId = thread.id;
    await session.save();

    for (const userId of [interaction.user.id, ...inviteUserIds]) {
      await thread.members.add(userId).catch(() => {});
    }
    return { channel: thread, thread, fallbackReason: null };
  } catch (err) {
    logger.warn(`Could not create a game thread in channel ${parent.id}: ${err.message}`);
    return { channel: parent, thread: null, fallbackReason: permissionHint };
  }
}

// ── Cleanup sweeper ──────────────────────────────────────────────────────

async function retireThread(client, session) {
  const threadId = session.threadId;
  session.threadId = null; // clear first so we never try twice
  await session.save();

  try {
    const channel = await client.channels.fetch(threadId);
    await channel.delete('Game session ended');
  } catch (err) {
    if (err.code !== 10003) { // 10003 = already gone, which is fine
      logger.warn(`Could not delete game thread ${threadId}: ${err.message}. The bot needs the "Manage Threads" permission.`);
    }
  }
}

async function refreshDashboard(client, sessionId) {
  const full = await sessionService.getSessionWithPlayers(sessionId);
  await dashboardService.updateDashboard(client, full);
}

let sweeping = false;

async function sweep(client) {
  if (sweeping) return;
  sweeping = true;
  try {
    const now = Date.now();
    const g = config.games;
    const hasThread = { [Op.ne]: null };

    // 1. Ended games: delete the thread once the grace period has passed.
    const ended = await GameSession.findAll({
      where: {
        status: { [Op.in]: ['finished', 'cancelled'] },
        threadId: hasThread,
        updatedAt: { [Op.lt]: new Date(now - g.threadDeleteDelaySeconds * 1000) },
      },
    });
    for (const session of ended) await retireThread(client, session);

    // 2. Lobbies nobody started: cancel them (their thread is deleted on a later sweep).
    const stale = await GameSession.findAll({
      where: {
        status: 'waiting',
        threadId: hasThread,
        createdAt: { [Op.lt]: new Date(now - g.waitingTimeoutMinutes * 60_000) },
      },
    });
    for (const session of stale) {
      session.status = 'cancelled';
      session.result = { summary: 'Cancelled — nobody started the game in time.' };
      await session.save();
      await refreshDashboard(client, session.id);
    }

    // 3. Abandoned games: end them after a long stretch with no moves.
    const idle = await GameSession.findAll({
      where: {
        status: 'active',
        threadId: hasThread,
        updatedAt: { [Op.lt]: new Date(now - g.activeIdleTimeoutMinutes * 60_000) },
      },
    });
    for (const session of idle) {
      session.status = 'finished';
      session.result = { summary: 'Game ended — no activity for a while.' };
      await session.save();
      await refreshDashboard(client, session.id);
    }
  } catch (err) {
    logger.error('Game thread sweep failed:', err.message);
  } finally {
    sweeping = false;
  }
}

function startSweeper(client) {
  setInterval(() => sweep(client), config.games.sweepIntervalSeconds * 1000);
  sweep(client); // also clean up anything left over from before a restart
}

module.exports = { assertCanStartNewGame, openSessionSpace, startSweeper };
