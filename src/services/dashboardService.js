const { buildChessEmbed, buildChessComponents } = require('../ui/chessUI');
const { buildLotteryEmbed, buildLotteryComponents } = require('../ui/lotteryUI');

/** Build { embeds, components } for a session, dispatching by gameType. */
function renderSession(session) {
  if (session.gameType === 'chess') {
    const players = session.players || [];
    const white = players.find((p) => p.seat === 0);
    const black = players.find((p) => p.seat === 1);
    const whiteDisplay = white ? `<@${white.userId}>` : null;
    const blackDisplay = session.vsAI ? `AI (${session.aiDifficulty || 'easy'})` : black ? `<@${black.userId}>` : null;

    return {
      embeds: [buildChessEmbed(session, whiteDisplay, blackDisplay)],
      components: buildChessComponents(session),
    };
  }

  throw new Error(`No dashboard renderer registered for gameType "${session.gameType}".`);
}

/** Posts a brand-new dashboard message and stores its ID on the session. */
async function postDashboard(channel, session) {
  const { embeds, components } = renderSession(session);
  const message = await channel.send({ embeds, components });
  session.messageId = message.id;
  session.channelId = channel.id;
  await session.save();
  return message;
}

/** Re-renders and edits the existing dashboard message in place. */
async function updateDashboard(client, session) {
  if (!session.channelId || !session.messageId) return null;
  try {
    const channel = await client.channels.fetch(session.channelId);
    const message = await channel.messages.fetch(session.messageId);
    const { embeds, components } = renderSession(session);
    await message.edit({ embeds, components });
    return message;
  } catch (err) {
    // Message may have been deleted, or the bot lost channel access — non-fatal.
    return null;
  }
}

function renderLottery(lottery, ticketCount) {
  return {
    embeds: [buildLotteryEmbed(lottery, ticketCount)],
    components: buildLotteryComponents(lottery),
  };
}

module.exports = { renderSession, postDashboard, updateDashboard, renderLottery };
