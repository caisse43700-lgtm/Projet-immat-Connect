/* core/brain-engine.js — ImmatConnect BrainEngine v1
 * Boucle OODA (Observe→Orient→Predict→Decide→Act) — moteur cognitif du système
 * Tick toutes les 30 s — ne déclenche une action que si urgence > 5 ou prédiction haute confiance
 * Publie S._brainState / S._brainOrientation / S._brainPredictions pour Ange
 */
'use strict';
if (window.__BrainEngineV1) { /* déjà chargé */ } else {
window.__BrainEngineV1 = true;

const BrainEngine = (function () {

  const TICK_MS      = 30_000;
  const SILENCE_WARN = 5 * 60_000;   // 5 min sans événement bus = silence suspect

  let _timer   = null;
  let _running = false;
  let _prevState  = null;
  let _state      = null;
  let _orientation = null;
  let _predictions = [];
  let _tickCount  = 0;

  // ── 1. OBSERVE ────────────────────────────────────────────────────────────────
  function _observe() {
    const now   = Date.now();
    const S     = window.S || {};
    const hour  = new Date().getHours();
    const dow   = new Date().getDay();

    const lat  = S.myLat  ?? null;
    const lng  = S.myLng  ?? null;
    const gpsAge = S._lastLocateAt ? now - S._lastLocateAt : null;

    // Vitesse estimée — déplacée de S._lastSpeed si disponible, sinon null
    const speed = S._lastSpeed ?? null;

    const isDriving = speed != null ? speed > 8 : (gpsAge != null && gpsAge < 120_000 && S._locateCount > 1);

    const isNight    = hour < 6 || hour >= 21;
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

    const weather = S._weatherCache?.condition ?? null;
    const badWeather = weather === 'storm' || weather === 'showers' || weather === 'fog' || weather === 'snow';

    const riskZones   = Array.isArray(S.riskZones)   ? S.riskZones   : [];
    const alerts      = Array.isArray(S.alerts)       ? S.alerts.filter(a => a.status !== 'resolved' && a.status !== 'gone') : [];
    const nearbyCount = Array.isArray(S.nearby)       ? S.nearby.length : 0;

    // Silence bus = temps depuis dernier événement
    let silenceSince = null;
    try {
      const journal = window.ImmatBus?.getJournal?.() || [];
      if (journal.length) {
        const last = journal[journal.length - 1];
        silenceSince = now - last.at;
      }
    } catch (_) {}

    // Zone à risque la plus proche (< 3 km)
    let nearestRisk = null;
    if (lat != null && lng != null && riskZones.length) {
      for (const z of riskZones) {
        const d = _km(lat, lng, z.lat, z.lng);
        if (!nearestRisk || d < nearestRisk.dist) {
          nearestRisk = { ...z, dist: d };
        }
      }
    }

    return {
      ts: now,
      lat, lng, gpsAge, speed, isDriving,
      hour, dow, isNight, isRushHour,
      weather, badWeather,
      nearestRisk,
      riskZoneCount: riskZones.length,
      alertCount:    alerts.length,
      nearbyCount,
      silenceSince,
    };
  }

  // ── 2. ORIENT ─────────────────────────────────────────────────────────────────
  function _orient(st) {
    const signals = [];
    let urgency   = 0;

    if (st.nearestRisk && st.nearestRisk.dist < 0.5 && st.nearestRisk.risk_score > 40) {
      signals.push('RISK_ZONE_NEAR');
      urgency += 3;
    }
    if (st.nearestRisk && st.nearestRisk.dist < 1 && st.nearestRisk.risk_score > 60) {
      signals.push('HIGH_RISK_CONTEXT');
      urgency += 2;
    }
    if (st.isDriving && st.isNight && st.badWeather) {
      signals.push('NIGHT_WEATHER_DRIVING');
      urgency += 2;
    }
    if (st.isDriving && st.silenceSince != null && st.silenceSince > SILENCE_WARN) {
      signals.push('DRIVING_SILENCE');
      urgency += 2;
    }
    if (st.gpsAge != null && st.gpsAge > 5 * 60_000 && st.isDriving) {
      signals.push('STALE_GPS');
      urgency += 1;
    }
    if (st.alertCount >= 3) {
      signals.push('HIGH_ALERT_DENSITY');
      urgency += 1;
    }
    if (st.nearbyCount === 0 && st.isDriving && st.isNight) {
      signals.push('ISOLATED_DRIVER');
      urgency += 1;
    }

    return {
      signals,
      urgency: Math.min(10, urgency),
      summary: signals.length
        ? signals.join(' + ')
        : 'Situation nominale',
    };
  }

  // ── 3. PREDICT ────────────────────────────────────────────────────────────────
  function _predict(st, or_) {
    const preds = [];

    // Incident probable : zone à risque + mauvais temps + conduite
    if (or_.signals.includes('RISK_ZONE_NEAR') && st.badWeather && st.isDriving) {
      preds.push({
        type: 'INCIDENT_PROBABLE',
        confidence: 0.75,
        reason: 'Zone à risque + météo dégradée + conduite active',
      });
    }

    // Arrêt inattendu : conduite + silence bus prolongé (possible panne/accident)
    if (st.isDriving && or_.signals.includes('DRIVING_SILENCE')) {
      preds.push({
        type: 'UNEXPECTED_STOP',
        confidence: 0.60,
        reason: 'Conduite active sans activité réseau depuis ' + Math.round((st.silenceSince||0) / 60_000) + ' min',
      });
    }

    // Conducteur isolé : nuit, pas de véhicules proches, conduite
    if (or_.signals.includes('ISOLATED_DRIVER') && st.isNight) {
      preds.push({
        type: 'ISOLATED_DRIVER',
        confidence: 0.80,
        reason: 'Conduite nocturne sans véhicules proches',
      });
    }

    return preds;
  }

  // ── 4. DECIDE ─────────────────────────────────────────────────────────────────
  function _decide(st, or_, preds) {
    if (or_.urgency >= 7) {
      return { action: 'ALERT_HIGH_URGENCY', signals: or_.signals, urgency: or_.urgency };
    }
    const topPred = preds.find(p => p.confidence >= 0.7);
    if (topPred) {
      return { action: 'PREDICTIVE_WARNING', prediction: topPred, urgency: or_.urgency };
    }
    return { action: 'GUARDIAN_SYNC', urgency: or_.urgency };
  }

  // ── 5. ACT ────────────────────────────────────────────────────────────────────
  function _act(decision, st, or_, preds) {
    // Toujours émettre le tick pour que les modules puissent lire l'état
    try {
      window.ImmatBus?.emit?.('BRAIN_TICK', {
        urgency:   or_.urgency,
        signals:   or_.signals,
        action:    decision.action,
        _src:      'BrainEngine/tick',
      });
    } catch (_) {}

    // GPS périmé → forcer une localisation
    if (or_.signals.includes('STALE_GPS') && typeof window.App?.locate === 'function') {
      try { window.App.locate(); } catch (_) {}
    }

    if (decision.action === 'ALERT_HIGH_URGENCY') {
      const msg = _buildUrgencyMessage(or_.signals, st);
      try { if (typeof toast === 'function') toast(msg, 'bad'); } catch (_) {}
      try { if (typeof speak === 'function' && window.S?.voice) speak(msg, true); } catch (_) {}
    }

    if (decision.action === 'PREDICTIVE_WARNING') {
      const pred = decision.prediction;
      const msg  = _predictionMessage(pred);
      try { if (typeof toast === 'function') toast('🧠 ' + msg, 'warn'); } catch (_) {}
      try {
        window.ImmatBus?.emit?.('BRAIN_PREDICTION', {
          type:       pred.type,
          confidence: pred.confidence,
          reason:     pred.reason,
          _src:       'BrainEngine/predict',
        });
      } catch (_) {}
    }

    if (decision.action === 'GUARDIAN_SYNC') {
      // Sync silencieux vers GuardianLoop si urgence > 0
      if (or_.urgency > 0) {
        try {
          window.GuardianLoop?._trigger?.({
            type:    'BRAIN_CONTEXT',
            signals: or_.signals,
            urgency: or_.urgency,
            _src:    'BrainEngine/guardianSync',
          });
        } catch (_) {}
      }
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────────
  function _buildUrgencyMessage(signals, st) {
    if (signals.includes('HIGH_RISK_CONTEXT') && signals.includes('NIGHT_WEATHER_DRIVING')) {
      return '⚠️ Attention : zone à risque élevé, conditions météo dégradées, conduite nocturne.';
    }
    if (signals.includes('RISK_ZONE_NEAR')) {
      return '⚠️ Zone à risque dans votre trajectoire.';
    }
    if (signals.includes('DRIVING_SILENCE')) {
      return '⚠️ Aucune activité depuis plusieurs minutes — tout va bien ?';
    }
    return '⚠️ Situation à risque détectée (' + signals.join(', ') + ').';
  }

  function _predictionMessage(pred) {
    if (pred.type === 'INCIDENT_PROBABLE') return 'Risque d\'incident élevé — soyez vigilant(e).';
    if (pred.type === 'UNEXPECTED_STOP')   return 'Arrêt inattendu possible — vérifiez votre état.';
    if (pred.type === 'ISOLATED_DRIVER')   return 'Vous êtes seul(e) sur la route — prévenez un proche.';
    return pred.reason;
  }

  // ── Détection de changement significatif ─────────────────────────────────────
  function _significant(prev, curr, or_) {
    if (!prev) return true;
    if (or_.urgency >= 5) return true;
    if (or_.urgency !== (prev._urgency || 0)) return true;
    return false;
  }

  // ── Tick principal ────────────────────────────────────────────────────────────
  function _tick() {
    try {
      _tickCount++;
      const st   = _observe();
      const or_  = _orient(st);
      const preds = _predict(st, or_);
      const dec  = _decide(st, or_, preds);

      // Publie sur S pour Ange et dashboard
      if (window.S) {
        window.S._brainState       = st;
        window.S._brainOrientation = or_;
        window.S._brainPredictions = preds;
      }
      _state       = st;
      _orientation = or_;
      _predictions = preds;

      if (_significant(_prevState, st, or_)) {
        _act(dec, st, or_, preds);
      }

      _prevState = { ...st, _urgency: or_.urgency };
    } catch (e) {
      // Ne jamais laisser le moteur s'éteindre sur une erreur
      try { window.ImmatBus?.emit?.('INVARIANT_WARNING', { inv: 'BRAIN-001', msg: e?.message, _src: 'BrainEngine' }); } catch (_) {}
    }
  }

  // ── Utilitaire distance ───────────────────────────────────────────────────────
  function _km(lat1, lng1, lat2, lng2) {
    const R  = 6371;
    const dL = (lat2 - lat1) * Math.PI / 180;
    const dG = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dG/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ── API publique ──────────────────────────────────────────────────────────────
  function start() {
    if (_running) return;
    _running = true;
    _tick();
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function getState()       { return _state; }
  function getOrientation() { return _orientation; }
  function getPredictions() { return [..._predictions]; }
  function getTickCount()   { return _tickCount; }

  return { start, stop, getState, getOrientation, getPredictions, getTickCount };

})();

if (typeof window !== 'undefined') window.BrainEngine = BrainEngine;
} // __BrainEngineV1
