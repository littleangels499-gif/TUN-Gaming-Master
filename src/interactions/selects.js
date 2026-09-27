const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');
const lotteryManager = require('../games/lottery/lotteryManager');
const { LotteryTicket } = require('../database/models');
const { baseEmbed, COLORS, errorEmbed } = require('../utils/embeds');

async function handleSelect(interaction) {
  if (interaction.customId !== 'hub:select') return;

  const choice = interaction.values[0];

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
      await interaction.reply({ content: `Chess game #${session.id} created.` });
      const full = await sessionService.getSessionWithPlayers(session.id);
      await dashboardService.postDashboard(interaction.channel, full);
      return;
    }

    if (choice === 'lottery') {
      const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
      const ticketCount = (await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } })) || 0;
      const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount);
      await interaction.reply({ embeds, components });
      return;
    }

    if (choice === 'war_simulator') {
      await interaction.reply({
        embeds: [baseEmbed({ title: '⚔️ War Simulator', description: 'Use `/sim nation view` to see your nation, or `/sim link` to import your Politics & War nation.', color: COLORS.primary })],
        ephemeral: true,
      });
      return;
    }

    if (choice === 'leaderboards') {
      await interaction.reply({
        embeds: [baseEmbed({ title: '🏆 Leaderboards', description: 'Leaderboards are coming in a future update.', color: COLORS.neutral })],
        ephemeral: true,
      });
      return;
    }
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }
}

module.exports = { handleSelect };
