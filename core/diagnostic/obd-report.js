'use strict';

const { DiagnosticInbox } = require('./diagnostic-inbox');
const { PATHS } = require('./path-registry');

function buildReport() {
  const counts = DiagnosticInbox.countBySeverity();
  const defects = DiagnosticInbox.list();

  return {
    generatedAt: new Date().toISOString(),
    health: Math.max(0, 100 - ((counts.critical || 0) * 25) - ((counts.high || 0) * 10)),
    counts,
    monitoredChains: Object.keys(PATHS),
    defects: defects.slice(0, 20),
    summary: {
      critical: counts.critical || 0,
      warnings: (counts.medium || 0) + (counts.low || 0),
      chains: Object.keys(PATHS).length
    }
  };
}

module.exports = { buildReport };
