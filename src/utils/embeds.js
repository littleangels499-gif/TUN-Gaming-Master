const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x2b6cb0,
  success: 0x2f855a,
  danger: 0xc53030,
  warning: 0xd69e2e,
  neutral: 0x4a5568,
};

function baseEmbed({ title, description, color = COLORS.primary, footer } = {}) {
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

function errorEmbed(message) {
  return baseEmbed({ title: '⚠️ Something went wrong', description: message, color: COLORS.danger });
}

function successEmbed(message) {
  return baseEmbed({ description: `✅ ${message}`, color: COLORS.success });
}

module.exports = { COLORS, baseEmbed, errorEmbed, successEmbed };
