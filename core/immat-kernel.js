/* core/immat-kernel.js — ImmatConnect Kernel v1
 *
 * La question que personne ne pose : de quelle fraction de mes propres données
 * puis-je me fier en ce moment précis ?
 *
 * Ce module est le substrat de fiabilité de tout le système.
 * Il ne produit pas d'alertes. Il qualifie la qualité de celles des autres.
 *
 * Surveille en continu (tick 5 s) :
 *   — fraîcheur de chaque donnée critique dans window.S
 *   — disponibilité réelle de chaque module (pas leur présence en mémoire,
 *     leur activité récente mesurable)
 *   — sommeil iOS : gap entre ticks > 2 min → résurrection détectée
 *   — démarrage à froid : 60 premières secondes → données incomplètes
 *
 * Score de fiabilité global (0–100 %) :
 *   GPS frais + Brain frais + Consciousness frais + Météo fraîche → 25 pts chacun
 *
 * Effets sur le reste du système :
 *   score < 75 % → ImmatConsciousness relève son seuil de convergence de 1
 *   score < 40 % → ImmatSoul préfixe ses insights d'une mise en garde
 *   résurrection → ImmatConsciousness et ImmatSoul flushent leur historique
 *   GPS périmé   → relance silencieuse de App.locate()
 *
 * Publie : S._reliability { score, level, degraded, cold_start, resurrection, modules }
 * Émet   : KERNEL_RESURRECTION | KERNEL_DEGRADED | KERNEL_HEALTHY
 */
