const sessionService = require('../services/sessionService');
const dashboardService = require('../services/dashboardService');
const chessGame = require('../games/chess/chessGame');
const { buildMoveModal } = require('../ui/chessUI');
const { buildGamingHubEmbed, buildGamingHubComponents } = require('../ui/gamingHub');
const { buildWarEmbed, buildWarComponents } = require('../ui/warDashboard');
const { errorEmbed, successEmbed, baseEmbed, COLORS } = require('../utils/embeds');
const lotteryManager = require('../games/lottery/lotteryManager');
const warSimulator = require('../simulation/warSimulator');
const { SimulationWar, SimulationNation, LotteryTicket, SimulationAttack } = require('../database/models');
const { ensureUser } = require('../utils/economy');

async function safeReplyError(interaction, message) {
  const payload = { embeds: [errorEmbed(message)], ephemeral: true };
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
  else await interaction.reply(payload);
}

async function handleButton(interaction) {
  const [namespace, action, ...rest] = interaction.customId.split(':');

  try {
    if (namespace === 'hub') return handleHubButton(interaction, action);
    if (namespace === 'chess') return handleChessButton(interaction, action, rest);
    if (namespace === 'lottery') return handleLotteryButton(interaction, action, rest);
    if (namespace === 'war') return handleWarButton(interaction, action, rest);
  } catch (err) {
    await safeReplyError(interaction, err.message);
  }
}

// ── Hub ──────────────────────────────────────────────────────────────────
async function handleHubButton(interaction, action) {
  if (action === 'chess') {
    const session = await sessionService.createSession({
      gameType: 'chess',
      hostId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      settings: { maxPlayers: 2 },
    });
    session.state = { fen: chessGame.newGameFen() };
    await session.save();
    await interaction.reply({ content: `Chess game #${session.id} created.` });
    const full = await sessionService.getSessionWithPlayers(session.id);
    await dashboardService.postDashboard(interaction.channel, full);
    return;
  }

  if (action === 'lottery') {
    const lottery = await lotteryManager.getOrCreateOpenLottery(interaction.guildId);
    const ticketCount = (await LotteryTicket.sum('quantity', { where: { lotteryId: lottery.id } })) || 0;
    const { embeds, components } = dashboardService.renderLottery(lottery, ticketCount);
    await interaction.reply({ embeds, components });
    return;
  }

  if (action === 'war') {
    await interaction.reply({
      embeds: [baseEmbed({ title: '⚔️ War Simulator', description: 'Use `/sim nation view` to see your nation, or `/sim link` to import your Politics & War nation.', color: COLORS.primary })],
      ephemeral: true,
    });
    return;
  }
}

// ── Chess ────────────────────────────────────────────────────────────────
async function handleChessButton(interaction, action, [gameId]) {
  const id = Number(gameId);

  if (action === 'join') {
    await sessionService.joinSession(id, interaction.user.id);
    const full = await sessionService.getSessionWithPlayers(id);
    await dashboardService.updateDashboard(interaction.client, full);
    await interaction.reply({ embeds: [successEmbed('You joined the game.')], ephemeral: true });
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
    await interaction.reply({ embeds: [successEmbed(allReady ? 'Both players ready — game started!' : 'You are marked ready.')], ephemeral: true });
    return;
  }

  if (action === 'cancel') {
    const session = await sessionService.getSessionWithPlayers(id);
    if (session.hostId !== interaction.user.id) {
      return safeReplyError(interaction, 'Only the host can cancel this game.');
    }
    session.status = 'cancelled';
    await session.save();
    await dashboardService.updateDashboard(interaction.client, session);
    await interaction.reply({ embeds: [successEmbed('Game cancelled.')], ephemeral: true });
    return;
  }

  if (action === 'move') {
    const modal = buildMoveModal(id);
    await interaction.showModal(modal);
    return;
  }

  if (action === 'resign') {
    const { session } = await sessionService.resign(id, interaction.user.id);
    const full = await sessionService.getSessionWithPlayers(id);
    full.result = { summary: `<@${interaction.user.id}> resigned.` };
    await full.save();
    await dashboardService.updateDashboard(interaction.client, full);
    await interaction.reply({ embeds: [successEmbed('You resigned.')], ephemeral: true });
    return;
  }

  if (action === 'rematch') {
    const rematch = await sessionService.createRematch(id);
    rematch.state = { fen: chessGame.newGameFen() };
    await rematch.save();
    await interaction.reply({ content: `Rematch created: game #${rematch.id}.` });
    const full = await sessionService.getSessionWithPlayers(rematch.id);
    await dashboardService.postDashboard(interaction.channel, full);
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
  await interaction.update({ embeds, components });
}

// ── War ──────────────────────────────────────────────────────────────────
async function handleWarButton(interaction, action, rest) {
  if (action === 'attack') {
    const [type, warId] = rest;
    const myNation = await SimulationNation.findOne({ where: { userId: interaction.user.id, scenarioId: null, isActive: true } });
    if (!myNation) return safeReplyError(interaction, 'You need a simulation nation first (`/sim nation create`).');

    const { war, outcome, actor, target } = await warSimulator.executeAttack({
      warId: Number(warId),
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
      ],
    });

    const freshWar = await SimulationWar.findByPk(war.id, { include: [{ association: 'attacker' }, { association: 'defender' }] });
    await interaction.message.edit({ embeds: [buildWarEmbed(freshWar, freshWar.attacker, freshWar.defender)], components: buildWarComponents(freshWar) });
    return;
  }

  if (action === 'details') {
    const [warId] = rest;
    const war = await SimulationWar.findByPk(Number(warId), { include: [{ association: 'attacker' }, { association: 'defender' }] });
    if (!war) return safeReplyError(interaction, 'War not found.');
    await interaction.reply({ embeds: [buildWarEmbed(war, war.attacker, war.defender)], ephemeral: true });
    return;
  }

  if (action === 'log') {
    const [warId] = rest;
    const attacks = await SimulationAttack.findAll({ where: { warId: Number(warId) }, order: [['createdAt', 'DESC']], limit: 10 });
    if (!attacks.length) return interaction.reply({ embeds: [baseEmbed({ title: '📜 Battle Log', description: 'No attacks logged yet.' })], ephemeral: true });

    const lines = attacks.map((a) => `Turn ${a.turn}: **${a.actionType}** by nation #${a.actorNationId} → ${a.result.replace(/_/g, ' ')} (resistance ${a.resistanceChange})`);
    await interaction.reply({ embeds: [baseEmbed({ title: '📜 Battle Log', description: lines.join('\n') })], ephemeral: true });
    return;
  }
}

module.exports = { handleButton };
