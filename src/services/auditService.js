const { AuditLog } = require('../database/models');
const logger = require('../utils/logger');

async function recordAudit({ actorId, action, targetType = null, targetId = null, details = null }) {
  try {
    await AuditLog.create({ actorId, action, targetType, targetId: targetId ? String(targetId) : null, details });
  } catch (err) {
    // Auditing must never crash the feature it's observing.
    logger.error('Failed to write audit log:', err.message);
  }
}

module.exports = { recordAudit };
