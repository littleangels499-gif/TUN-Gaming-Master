const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');

function buildLotteryEmbed(lottery, ticketCount) {
  const lines = [
    `🎟️ Ticket price: **${lottery.ticketPrice}** coins`,
    `💰 Current prize pool: **${lottery.prizePool}** coins`,
    `🎫 Tickets sold: **${ticketCount}**`,
  ];

  if (lottery.status === 'drawn') {
    lines.push('', `🏆 Winner: <@${lottery.winnerUserId}>`);
  }

  return baseEmbed({
    title: '🎟️ TUN Lottery',
    description: lines.join('\n'),
    color: lottery.status === 'open' ? COLORS.primary : COLORS.neutral,
    footer: `Lottery #${lottery.id}`,
  });
}

function buildLotteryComponents(lottery) {
  if (lottery.status !== 'open') return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`lottery:buy:1:${lottery.id}`).setLabel('Buy 1 Ticket').setEmoji('🎟️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`lottery:buy:5:${lottery.id}`).setLabel('Buy 5 Tickets').setEmoji('🎟️').setStyle(ButtonStyle.Primary),
    ),
  ];
}

module.exports = { buildLotteryEmbed, buildLotteryComponents };
