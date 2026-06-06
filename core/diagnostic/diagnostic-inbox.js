'use strict';

function createDiagnosticInbox(options = {}) {
  const maxItems = Number(options.maxItems || 200);
  const items = [];

  function add(defect) {
    if (!defect) return null;
    const item = Object.freeze({
      id: defect.id || ('DIAG-' + String(items.length + 1).padStart(3, '0')),
      severity: defect.severity || 'medium',
      category: defect.category || 'system',
      title: defect.title || 'Defaut systeme detecte',
      symptom: defect.symptom || defect.title || 'Symptome non renseigne',
      source: defect.source || 'source inconnue',
      chain: defect.chain || defect.path || 'chaine non renseignee',
      firstBrokenStep: defect.firstBrokenStep || null,
      lastKnownGood: defect.lastKnownGood || null,
      impact: defect.impact || 'impact a qualifier',
      recommendation: defect.recommendation || 'auditer avant correction',
      evidence: defect.evidence || null,
      action: defect.action || null,
      at: defect.at || Date.now(),
    });
    items.unshift(item);
    if (items.length > maxItems) items.length = maxItems;
    return item;
  }

  function list(filter = {}) {
    return items.filter(item => {
      if (filter.severity && item.severity !== filter.severity) return false;
      if (filter.category && item.category !== filter.category) return false;
      return true;
    });
  }

  function clear() {
    items.length = 0;
  }

  function countBySeverity() {
    return items.reduce((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    }, {});
  }

  function hasCritical() {
    return items.some(item => item.severity === 'critical');
  }

  return { add, list, clear, countBySeverity, hasCritical };
}

const DiagnosticInbox = createDiagnosticInbox();

module.exports = { createDiagnosticInbox, DiagnosticInbox };
