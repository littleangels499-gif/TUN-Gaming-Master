const hubPanelService = require('../services/hubPanelService');

module.exports = {
  name: 'messageCreate',
  execute(message) {
    // Cheap no-op for every channel that doesn't have a sticky hub panel —
    // see hubPanelService for the actual (debounced) reposition logic.
    hubPanelService.handleChannelActivity(message);
  },
};
