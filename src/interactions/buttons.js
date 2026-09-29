const { MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessLauncher = require('../games/chess/chessLauncher');
const { buildMoveModal } = require('../ui/chessUI');
const { buildWarEmbed, buildWarComponents } = require('../ui/warDashboard');
const { errorEmbed, successEmbed, baseEmbed, COLORS } = require('../utils/embeds');
const lotteryManager = require('../games/lottery/lotteryManager');
const warSimulator = require('../simulation/warSimulator');
const { SimulationWar, SimulationNation, LotteryTicket, SimulationAttack } = require('../database/models');
const { ensureUser } = require('../utils/economy');
const { buildDailyClaimEmbed, buildBalanceEmbed } = require('../ui/economyUI');

// Actions that reply ephemerally (only the clicker sees them). Everything
// else replies publicly. Keep this in sync with the branches below.
const EPHEMERAL_ACTIONS = new Set([
  'hub:chess',
  'hub:war',
  'hub:daily',
  'hub:balance',
  'chess:ai',
  'chess:join',
  'chess:ready',
  'chess:cancel',
  'chess:resign',
  'chess:rematch',
  'war:details',
  'war:log',
]);

async function safeReplyError(interaction, message) {
  // By the time we reach here the interaction is always already acknowledged
  // (we defer before dispatching, and the one action that doesn't — chess:move
  // — has its own try/catch and never calls this). followUp posts a fresh
  // ephemeral message so we never clobber a dashboard embed that's mid-update.
  try {
    await interaction.followUp({ embeds: [errorEmbed(message)], flags: MessageFlags.Ephemeral });
  } catch (err) {
    // Token already dead (e.g. it expired before we even got to reply) —
    // there is nothing further we can do.
  }
}

async function handleButton(interaction) {
  const [namespace, action, ...rest] = interaction.customId.split(':');

  // A modal must be the FIRST response to an interaction — deferring first
  // would make showModal() impossible. Handle this one before anything else.
  if (namespace === 'chess' && action === 'move') {
    try {
      await interaction.showModal(buildMoveModal(Number(rest[0])));
    } catch (err) {
      // Interaction token already expired before we could show the modal.
    }
    return;
  }

  const isLotteryBuy = namespace === 'lottery' && action === 'buy';
  const isEphemeral = EPHEMERAL_ACTIONS.has(`${namespace}:${action}`);

  try {
    if (isLotteryBuy) {
      // Keeps editing the SAME message in place, matching the old .update() behavior.
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply(isEphemeral ? { flags: MessageFlags.Ephemeral } : undefined);
    }
  } catch (err) {
    // Discord invalidated the token before we could acknowledge (usually a
    // slow first DB hit or a gateway delay pushing us past the 3s window).
    // There is no valid interaction left to respond to — nothing more to do.
    return;
  }

  try {
    if (namespace === 'hub') { await handleHubButton(interaction, action); return; }
    if (namespace === 'chess') { await handleChessButton(interaction, action, rest); return; }
    if (namespace === 'lottery') { await handleLotteryButton(interaction, action, rest); return; }
    if (namespace === 'war') { await handleWarButton(interaction, action, rest); return; }
  } catch (err) {
    await safeReplyError(interaction, err.message);
  }
}

// ── Hub ──────────────────────────────────────────────────────────────────
async function handleHubButton(interaction, action) {
  if (action === 'daily') {
    await interaction.editReply({ embeds: [await buildDailyClaimEmbed(interaction.user)] });
    return;
  }

  if (action === 'balance') {
    await interaction.editReply({ embeds: [await buildBalanceEmbed(interaction.user)] });
    return;
  }

  if (action === 'chess') {
    const { session, thread, fallbackReason } = await chessLauncher.launchChess(interaction);
    await interaction.editReply({ content: chessLauncher.describeLaunch(session, thread, fallbackReason) });
    return;
  }

  if (action === 'lottery') {
    const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
    const ticketCount = (await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } })) || 0;
    const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount);
    await interaction.editReply({ embeds, components });
    return;
  }

  if (action === 'war') {
    await interaction.editReply({
      embeds: [baseEmbed({ title: '⚔️ War Simulator', description: 'Use `/sim nation view` to see your nation, or `/sim link` to import your Politics & War nation.', color: COLORS.primary })],
    });
    return;
  }
}

