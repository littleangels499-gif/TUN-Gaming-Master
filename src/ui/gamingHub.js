const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');

// The single entry point described in spec section 6: one Gaming Hub embed
// the member opens, then picks an activity via select menu or buttons.
// Everything here has an equivalent slash command (see commands/*.js) so
// the platform stays fully usable without buttons.

function buildGamingHubEmbed() {
  return baseEmbed({
    title: '🎮 TUN GAMING HUB',
    description: [
      'Choose an activity below, or use the equivalent slash command any time.',
      '',
      '**Games:** ♟️ Chess • 🟪 Minesweeper • 🎟️ Lottery • 🎁 Daily Coins',
      '**Simulation:** ⚔️ War Simulator',
      '**Info:** 🏆 Leaderboards',
      '',
      '_More games are added as modules — nothing here needs to be relearned._',
    ].join('\n'),
    color: COLORS.primary,
    footer: 'TUN Gaming & Simulation Platform',
  });
}

function buildGamingHubComponents() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('hub:select')
    .setPlaceholder('Choose an activity...')
    .addOptions(
      { label: 'Chess', value: 'chess', emoji: '♟️', description: 'Play chess vs a friend or the AI' },
      { label: 'Lottery', value: 'lottery', emoji: '🎟️', description: 'Buy tickets, see the current pool' },
      { label: 'Minesweeper', value: 'minesweeper', emoji: '🟪', description: 'Clear a 5x5 board, optionally for coins' },
      { label: 'Daily Coins', value: 'daily', emoji: '🎁', description: 'Claim your free daily coins' },
      { label: 'War Simulator', value: 'war_simulator', emoji: '⚔️', description: 'Manage your simulated nation' },
      { label: 'Leaderboards', value: 'leaderboards', emoji: '🏆', description: 'See top players' },
    );

  const row1 = new ActionRowBuilder().addComponents(select);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hub:chess').setLabel('Chess').setEmoji('♟️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hub:lottery').setLabel('Lottery').setEmoji('🎟️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hub:war').setLabel('War Simulator').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('hub:daily').setLabel('Daily Coins').setEmoji('🎁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('hub:balance').setLabel('Balance').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

module.exports = { buildGamingHubEmbed, buildGamingHubComponents };
