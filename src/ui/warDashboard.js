const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

function buildWarEmbed(war, attackerNation, defenderNation) {
  const description = [
    `**${attackerNation.name}** vs **${defenderNation.name}**`,
    '',
    `🟢 Soldiers: ${fmt(attackerNation.soldiers)} | Tanks: ${fmt(attackerNation.tanks)} | Aircraft: ${fmt(attackerNation.aircraft)} | Ships: ${fmt(attackerNation.ships)}`,
    `🔴 Soldiers: ${fmt(defenderNation.soldiers)} | Tanks: ${fmt(defenderNation.tanks)} | Aircraft: ${fmt(defenderNation.aircraft)} | Ships: ${fmt(defenderNation.ships)}`,
    '',
    `Resistance: ${attackerNation.resistance.toFixed(0)}% vs ${defenderNation.resistance.toFixed(0)}%`,
    `Turns Remaining: ${war.turnsRemaining}`,
    `War Type: ${war.warType}`,
  ].join('\n');

  return baseEmbed({
    title: `⚔️ WAR #${war.id}`,
    description,
    color: war.status === 'active' ? COLORS.danger : COLORS.neutral,
    footer: war.status === 'active' ? 'Active war' : `Ended: ${war.status}`,
  });
}

function buildWarComponents(war, { nukesEnabled = false } = {}) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`war:attack:ground:${war.id}`).setLabel('Ground Attack').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`war:attack:air:${war.id}`).setLabel('Air Attack').setEmoji('✈️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`war:attack:naval:${war.id}`).setLabel('Naval Attack').setEmoji('🚢').setStyle(ButtonStyle.Primary),
  );

  const secondRowButtons = [
    new ButtonBuilder().setCustomId(`war:attack:missile:${war.id}`).setLabel('Missile').setEmoji('☢️').setStyle(ButtonStyle.Danger),
  ];
  if (nukesEnabled) {
    secondRowButtons.push(
      new ButtonBuilder().setCustomId(`war:attack:nuke:${war.id}`).setLabel('Nuke').setEmoji('☢️').setStyle(ButtonStyle.Danger)
    );
  }
  secondRowButtons.push(
    new ButtonBuilder().setCustomId(`war:details:${war.id}`).setLabel('War Details').setEmoji('📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`war:log:${war.id}`).setLabel('Battle Log').setEmoji('📜').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(...secondRowButtons.slice(0, 5));

  if (war.status !== 'active') {
    return [];
  }
  return [row1, row2];
}

module.exports = { buildWarEmbed, buildWarComponents };
