const { SlashCommandBuilder } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Controls that work for any game session (slash-command parity for buttons)')
    .addSubcommand((sub) =>
      sub.setName('join').setDescription('Join a game').addIntegerOption((o) => o.setName('game_id').setDescription('Game ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('leave').setDescription('Leave a game').addIntegerOption((o) => o.setName('game_id').setDescription('Game ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription("Show a game's current status").addIntegerOption((o) => o.setName('game_id').setDescription('Game ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('rematch').setDescription('Start a rematch of a finished game').addIntegerOption((o) => o.setName('game_id').setDescription('Game ID').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gameId = interaction.options.getInteger('game_id');

    try {
      if (sub === 'join') {
        const session = await sessionService.joinSession(gameId, interaction.user.id);
        const full = await sessionService.getSessionWithPlayers(session.id);
        await dashboardService.updateDashboard(interaction.client, full);
        await interaction.reply({ embeds: [successEmbed(`You joined game #${gameId}.`)], ephemeral: true });
        return;
      }

      if (sub === 'leave') {
        await sessionService.leaveSession(gameId, interaction.user.id);
        const full = await sessionService.getSessionWithPlayers(gameId);
        await dashboardService.updateDashboard(interaction.client, full);
        await interaction.reply({ embeds: [successEmbed(`You left game #${gameId}.`)], ephemeral: true });
        return;
      }

      if (sub === 'status') {
        const full = await sessionService.getSessionWithPlayers(gameId);
        if (!full) return interaction.reply({ embeds: [errorEmbed('Game not found.')], ephemeral: true });
        const { embeds, components } = dashboardService.renderSession(full);
        await interaction.reply({ embeds, components, ephemeral: true });
        return;
      }

      if (sub === 'rematch') {
        const rematch = await sessionService.createRematch(gameId);
        await interaction.reply({ content: `Rematch created: game #${rematch.id}.` });
        const full = await sessionService.getSessionWithPlayers(rematch.id);
        await dashboardService.postDashboard(interaction.channel, full);
        return;
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
    }
  },
};
