const { MessageFlags } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');
const lotteryManager = require('../games/lottery/lotteryManager');
const { LotteryTicket } = require('../database/models');
const { baseEmbed, COLORS, errorEmbed } = require('../utils/embeds');
const { buildDailyClaimEmbed } = require('../ui/economyUI');

async function handleSelect(interaction) {
  if (interaction.customId.startsWith('chess:aisel:')) {
    await handleChessAiSelect(interaction);
    return;
  }
  if (interaction.customId === 'hub:select') {
    await handleHubSelect(interaction);
    return;
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
  const isEphemeralChoice = ['war_simulator', 'leaderboards', 'daily'].includes(choice);

  // Acknowledge within Discord's 3-second window BEFORE doing any DB work.
  try {
    await interaction.deferReply(isEphemeralChoice ? { flags: MessageFlags.Ephemeral } : undefined);
  } catch (err) {
    return;
  }

  try {
    if (choice === 'chess') {
      const session = await sessionService.createSession({
        gameType: 'chess',
        hostId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        settings: { maxPlayers: 2 },
      });
      session.state = { fen: chessGame.newGameFen() };
      await session.save();
      await interaction.editReply({ content: `Chess game #${session.id} created.` });
      const full = await sessionService.getSessionWithPlayers(session.id);
      await dashboardService.postDashboard(interaction.channel, full);
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
      await interaction.editReply({
        embeds: [baseEmbed({ title: '🏆 Leaderboards', description: 'Leaderboards are coming in a future update.', color: COLORS.neutral })],
      });
      return;
    }
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed(err.message)] }).catch(() => {});
  }
}

module.exports = { handleSelect };
