/* core/immatOrganism.js — ImmatOrganism V1 : Phase 1 Observateur
 *
 * Noyau vivant d'ImmatConnect.
 * Phase 1 : observe, journalise, détecte. Ne bloque rien.
 *
 * Branchements actifs :
 *   - bus d'événements (ImmatBus)
 *   - validation invariants (ImmatBrain, phase 1)
 *   - journal de violations
 *
 * Usage :
 *   ImmatOrganism.init();
 *   ImmatOrganism.observe('CALL_REQUESTED', { plate, source });
 */
'use strict';

const ImmatOrganism = (function () {
  let _initialized = false;
  let _bus = null;
  let _brain = null;

  // ── Init ────────────────────────────────────────────────────────
  function init(options) {
    if (_initialized) return;
    _initialized = true;

    _bus   = (typeof ImmatBus   !== 'undefined') ? ImmatBus   : null;
    _brain = (typeof ImmatBrain !== 'undefined') ? ImmatBrain : null;

    if (_bus) {
      // Écouter toutes les violations et les journaliser
      _bus.on('INVARIANT_VIOLATED', entry => {
        _log('warn', '[INV] ' + entry.payload.invariant + ' — ' + entry.payload.label, entry.payload);
      });

      // Journal général de tous les événements (phase 1)
      _bus.on('*', entry => {
        _log('info', '[BUS] ' + entry.event, entry.payload);
      });
    }

    _log('info', 'ImmatOrganism V1 initialisé — Phase 1 Observateur', { phase: _brain?.getPhase?.() || 1 });
  }

  // ── Observation ──────────────────────────────────────────────────
  function observe(eventName, payload) {
    if (!_initialized) return;
    if (_bus) _bus.emit(eventName, payload);
  }

  // ── Validations exposées (délèguent à ImmatBrain) ────────────────

  function canRequestCall(context) {
    if (!_brain) return true;
    return _brain.canRequestCall(context);
  }

  function canDisplayVehicleOnMap(context) {
    if (!_brain) return true;
    return _brain.canDisplayVehicleOnMap(context);
  }

  function classifyEntity(entity) {
    if (!_brain) return 'unknown';
    return _brain.classifyEntity(entity);
  }

  function validateInvariant(invId, passes, context) {
    if (!_brain) return passes;
    return _brain.validateInvariant(invId, passes, context);
  }

  // ── Diagnostic OBD ──────────────────────────────────────────────
  function diagnose(query) {
    try {
      const now = Date.now();
      const FIVE_MIN = 5 * 60 * 1000;
      const journal = _bus ? _bus.getJournal() : [];

      const evFilter  = query && query.event ? String(query.event) : null;
      const sinceMs   = query && query.since != null ? Number(query.since) : null;
      const limitN    = query && query.limit != null ? Math.max(1, Number(query.limit)) : 20;

      let filtered = journal;
      if (evFilter)  filtered = filtered.filter(e => e.event === evFilter);
      if (sinceMs)   filtered = filtered.filter(e => (now - e.at) <= sinceMs);
      filtered = filtered.slice(-limitN);

      const violations = journal
        .filter(e => e.event === 'INVARIANT_VIOLATED')
        .map(e => ({
          invariant: e.payload.invariant || '?',
          label:     e.payload.label || e.payload.name || '?',
          severity:  e.payload.severity || 'unknown',
          at:        e.at,
        }));

      const recent   = violations.filter(v => (now - v.at) <= FIVE_MIN);
      const critical = recent.filter(v => v.severity === 'critical');

      const health = critical.length > 0 ? 'violated'
                   : recent.length > 0 ? 'degraded'
                   : 'ok';

      const events = filtered.map(e => ({
        event:   e.event,
        payload: _anonymize(e.payload),
        at:      e.at,
        ago:     now - e.at,
      }));

      const last = journal.length ? journal[journal.length - 1] : null;
      const summary = _summary(health, journal.length, violations.length, last, now);

      return {
        phase:       _brain ? (_brain.getPhase ? _brain.getPhase() : 1) : 1,
        initialized: _initialized,
        health,
        events,
        violations,
        summary,
      };
    } catch (e) {
      return {
        phase: 1, initialized: _initialized,
        health: 'degraded', events: [], violations: [],
        summary: 'Erreur interne diagnose() — journal inaccessible.',
      };
    }
  }

  function query(intent) {
    try {
      const what  = intent && intent.what   != null ? String(intent.what)  : 'all';
      const win   = intent && intent.window != null ? intent.window         : null;
      const limit = intent && intent.max    != null ? Number(intent.max)    : 10;

      const _winMap = { '5m': 300000, '1h': 3600000, '24h': 86400000 };
      const since = win != null
        ? (_winMap[String(win)] || (Number(win) || null))
        : null;

      const event = what === 'all'        ? null
                  : what === 'violations' ? 'INVARIANT_VIOLATED'
                  : what;

      const q = { what, event: event || 'all', since, limit };
      const result = diagnose({ event, since, limit });
      return Object.assign({}, result, { query: q });
    } catch (e) {
      return {
        phase: 1, initialized: _initialized, health: 'degraded',
        events: [], violations: [],
        summary: 'Erreur interne query().',
        query: { what: null, event: null, since: null, limit: 10 },
      };
    }
  }

  function _anonymize(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const out = {};
    for (const k of Object.keys(payload)) {
      let v = payload[k];
      if (typeof v === 'string') {
        v = v.replace(/\b[A-Z]{2}-\d{3}-[A-Z]{2}\b/g, '**-***-**');
        v = v.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uid]');
      } else if ((k === 'lat' || k === 'lng') && typeof v === 'number') {
        v = Math.round(v * 100) / 100;
      }
      out[k] = v;
    }
    return out;
  }

  function _summary(health, total, violations, last, now) {
    const h = health === 'ok' ? 'Système sain.'
            : health === 'violated' ? 'Violation critique détectée.'
            : 'Système dégradé ou en veille.';
    const ev = total + ' événement(s) en mémoire.';
    const vl = violations > 0 ? violations + ' violation(s) enregistrée(s).' : '';
    const lg = last ? 'Dernier : ' + last.event + ' (il y a ' + Math.round((now - last.at) / 1000) + 's).' : '';
    return [h, ev, vl, lg].filter(Boolean).join(' ');
  }

  // ── Journal interne ──────────────────────────────────────────────
  function _log(level, msg, data) {
    const prefix = '[ImmatOrganism]';
    try {
      if (level === 'warn') console.warn(prefix, msg, data || '');
      else console.info(prefix, msg, data || '');
    } catch (e) {}
  }

  function getJournal() {
    return _bus ? _bus.getJournal() : [];
  }

  // ── API publique ─────────────────────────────────────────────────
  return {
    init,
    observe,
    canRequestCall,
    canDisplayVehicleOnMap,
    classifyEntity,
    validateInvariant,
    getJournal,
    diagnose,
    query,
  };
})();

if (typeof window !== 'undefined') window.ImmatOrganism = ImmatOrganism;
if (typeof module !== 'undefined') module.exports = { ImmatOrganism };
