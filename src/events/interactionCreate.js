const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embeds');
const { handleButton } = require('../interactions/buttons');
const { handleSelect } = require('../interactions/selects');
const { handleModal } = require('../interactions/modals');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Unknown command: ${interaction.commandName}`);
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await handleModal(interaction);
        return;
      }
    } catch (err) {
      logger.error('Unhandled interaction error:', err);
      const payload = { embeds: [errorEmbed('An unexpected error occurred. This has been logged.')], ephemeral: true };
      try {
        if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch (nestedErr) {
        logger.error('Failed to send error reply:', nestedErr);
      }
    }
  },
};
