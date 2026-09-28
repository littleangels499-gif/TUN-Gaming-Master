const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const nationService = require('../simulation/nationService');
const scenarioService = require('../simulation/scenarioService');
const warSimulator = require('../simulation/warSimulator');
const { SimulationWar } = require('../database/models');
const { errorEmbed, successEmbed, baseEmbed, COLORS } = require('../utils/embeds');
const { buildWarEmbed, buildWarComponents } = require('../ui/warDashboard');
const { isTrainingInstructor, isSimAdmin } = require('../utils/permissions');
const { recordAudit } = require('../services/auditService');
const dashboardService = require('../services/dashboardService');

function nationSummaryEmbed(nation) {
  const r = nation.resources;
  return baseEmbed({
    title: `🏳️ ${nation.name}`,
    color: COLORS.primary,
    description: [
      `Mode: **${nation.mode}** | Cities: **${nation.cities}** | Infra: **${nation.infrastructureTotal.toFixed(0)}**`,
      `Treasury: **${nation.treasury.toFixed(0)}**`,
      `Resources: food ${r.food} | coal ${r.coal} | oil ${r.oil} | uranium ${r.uranium} | lead ${r.lead} | iron ${r.iron} | bauxite ${r.bauxite} | gasoline ${r.gasoline} | munitions ${r.munitions} | steel ${r.steel} | aluminum ${r.aluminum}`,
      '',
      `🪖 Soldiers: **${nation.soldiers}** | 🛡️ Tanks: **${nation.tanks}** | ✈️ Aircraft: **${nation.aircraft}** | 🚢 Ships: **${nation.ships}**`,
      `☢️ Missiles: **${nation.missiles}** | ☢️ Nukes: **${nation.nukes}**`,
      `Resistance: **${nation.resistance.toFixed(0)}%** | Score: **${nation.score.toFixed(1)}**`,
    ].join('\n'),
    footer: `Simulation nation #${nation.id}`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sim')
    .setDescription('TUN War Simulator')

    .addSubcommand((sub) =>
      sub
        .setName('link')
        .setDescription('Link your real Politics & War nation (your API key is never stored)')
        .addStringOption((o) => o.setName('api_key').setDescription('Your PnW API key').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('refresh')
        .setDescription('Re-import selected attributes from your linked PnW nation (overwrites simulator values!)')
        .addStringOption((o) => o.setName('api_key').setDescription('Your PnW API key').setRequired(true))
    )

    .addSubcommandGroup((group) =>
      group
        .setName('nation')
        .setDescription('Your simulation nation')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a Sandbox nation (Sim Admins can create one for another member)')
            .addStringOption((o) => o.setName('name').setDescription('Nation name'))
            .addUserOption((o) => o.setName('member').setDescription('(Sim Admin) Create the nation for this member'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View a simulation nation')
            .addUserOption((o) => o.setName('member').setDescription('(Sim Admin) View another member\'s nation'))
        )
    )

    .addSubcommandGroup((group) =>
      group
        .setName('war')
        .setDescription('Wars')
        .addSubcommand((sub) =>
          sub
            .setName('declare')
            .setDescription('Declare war on another member\'s simulation nation')
            .addUserOption((o) => o.setName('target').setDescription('Member to declare war on').setRequired(true))
            .addStringOption((o) =>
              o.setName('war_type').setDescription('War type').addChoices(
                { name: 'Raid', value: 'raid' },
                { name: 'Ordinary', value: 'ordinary' },
                { name: 'Attrition', value: 'attrition' },
              )
            )
        )
        .addSubcommand((sub) =>
          sub.setName('view').setDescription('View an active war').addIntegerOption((o) => o.setName('war_id').setDescription('War ID').setRequired(true))
        )
    )

    .addSubcommandGroup((group) =>
      group
        .setName('attack')
        .setDescription('Attack in an active war')
        .addSubcommand((sub) =>
          sub
            .setName('launch')
            .setDescription('Launch an attack')
            .addIntegerOption((o) => o.setName('war_id').setDescription('War ID').setRequired(true))
            .addStringOption((o) =>
              o
                .setName('type')
                .setDescription('Attack type')
                .setRequired(true)
                .addChoices(
                  { name: 'Ground', value: 'ground' },
                  { name: 'Air', value: 'air' },
                  { name: 'Naval', value: 'naval' },
                  { name: 'Missile', value: 'missile' },
                  { name: 'Nuke', value: 'nuke' },
                )
            )
        )
    )

    .addSubcommandGroup((group) =>
      group
        .setName('scenario')
        .setDescription('Instructor scenario controls')
        .addSubcommand((sub) =>
          sub.setName('create').setDescription('(Instructor) Create a new scenario').addStringOption((o) => o.setName('name').setDescription('Scenario name').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('(Instructor) Add a participant to a scenario')
            .addIntegerOption((o) => o.setName('scenario_id').setDescription('Scenario ID').setRequired(true))
            .addUserOption((o) => o.setName('member').setDescription('Member to add').setRequired(true))
            .addStringOption((o) => o.setName('team').setDescription('Team label (for coalition exercises)'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('override')
            .setDescription('(Instructor) Override a numeric field on a participant\'s scenario nation')
            .addIntegerOption((o) => o.setName('scenario_id').setDescription('Scenario ID').setRequired(true))
            .addUserOption((o) => o.setName('member').setDescription('Participant').setRequired(true))
            .addStringOption((o) =>
              o
                .setName('field')
                .setDescription('Field to change')
                .setRequired(true)
                .addChoices(
                  { name: 'Cities', value: 'cities' },
                  { name: 'Infrastructure', value: 'infrastructureTotal' },
                  { name: 'Treasury (money)', value: 'treasury' },
                  { name: 'Soldiers', value: 'soldiers' },
                  { name: 'Tanks', value: 'tanks' },
                  { name: 'Aircraft', value: 'aircraft' },
                  { name: 'Ships', value: 'ships' },
                  { name: 'Missiles', value: 'missiles' },
                  { name: 'Nukes', value: 'nukes' },
                  { name: 'Resistance', value: 'resistance' },
                )
            )
            .addNumberOption((o) => o.setName('value').setDescription('New value').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('override_resource')
            .setDescription('(Instructor) Override a resource amount on a participant\'s scenario nation')
            .addIntegerOption((o) => o.setName('scenario_id').setDescription('Scenario ID').setRequired(true))
            .addUserOption((o) => o.setName('member').setDescription('Participant').setRequired(true))
            .addStringOption((o) =>
              o
                .setName('resource')
                .setDescription('Resource')
                .setRequired(true)
                .addChoices(
                  ...['food', 'coal', 'oil', 'uranium', 'lead', 'iron', 'bauxite', 'gasoline', 'munitions', 'steel', 'aluminum']
                    .map((r) => ({ name: r, value: r }))
                )
            )
            .addNumberOption((o) => o.setName('amount').setDescription('New amount').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('start').setDescription('(Instructor) Start a scenario').addIntegerOption((o) => o.setName('scenario_id').setDescription('Scenario ID').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('end').setDescription('(Instructor) End a scenario (participants revert to their normal nation)').addIntegerOption((o) => o.setName('scenario_id').setDescription('Scenario ID').setRequired(true))
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    try {
      // ── /sim link, /sim refresh ─────────────────────────────────────
      if (!group && sub === 'link') {
        const apiKey = interaction.options.getString('api_key');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const nation = await nationService.linkAndImportNation(interaction.user.id, apiKey);
        await interaction.editReply({
          embeds: [successEmbed(`Linked! Your simulation nation "**${nation.name}**" has been created from your PnW nation. Consider regenerating your API key on the PnW site now that it's been used.`)],
        });
        return;
      }

      if (!group && sub === 'refresh') {
        const apiKey = interaction.options.getString('api_key');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({
          embeds: [
            baseEmbed({
              title: '⚠️ Confirm refresh',
              color: COLORS.warning,
              description: 'This will OVERWRITE your simulator nation\'s cities, infrastructure, treasury, resources, and military with your current real PnW values. This cannot be undone. Run `/sim refresh` again within the next reply to confirm, or use `/sim nation view` to check your current simulator values first.',
            }),
          ],
        });
        // Simplified single-step confirm-by-re-running for the MVP; a full
        // implementation could use a confirm button with a short-lived token.
        const nation = await nationService.refreshNationFromPnw(interaction.user.id, apiKey);
        await interaction.followUp({ embeds: [successEmbed(`Refreshed "${nation.name}" from Politics & War.`)], flags: MessageFlags.Ephemeral });
        return;
      }

      // ── /sim nation create|view ─────────────────────────────────────
      if (group === 'nation' && sub === 'create') {
        const name = interaction.options.getString('name');
        const target = interaction.options.getUser('member');

        // Admin path: create a nation on behalf of another member.
        if (target && target.id !== interaction.user.id) {
          if (!isSimAdmin(interaction.member)) {
            await interaction.reply({ embeds: [errorEmbed('Only a Simulation Administrator can create a nation for another member.')], flags: MessageFlags.Ephemeral });
            return;
          }
          if (target.bot) {
            await interaction.reply({ embeds: [errorEmbed('Bots cannot have simulation nations.')], flags: MessageFlags.Ephemeral });
            return;
          }
          const created = await nationService.createSandboxNation(target.id, {
            name: name || `${target.username}'s Nation`,
            leaderName: target.username,
          });
          await recordAudit({
            actorId: interaction.user.id,
            action: 'nation.admin_create',
            targetType: 'SimulationNation',
            targetId: created.id,
            details: { forUserId: target.id, name: created.name },
          });
          await interaction.reply({
            content: `🛠️ <@${interaction.user.id}> created a simulation nation for <@${target.id}>.`,
            embeds: [nationSummaryEmbed(created)],
          });
          return;
        }

        const nation = await nationService.createSandboxNation(interaction.user.id, { name, leaderName: interaction.user.username });
        await interaction.reply({ embeds: [nationSummaryEmbed(nation)] });
        return;
      }

      if (group === 'nation' && sub === 'view') {
        const target = interaction.options.getUser('member') || interaction.user;
        const isSelf = target.id === interaction.user.id;

        if (!isSelf && !isSimAdmin(interaction.member)) {
          await interaction.reply({ embeds: [errorEmbed("Only a Simulation Administrator can view another member's nation.")], flags: MessageFlags.Ephemeral });
          return;
        }

        const nation = await nationService.getNormalNation(target.id);
        if (!nation) {
          const msg = isSelf
            ? "You don't have a simulation nation yet. Use `/sim nation create` or `/sim link`."
            : `<@${target.id}> has no simulation nation yet. Use \`/sim nation create member:@them\` to make one.`;
          await interaction.reply({ embeds: [errorEmbed(msg)], flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.reply({ embeds: [nationSummaryEmbed(nation)] });
        return;
      }

      // ── /sim war declare|view ───────────────────────────────────────
      if (group === 'war' && sub === 'declare') {
        const target = interaction.options.getUser('target');
        const warType = interaction.options.getString('war_type') || 'ordinary';

        const [myNation, targetNation] = await Promise.all([
          nationService.getNormalNation(interaction.user.id),
          nationService.getNormalNation(target.id),
        ]);
        if (!myNation) return interaction.reply({ embeds: [errorEmbed('You need a simulation nation first.')], flags: MessageFlags.Ephemeral });
        if (!targetNation) return interaction.reply({ embeds: [errorEmbed('That member has no simulation nation.')], flags: MessageFlags.Ephemeral });

        const war = await warSimulator.declareWar(myNation.id, targetNation.id, { warType });
        await interaction.reply({
          embeds: [buildWarEmbed(war, myNation, targetNation)],
          components: buildWarComponents(war),
        });
        return;
      }

      if (group === 'war' && sub === 'view') {
        const warId = interaction.options.getInteger('war_id');
        const war = await SimulationWar.findByPk(warId, { include: [{ association: 'attacker' }, { association: 'defender' }] });
        if (!war) return interaction.reply({ embeds: [errorEmbed('War not found.')], flags: MessageFlags.Ephemeral });
        await interaction.reply({ embeds: [buildWarEmbed(war, war.attacker, war.defender)], components: buildWarComponents(war) });
        return;
      }

      // ── /sim attack launch ───────────────────────────────────────────
      if (group === 'attack' && sub === 'launch') {
        const warId = interaction.options.getInteger('war_id');
        const type = interaction.options.getString('type');
        const myNation = await nationService.getNormalNation(interaction.user.id);
        if (!myNation) return interaction.reply({ embeds: [errorEmbed('You need a simulation nation first.')], flags: MessageFlags.Ephemeral });

        const { war, outcome, actor, target } = await warSimulator.executeAttack({
          warId,
          actingNationId: myNation.id,
          actionType: type,
        });

        const resultText = outcome.result.replace(/_/g, ' ');
        await interaction.reply({
          embeds: [
            baseEmbed({
              title: `${type.toUpperCase()} ATTACK — ${resultText.toUpperCase()}`,
              color: outcome.result === 'utter_failure' ? COLORS.danger : COLORS.success,
              description: `${actor.name} attacked ${target.name}.\nResistance change: ${outcome.resistanceChange}`,
            }),
            buildWarEmbed(war, war.attackerNationId === myNation.id ? actor : target, war.attackerNationId === myNation.id ? target : actor),
          ],
          components: buildWarComponents(war),
        });
        return;
      }

      // ── /sim scenario ... ────────────────────────────────────────────
      if (group === 'scenario') {
        if (!isTrainingInstructor(interaction.member)) {
          await interaction.reply({ embeds: [errorEmbed('Only a Training Instructor or Simulation Administrator can manage scenarios.')], flags: MessageFlags.Ephemeral });
          return;
        }

        if (sub === 'create') {
          const name = interaction.options.getString('name');
          const scenario = await scenarioService.createScenario(interaction.guildId, interaction.user.id, { name });
          await interaction.reply({ embeds: [successEmbed(`Scenario "${name}" created with ID #${scenario.id}. Use \`/sim scenario add\` to add participants.`)] });
          return;
        }

        if (sub === 'add') {
          const scenarioId = interaction.options.getInteger('scenario_id');
          const member = interaction.options.getUser('member');
          const team = interaction.options.getString('team');
          await scenarioService.addParticipant(scenarioId, member.id, { team });
          await interaction.reply({ embeds: [successEmbed(`Added <@${member.id}> to scenario #${scenarioId}.`)] });
          return;
        }

        if (sub === 'override') {
          const scenarioId = interaction.options.getInteger('scenario_id');
          const member = interaction.options.getUser('member');
          const field = interaction.options.getString('field');
          const value = interaction.options.getNumber('value');
          await scenarioService.applyOverride(scenarioId, member.id, { [field]: value }, interaction.user.id);
          await interaction.reply({ embeds: [successEmbed(`Set ${field} = ${value} for <@${member.id}> in scenario #${scenarioId}.`)], flags: MessageFlags.Ephemeral });
          return;
        }

        if (sub === 'override_resource') {
          const scenarioId = interaction.options.getInteger('scenario_id');
          const member = interaction.options.getUser('member');
          const resource = interaction.options.getString('resource');
          const amount = interaction.options.getNumber('amount');
          await scenarioService.applyResourceOverride(scenarioId, member.id, resource, amount, interaction.user.id);
          await interaction.reply({ embeds: [successEmbed(`Set ${resource} = ${amount} for <@${member.id}> in scenario #${scenarioId}.`)], flags: MessageFlags.Ephemeral });
          return;
        }

        if (sub === 'start') {
          const scenarioId = interaction.options.getInteger('scenario_id');
          await scenarioService.startScenario(scenarioId);
          await interaction.reply({ embeds: [successEmbed(`Scenario #${scenarioId} started.`)] });
          return;
        }

        if (sub === 'end') {
          const scenarioId = interaction.options.getInteger('scenario_id');
          await scenarioService.endScenario(scenarioId, interaction.user.id);
          await interaction.reply({ embeds: [successEmbed(`Scenario #${scenarioId} ended. All participants are back on their normal simulation nation.`)] });
          return;
        }
      }
    } catch (err) {
      const replyPayload = { embeds: [errorEmbed(err.message)], flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(replyPayload);
      } else {
        await interaction.reply(replyPayload);
      }
    }
  },
};
