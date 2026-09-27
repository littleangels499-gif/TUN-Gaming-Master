const { sequelize } = require('../index');

const User = require('./User')(sequelize);
const GameBalance = require('./GameBalance')(sequelize);
const GameTransaction = require('./GameTransaction')(sequelize);
const GameSession = require('./GameSession')(sequelize);
const GamePlayer = require('./GamePlayer')(sequelize);
const Lottery = require('./Lottery')(sequelize);
const LotteryTicket = require('./LotteryTicket')(sequelize);
const PnwLink = require('./PnwLink')(sequelize);
const SimulationNation = require('./SimulationNation')(sequelize);
const SimulationCity = require('./SimulationCity')(sequelize);
const SimulationWar = require('./SimulationWar')(sequelize);
const SimulationAttack = require('./SimulationAttack')(sequelize);
const SimulationTurn = require('./SimulationTurn')(sequelize);
const SimulationScenario = require('./SimulationScenario')(sequelize);
const SimulationScenarioPlayer = require('./SimulationScenarioPlayer')(sequelize);
const SimulationTrainingScore = require('./SimulationTrainingScore')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// ── Associations ────────────────────────────────────────────────────────

User.hasOne(GameBalance, { foreignKey: 'userId', sourceKey: 'discordId' });
User.hasOne(PnwLink, { foreignKey: 'userId', sourceKey: 'discordId' });

GameSession.hasMany(GamePlayer, { foreignKey: 'sessionId', as: 'players' });
GamePlayer.belongsTo(GameSession, { foreignKey: 'sessionId' });

Lottery.hasMany(LotteryTicket, { foreignKey: 'lotteryId', as: 'tickets' });
LotteryTicket.belongsTo(Lottery, { foreignKey: 'lotteryId' });

SimulationNation.hasMany(SimulationCity, { foreignKey: 'nationId', as: 'cityDetails' });
SimulationCity.belongsTo(SimulationNation, { foreignKey: 'nationId' });

// A scenario clone points back to the member's normal (base) nation.
SimulationNation.belongsTo(SimulationNation, { as: 'baseNation', foreignKey: 'baseNationId' });

SimulationWar.belongsTo(SimulationNation, { as: 'attacker', foreignKey: 'attackerNationId' });
SimulationWar.belongsTo(SimulationNation, { as: 'defender', foreignKey: 'defenderNationId' });
SimulationWar.hasMany(SimulationAttack, { foreignKey: 'warId', as: 'attacks' });
SimulationAttack.belongsTo(SimulationWar, { foreignKey: 'warId' });
SimulationWar.hasMany(SimulationTurn, { foreignKey: 'warId', as: 'turns' });

SimulationScenario.hasMany(SimulationScenarioPlayer, { foreignKey: 'scenarioId', as: 'participants' });
SimulationScenarioPlayer.belongsTo(SimulationScenario, { foreignKey: 'scenarioId' });
SimulationScenario.hasMany(SimulationTrainingScore, { foreignKey: 'scenarioId', as: 'scores' });

module.exports = {
  sequelize,
  User,
  GameBalance,
  GameTransaction,
  GameSession,
  GamePlayer,
  Lottery,
  LotteryTicket,
  PnwLink,
  SimulationNation,
  SimulationCity,
  SimulationWar,
  SimulationAttack,
  SimulationTurn,
  SimulationScenario,
  SimulationScenarioPlayer,
  SimulationTrainingScore,
  AuditLog,
};
