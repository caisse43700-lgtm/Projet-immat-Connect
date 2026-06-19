/* guardian-loop.js — SESSION 28
 * Guardian Intelligence Loop : observation → heuristiques → recommendation → validation
 * INV-GUARD-001 : toute Recommendation référence au moins une Interaction (evidence[])
 * INV-GUARD-002 : le système PROPOSE, le Gardien VALIDE — jamais automatique
 * INV-GUARD-003 : chaque heuristique est observable via OBD GUARDIAN_RECOMMENDATION_CREATED
 */
'use strict';
if (!window.__GuardianLoopV1) {
window.__GuardianLoopV1 = true;

const GuardianLoop = (function () {

  const STORAGE_KEY = 'ic_guardian_recommendations';
  const MAX_RECS    = 100;

  // ── Constantes métier ────────────────────────────────────────────────────────

  const SEVERITIES = {
    LOW:      'low',
    MEDIUM:   'medium',
    HIGH:     'high',
    CRITICAL: 'critical',
  };

  const CATEGORIES = {
    BLOCK:   'block',
    TRUST:   'trust',
    ALERT:   'alert',
    REVIEW:  'review',
    ABUSE:   'abuse',
    STATION: 'station',
    HELP:    'help',
    VEHICLE: 'vehicle',
    CALL:    'call',
    MESSAGE: 'message',
    ROAD:    'road',
    GPS:     'gps',
  };

  const REC_STATUS = {
    PENDING:  'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    APPLIED:  'applied',
    EXPIRED:  'expired',
  };

  // Seuils des heuristiques — ajustables sans changement de structure
  const HEURISTICS = {
    BLOCK_THRESHOLD:          3,
    ABUSE_THRESHOLD:          2,
    MISSED_THRESHOLD:         5,
    TRUST_THRESHOLD:          5,
    PARKED_THRESHOLD:         1,
    HELP_RESPONSE_THRESHOLD:  1,
    VEHICLE_ALERT_THRESHOLD:  1,
    MESSAGE_THRESHOLD:        3,
    ROAD_ALERT_THRESHOLD:     1,
    GPS_FIX_THRESHOLD:        3,
  };

  // ── Persistence ──────────────────────────────────────────────────────────────

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }

  function _save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_RECS))); } catch (e) {}
  }

  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function _nPlate(p) {
    return String(p || '').replace(/[\s-]/g, '').toUpperCase();
  }

  function _emitObd(eventName, data) {
    try {
      window.ImmatOrganism?.observe?.(eventName, {
        ...data,
        _src: 'ImmatConnect/GuardianLoop',
      });
    } catch (e) {}
  }

  // ── recommend() — INV-GUARD-001 : evidence[] obligatoire ────────────────────

  function recommend({ category, severity, evidence, interaction_ids, feature_id, flow_id,
                        invariant_id, plate, message, heuristic }) {
    // INV-GUARD-001 : une Recommendation sans Interaction est invalide
    if (!interaction_ids || interaction_ids.length === 0) return null;

    const rec = {
      id:              _uuid(),
      category:        category || CATEGORIES.REVIEW,
      severity:        severity || SEVERITIES.MEDIUM,
      plate:           _nPlate(plate),
      evidence:        evidence || [],
      interaction_ids: interaction_ids,
      feature_id:      feature_id  || null,
      flow_id:         flow_id     || null,
      invariant_id:    invariant_id || null,
      heuristic:       heuristic   || null,
      message:         message     || '',
      status:          REC_STATUS.PENDING,
      decision:        null,
      decision_reason: null,
      created_at:      new Date().toISOString(),
      decided_at:      null,
    };

    const list = _load();
    list.push(rec);
    _save(list);

    // INV-GUARD-003 : chaque recommendation est observable
    _emitObd('GUARDIAN_RECOMMENDATION_CREATED', {
      recommendation_id: rec.id,
      category:          rec.category,
      severity:          rec.severity,
      plate:             rec.plate,
      heuristic:         rec.heuristic,
      invariant:         rec.invariant_id,
    });
    try{if(window.ImmatBus)window.ImmatBus.emit('GUARDIAN_RECOMMENDATION_CREATED',{recommendation_id:rec.id,category:rec.category,severity:rec.severity,plate:rec.plate,heuristic:rec.heuristic})}catch(e){}

    return rec;
  }

  // ── validate() — INV-GUARD-002 : jamais automatique ─────────────────────────

  function validate(id, decision, reason) {
    if (decision !== REC_STATUS.APPROVED && decision !== REC_STATUS.REJECTED) return false;

    const list = _load();
    const rec  = list.find(r => r.id === id);
    if (!rec || rec.status !== REC_STATUS.PENDING) return false;

    rec.status          = decision;
    rec.decision        = decision;
    rec.decision_reason = reason || null;
    rec.decided_at      = new Date().toISOString();
    _save(list);

    _emitObd('GUARDIAN_RECOMMENDATION_DECIDED', {
      recommendation_id: rec.id,
      decision,
      reason: reason || null,
    });
    try{if(window.ImmatBus)window.ImmatBus.emit('GUARDIAN_RECOMMENDATION_REVIEWED',{recommendation_id:rec.id,decision,reason:reason||null})}catch(e){}

    return true;
  }

  function markApplied(id) {
    const list = _load();
    const rec  = list.find(r => r.id === id);
    if (!rec || rec.status !== REC_STATUS.APPROVED) return false;
    rec.status = REC_STATUS.APPLIED;
    _save(list);
    return true;
  }

  // ── expire() — marque expirée une recommendation périmée ────────────────────

  function expire(id) {
    const list = _load();
    const rec  = list.find(r => r.id === id);
    if (!rec || rec.status !== REC_STATUS.PENDING) return false;
    rec.status = REC_STATUS.EXPIRED;
    _save(list);
    return true;
  }

  // ── observe() — analyse les Interactions et génère les Recommendations ───────

  function observe(plate) {
    if (!window.InteractionEngine) return [];
    const p = _nPlate(plate);
    if (!p) return [];

    const result = window.InteractionEngine.getHistoryUnified(p, { limit: 100 });
    const interactions = (result && result.interactions) ? result.interactions : [];
    if (interactions.length === 0) return [];

    // Déduplique : pas deux Recommendations pending avec le même heuristic sur la même plaque
    const existingHeuristics = getPending(p).map(r => r.heuristic);
    const created = [];

    // HEURISTIC-001 — Blocages répétés (INV-COM-019)
    const blocks = interactions.filter(i => i.type === 'BLOCK');
    if (blocks.length >= HEURISTICS.BLOCK_THRESHOLD && !existingHeuristics.includes('HEURISTIC-001')) {
      const rec = recommend({
        category:       CATEGORIES.BLOCK,
        severity:       SEVERITIES.HIGH,
        plate:          p,
        evidence:       blocks.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: blocks.map(i => i.id),
        heuristic:      'HEURISTIC-001',
        flow_id:        'FLOW-BLOCK',
        invariant_id:   'INV-GUARD-001',
        message:        `${blocks.length} blocages détectés — revue recommandée`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-002 — Signalements d'abus (INV-COM-029)
    const abuses = interactions.filter(i => i.type === 'ABUSE');
    if (abuses.length >= HEURISTICS.ABUSE_THRESHOLD && !existingHeuristics.includes('HEURISTIC-002')) {
      const rec = recommend({
        category:       CATEGORIES.ABUSE,
        severity:       SEVERITIES.CRITICAL,
        plate:          p,
        evidence:       abuses.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: abuses.map(i => i.id),
        heuristic:      'HEURISTIC-002',
        flow_id:        'FLOW-ABUSE',
        invariant_id:   'INV-GUARD-001',
        message:        `${abuses.length} signalements d'abus — escalade recommandée`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-003 — Appels manqués excessifs (INV-CALL-001)
    const missed = interactions.filter(i => i.type === 'CALL_MISSED');
    if (missed.length >= HEURISTICS.MISSED_THRESHOLD && !existingHeuristics.includes('HEURISTIC-003')) {
      const rec = recommend({
        category:       CATEGORIES.REVIEW,
        severity:       SEVERITIES.MEDIUM,
        plate:          p,
        evidence:       missed.map(i => ({ type: i.type, timestamp: i.timestamp })),
        interaction_ids: missed.map(i => i.id),
        heuristic:      'HEURISTIC-003',
        flow_id:        'FLOW-008',
        invariant_id:   'INV-CALL-001',
        message:        `${missed.length} appels manqués — revue de disponibilité recommandée`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-005 — Signalement véhicule stationné reçu (INV-STATION-001)
    const parkedReports = interactions.filter(i => i.type === 'PARKED_REPORT');
    if (parkedReports.length >= HEURISTICS.PARKED_THRESHOLD && !existingHeuristics.includes('HEURISTIC-005')) {
      const rec = recommend({
        category:        CATEGORIES.STATION,
        severity:        SEVERITIES.MEDIUM,
        plate:           p,
        evidence:        parkedReports.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: parkedReports.map(i => i.id),
        heuristic:       'HEURISTIC-005',
        flow_id:         'FLOW-STATION',
        invariant_id:    'INV-STATION-001',
        message:         `${parkedReports.length} signalement(s) véhicule stationné reçu(s) — vérification recommandée`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-007 — Alertes véhicule envoyées (FLOW-VEHICLE-ALERT)
    const vehicleAlerts = interactions.filter(i => i.type === 'VEHICLE_ALERT');
    if (vehicleAlerts.length >= HEURISTICS.VEHICLE_ALERT_THRESHOLD && !existingHeuristics.includes('HEURISTIC-007')) {
      const rec = recommend({
        category:        CATEGORIES.VEHICLE,
        severity:        SEVERITIES.LOW,
        plate:           p,
        evidence:        vehicleAlerts.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: vehicleAlerts.map(i => i.id),
        heuristic:       'HEURISTIC-007',
        flow_id:         'FLOW-VEHICLE-ALERT',
        invariant_id:    'INV-COM-001',
        message:         `${vehicleAlerts.length} alerte(s) véhicule envoyée(s) — conducteur vigilant`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-006 — Aide donnée à un conducteur en difficulté (FLOW-ASSIST-RESPONSE)
    const helpResponses = interactions.filter(i => i.type === 'HELP_RESPONSE');
    if (helpResponses.length >= HEURISTICS.HELP_RESPONSE_THRESHOLD && !existingHeuristics.includes('HEURISTIC-006')) {
      const rec = recommend({
        category:        CATEGORIES.HELP,
        severity:        SEVERITIES.LOW,
        plate:           p,
        evidence:        helpResponses.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: helpResponses.map(i => i.id),
        heuristic:       'HEURISTIC-006',
        flow_id:         'FLOW-ASSIST-RESPONSE',
        invariant_id:    'INV-COM-005',
        message:         `${helpResponses.length} aide(s) proposée(s) à des conducteurs en difficulté — conducteur solidaire`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-008 — Signalements route envoyés (FLOW-ROAD-SIGNAL)
    const roadAlerts = interactions.filter(i => i.type === 'ROAD_ALERT');
    if (roadAlerts.length >= HEURISTICS.ROAD_ALERT_THRESHOLD && !existingHeuristics.includes('HEURISTIC-008')) {
      const rec = recommend({
        category:        CATEGORIES.ROAD,
        severity:        SEVERITIES.LOW,
        plate:           p,
        evidence:        roadAlerts.map(i => ({ type: i.type, timestamp: i.timestamp, target: i.target })),
        interaction_ids: roadAlerts.map(i => i.id),
        heuristic:       'HEURISTIC-008',
        flow_id:         'FLOW-ROAD-SIGNAL',
        invariant_id:    'INV-COM-011',
        message:         `${roadAlerts.length} signalement(s) route envoyé(s) — conducteur vigilant sur la route`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-009 — Conducteur GPS actif (plusieurs fixs enregistrés)
    const gpsFixes = interactions.filter(i => i.type === 'GPS_FIX');
    if (gpsFixes.length >= HEURISTICS.GPS_FIX_THRESHOLD && !existingHeuristics.includes('HEURISTIC-009')) {
      const rec = recommend({
        category:        CATEGORIES.GPS,
        severity:        SEVERITIES.LOW,
        plate:           p,
        evidence:        gpsFixes.slice(0, 3).map(i => ({ type: i.type, timestamp: i.timestamp })),
        interaction_ids: gpsFixes.slice(0, 3).map(i => i.id),
        heuristic:       'HEURISTIC-009',
        flow_id:         'FLOW-GPS-FIX',
        invariant_id:    'INV-COM-001',
        message:         `${gpsFixes.length} session(s) GPS enregistrée(s) — conducteur actif sur carte`,
      });
      if (rec) created.push(rec);
    }

    // HEURISTIC-004 — Interactions positives → confiance (INV-COM-018)
    const positive = interactions.filter(i =>
      ['THANKS', 'MESSAGE', 'HELP', 'CONTACT_ACCEPTED', 'PARKED_RESPONSE', 'HELP_RESPONSE', 'VEHICLE_ALERT', 'VEHICLE_RESPONSE', 'CALL_ACCEPTED', 'ROAD_ALERT', 'GPS_FIX'].includes(i.type)
    );
    if (positive.length >= HEURISTICS.TRUST_THRESHOLD && !existingHeuristics.includes('HEURISTIC-004')) {
      const sample = positive.slice(0, 5);
      const rec = recommend({
        category:       CATEGORIES.TRUST,
        severity:       SEVERITIES.LOW,
        plate:          p,
        evidence:       sample.map(i => ({ type: i.type, timestamp: i.timestamp })),
        interaction_ids: sample.map(i => i.id),
        heuristic:      'HEURISTIC-004',
        flow_id:        'FLOW-TRUST',
        invariant_id:   'INV-COM-018',
        message:        `${positive.length} interactions positives — niveau de confiance à considérer`,
      });
      if (rec) created.push(rec);
    }

    return created;
  }

  // ── Lecture ──────────────────────────────────────────────────────────────────

  function getPending(plate) {
    let list = _load().filter(r => r.status === REC_STATUS.PENDING);
    if (plate) {
      const p = _nPlate(plate);
      list = list.filter(r => r.plate === p);
    }
    return list;
  }

  function getAll(plate, opts) {
    const { status = null, limit = 50 } = opts || {};
    let list = _load();
    if (plate) {
      const p = _nPlate(plate);
      list = list.filter(r => r.plate === p);
    }
    if (status) list = list.filter(r => r.status === status);
    return list.slice(-limit).reverse();
  }

  function getStats(plate) {
    let list = _load();
    if (plate) {
      const p = _nPlate(plate);
      list = list.filter(r => r.plate === p);
    }
    return {
      total:       list.length,
      pending:     list.filter(r => r.status === REC_STATUS.PENDING).length,
      approved:    list.filter(r => r.status === REC_STATUS.APPROVED).length,
      rejected:    list.filter(r => r.status === REC_STATUS.REJECTED).length,
      applied:     list.filter(r => r.status === REC_STATUS.APPLIED).length,
      expired:     list.filter(r => r.status === REC_STATUS.EXPIRED).length,
      by_category: list.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {}),
      by_severity: list.reduce((acc, r) => { acc[r.severity] = (acc[r.severity] || 0) + 1; return acc; }, {}),
    };
  }

  // ── getRuntimeState — lecture seule pour OBD ────────────────────────────────

  function getRuntimeState() {
    try {
      const list = _load();
      const pending = list.filter(r => r.status === REC_STATUS.PENDING);
      const byCategory = {};
      pending.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });
      return {
        available:              true,
        pendingRecommendations: pending.length,
        totalRecommendations:   list.length,
        pendingCritical:        pending.filter(r => r.severity === SEVERITIES.CRITICAL).length,
        pendingHigh:            pending.filter(r => r.severity === SEVERITIES.HIGH).length,
        byCategory,
        lastRecommendationAt:   list.length ? list[list.length - 1].created_at : null,
        lastGuardianError:      null,
      };
    } catch (e) {
      return { available: false, error: String(e && (e.message || e)) };
    }
  }

  // ── API publique ─────────────────────────────────────────────────────────────

  return {
    recommend, validate, markApplied, expire, observe,
    getPending, getAll, getStats, getRuntimeState,
    SEVERITIES, CATEGORIES, REC_STATUS, HEURISTICS,
  };

})();

window.GuardianLoop = GuardianLoop;

// ── Auto-trigger observe() via ImmatBus ─────────────────────────────────────
// Déclenché après les événements les plus directement liés aux heuristiques.
// InteractionEngine.create() est appelé AVANT ImmatBus.emit() dans chaque module,
// donc le ledger est déjà à jour quand observe() lit les interactions.
(function _guardianBusSubscribe() {
  function _plate(payload) {
    return payload && (_nPlate(payload.from) || _nPlate(payload.plate) || _nPlate(payload.to) || _nPlate(payload.target) || '');
  }
  function _nPlate(p) { return String(p || '').replace(/[\s-]/g, '').toUpperCase(); }
  function _trigger(payload) {
    var p = _plate(payload);
    if (!p) return;
    try { window.GuardianLoop.observe(p); } catch (e) {}
  }
  function _sub() {
    var bus = window.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    // HEURISTIC-003 : appels manqués
    bus.on('CALL_MISSED',    function (e) { _trigger(e.payload); });
    // HEURISTIC-002 : abus signalés
    bus.on('ABUSE_REPORTED', function (e) { _trigger(e.payload); });
    // HEURISTIC-001 : blocages
    bus.on('BLOCK_APPLIED',  function (e) { _trigger(e.payload); });
    // HEURISTIC-004 : interactions positives (appels acceptés + messages)
    bus.on('CALL_ACCEPTED',      function (e) { _trigger(e.payload); });
    bus.on('MESSAGE_SENT',       function (e) { _trigger(e.payload); });
    bus.on('MESSAGE_RECEIVED',   function (e) { _trigger(e.payload); });
    // HEURISTIC-005 : signalements stationnés
    bus.on('PARKED_REPORT_SENT',    function (e) { _trigger(e.payload); });
    // HEURISTIC-006 : aide proposée
    bus.on('HELP_RESPONSE_SENT',    function (e) { _trigger(e.payload); });
    // HEURISTIC-007 : alertes véhicule envoyées
    bus.on('VEHICLE_REPORT_SENT',   function (e) { _trigger(e.payload); });
    bus.on('VEHICLE_RESPONSE_SENT', function (e) { _trigger(e.payload); });
    // HEURISTIC-008 : signalements route
    bus.on('ROAD_CREATED', function (e) { _trigger(e.payload); });
    // HEURISTIC-009 : GPS actif
    bus.on('GPS_LOCATED',  function (e) { _trigger(e.payload); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _sub);
  } else {
    _sub();
  }
})();
}
