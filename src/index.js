const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');

const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase, syncDatabase } = require('./database');
require('./database/models'); // registers associations before sync

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.commands = new Collection();
  const commandsDir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsDir, file));
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`Skipped loading ${file}: missing "data.name".`);
    }
  }
  logger.info(`Loaded ${client.commands.size} command(s).`);

  const eventsDir = path.join(__dirname, 'events');
  for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'))) {
    const event = require(path.join(eventsDir, file));
    const names = Array.isArray(event.name) ? event.name : [event.name];

    if (event.once) {
      // Guard against firing twice when a discord.js version emits both an
      // old and new alias for the same event (e.g. "ready" + "clientReady"
      // during discord.js's v14->v15 transition).
      let fired = false;
      for (const name of names) {
        client.once(name, (...args) => {
          if (fired) return;
          fired = true;
          event.execute(...args);
        });
      }
    } else {
      for (const name of names) {
        client.on(name, (...args) => event.execute(...args));
      }
    }
  }

  await connectDatabase();
  await syncDatabase();
  await require('./services/hubPanelService').loadCache();

  if (!config.discord.token) {
    logger.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in before starting the bot.');
    process.exit(1);
  }

  await client.login(config.discord.token);
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
