/* core/behavior-pulse.js — ImmatConnect BehaviorPulse v1
 *
 * Ce qu'aucun ingénieur ne fait car trop susceptible :
 * admettre que son propre système est parfois trop bruyant.
 *
 * Mesure la charge cognitive du conducteur à partir de micro-patterns
 * d'interaction (rythme des taps, variance inter-tap, actions abandonnées,
 * torpeur en conduite active) — 100 % local, zéro token, zéro réseau.
 *
 * Inversion fondamentale : plus le conducteur est surchargé,
 * plus le système se tait. Un seul signal passe. Les autres attendent.
 *
 * Publie : S._behaviorPulse  { cognitiveLoad (0–10), state, tapRate, abandonRate, torpor }
 * Émet   : BEHAVIOR_PULSE_UPDATE sur ImmatBus
 */
'use strict';
if (window.__BehaviorPulseV1) { /* déjà chargé */ } else {
window.__BehaviorPulseV1 = true;

const BehaviorPulse = (function () {

  const TICK_MS    = 30_000;   // analyse toutes les 30 s
  const WINDOW_MS  = 60_000;   // fenêtre glissante : 1 min
  const MAX_TAPS   = 200;
  const TORPOR_MS  = 5 * 60_000; // conduite sans interaction = signal

  let _timer    = null;
  let _running  = false;

  let _taps     = [];   // [{at}]
  let _actions  = [];   // [{at, type, dwell, completed}]
  let _lastOpen = {};   // type → at

  // ── Listeners DOM (passthrough — ne bloque rien) ──────────────────────

  function _onTap() {
    _taps.push({ at: Date.now() });
    if (_taps.length > MAX_TAPS) _taps.shift();
  }

  function _onOpen(type) {
    _lastOpen[type] = Date.now();
  }

  function _onClose(type) {
    const openedAt = _lastOpen[type];
    if (!openedAt) return;
    const dwell = Date.now() - openedAt;
    _actions.push({ at: Date.now(), type, dwell, completed: dwell > 2000 });
    if (_actions.length > 60) _actions.shift();
    delete _lastOpen[type];
  }

  // ── Calcul de la charge cognitive ─────────────────────────────────────

  function _compute() {
    const now    = Date.now();
    const cutoff = now - WINDOW_MS;

    const recentTaps = _taps.filter(t => t.at > cutoff);
    const recentActs = _actions.filter(a => a.at > cutoff);

    let load = 0;

    // Signal 1 — rythme de taps (taps/min) : > 30/min = agitation
    const tapRate = recentTaps.length; // fenêtre = 1 min donc déjà en taps/min
    if (tapRate > 30) load += 3;
    else if (tapRate > 15) load += 1;

    // Signal 2 — variance inter-tap : tap erratiques = stress
    if (recentTaps.length >= 4) {
      const ivs = [];
      for (let i = 1; i < recentTaps.length; i++) {
        ivs.push(recentTaps[i].at - recentTaps[i - 1].at);
      }
      const mean = ivs.reduce((s, v) => s + v, 0) / ivs.length;
      const stdDev = Math.sqrt(ivs.reduce((s, v) => s + (v - mean) ** 2, 0) / ivs.length);
      if (stdDev > 3000) load += 2;
      else if (stdDev > 1500) load += 1;
    }

    // Signal 3 — taux d'actions abandonnées (ouverture + fermeture < 2s)
    const abandonRate = recentActs.length
      ? recentActs.filter(a => !a.completed).length / recentActs.length
      : 0;
    if (abandonRate > 0.5) load += 3;
    else if (abandonRate > 0.25) load += 1;

    // Signal 4 — torpeur : conduite active mais aucun tap depuis 5 min
    const S = window.S || {};
    const isDriving = !!(S._brainState?.isDriving);
    let torpor = false;
    if (isDriving && _taps.length > 0) {
      const lastTapAge = now - _taps[_taps.length - 1].at;
      if (lastTapAge > TORPOR_MS) { torpor = true; load += 2; }
    }

    const cognitiveLoad = Math.min(10, load);
    const state = cognitiveLoad >= 7 ? 'overwhelmed'
                : cognitiveLoad >= 4 ? 'elevated'
                : 'calm';

    return { cognitiveLoad, state, tapRate, abandonRate: Math.round(abandonRate * 100) / 100, torpor };
  }

  // ── Tick principal ─────────────────────────────────────────────────────

  function _tick() {
    try {
      const result = _compute();
      if (window.S) window.S._behaviorPulse = result;

      try { window.ImmatBus?.emit?.('BEHAVIOR_PULSE_UPDATE', { ...result, _src: 'BehaviorPulse' }); } catch (_) {}

      // Torpeur en conduite : voix douce uniquement — pas de toast (il serait ignoré)
      if (result.torpor) {
        try { if (typeof speak === 'function' && window.S?.voice) speak('Tout va bien ?', false); } catch (_) {}
      }
    } catch (e) {
      try { window.ImmatBus?.emit?.('INVARIANT_WARNING', { inv: 'PULSE-001', msg: e?.message, _src: 'BehaviorPulse' }); } catch (_) {}
    }
  }

  // ── Hooks ImmatBus pour actions panel ─────────────────────────────────

  function _subBus() {
    const bus = window.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    bus.on('ANGE_OPENED',   () => _onOpen('ange'));
    bus.on('ANGE_CLOSED',   () => _onClose('ange'));
    bus.on('REPORT_OPENED', () => _onOpen('report'));
    bus.on('REPORT_CLOSED', () => _onClose('report'));
  }

  // ── API publique ───────────────────────────────────────────────────────

  function start() {
    if (_running) return;
    _running = true;
    document.addEventListener('touchstart', _onTap, { passive: true, capture: true });
    document.addEventListener('click',      _onTap, { passive: true, capture: true });
    _subBus();
    _tick();
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
    document.removeEventListener('touchstart', _onTap, { capture: true });
    document.removeEventListener('click',      _onTap, { capture: true });
  }

  function getCognitiveLoad() { return window.S?._behaviorPulse?.cognitiveLoad ?? 0; }
  function getState()         { return window.S?._behaviorPulse?.state ?? 'calm'; }

  return { start, stop, getCognitiveLoad, getState };

})();

if (typeof window !== 'undefined') window.BehaviorPulse = BehaviorPulse;
} // __BehaviorPulseV1
