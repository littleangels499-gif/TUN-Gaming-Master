const { handleChessMove } = require('./chessHandlers');
const { errorEmbed } = require('../utils/embeds');

async function handleModal(interaction) {
  const [namespace, action, ...rest] = interaction.customId.split(':');

  try {
    if (namespace === 'chess' && action === 'move_modal') {
      const gameId = Number(rest[0]);
      const moveInput = interaction.fields.getTextInputValue('move');
      await handleChessMove(interaction, gameId, moveInput);
      return;
    }
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }
}

module.exports = { handleModal };
