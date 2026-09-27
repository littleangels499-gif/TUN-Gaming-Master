// This MVP uses Sequelize's sync({ alter: true }) instead of hand-written
// migrations, which is fine while the schema is still evolving. Once things
// stabilize, replace this with real migrations (sequelize-cli or umzug) so
// production data is never at risk from an automatic `alter`.

const { connectDatabase, syncDatabase } = require('./index');
require('./models');
const logger = require('../utils/logger');

async function main() {
  await connectDatabase();
  await syncDatabase({ alter: true });
  logger.info('Migration (schema sync) complete.');
  process.exit(0);
}

main().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
