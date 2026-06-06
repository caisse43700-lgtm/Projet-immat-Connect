'use strict';

const { DiagnosticInbox } = require('./diagnostic-inbox');

function buildHealth(counts) {
  const critical = counts.critical || 0;
  const high = counts.high || 0;
  let score = 100 - (critical * 25) - (high * 10);
  if (score < 0) score = 0;
  return score;
}

function openGateway() {
  const counts = DiagnosticInbox.countBySeverity();

  return {
    gateway: 'claude-obd',
    connected: true,
    health: buildHealth(counts),
    counts,
    defects: DiagnosticInbox.list().slice(0, 20),
    actions: [
      'view_defects',
      'view_evidence',
      'run_autotests',
      'audit_invariants'
    ]
  };
}

module.exports = { openGateway };
