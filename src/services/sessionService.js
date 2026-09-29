const { GameSession, GamePlayer } = require('../database/models');

// Shared logic for the unified session system (spec section 5). Individual
// games (chess, etc.) build their game-specific behavior on top of this.

async function createSession({ gameType, hostId, guildId, channelId, isPrivate = false, isSolo = false, vsAI = false, aiDifficulty = null, settings = {} }) {
  const session = await GameSession.create({
    gameType, hostId, guildId, channelId, isPrivate, isSolo, vsAI, aiDifficulty, settings,
  });
  await GamePlayer.create({ sessionId: session.id, seat: 0, userId: hostId, isReady: isSolo });
  return session;
}

async function joinSession(sessionId, userId) {
  const session = await GameSession.findByPk(sessionId, { include: [{ association: 'players' }] });
  if (!session) throw new Error('Game session not found.');
  if (session.status !== 'waiting') throw new Error('This game has already started or ended.');
  if (session.vsAI) throw new Error('This is a vs-AI game and cannot be joined by another player.');
  if (session.players.some((p) => p.userId === userId)) throw new Error('You are already in this game.');

  const maxPlayers = session.settings?.maxPlayers;
  if (maxPlayers && session.players.length >= maxPlayers) {
    throw new Error(`This game is full (max ${maxPlayers} players).`);
  }

  const allowedJoinerId = session.settings?.allowedJoinerId;
  if (allowedJoinerId && String(allowedJoinerId) !== String(userId)) {
    throw new Error('This game is private and you were not the invited opponent.');
  }

  const seat = session.players.length;
  await GamePlayer.create({ sessionId, seat, userId });
  return session;
}

async function setReady(sessionId, userId, ready = true) {
  const player = await GamePlayer.findOne({ where: { sessionId, userId } });
  if (!player) throw new Error('You are not part of this game.');
  player.isReady = ready;
  await player.save();
  return player;
}

async function leaveSession(sessionId, userId) {
  const player = await GamePlayer.findOne({ where: { sessionId, userId } });
  if (!player) throw new Error('You are not part of this game.');
  player.hasLeft = true;
  await player.save();
  return player;
}

async function resign(sessionId, userId) {
  const player = await GamePlayer.findOne({ where: { sessionId, userId } });
  if (!player) throw new Error('You are not part of this game.');
  player.hasResigned = true;
  await player.save();
  const session = await GameSession.findByPk(sessionId);
  session.status = 'finished';
  await session.save();
  return { player, session };
}

async function getSessionWithPlayers(sessionId) {
  return GameSession.findByPk(sessionId, { include: [{ association: 'players' }] });
}

async function startSession(sessionId) {
  const session = await GameSession.findByPk(sessionId);
  session.status = 'active';
  await session.save();
  return session;
}

async function finishSession(sessionId, result) {
  const session = await GameSession.findByPk(sessionId);
  session.status = 'finished';
  session.result = result;
  await session.save();
  return session;
}

/** Creates a fresh session mirroring an old one's settings — used for Rematch. */
async function createRematch(oldSessionId) {
  const old = await getSessionWithPlayers(oldSessionId);
  if (!old) throw new Error('Original game not found.');

  const rematch = await createSession({
    gameType: old.gameType,
    hostId: old.hostId,
    guildId: old.guildId,
    channelId: old.channelId,
    isPrivate: old.isPrivate,
    isSolo: old.isSolo,
    vsAI: old.vsAI,
    aiDifficulty: old.aiDifficulty,
    settings: old.settings,
  });

  for (const p of old.players) {
    if (p.userId === old.hostId) continue;
    await GamePlayer.create({ sessionId: rematch.id, seat: p.seat, userId: p.userId });
  }

  if (old.vsAI) {
    rematch.status = 'active';
    rematch.turnUserId = old.hostId;
    await rematch.save();
  }

  return rematch;
}

/** Converts a waiting, host-only game into a solo game against the AI. */
async function startVsAI(sessionId, userId, difficulty) {
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new Error('Unknown AI difficulty.');
  const session = await GameSession.findByPk(sessionId, { include: [{ association: 'players' }] });
  if (!session) throw new Error('Game session not found.');
  if (session.hostId !== userId) throw new Error('Only the host can switch this game to play against the AI.');
  if (session.status !== 'waiting') throw new Error('This game has already started or ended.');
  if (session.players.length > 1) throw new Error('Another player has already joined this game.');

  session.vsAI = true;
  session.isSolo = true;
  session.aiDifficulty = difficulty;
  session.status = 'active';
  session.turnUserId = userId;
  await session.save();
  await GamePlayer.update({ isReady: true }, { where: { sessionId, userId } });
  return session;
}

module.exports = {
  startVsAI,
  createSession,
  joinSession,
  setReady,
  leaveSession,
  resign,
  getSessionWithPlayers,
  startSession,
  finishSession,
  createRematch,
};
