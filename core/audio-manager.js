/* core/audio-manager.js — AudioManager squelette Phase 7
 *
 * Gère les sons : message beep, sonnerie entrante, tonalité sortante, alerte système.
 * Fallback synthétique via Web Audio API quand aucun src n'est défini sur l'élément audio.
 * getRuntimeState() est lecture seule. Aucun son depuis les diagnostics.
 *
 * Familles audio :
 *   messageAudioBeep       — court, non-loopé, message reçu uniquement
 *   callAudioIncoming      — loopé, appel entrant
 *   callAudioOutgoing      — loopé optionnel, appel sortant
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

  // ── Web Audio API (fallback synthétique) ─────────────────────────
  var _ctx = null;
  var _toneActive = false;
  var _syntheticLoop = null;

  function _getOrCreateCtx() {
    if (!_ctx) {
      try { _ctx = new (w.AudioContext || w.webkitAudioContext)(); } catch(e) { return null; }
    }
    return _ctx;
  }

  function _resumeCtx() {
    var ctx = _getOrCreateCtx();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume().catch(function(){}); } catch(e) {} }
    return ctx;
  }

  // Joue un bip pur via Web Audio
  function _syntheticBeep(freqHz, durationMs, volume) {
    var ctx = _resumeCtx();
    if (!ctx) return;
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
    } catch(e) { _lastError = String(e && (e.message || e)); }
  }

  // Sonnerie européenne : 440Hz + 480Hz, 400ms / 200ms silence / 400ms / 2.4s silence, cycle
  function _scheduleRingCycle() {
    if (!_toneActive) return;
    _syntheticBeep(440, 400, 0.10);
    _syntheticBeep(480, 400, 0.10);
    _syntheticLoop = setTimeout(function() {
      if (!_toneActive) return;
      _syntheticBeep(440, 400, 0.10);
      _syntheticBeep(480, 400, 0.10);
      _syntheticLoop = setTimeout(_scheduleRingCycle, 2800);
    }, 600);
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
    document.removeEventListener('click', _onUserGesture);
    document.removeEventListener('touchstart', _onUserGesture);
  }

  function unlockFromUserGesture() {
    if (_unlocked) return;
    // Débloquer aussi le contexte Web Audio
    _resumeCtx();
    var audio = _$('callAudioIncoming') || _$('callAudio');
    if (!audio) { _unlocked = true; return; }
    try {
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          try { audio.pause(); audio.currentTime = 0; } catch (e) {}
          _unlocked = true;
        }).catch(function (e) {
          _lastBlocked = true;
          _lastError = String(e && (e.message || e));
          // Pas de src — considéré comme débloqué quand même
          _unlocked = true;
        });
      } else {
        try { audio.pause(); audio.currentTime = 0; } catch (e) {}
        _unlocked = true;
      }
    } catch (e) {
      _lastError = String(e && (e.message || e));
      _unlocked = true;
    }
  }

  // ── Lecture HTML audio ───────────────────────────────────────────

  function _play(el, loop) {
    if (!el) return false;
    if (!el.src) { return false; } // pas de src → fallback synthétique
    try {
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
    var el = _$('messageAudioBeep') || _$('callAudio');
    if (_play(el, false)) {
      _currentlyPlaying = 'message';
      return;
    }
    // Fallback : bip court 880 Hz + 1100 Hz
    _syntheticBeep(880, 120, 0.08);
    setTimeout(function() { _syntheticBeep(1100, 80, 0.06); }, 130);
  }

  function playIncomingRingtone(context) {
    if (!_soundsEnabled()) return;
    var el = _$('callAudioIncoming') || _$('callAudio');
    if (_play(el, true)) {
      _currentlyPlaying = 'incoming';
      return;
    }
    // Fallback : sonnerie synthétique en boucle via Web Audio
    _currentlyPlaying = 'incoming';
    _stopSynthetic();
    _toneActive = true;
    _scheduleRingCycle();
  }

  function playOutgoingTone(context) {
    if (!_soundsEnabled()) return;
    var el = _$('callAudioOutgoing') || _$('callAudio');
    if (el && el.src) {
      if (_play(el, true)) _currentlyPlaying = 'outgoing';
    }
    // tonalité sortante optionnelle — pas de fallback synthétique obligatoire
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
        unlockedByUserGesture: _unlocked,
        incomingRingtoneReady: !!(inc && inc.src && !inc.error),
        outgoingToneReady: !!(out && out.src && !out.error),
        messageBeepReady: !!(beep && beep.src && !beep.error),
        syntheticToneAvailable: !!_getOrCreateCtx(),
        syntheticToneActive: _toneActive,
        webAudioContextState: ctx ? ctx.state : 'not-created',
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

  function init() {
    try {
      document.addEventListener('click', _onUserGesture, { once: true, passive: true });
      document.addEventListener('touchstart', _onUserGesture, { once: true, passive: true });
    } catch (e) {}
  }

  w.AudioManager = {
    init: init,
    unlockFromUserGesture: unlockFromUserGesture,
    playMessageBeep: playMessageBeep,
    playIncomingRingtone: playIncomingRingtone,
    playOutgoingTone: playOutgoingTone,
    stopCallAudio: stopCallAudio,
    stopAll: stopAll,
    getRuntimeState: getRuntimeState
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
