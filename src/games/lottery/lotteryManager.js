const { Lottery, LotteryTicket } = require('../../database/models');
const { adjustBalance } = require('../../utils/economy');

async function getOrCreateOpenLottery(guildId, ticketPrice = 25) {
  let lottery = await Lottery.findOne({ where: { guildId, status: 'open' } });
  if (!lottery) {
    lottery = await Lottery.create({ guildId, ticketPrice, prizePool: 0 });
  }
  return lottery;
}

async function buyTickets(guildId, userId, quantity = 1) {
  if (quantity < 1) throw new Error('Quantity must be at least 1.');

  const lottery = await getOrCreateOpenLottery(guildId);
  const cost = lottery.ticketPrice * quantity;

  await adjustBalance(userId, -cost, 'lottery_ticket', { lotteryId: lottery.id, quantity });

  await LotteryTicket.create({ lotteryId: lottery.id, userId, quantity });

  lottery.prizePool += cost;
  await lottery.save();

  return { lottery, cost };
}

async function drawWinner(lotteryId) {
  const lottery = await Lottery.findByPk(lotteryId, { include: [{ association: 'tickets' }] });
  if (!lottery) throw new Error('Lottery not found.');
  if (lottery.status !== 'open') throw new Error('This lottery has already been drawn or cancelled.');

  const tickets = lottery.tickets;
  if (!tickets.length) throw new Error('No tickets have been sold for this lottery yet.');

  // Weighted random draw: build a flat pool where each ticket quantity counts.
  const pool = [];
  for (const t of tickets) {
    for (let i = 0; i < t.quantity; i++) pool.push(t.userId);
  }
  const winnerUserId = pool[Math.floor(Math.random() * pool.length)];

  lottery.status = 'drawn';
  lottery.winnerUserId = winnerUserId;
  lottery.drawnAt = new Date();
  await lottery.save();

  await adjustBalance(winnerUserId, lottery.prizePool, 'lottery_winnings', { lotteryId: lottery.id });

  return lottery;
}

module.exports = { getOrCreateOpenLottery, buyTickets, drawWinner };
