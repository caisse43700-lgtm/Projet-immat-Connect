/* core/audio-manager.js — AudioManager Phase 7
 *
 * Gère les sons : message beep, sonnerie entrante, tonalité sortante.
 * Les sons sont générés au démarrage (WAV en mémoire, Blob URL) et assignés
 * aux éléments <audio>. Aucun fichier externe nécessaire.
 *
 * Pourquoi des éléments <audio> et pas Web Audio seul :
 * iOS Safari autorise la relecture d'un élément <audio> déjà joué dans un
 * geste utilisateur — c'est le seul moyen fiable de sonner quand l'appel
 * entrant arrive via le réseau (sans geste). Le premier tap dans l'app
 * "débloque" les éléments ; ensuite play() fonctionne à tout moment.
 *
 * Familles audio :
 *   messageAudioBeep       — court, non-loopé, message reçu uniquement
 *   callAudioIncoming      — loopé, appel entrant (sonnerie téléphone)
 *   callAudioOutgoing      — loopé, appel sortant (tonalité de retour)
 *   callAudio              — alias rétrocompatible
 *
 * API publique :
 *   AudioManager.init()
 *   AudioManager.unlockFromUserGesture()
 *   AudioManager.playMessageBeep(context)
 *   AudioManager.playIncomingRingtone(context)
 *   AudioManager.playOutgoingTone(context)
 *   AudioManager.stopCallAudio(reason)
 *   AudioManager.stopAll(reason)
 *   AudioManager.getRuntimeState()
 */
