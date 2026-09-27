const { SlashCommandBuilder } = require('discord.js');
const lotteryManager = require('../games/lottery/lotteryManager');
const dashboardService = require('../services/dashboardService');
const { errorEmbed } = require('../utils/embeds');
const { isGameAdmin } = require('../utils/permissions');
const { LotteryTicket } = require('../database/models');
const { ensureUser } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery')
    .setDescription('TUN Lottery')
    .addSubcommand((sub) =>
      sub
        .setName('buy')
        .setDescription('Buy lottery tickets')
        .addIntegerOption((o) => o.setName('quantity').setDescription('Number of tickets').setMinValue(1).setMaxValue(100))
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the current lottery'))
    .addSubcommand((sub) => sub.setName('draw').setDescription('(Admin) Draw the winner')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'buy') {
        await ensureUser(interaction.user);
        const quantity = interaction.options.getInteger('quantity') || 1;
        const { lottery } = await lotteryManager.buyTickets(interaction.guildId, interaction.user.id, quantity);
        const ticketCount = await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } });
        const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount || 0);
        await interaction.reply({ embeds, components });
        return;
      }

      if (sub === 'status') {
        const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
        const ticketCount = await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } });
        const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount || 0);
        await interaction.reply({ embeds, components });
        return;
      }

      if (sub === 'draw') {
        if (!isGameAdmin(interaction.member)) {
          await interaction.reply({ embeds: [errorEmbed('Only a Game Administrator can draw the lottery.')], ephemeral: true });
          return;
        }
        const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
        const drawn = await lotteryManager.drawWinner(lottery.id);
        const ticketCount = await LotteryTicket.sum('quantity', { where: { lotteryId: drawn.id } });
        const { embeds } = dashboardService.renderLottery(drawn, ticketCount || 0);
        await interaction.reply({ embeds });
        return;
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
    }
  },
};
