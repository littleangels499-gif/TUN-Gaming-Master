const { MessageFlags } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessLauncher = require('../games/chess/chessLauncher');
const lotteryManager = require('../games/lottery/lotteryManager');
const { LotteryTicket } = require('../database/models');
const { baseEmbed, COLORS, errorEmbed } = require('../utils/embeds');
const { buildDailyClaimEmbed } = require('../ui/economyUI');
const minesweeperLauncher = require('../games/minesweeper/minesweeperLauncher');
const { TITLES, BUILDERS } = require('../services/leaderboardService');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

async function handleSelect(interaction) {
  if (interaction.customId.startsWith('chess:aisel:')) {
    await handleChessAiSelect(interaction);
    return;
  }
  if (interaction.customId === 'hub:lbselect') {
    await handleLeaderboardSelect(interaction);
    return;
  }
  if (interaction.customId === 'hub:select') {
    await handleHubSelect(interaction);
    return;
  }
}

// ── Leaderboard picker (shown after choosing "Leaderboards" in the hub) ──
async function handleLeaderboardSelect(interaction) {
  try {
    await interaction.deferUpdate();
  } catch (err) {
    return;
  }
  const board = interaction.values[0];
  try {
    const description = await BUILDERS[board]();
    if (!description) {
      await interaction.editReply({ content: null, embeds: [errorEmbed('Nobody has any data for this leaderboard yet.')], components: [] });
      return;
    }
    await interaction.editReply({ content: null, embeds: [baseEmbed({ title: TITLES[board], description, color: COLORS.primary })], components: [] });
  } catch (err) {
    await interaction.editReply({ content: null, embeds: [errorEmbed(err.message)], components: [] }).catch(() => {});
  }
}

// ── "Play vs AI" difficulty picker (shown privately to the host) ─────────
async function handleChessAiSelect(interaction) {
  try {
    await interaction.deferUpdate();
  } catch (err) {
    return; // token already expired, nothing we can do
  }

  try {
    const sessionId = Number(interaction.customId.split(':')[2]);
    const difficulty = interaction.values[0];
    await sessionService.startVsAI(sessionId, interaction.user.id, difficulty);

    const full = await sessionService.getSessionWithPlayers(sessionId);
    await dashboardService.updateDashboard(interaction.client, full);

    await interaction.editReply({
      content: `✅ Game started against the AI (**${difficulty}**). You play White — click **Make Move** on the board.`,
      components: [],
    });
  } catch (err) {
    await interaction.editReply({ content: `⚠️ ${err.message}`, components: [] }).catch(() => {});
  }
}

// ── Gaming Hub menu ──────────────────────────────────────────────────────
async function handleHubSelect(interaction) {
  const choice = interaction.values[0];
  const isEphemeralChoice = ['chess', 'minesweeper', 'war_simulator', 'leaderboards', 'daily'].includes(choice);

  // Acknowledge within Discord's 3-second window BEFORE doing any DB work.
  try {
    await interaction.deferReply(isEphemeralChoice ? { flags: MessageFlags.Ephemeral } : undefined);
  } catch (err) {
    return;
  }

  try {
    if (choice === 'chess') {
      const { session, thread, fallbackReason } = await chessLauncher.launchChess(interaction);
      await interaction.editReply({ content: chessLauncher.describeLaunch(session, thread, fallbackReason) });
      return;
    }

    if (choice === 'minesweeper') {
      const { session, thread, fallbackReason } = await minesweeperLauncher.launchMinesweeper(interaction, { mineCount: 5, bet: 0 });
      await interaction.editReply({ content: minesweeperLauncher.describeLaunch(session, thread, fallbackReason) + '\n_(Default: 5 mines, no bet. Use `/minesweeper start` to customize.)_' });
      return;
    }

    if (choice === 'lottery') {
      const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
      const ticketCount = (await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } })) || 0;
      const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount);
      await interaction.editReply({ embeds, components });
      return;
    }

    if (choice === 'daily') {
      await interaction.editReply({ embeds: [await buildDailyClaimEmbed(interaction.user)] });
      return;
    }

    if (choice === 'war_simulator') {
      await interaction.editReply({
        embeds: [baseEmbed({ title: '⚔️ War Simulator', description: 'Use `/sim nation view` to see your nation, or `/sim link` to import your Politics & War nation.', color: COLORS.primary })],
      });
      return;
    }

    if (choice === 'leaderboards') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('hub:lbselect')
        .setPlaceholder('Choose a leaderboard...')
        .addOptions(
          { label: 'Coins', value: 'coins', emoji: '💰' },
          { label: 'War Simulator', value: 'war', emoji: '⚔️' },
          { label: 'Chess', value: 'chess', emoji: '♟️' },
        );
      await interaction.editReply({ content: '🏆 Which leaderboard?', components: [new ActionRowBuilder().addComponents(menu)] });
      return;
    }
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed(err.message)] }).catch(() => {});
  }
}

module.exports = { handleSelect };
