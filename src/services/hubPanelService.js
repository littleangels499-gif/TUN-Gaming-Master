const { HubPanel } = require('../database/models');
const { buildGamingHubEmbed, buildGamingHubComponents } = require('../ui/gamingHub');
const logger = require('../utils/logger');

// In-memory cache so we don't hit the DB on every single message in every
// channel — most channels have no sticky panel at all, and this check runs
// on every messageCreate event.
const activePanels = new Map(); // channelId -> { guildId, messageId }

// Guards against the reposition itself re-triggering a reposition: while
// we're mid-repost for a channel, any messageCreate events for it (which
// includes the very message we just posted) are ignored.
const repositioning = new Set();

// Coalesces bursts of activity (e.g. several interaction replies in a row)
// into a single reposition instead of thrashing delete+send repeatedly.
const debounceTimers = new Map();
const DEBOUNCE_MS = 1500;

async function loadCache() {
  const panels = await HubPanel.findAll();
  activePanels.clear();
  for (const p of panels) activePanels.set(p.channelId, { guildId: p.guildId, messageId: p.messageId });
  logger.info(`Loaded ${panels.length} sticky hub panel(s).`);
}

function isPanelChannel(channelId) {
  return activePanels.has(channelId);
}

/** Posts a brand-new sticky panel in `channel` and remembers it. */
async function setupHubPanel(channel) {
  const message = await channel.send({ embeds: [buildGamingHubEmbed()], components: buildGamingHubComponents() });
  await HubPanel.upsert({ guildId: channel.guildId, channelId: channel.id, messageId: message.id });
  activePanels.set(channel.id, { guildId: channel.guildId, messageId: message.id });
  return message;
}

/** Removes the sticky behavior for a channel and tries to clean up the old message. */
async function removeHubPanel(channel) {
  const existing = activePanels.get(channel.id);
  activePanels.delete(channel.id);
  await HubPanel.destroy({ where: { channelId: channel.id } });

  if (existing) {
    try {
      const oldMessage = await channel.messages.fetch(existing.messageId);
      await oldMessage.delete();
    } catch (err) {
      // Already deleted, or we lost access — not fatal either way.
    }
  }
}

/** Deletes the old panel message and posts a fresh copy at the bottom. */
async function repostPanel(channel) {
  const panelInfo = activePanels.get(channel.id);
  if (!panelInfo) return;

  repositioning.add(channel.id);
  try {
    try {
      const oldMessage = await channel.messages.fetch(panelInfo.messageId);
      await oldMessage.delete();
    } catch (err) {
      // Already gone — fine, we're replacing it anyway.
    }

    const newMessage = await channel.send({ embeds: [buildGamingHubEmbed()], components: buildGamingHubComponents() });
    activePanels.set(channel.id, { guildId: panelInfo.guildId, messageId: newMessage.id });
    await HubPanel.update({ messageId: newMessage.id }, { where: { channelId: channel.id } });
  } catch (err) {
    logger.error(`Failed to reposition hub panel in channel ${channel.id}:`, err.message);
  } finally {
    // Small delay before releasing the lock so the gateway event for the
    // message we just sent (which fires asynchronously) is guaranteed to
    // arrive while we're still "repositioning" and gets ignored.
    setTimeout(() => repositioning.delete(channel.id), 500);
  }
}

/**
 * Call this on every messageCreate. It's a cheap Map lookup and returns
 * immediately for the vast majority of channels that have no sticky panel.
 */
function handleChannelActivity(message) {
  const channelId = message.channelId;
  if (!activePanels.has(channelId)) return;
  if (repositioning.has(channelId)) return;

  const panelInfo = activePanels.get(channelId);
  if (message.id === panelInfo.messageId) return; // the panel message itself

  clearTimeout(debounceTimers.get(channelId));
  const timer = setTimeout(() => {
    debounceTimers.delete(channelId);
    repostPanel(message.channel).catch((err) => logger.error('repostPanel error:', err.message));
  }, DEBOUNCE_MS);
  debounceTimers.set(channelId, timer);
}

module.exports = { loadCache, setupHubPanel, removeHubPanel, isPanelChannel, handleChannelActivity };
