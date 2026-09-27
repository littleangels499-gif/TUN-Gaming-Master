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
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    else client.on(event.name, (...args) => event.execute(...args));
  }

  await connectDatabase();
  await syncDatabase();

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
