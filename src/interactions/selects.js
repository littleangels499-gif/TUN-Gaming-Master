const { MessageFlags } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');
const lotteryManager = require('../games/lottery/lotteryManager');
const { LotteryTicket } = require('../database/models');
const { baseEmbed, COLORS, errorEmbed } = require('../utils/embeds');

async function handleSelect(interaction) {
  if (interaction.customId !== 'hub:select') return;

  const choice = interaction.values[0];
  const isEphemeralChoice = choice === 'war_simulator' || choice === 'leaderboards';

  // Acknowledge within Discord's 3-second window BEFORE doing any DB work.
  // Everything after this uses editReply, which has a much longer (15 min) budget.
  try {
    await interaction.deferReply(isEphemeralChoice ? { flags: MessageFlags.Ephemeral } : undefined);
  } catch (err) {
    // The interaction already expired before we could even defer (e.g. a
    // gateway hiccup delayed delivery). Nothing we can do — there is no
    // valid token left to respond with, so just stop here quietly.
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