(function (w) {
  'use strict';

  var _unlocked = false;
  var _lastError = null;
  var _lastBlocked = false;
  var _currentlyPlaying = null; // 'incoming' | 'outgoing' | 'message' | null
  var _lastStopReason = null;
  var _assetsGenerated = false;

  // ── Génération des sons (WAV en mémoire) ─────────────────────────

  var SAMPLE_RATE = 16000;

  function _buildWavBlobUrl(renderFn, seconds) {
    var n = Math.floor(seconds * SAMPLE_RATE);
    var buf = new ArrayBuffer(44 + n * 2);
    var v = new DataView(buf);
    function ws(off, s) { for (var j = 0; j < s.length; j++) v.setUint8(off + j, s.charCodeAt(j)); }
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SAMPLE_RATE, true); v.setUint32(28, SAMPLE_RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    var pcm = new Int16Array(buf, 44);
    for (var i = 0; i < n; i++) {
      var s = renderFn(i / SAMPLE_RATE);
      pcm[i] = Math.max(-1, Math.min(1, s)) * 32767;
    }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  // Sonnerie entrante DISTINCTIVE : motif mélodique ascendant (si-mi-sol aigu)
  // joué deux fois, puis silence — cycle de 5s, loopé. Volontairement différent
  // de la tonalité de retour sortante (440 Hz pur) et du bip message (880/1100).
  var _RING_NOTES = [
    [0.00, 0.18,  988], // B5
    [0.20, 0.38, 1319], // E6
    [0.40, 0.72, 1568], // G6
    [0.85, 1.03,  988], // reprise
    [1.05, 1.23, 1319],
    [1.25, 1.60, 1568],
  ];
  function _ringSample(t) {
    var ph = t % 5; // cycle de 5s : ~1.6s de motif, puis silence
    for (var i = 0; i < _RING_NOTES.length; i++) {
      var s = _RING_NOTES[i][0], e = _RING_NOTES[i][1], f = _RING_NOTES[i][2];
      if (ph >= s && ph < e) {
        var local = ph - s, dur = e - s;
        var env = Math.min(1, local / 0.01, (dur - local) / 0.03); // anti-clic
        return env * 0.42 * Math.sin(2 * Math.PI * f * local);
      }
    }
    return 0;
  }

  // Tonalité de retour d'appel (côté appelant) : 440 Hz pur, 1.5s ON / 3.5s OFF
  function _ringbackSample(t) {
    var ph = t % 5;
    if (ph >= 1.5) return 0;
    var env = Math.min(1, ph / 0.01, (1.5 - ph) / 0.01);
    return env * 0.22 * Math.sin(2 * Math.PI * 440 * ph);
  }

  // Bip message : double bip court 880 puis 1100 Hz
  function _beepSample(t) {
    if (t < 0.12) {
      var e1 = Math.min(1, t / 0.005, (0.12 - t) / 0.02);
      return e1 * 0.25 * Math.sin(2 * Math.PI * 880 * t);
    }
    if (t >= 0.16 && t < 0.28) {
      var t2 = t - 0.16;
      var e2 = Math.min(1, t2 / 0.005, (0.12 - t2) / 0.02);
      return e2 * 0.22 * Math.sin(2 * Math.PI * 1100 * t2);
    }
    return 0;
  }

  function _ensureSources() {
    if (_assetsGenerated) return;
    try {
      var inc = _$('callAudioIncoming');
      var out = _$('callAudioOutgoing');
      var beep = _$('messageAudioBeep');
      if (inc && !inc.src) inc.src = _buildWavBlobUrl(_ringSample, 5);
      if (out && !out.src) out.src = _buildWavBlobUrl(_ringbackSample, 5);
      if (beep && !beep.src) beep.src = _buildWavBlobUrl(_beepSample, 0.3);
      _assetsGenerated = true;
    } catch (e) {
      _lastError = String(e && (e.message || e));
    }
  }

  // ── Web Audio API (dernier recours si <audio> bloqué) ────────────
  var _ctx = null;
  var _toneActive = false;
  var _syntheticLoop = null;

  function _getOrCreateCtx() {
    if (!_ctx) {
      try { _ctx = new (w.AudioContext || w.webkitAudioContext)(); } catch (e) { return null; }
    }
    return _ctx;
  }

  function _resumeCtx() {
    var ctx = _getOrCreateCtx();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume().catch(function () {}); } catch (e) {} }
    return ctx;
  }

  function _syntheticBeep(freqHz, durationMs, volume) {
    // Vérifier l'état AVANT toute tentative de resume.
    // ctx.resume() est async : si appelé avant le check, l'état passe à 'resuming'
    // et contourne le guard — les oscillateurs se déclenchent au premier toucher.
    var ctx = _getOrCreateCtx();
    if (!ctx || ctx.state !== 'running') return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      gain.gain.value = typeof volume === 'number' ? volume : 0.12;
      osc.type = 'sine';
      osc.frequency.value = freqHz || 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t = ctx.currentTime;
      osc.start(t);
      osc.stop(t + (durationMs || 400) / 1000);
    } catch (e) { _lastError = String(e && (e.message || e)); }
  }

  function _scheduleRingCycle() {
    if (!_toneActive) return;
    _syntheticBeep(440, 1500, 0.10);
    _syntheticBeep(480, 1500, 0.10);
    _syntheticLoop = setTimeout(_scheduleRingCycle, 5000);
  }

  function _stopSynthetic() {
    _toneActive = false;
    clearTimeout(_syntheticLoop);
    _syntheticLoop = null;
  }

  // ── Éléments HTML audio ──────────────────────────────────────────
  function _$(id) { return document.getElementById(id); }

  function _soundsEnabled() {
    try { return w.S ? w.S.sounds !== false : true; } catch (e) { return true; }
  }

  // ── Unlock ──────────────────────────────────────────────────────

  function _onUserGesture() {
    unlockFromUserGesture();
    if (_unlocked) {
      document.removeEventListener('click', _onUserGesture);
      document.removeEventListener('touchstart', _onUserGesture);
    }
  }

  // Joue chaque élément en muet pendant le geste — iOS les autorise ensuite
  // à être rejoués à tout moment (appel entrant sans geste).
  function unlockFromUserGesture() {
    if (_unlocked) return;
    // Si les sons sont désactivés, marquer comme débloqué sans rien jouer.
    if (!_soundsEnabled()) { _unlocked = true; return; }
    // Toujours annuler les synthétiques avant resume — même si _currentlyPlaying
    // est défini (ex : recovery d'appel entrant pré-geste).
    _stopSynthetic();
    _ensureSources();
    _resumeCtx();
    var ok = true;
    ['callAudioIncoming', 'callAudioOutgoing', 'messageAudioBeep', 'callAudio'].forEach(function (id) {
      var el = _$(id);
      if (!el || !el.src) return;
      try {
        el.muted = true;
        var p = el.play();
        if (p && typeof p.then === 'function') {
          p.then(function () {
            try { el.pause(); el.currentTime = 0; el.muted = false; } catch (e) {}
          }).catch(function (e) {
            try { el.muted = false; } catch (e2) {}
            _lastBlocked = true;
            _lastError = String(e && (e.message || e));
            if (id === 'callAudioIncoming') ok = false;
          });
        } else {
          try { el.pause(); el.currentTime = 0; el.muted = false; } catch (e) {}
        }
      } catch (e) {
        try { el.muted = false; } catch (e2) {}
        _lastError = String(e && (e.message || e));
      }
    });
    _unlocked = ok;
  }

  // ── Lecture HTML audio ───────────────────────────────────────────

  function _play(el, loop) {
    if (!el) return false;
    if (!el.src) return false;
    try {
      el.muted = false;
      el.loop = !!loop;
      el.currentTime = 0;
      var p = el.play();
      if (p && typeof p.then === 'function') {
        p.catch(function (e) {
          _lastBlocked = true;
          _lastError = String(e && (e.message || e));
          _currentlyPlaying = null;
        });
      }
      return true;
    } catch (e) {
      _lastError = String(e && (e.message || e));
      return false;
    }
  }

  // ── API sons ─────────────────────────────────────────────────────

  function playMessageBeep(context) {
    if (!_soundsEnabled()) return;
    _ensureSources();
    var el = _$('messageAudioBeep') || _$('callAudio');
    if (_play(el, false)) {
      _currentlyPlaying = 'message';
      return;
    }
    _syntheticBeep(880, 120, 0.08);
    setTimeout(function () { _syntheticBeep(1100, 80, 0.06); }, 130);
  }

  function playIncomingRingtone(context) {
    if (!_soundsEnabled()) return;
    _ensureSources();
    var el = _$('callAudioIncoming') || _$('callAudio');
    if (_play(el, true)) {
      _currentlyPlaying = 'incoming';
      return;
    }
    // Dernier recours : Web Audio (ne fonctionne que si contexte déjà débloqué)
    _currentlyPlaying = 'incoming';
    _stopSynthetic();
    _toneActive = true;
    _scheduleRingCycle();
  }

  function playOutgoingTone(context) {
    if (!_soundsEnabled()) return;
    _ensureSources();
    var el = _$('callAudioOutgoing') || _$('callAudio');
    if (el && el.src) {
      if (_play(el, true)) _currentlyPlaying = 'outgoing';
    }
  }

  // ── Arrêt ────────────────────────────────────────────────────────

  function stopCallAudio(reason) {
    _stopSynthetic();
    _lastStopReason = reason || null;
    ['callAudioIncoming', 'callAudioOutgoing', 'callAudio'].forEach(function (id) {
      var el = _$(id);
      if (!el) return;
      try { el.pause(); el.currentTime = 0; el.loop = false; } catch (e) {}
    });
    if (_currentlyPlaying === 'incoming' || _currentlyPlaying === 'outgoing') {
      _currentlyPlaying = null;
    }
  }

  function stopAll(reason) {
    stopCallAudio(reason);
    var el = _$('messageAudioBeep');
    if (el) { try { el.pause(); el.currentTime = 0; } catch (e) {} }
    _currentlyPlaying = null;
  }

  // ── Diagnostics ──────────────────────────────────────────────────

  function getRuntimeState() {
    try {
      var inc = _$('callAudioIncoming') || _$('callAudio');
      var out = _$('callAudioOutgoing') || _$('callAudio');
      var beep = _$('messageAudioBeep') || _$('callAudio');
      var ctx = _ctx;
      return {
        supported: !!(w.Audio || (typeof HTMLAudioElement !== 'undefined') ||
          (document.createElement && document.createElement('audio').canPlayType)),
        synthAvailable: !!(w.AudioContext || w.webkitAudioContext),
        unlockedByUserGesture: _unlocked,
        assetsGenerated: _assetsGenerated,
        incomingRingtoneReady: !!(inc && inc.src && !inc.error),
        outgoingToneReady: !!(out && out.src && !out.error),
        messageBeepReady: !!(beep && beep.src && !beep.error),
        syntheticToneAvailable: !!ctx,
        syntheticToneActive: _toneActive,
        webAudioContextState: ctx ? ctx.state : 'unavailable',
        currentlyPlaying: _currentlyPlaying,
        lastAudioError: _lastError,
        lastAudioBlocked: _lastBlocked,
        lastStopReason: _lastStopReason,
        soundsEnabled: _soundsEnabled(),
        hasCallAudioIncoming: !!_$('callAudioIncoming'),
        hasCallAudioOutgoing: !!_$('callAudioOutgoing'),
        hasMessageAudioBeep: !!_$('messageAudioBeep'),
        hasCallAudioLegacy: !!_$('callAudio')
      };
    } catch (e) {
      return { supported: false, error: String(e && (e.message || e)) };
    }
  }

  // ── Init ─────────────────────────────────────────────────────────

  var _initialized = false;
  function init() {
    if (_initialized) return;
    _initialized = true;
    _ensureSources();
    try {
      document.addEventListener('click', _onUserGesture, { passive: true });
      document.addEventListener('touchstart', _onUserGesture, { passive: true });
    } catch (e) {}
  }

  function setVolume(vol) {
    var v = Math.max(0, Math.min(1, isFinite(Number(vol)) ? Number(vol) : 0));
    ['callAudioIncoming', 'callAudioOutgoing', 'messageAudioBeep'].forEach(function(id) {
      try { var el = _$( id); if (el) el.volume = v; } catch(e) {}
    });
  }

  w.AudioManager = {
    init: init,
    unlockFromUserGesture: unlockFromUserGesture,
    playMessageBeep: playMessageBeep,
    playIncomingRingtone: playIncomingRingtone,
    playOutgoingTone: playOutgoingTone,
    stopCallAudio: stopCallAudio,
    stopAll: stopAll,
    setVolume: setVolume,
    getRuntimeState: getRuntimeState
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
