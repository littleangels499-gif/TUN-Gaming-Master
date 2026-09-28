const { MessageFlags } = require('discord.js');
const { handleChessMove } = require('./chessHandlers');
const { errorEmbed } = require('../utils/embeds');

async function handleModal(interaction) {
  const [namespace, action, ...rest] = interaction.customId.split(':');

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (err) {
    // Token already expired before we could acknowledge — nothing to do.
    return;
  }

  try {
    if (namespace === 'chess' && action === 'move_modal') {
      const gameId = Number(rest[0]);
      const moveInput = interaction.fields.getTextInputValue('move');
      await handleChessMove(interaction, gameId, moveInput);
      return;
    }
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed(err.message)] }).catch(() => {});
  }
}

module.exports = { handleModal };