// ── Chess ────────────────────────────────────────────────────────────────
async function handleChessButton(interaction, action, [gameId]) {
  const id = Number(gameId);

  if (action === 'ai') {
    const session = await sessionService.getSessionWithPlayers(id);
    if (!session) throw new Error('Game not found.');
    if (session.hostId !== interaction.user.id) throw new Error('Only the host can switch this game to play against the AI.');
    if (session.status !== 'waiting') throw new Error('This game has already started or ended.');
    if (session.players.length > 1) throw new Error('Another player has already joined this game.');

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`chess:aisel:${id}`)
      .setPlaceholder('Choose the AI difficulty...')
      .addOptions(
        { label: 'Easy', value: 'easy', emoji: '🟢', description: 'Plays random moves' },
        { label: 'Medium', value: 'medium', emoji: '🟡', description: 'Mixes smart and random moves' },
        { label: 'Hard', value: 'hard', emoji: '🔴', description: 'Prefers captures and checks' },
      );
    await interaction.editReply({
      content: '🤖 Pick the AI difficulty. You will play White.',
      components: [new ActionRowBuilder().addComponents(menu)],
    });
    return;
  }

  if (action === 'join') {
    await sessionService.joinSession(id, interaction.user.id);
    const full = await sessionService.getSessionWithPlayers(id);
    await dashboardService.updateDashboard(interaction.client, full);
    await interaction.editReply({ embeds: [successEmbed('You joined the game.')] });
    return;
  }

  if (action === 'ready') {
    await sessionService.setReady(id, interaction.user.id, true);
    const full = await sessionService.getSessionWithPlayers(id);
    const allReady = full.players.length >= 2 && full.players.every((p) => p.isReady);
    if (allReady) {
      full.status = 'active';
      await full.save();
    }
    const reloaded = await sessionService.getSessionWithPlayers(id);
    await dashboardService.updateDashboard(interaction.client, reloaded);
    await interaction.editReply({ embeds: [successEmbed(allReady ? 'Both players ready — game started!' : 'You are marked ready.')] });
    return;
  }

  if (action === 'cancel') {
    const session = await sessionService.getSessionWithPlayers(id);
    if (session.hostId !== interaction.user.id) {
      await interaction.editReply({ embeds: [errorEmbed('Only the host can cancel this game.')] });
      return;
    }
    session.status = 'cancelled';
    await session.save();
    await dashboardService.updateDashboard(interaction.client, session);
    await interaction.editReply({ embeds: [successEmbed('Game cancelled.')] });
    return;
  }

  if (action === 'resign') {
    await sessionService.resign(id, interaction.user.id);
    const full = await sessionService.getSessionWithPlayers(id);
    full.result = { summary: `<@${interaction.user.id}> resigned.` };
    await full.save();
    await dashboardService.updateDashboard(interaction.client, full);
    await interaction.editReply({ embeds: [successEmbed('You resigned.')] });
    return;
  }

  if (action === 'rematch') {
    const { session, thread, fallbackReason } = await chessLauncher.launchChessRematch(interaction, id);
    await interaction.editReply({ content: chessLauncher.describeLaunch(session, thread, fallbackReason, 'Your rematch') });
    return;
  }
}

// ── Lottery ──────────────────────────────────────────────────────────────
async function handleLotteryButton(interaction, action, [quantity, lotteryId]) {
  if (action !== 'buy') return;
  await ensureUser(interaction.user);
  const { lottery } = await lotteryManager.buyTickets(interaction.guildId, interaction.user.id, Number(quantity));
  const ticketCount = (await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } })) || 0;
  const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount);
  await interaction.editReply({ embeds, components });
}

// ── War ──────────────────────────────────────────────────────────────────
async function handleWarButton(interaction, action, rest) {
  if (action === 'attack') {
    const [type, warId] = rest;
    const myNation = await SimulationNation.findOne({ where: { userId: interaction.user.id, scenarioId: null, isActive: true } });
    if (!myNation) {
      await interaction.editReply({ embeds: [errorEmbed('You need a simulation nation first (`/sim nation create`).')] });
      return;
    }

    const { war, outcome, actor, target } = await warSimulator.executeAttack({
      warId: Number(warId),
      actingNationId: myNation.id,
      actionType: type,
    });

    const resultText = outcome.result.replace(/_/g, ' ');
    await interaction.editReply({
      embeds: [
        baseEmbed({
          title: `${type.toUpperCase()} ATTACK — ${resultText.toUpperCase()}`,
          color: outcome.result === 'utter_failure' ? COLORS.danger : COLORS.success,
          description: `${actor.name} attacked ${target.name}.\nResistance change: ${outcome.resistanceChange}`,
        }),
      ],
    });

    const freshWar = await SimulationWar.findByPk(war.id, { include: [{ association: 'attacker' }, { association: 'defender' }] });
    await interaction.message.edit({ embeds: [buildWarEmbed(freshWar, freshWar.attacker, freshWar.defender)], components: buildWarComponents(freshWar) });
    return;
  }

  if (action === 'details') {
    const [warId] = rest;
    const war = await SimulationWar.findByPk(Number(warId), { include: [{ association: 'attacker' }, { association: 'defender' }] });
    if (!war) {
      await interaction.editReply({ embeds: [errorEmbed('War not found.')] });
      return;
    }
    await interaction.editReply({ embeds: [buildWarEmbed(war, war.attacker, war.defender)] });
    return;
  }

  if (action === 'log') {
    const [warId] = rest;
    const attacks = await SimulationAttack.findAll({ where: { warId: Number(warId) }, order: [['createdAt', 'DESC']], limit: 10 });
    if (!attacks.length) {
      await interaction.editReply({ embeds: [baseEmbed({ title: '📜 Battle Log', description: 'No attacks logged yet.' })] });
      return;
    }

    const lines = attacks.map((a) => `Turn ${a.turn}: **${a.actionType}** by nation #${a.actorNationId} → ${a.result.replace(/_/g, ' ')} (resistance ${a.resistanceChange})`);
    await interaction.editReply({ embeds: [baseEmbed({ title: '📜 Battle Log', description: lines.join('\n') })] });
    return;
  }
}

module.exports = { handleButton };
