const { ChannelType, ThreadAutoArchiveDuration } = require('discord.js');
const { Op } = require('sequelize');
const { GameSession, SimulationWar } = require('../database/models');
const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');
const dashboardService = require('./dashboardService');
const { baseEmbed, COLORS } = require('../utils/embeds');

// Every game AND every war gets its own thread so the main channel never
// fills up with boards/dashboards from different sessions running at once.
// A background sweeper (below) deletes the thread shortly after the session
// ends. It works from the database, so cleanup still happens if the bot
// restarts mid-game/mid-war.

/** Sessions must be started from the games channel, never from inside another session's thread. */
function assertCanStartNewGame(interaction) {
  if (interaction.channel?.isThread?.()) {
    throw new Error('Start new games or wars from the games channel, not from inside another session\'s thread.');
  }
}

/**
 * Finds or creates the place where a session's dashboard should live.
 * `row` is any Sequelize instance with `id`, `threadId` and `.save()` —
 * currently a GameSession (chess) or a SimulationWar. Returns
 * { channel, thread, fallbackReason }. If a thread can't be made (missing
 * permissions), falls back to the current channel and says why.
 */
async function openSessionSpace(interaction, row, { title, inviteUserIds = [], reuseThreadOf = null, reuseModel = GameSession } = {}) {
  // Rematch (chess only, for now): keep using the thread the previous game was in.
  if (reuseThreadOf) {
    const old = await reuseModel.findByPk(reuseThreadOf);
    if (old && old.threadId) {
      const existing = await interaction.client.channels.fetch(old.threadId).catch(() => null);
      if (existing) {
        row.threadId = existing.id;
        await row.save();
        old.threadId = null; // so the sweeper doesn't delete the thread we're still using
        await old.save();
        return { channel: existing, thread: existing, fallbackReason: null };
      }
    }
  }

  // Already inside a thread (only reachable for rematches): just use it.
  if (interaction.channel?.isThread?.()) {
    row.threadId = interaction.channelId;
    await row.save();
    return { channel: interaction.channel, thread: interaction.channel, fallbackReason: null };
  }

  const parent = interaction.channel;
  const permissionHint =
    'I could not create a thread here, so this was posted in the channel instead. ' +
    'Give the bot the "Create Public Threads", "Send Messages in Threads" and "Manage Threads" permissions.';

  if (!parent?.threads?.create) {
    return { channel: parent, thread: null, fallbackReason: permissionHint };
  }

  try {
    const owner = interaction.member?.displayName || interaction.user.username;
    const thread = await parent.threads.create({
      name: `${title} #${row.id} • ${owner}`.slice(0, 100),
      type: ChannelType.PublicThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      reason: `Session #${row.id}`,
    });

    row.threadId = thread.id;
    await row.save();

    for (const userId of [interaction.user.id, ...inviteUserIds]) {
      await thread.members.add(userId).catch(() => {});
    }
    return { channel: thread, thread, fallbackReason: null };
  } catch (err) {
    logger.warn(`Could not create a thread in channel ${parent.id}: ${err.message}`);
    return { channel: parent, thread: null, fallbackReason: permissionHint };
  }
}

// ── Cleanup sweeper ──────────────────────────────────────────────────────

/** Deletes the Discord thread for any row with a threadId (GameSession or SimulationWar). */
async function retireThread(client, row) {
  const threadId = row.threadId;
  row.threadId = null; // clear first so we never try twice
  await row.save();

  try {
    const channel = await client.channels.fetch(threadId);
    await channel.delete('Session ended');
  } catch (err) {
    if (err.code !== 10003) { // 10003 = already gone, which is fine
      logger.warn(`Could not delete thread ${threadId}: ${err.message}. The bot needs the "Manage Threads" permission.`);
    }
  }
}

async function refreshChessDashboard(client, sessionId) {
  const full = await sessionService.getSessionWithPlayers(sessionId);
  await dashboardService.updateDashboard(client, full);
}

async function sweepChessSessions(client) {
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
    await refreshChessDashboard(client, session.id);
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
    await refreshChessDashboard(client, session.id);
  }
}

const WAR_ENDED_STATUSES = ['won_attacker', 'won_defender', 'expired', 'ended_by_admin'];

async function sweepWars(client) {
  const now = Date.now();
  const g = config.games;
  const hasThread = { [Op.ne]: null };

  // 1. Ended wars: delete the thread once the grace period has passed.
  const ended = await SimulationWar.findAll({
    where: {
      status: { [Op.in]: WAR_ENDED_STATUSES },
      threadId: hasThread,
      updatedAt: { [Op.lt]: new Date(now - g.threadDeleteDelaySeconds * 1000) },
    },
  });
  for (const war of ended) await retireThread(client, war);

  // 2. Wars nobody has attacked in for a long time: auto-expire them.
  const idle = await SimulationWar.findAll({
    where: {
      status: 'active',
      threadId: hasThread,
      updatedAt: { [Op.lt]: new Date(now - g.warIdleTimeoutHours * 60 * 60_000) },
    },
  });
  for (const war of idle) {
    war.status = 'expired';
    war.endedAt = new Date();
    war.result = { winner: 'expired', reason: 'No attacks for a while.' };
    await war.save();
    if (war.threadId) {
      try {
        const channel = await client.channels.fetch(war.threadId);
        await channel.send({
          embeds: [baseEmbed({ title: '⏳ War Expired', description: 'This war ended automatically due to inactivity.', color: COLORS.neutral })],
        });
      } catch (err) {
        // Thread already gone — nothing to announce to.
      }
    }
  }
}

let sweeping = false;

async function sweep(client) {
  if (sweeping) return;
  sweeping = true;
  try {
    await sweepChessSessions(client);
    await sweepWars(client);
  } catch (err) {
    logger.error('Thread cleanup sweep failed:', err.message);
  } finally {
    sweeping = false;
  }
}

function startSweeper(client) {
  setInterval(() => sweep(client), config.games.sweepIntervalSeconds * 1000);
  sweep(client); // also clean up anything left over from before a restart
}

module.exports = { assertCanStartNewGame, openSessionSpace, retireThread, startSweeper };
