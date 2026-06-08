/* core/audio-manager.js — AudioManager squelette Phase 7
 *
 * Gère les sons : message beep, sonnerie entrante, tonalité sortante, alerte système.
 * Ne joue rien si aucun src n'est défini — phase asset manquante intentionnelle.
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
        });
      } else {
        try { audio.pause(); audio.currentTime = 0; } catch (e) {}
        _unlocked = true;
      }
    } catch (e) {
      _lastError = String(e && (e.message || e));
    }
  }

  // ── Lecture ──────────────────────────────────────────────────────

  function _play(el, loop) {
    if (!el) return false;
    if (!el.src) { _lastBlocked = true; return false; }
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

  function playMessageBeep(context) {
    if (!_soundsEnabled()) return;
    var el = _$('messageAudioBeep') || _$('callAudio');
    if (_play(el, false)) _currentlyPlaying = 'message';
  }

  function playIncomingRingtone(context) {
    if (!_soundsEnabled()) return;
    var el = _$('callAudioIncoming') || _$('callAudio');
    if (_play(el, true)) _currentlyPlaying = 'incoming';
  }

  function playOutgoingTone(context) {
    if (!_soundsEnabled()) return;
    var el = _$('callAudioOutgoing') || _$('callAudio');
    if (el && el.src) {
      if (_play(el, true)) _currentlyPlaying = 'outgoing';
    }
    // outgoing tone is optional — no _lastBlocked if no src
  }

  // ── Arrêt ────────────────────────────────────────────────────────

  function stopCallAudio(reason) {
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
      return {
        supported: !!(w.Audio || (typeof HTMLAudioElement !== 'undefined') ||
          (document.createElement && document.createElement('audio').canPlayType)),
        unlockedByUserGesture: _unlocked,
        incomingRingtoneReady: !!(inc && inc.src && !inc.error),
        outgoingToneReady: !!(out && out.src && !out.error),
        messageBeepReady: !!(beep && beep.src && !beep.error),
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
