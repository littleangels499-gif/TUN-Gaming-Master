const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');
const { SIZE, TOTAL_CELLS, calculatePayout } = require('../games/minesweeper/minesweeperGame');

const NUMBER_EMOJI = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

function buildMinesweeperEmbed(session) {
  const { mineCount, bet, gameOver, won } = session.state;
  const lines = [
    `💣 Mines: **${mineCount}** / ${TOTAL_CELLS} cells`,
    bet ? `🪙 Bet: **${bet}** coins (win pays **${calculatePayout(bet, mineCount)}**)` : '🪙 No bet — just for fun.',
  ];

  if (gameOver) {
    lines.push('', won ? `🎉 **You cleared the board!**${bet ? ` You won **${calculatePayout(bet, mineCount)}** coins.` : ''}` : `💥 **Boom.** You hit a mine.${bet ? ` You lost your **${bet}** coin bet.` : ''}`);
  } else {
    lines.push('', 'Click a tile to reveal it. Avoid the mines!');
  }

  return baseEmbed({
    title: '🟪 Minesweeper',
    description: lines.join('\n'),
    color: gameOver ? (won ? COLORS.success : COLORS.danger) : COLORS.primary,
    footer: `Game #${session.id}`,
  });
}

function buildMinesweeperComponents(session) {
  const { grid, revealed, gameOver } = session.state;
  const rows = [];

  for (let r = 0; r < SIZE; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      const isRevealed = revealed[i];
      const cell = grid ? grid[i] : null;

      let label = '⬜';
      let style = ButtonStyle.Secondary;

      if (isRevealed && cell) {
        if (cell.mine) {
          label = '💣';
          style = ButtonStyle.Danger;
        } else {
          label = NUMBER_EMOJI[cell.adjacent];
          style = ButtonStyle.Success;
        }
      } else if (gameOver && cell?.mine) {
        // Reveal all mines once the game ends, even ones the player didn't click.
        label = '💣';
        style = ButtonStyle.Danger;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mine:cell:${session.id}:${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(Boolean(isRevealed) || gameOver)
      );
    }
    rows.push(row);
  }
  return rows;
}

module.exports = { buildMinesweeperEmbed, buildMinesweeperComponents };
