'use strict';

function trace(defect = {}) {
  const chain = defect.chain || defect.path || 'unknown';

  return {
    chain,
    symptom: defect.symptom || defect.title || 'Symptome inconnu',
    firstBrokenStep: defect.firstBrokenStep || defect.source || 'non localise',
    lastKnownGood: defect.lastKnownGood || null,
    probableSource: defect.source || 'source inconnue',
    confidence: defect.confidence || 0.5,
    recommendation: defect.recommendation || 'Auditer la chaine complete',
    evidence: defect.evidence || null,
  };
}

function enrich(defect) {
  return Object.assign({}, defect, {
    trace: trace(defect)
  });
}

module.exports = { trace, enrich };
