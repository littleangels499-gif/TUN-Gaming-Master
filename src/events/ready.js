const logger = require('../utils/logger');

module.exports = {
  name: ['clientReady', 'ready'],
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}. Serving ${client.guilds.cache.size} guild(s).`);
    client.user.setActivity('TUN Gaming & Simulation Platform | /hub');
    require('../services/gameThreadService').startSweeper(client);
  },
};
