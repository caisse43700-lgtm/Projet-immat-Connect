'use strict';

const { DiagnosticInbox } = require('./diagnostic-inbox');

function createDiagnosticAdapter(options = {}) {
  const inbox = options.inbox || DiagnosticInbox;

  function adapt(eventName, payload = {}) {
    switch (eventName) {
      case 'INVARIANT_VIOLATED':
        return inbox.add({
          severity: payload.severity || 'high',
          category: 'invariant',
          title: payload.label || payload.invariant || 'Invariant viole',
          symptom: 'Violation d invariant',
          source: payload.invariant,
          chain: 'ImmatBrain -> Invariant -> Bus',
          evidence: payload,
          recommendation: 'Auditer la regle avant correction'
        });

      case 'INVARIANT_WARNING':
        return inbox.add({
          severity: 'medium',
          category: 'warning',
          title: payload.label || 'Avertissement invariant',
          source: payload.invariant,
          chain: 'ImmatBrain -> Warning',
          evidence: payload
        });

      case 'TEST_FAILED':
        return inbox.add({
          severity: 'high',
          category: 'test',
          title: payload.test || 'Test en echec',
          source: payload.test,
          chain: payload.chain || 'tests.js',
          evidence: payload,
          recommendation: 'Reproduire puis remonter a la source'
        });

      default:
        return null;
    }
  }

  return { adapt };
}

module.exports = { createDiagnosticAdapter };
