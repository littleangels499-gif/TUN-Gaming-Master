const { SlashCommandBuilder } = require('discord.js');
const { isGameAdmin, isSimAdmin } = require('../utils/permissions');
const { adjustBalance, ensureUser } = require('../utils/economy');
const { SimulationWar } = require('../database/models');
const { recordAudit } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrator controls')
    .addSubcommand((sub) =>
      sub
        .setName('give_currency')
        .setDescription('(Game Admin) Grant or remove gaming currency')
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
        .addIntegerOption((o) => o.setName('amount').setDescription('Amount (negative to remove)').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('force_end_war')
        .setDescription('(Sim Admin) Force-end an active war')
        .addIntegerOption((o) => o.setName('war_id').setDescription('War ID').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'give_currency') {
      if (!isGameAdmin(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Only a Game Administrator can do that.')], ephemeral: true });
        return;
      }
      const member = interaction.options.getUser('member');
      const amount = interaction.options.getInteger('amount');
      await ensureUser(member);
      await adjustBalance(member.id, amount, 'admin_adjustment', { by: interaction.user.id });
      await recordAudit({ actorId: interaction.user.id, action: 'economy.admin_adjustment', targetType: 'User', targetId: member.id, details: { amount } });
      await interaction.reply({ embeds: [successEmbed(`Adjusted <@${member.id}>'s balance by ${amount}.`)] });
      return;
    }

    if (sub === 'force_end_war') {
      if (!isSimAdmin(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Only a Simulation Administrator can do that.')], ephemeral: true });
        return;
      }
      const warId = interaction.options.getInteger('war_id');
      const war = await SimulationWar.findByPk(warId);
      if (!war) return interaction.reply({ embeds: [errorEmbed('War not found.')], ephemeral: true });

      war.status = 'ended_by_admin';
      war.endedAt = new Date();
      await war.save();
      await recordAudit({ actorId: interaction.user.id, action: 'war.force_end', targetType: 'SimulationWar', targetId: warId });
      await interaction.reply({ embeds: [successEmbed(`War #${warId} has been force-ended.`)] });
      return;
    }
  },
};
