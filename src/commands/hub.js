const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildGamingHubEmbed, buildGamingHubComponents } = require('../ui/gamingHub');
const hubPanelService = require('../services/hubPanelService');
const { isGameAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hub')
    .setDescription('TUN Gaming Hub')
    .addSubcommand((sub) =>
      sub.setName('show').setDescription('Show the Gaming Hub privately (only you see it)')
    )
    .addSubcommand((sub) =>
      sub.setName('setup').setDescription('(Admin) Pin the Gaming Hub to the bottom of this channel')
    )
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('(Admin) Remove the pinned Gaming Hub from this channel')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'show') {
      // Ephemeral: never posts a real message, so it can't push a sticky panel up.
      await interaction.reply({
        embeds: [buildGamingHubEmbed()],
        components: buildGamingHubComponents(),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // setup / remove are admin-only
    if (!isGameAdmin(interaction.member)) {
      await interaction.reply({
        embeds: [errorEmbed('Only a Game Administrator can do that.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (sub === 'setup') {
        await hubPanelService.setupHubPanel(interaction.channel);
        await interaction.editReply({
          embeds: [successEmbed('The Gaming Hub is now pinned here. It will stay as the last message in this channel.')],
        });
        return;
      }

      if (sub === 'remove') {
        if (!hubPanelService.isPanelChannel(interaction.channelId)) {
          await interaction.editReply({ embeds: [errorEmbed('There is no pinned Gaming Hub in this channel.')] });
          return;
        }
        await hubPanelService.removeHubPanel(interaction.channel);
        await interaction.editReply({ embeds: [successEmbed('The pinned Gaming Hub was removed from this channel.')] });
        return;
      }
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] }).catch(() => {});
    }
  },
};
