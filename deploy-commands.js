// Run with: node deploy-commands.js
// Registers all slash commands in src/commands/ with Discord.
//
// If DISCORD_GUILD_ID is set in .env, commands are registered to that one
// server and show up INSTANTLY — ideal while developing.
// If it's blank, commands are registered globally, which can take up to
// an hour to propagate — do this once you're ready to launch for real.

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./src/config');
const logger = require('./src/utils/logger');

async function main() {
  const commands = [];
  const commandsDir = path.join(__dirname, 'src', 'commands');
  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsDir, file));
    if (command?.data) commands.push(command.data.toJSON());
  }

  if (!config.discord.token || !config.discord.clientId) {
    logger.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env before deploying commands.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    const route = config.discord.guildId
      ? Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
      : Routes.applicationCommands(config.discord.clientId);

    const data = await rest.put(route, { body: commands });
    logger.info(`Successfully registered ${data.length} slash command(s)${config.discord.guildId ? ' (guild-scoped, instant)' : ' (global, may take up to 1 hour)'}.`);
  } catch (err) {
    logger.error('Failed to register commands:', err);
    process.exit(1);
  }
}

main();
