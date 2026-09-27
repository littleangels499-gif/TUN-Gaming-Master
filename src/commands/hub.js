const { SlashCommandBuilder } = require('discord.js');
const { buildGamingHubEmbed, buildGamingHubComponents } = require('../ui/gamingHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hub')
    .setDescription('Open the TUN Gaming Hub'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildGamingHubEmbed()],
      components: buildGamingHubComponents(),
    });
  },
};
