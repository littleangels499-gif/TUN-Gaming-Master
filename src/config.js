// Central place that reads environment variables so the rest of the
// codebase never touches `process.env` directly. This makes it obvious
// what the bot needs to run, and makes it easy to validate on startup.
require('dotenv').config();

function required(name, { allowEmptyInDev = false } = {}) {
  const value = process.env[name];
  if (!value && !allowEmptyInDev) {
    console.warn(`[config] Warning: environment variable ${name} is not set.`);
  }
  return value || '';
}

const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID || null, // null = register globally
  },

  database: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storagePath: process.env.DB_STORAGE_PATH || './data/tun-bot.sqlite',
    url: process.env.DATABASE_URL || null,
  },

  pnw: {
    apiBase: process.env.PNW_API_BASE || 'https://api.politicsandwar.com/graphql',
  },

  roles: {
    gameAdmin: process.env.ROLE_GAME_ADMIN || null,
    simAdmin: process.env.ROLE_SIM_ADMIN || null,
    trainingInstructor: process.env.ROLE_TRAINING_INSTRUCTOR || null,
    tournamentManager: process.env.ROLE_TOURNAMENT_MANAGER || null,
    moderator: process.env.ROLE_MODERATOR || null,
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  // Gameplay constants — tweak freely, nothing else in the codebase hardcodes these.
  simulation: {
    startingTreasury: 5_000_000,
    startingFood: 50_000,
    startingSoldiers: 0,
    startingTanks: 0,
    startingAircraft: 0,
    startingShips: 0,
    startingCities: 1,
    startingInfraPerCity: 500,
    warTurnsDefault: 60, // ~5 days at 12 turns/day, matching PnW's 2-hour turn cadence conceptually
    resistanceMax: 100,
  },

  // Per-game threads (see services/gameThreadService.js)
  games: {
    threadDeleteDelaySeconds: 60,   // how long a thread lives after its game ends
    waitingTimeoutMinutes: 15,      // lobby nobody started -> cancelled
    activeIdleTimeoutMinutes: 60,   // running game with no moves -> ended
    sweepIntervalSeconds: 15,
  },

  economy: {
    startingCurrency: 500,
    dailyRewardAmount: 100,
    dailyRewardCooldownHours: 20,
  },
};

module.exports = config;