'use strict';
if (window.__ImmatKernelV1) { /* déjà chargé */ } else {
window.__ImmatKernelV1 = true;

const ImmatKernel = (function () {

  const TICK_MS      = 5_000;
  const COLD_START_MS = 60_000;   // 60 s de démarrage à froid
  const SLEEP_GAP    = 2 * 60_000; // gap > 2 min entre ticks = iOS sleep détecté

  // Seuils de péremption par source de données
  const STALE = {
    gps:           2 * 60_000,   // GPS : 2 min
    brain:        65_000,        // BrainEngine : 65 s (tick 30 s, tolérance 2 cycles)
    consciousness: 15_000,       // ImmatConsciousness : 15 s (tick 5 s, tolérance 3)
    soul:         125_000,       // ImmatSoul : 125 s (tick 60 s, tolérance 2)
    weather:      20 * 60_000,   // Météo : 20 min
  };

  let _timer       = null;
  let _running     = false;
  let _startedAt   = 0;
  let _lastTickAt  = 0;
  let _resurrection = false;
  let _wasHealthy  = false;   // pour n'émettre KERNEL_HEALTHY qu'une fois

  // ── Inspection de la fraîcheur des données ──────────────────────────────

  function _inspect() {
    const now = Date.now();
    const S   = window.S || {};

    // GPS
    const gpsAge  = S.myGpsAt ? now - S.myGpsAt : null;
    const gpsOK   = gpsAge != null && gpsAge < STALE.gps;

    // BrainEngine — getState().ts est posé à chaque _observe()
    const brainTs  = window.BrainEngine?.getState?.()?.ts ?? null;
    const brainAge = brainTs ? now - brainTs : null;
    const brainOK  = brainAge != null && brainAge < STALE.brain;

    // ImmatConsciousness — S._consciousness.at posé à chaque _tick()
    const conscTs  = S._consciousness?.at ?? null;
    const conscAge = conscTs ? now - conscTs : null;
    const conscOK  = conscAge != null && conscAge < STALE.consciousness;

    // ImmatSoul — S._soul.at posé à chaque _tick()
    const soulTs   = S._soul?.at ?? null;
    const soulAge  = soulTs ? now - soulTs : null;
    const soulOK   = soulAge != null && soulAge < STALE.soul;

    // Météo — S._weatherCache.fetchedAt posé par App._getWeather()
    const wxTs     = S._weatherCache?.fetchedAt ?? null;
    const wxAge    = wxTs ? now - wxTs : null;
    const wxOK     = wxAge != null && wxAge < STALE.weather;

    return {
      gps:  { ok: gpsOK,   age: gpsAge },
      brain: { ok: brainOK, age: brainAge },
      consciousness: { ok: conscOK, age: conscAge },
      soul:  { ok: soulOK,  age: soulAge },
      weather: { ok: wxOK,  age: wxAge },
    };
  }

  // ── Score de fiabilité (0–100 %) ────────────────────────────────────────
  // 4 piliers essentiels, 25 pts chacun.
  // Soul et météo : bonus non bloquants.

  function _score(modules) {
    const pillars = [modules.gps.ok, modules.brain.ok, modules.consciousness.ok];
    const base    = pillars.filter(Boolean).length;
    const bonus   = (modules.weather.ok ? 1 : 0) + (modules.soul.ok ? 0.5 : 0);
    return Math.min(100, Math.round(base / 3 * 75 + bonus * 12.5));
  }

  // ── Auto-recovery ────────────────────────────────────────────────────────

  function _recover(modules) {
    // GPS périmé → relance silencieuse
    if (!modules.gps.ok && typeof window.App?.locate === 'function') {
      try { window.App.locate(); } catch (_) {}
    }
    // BrainEngine silencieux → tenter redémarrage
    if (!modules.brain.ok && window.BrainEngine && !window.BrainEngine._running) {
      try { window.BrainEngine.start?.(); } catch (_) {}
    }
  }

  // ── Tick principal ───────────────────────────────────────────────────────

  function _tick() {
    const now = Date.now();

    // Détection sommeil iOS
    const gap = _lastTickAt ? now - _lastTickAt : 0;
    _resurrection = gap > SLEEP_GAP && _lastTickAt > 0;
    _lastTickAt   = now;

    const coldStart = now - _startedAt < COLD_START_MS;
    const modules   = _inspect();
    const score     = _score(modules);
    const level     = score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';

    const reliability = {
      score,
      level,
      degraded:     score < 40,
      critical:     score < 25,
      cold_start:   coldStart,
      resurrection: _resurrection,
      modules,
      at: now,
    };

    if (window.S) window.S._reliability = reliability;

    // Bus events
    if (_resurrection) {
      try { window.ImmatBus?.emit?.('KERNEL_RESURRECTION', { gap_ms: gap, _src: 'ImmatKernel' }); } catch (_) {}
      // Flush historiques de tendance — les données d'avant le sommeil ne représentent plus rien
      try { if (window.ImmatConsciousness?._flushHistory) window.ImmatConsciousness._flushHistory(); } catch (_) {}
      try { if (window.ImmatSoul?._flushSnapshots)        window.ImmatSoul._flushSnapshots(); } catch (_) {}
    }

    if (reliability.degraded) {
      _wasHealthy = false;
      try { window.ImmatBus?.emit?.('KERNEL_DEGRADED', { score, level, cold_start: coldStart, _src: 'ImmatKernel' }); } catch (_) {}
    } else if (!_wasHealthy && score >= 75) {
      _wasHealthy = true;
      try { window.ImmatBus?.emit?.('KERNEL_HEALTHY', { score, _src: 'ImmatKernel' }); } catch (_) {}
    }

    _recover(modules);
  }

  // ── API publique ─────────────────────────────────────────────────────────

  function start() {
    if (_running) return;
    _running    = true;
    _startedAt  = Date.now();
    _lastTickAt = 0;
    _tick();
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function getReliability() { return window.S?._reliability || null; }
  function getScore()       { return window.S?._reliability?.score ?? 100; }
  function isHealthy()      { return (window.S?._reliability?.score ?? 0) >= 75; }
  function isColdStart()    { return !!(window.S?._reliability?.cold_start); }

  return { start, stop, getReliability, getScore, isHealthy, isColdStart };

})();

if (typeof window !== 'undefined') window.ImmatKernel = ImmatKernel;
} // __ImmatKernelV1
