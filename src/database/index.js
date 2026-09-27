const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

let sequelize;

if (config.database.dialect === 'postgres' && config.database.url) {
  // Only used if you deliberately opt into Postgres later (e.g. a Railway plugin).
  sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  });
} else {
  // Default path: SQLite. No server, no install, just a file on disk.
  const storagePath = path.resolve(process.cwd(), config.database.storagePath);
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
  });
}

async function connectDatabase() {
  await sequelize.authenticate();
  logger.info(`Database connected (${sequelize.getDialect()}).`);
}

async function syncDatabase({ alter = false } = {}) {
  // In an MVP, sync({alter:true}) is fine. As the schema stabilizes, switch
  // to real migrations (see src/database/migrate.js for the hook point).
  await sequelize.sync({ alter });
  logger.info('Database schema synced.');
}

module.exports = { sequelize, connectDatabase, syncDatabase };
