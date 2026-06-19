/* core/immat-consciousness.js — ImmatConnect Consciousness v1
 *
 * La "conscience" du système : synthèse des conclusions de tous les modules.
 * Chaque module observe le monde indépendamment — ce module lit leurs CONCLUSIONS
 * et construit un WorldState unifié avec convergence, tendance, et un unique FOCUS.
 *
 * Sources lues toutes les 5 s :
 *   BrainEngine   → urgence individuelle (0–10), signaux actifs
 *   GuardianLoop  → recommandations critiques/hautes en attente
 *   SwarmEngine   → alertes collectives récentes (trackées via ImmatBus)
 *   Narrator      → résumé situationnel en français
 *   ImmatOrganism → santé du système (violations récentes)
 *
 * Sortie :
 *   S._consciousness          → snapshot injecté dans contexte Ange
 *   ImmatBus CONSCIOUSNESS_UPDATE → quand convergence ≥ 2 modules alertent
 *
 * Connexions cross-module établies ici (ponts qui n'existaient pas) :
 *   SWARM_PLATE_CONFIRMED → GuardianLoop.observe(plate)
 *   GuardianLoop CRITICAL  → tag dans S._brainOrientation pour boost urgence
 */
'use strict';
if (window.__ConsciousnessV1) { /* déjà chargé */ } else {
window.__ConsciousnessV1 = true;

const ImmatConsciousness = (function () {

  const TICK_MS        = 5_000;       // 6× plus rapide que BrainEngine
  const SWARM_FRESH_MS = 5 * 60_000; // alerte swarm valide 5 min
  const HISTORY_LEN    = 3;           // snapshots conservés pour tendance
  const CONV_THRESHOLD = 2;           // convergence ≥ 2 → CONSCIOUSNESS_UPDATE

  let _timer       = null;
  let _running     = false;
  let _history     = [];             // derniers snapshots {brain.urgency, at}
  let _swarmAlerts = [];             // [{type, at, payload}] — alimenté par ImmatBus

  // ── Lecture des conclusions de chaque module ────────────────────────────

  function _readBrain() {
    try {
      const or_ = window.BrainEngine?.getOrientation?.();
      if (!or_) return { urgency: 0, signals: [], summary: '', available: false };
      return {
        urgency:   or_.urgency || 0,
        signals:   or_.signals || [],
        summary:   or_.summary || 'Nominal',
        available: true,
      };
    } catch (_) { return { urgency: 0, signals: [], summary: '', available: false }; }
  }

  function _readGuardian() {
    try {
      const rs = window.GuardianLoop?.getRuntimeState?.();
      if (!rs?.available) return { critical: 0, high: 0, pending: 0, available: false };
      return {
        critical:  rs.pendingCritical || 0,
        high:      rs.pendingHigh     || 0,
        pending:   rs.pendingRecommendations || 0,
        available: true,
      };
    } catch (_) { return { critical: 0, high: 0, pending: 0, available: false }; }
  }

  function _readSwarm() {
    const now   = Date.now();
    const fresh = _swarmAlerts.filter(a => now - a.at < SWARM_FRESH_MS);
    _swarmAlerts = fresh; // purge auto des alertes périmées
    return {
      recent:    fresh.length,
      types:     [...new Set(fresh.map(a => a.type))],
      hasHelp:   fresh.some(a => a.type === 'SWARM_HELP_NEARBY'),
      hasDanger: fresh.some(a => a.type === 'SWARM_ROUTE_DANGER'),
      available: true,
    };
  }

  function _readNarrator() {
    try {
      const situation = window.Narrator?.getSituation?.();
      if (!situation) return { situation: null, available: false };
      return { situation, available: true };
    } catch (_) { return { situation: null, available: false }; }
  }

  function _readOrganism() {
    try {
      const d = window.ImmatOrganism?.diagnose?.({});
      if (!d) return { health: 'unknown', violations: 0, available: false };
      const recent = (d.violations || []).filter(v => Date.now() - v.at < 5 * 60_000);
      return {
        health:     d.health || 'unknown',
        violations: recent.length,
        available:  true,
      };
    } catch (_) { return { health: 'unknown', violations: 0, available: false }; }
  }

  // ── Convergence — combien de modules détectent simultanément un danger ──

  function _convergence(brain, guardian, swarm, organism) {
    let score = 0;
    const votes = [];

    if (brain.available && brain.urgency >= 5) {
      score++;
      votes.push({ module: 'brain', urgency: brain.urgency, signals: brain.signals });
    }
    if (guardian.available && (guardian.critical > 0 || guardian.high > 0)) {
      score++;
      votes.push({ module: 'guardian', critical: guardian.critical, high: guardian.high });
    }
    if (swarm.available && swarm.recent > 0) {
      score++;
      votes.push({ module: 'swarm', types: swarm.types, count: swarm.recent });
    }
    if (organism.available && organism.violations > 0) {
      score++;
      votes.push({ module: 'organism', violations: organism.violations });
    }

    return { score, votes };
  }

  // ── Tendance — urgence brain sur les HISTORY_LEN derniers snapshots ─────

  function _trend() {
    if (_history.length < 2) return 'stable';
    const first = _history[0].urgency || 0;
    const last  = _history[_history.length - 1].urgency || 0;
    if (last - first >= 2) return 'rising';
    if (first - last >= 2) return 'falling';
    return 'stable';
  }

  // ── Focus — UNE seule chose la plus importante maintenant ───────────────

  function _focus(brain, guardian, swarm, conv) {
    if (swarm.hasHelp)           return 'SWARM_HELP_NEEDED';
    if (guardian.critical > 0)   return 'GUARDIAN_CRITICAL';
    if (swarm.hasDanger)         return 'SWARM_ROUTE_DANGER';
    if (brain.urgency >= 7)      return 'HIGH_URGENCY';
    if (conv.score >= 3)         return 'MULTI_MODULE_ALERT';
    if (brain.urgency >= 5 || guardian.high > 0) return 'ELEVATED_RISK';
    if (swarm.recent > 0)        return 'SWARM_ACTIVE';
    return 'NOMINAL';
  }

  // ── Connexions cross-module (ponts que les modules ne font pas seuls) ────

  function _crossModule(brain, guardian, swarmState) {
    // 1. GuardianLoop CRITICAL → signaler à BrainEngine via S (lu au prochain tick)
    if (guardian.critical > 0 && window.S?._brainOrientation) {
      try { window.S._brainOrientation._guardianCritical = guardian.critical; } catch (_) {}
    }

    // 2. SWARM_PLATE_CONFIRMED → GuardianLoop.observe(plate)
    //    Les plaques confirmées ont été mises dans S._swarmConfirmedPlates par _onSwarmEvent
    const plates = window.S?._swarmConfirmedPlates;
    if (plates?.length) {
      plates.forEach(plate => {
        try { window.GuardianLoop?.observe?.(plate); } catch (_) {}
      });
      try { delete window.S._swarmConfirmedPlates; } catch (_) {} // consommé
    }
  }

  // ── Tick principal ──────────────────────────────────────────────────────

  function _tick() {
    try {
      const brain    = _readBrain();
      const guardian = _readGuardian();
      const swarm    = _readSwarm();
      const narrator = _readNarrator();
      const organism = _readOrganism();
      const conv     = _convergence(brain, guardian, swarm, organism);

      // Historique pour tendance
      _history.push({ urgency: brain.urgency, at: Date.now() });
      if (_history.length > HISTORY_LEN) _history.shift();

      const trend = _trend();
      const focus = _focus(brain, guardian, swarm, conv);

      const worldState = {
        at:          Date.now(),
        brain,
        guardian,
        swarm,
        narrator,
        organism,
        convergence: conv,
        trend,
        focus,
      };

      if (window.S) window.S._consciousness = worldState;

      _crossModule(brain, guardian, swarm);

      if (conv.score >= CONV_THRESHOLD) {
        try {
          window.ImmatBus?.emit?.('CONSCIOUSNESS_UPDATE', {
            convergence: conv.score,
            focus,
            trend,
            votes:       conv.votes,
            _src:        'ImmatConsciousness',
          });
        } catch (_) {}
      }
    } catch (e) {
      try { window.ImmatBus?.emit?.('INVARIANT_WARNING', { inv: 'CONSCIOUSNESS-001', msg: e?.message, _src: 'ImmatConsciousness' }); } catch (_) {}
    }
  }

  // ── Abonnement ImmatBus pour tracker les alertes Swarm ─────────────────

  function _subscribeSwarm() {
    const bus = window.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;

    const types = ['SWARM_HELP_NEARBY', 'SWARM_PLATE_CONFIRMED', 'SWARM_PARKING_CONFIRMED', 'SWARM_ROUTE_DANGER'];
    types.forEach(type => {
      bus.on(type, (entry) => {
        _swarmAlerts.push({ type, at: Date.now(), payload: entry?.payload || {} });

        // Cross-module : SWARM_PLATE_CONFIRMED → GuardianLoop au prochain tick
        if (type === 'SWARM_PLATE_CONFIRMED') {
          try {
            const plates = (entry?.payload?.plates || []).map(p => (typeof p === 'string' ? p : p.plate)).filter(Boolean);
            if (plates.length && window.S) window.S._swarmConfirmedPlates = plates;
          } catch (_) {}
        }
      });
    });
  }

  // ── API publique ────────────────────────────────────────────────────────

  function start() {
    if (_running) return;
    _running = true;
    _subscribeSwarm();
    _tick();
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function getWorldState()  { return window.S?._consciousness || null; }
  function getFocus()       { return window.S?._consciousness?.focus || 'NOMINAL'; }
  function getConvergence() { return window.S?._consciousness?.convergence?.score || 0; }

  return { start, stop, getWorldState, getFocus, getConvergence };

})();

if (typeof window !== 'undefined') window.ImmatConsciousness = ImmatConsciousness;
} // __ConsciousnessV1
