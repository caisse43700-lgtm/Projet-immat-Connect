/* core/audio-manager.js — AudioManager Phase 7+
 *
 * Sonneries synthétisées via Web Audio API — aucun fichier requis.
 * Fallback sur éléments <audio> si src configuré.
 * Déverrouillage iOS : AudioContext.resume() sur premier geste utilisateur.
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
  var _currentlyPlaying = null;
  var _lastStopReason = null;
  var _ctx = null;
  var _ringingInterval = null;
  var _volume = 0.25;

  function _$(id) { return document.getElementById(id); }

  function _soundsEnabled() {
    try { return w.S ? w.S.sounds !== false : true; } catch (e) { return true; }
  }

  // ── Web Audio API ────────────────────────────────────────────────

  function _getCtx() {
    if (_ctx) return _ctx;
    try {
      _ctx = new (w.AudioContext || w.webkitAudioContext)();
    } catch (e) {
      _lastError = String(e && (e.message || e));
      _ctx = null;
    }
    return _ctx;
  }

  function _synth(freq, durationSec, startSec) {
    var ctx = _getCtx();
    if (!ctx) return;
    try {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startSec);
      gain.gain.exponentialRampToValueAtTime(_volume, startSec + 0.02);
      gain.gain.setValueAtTime(_volume, startSec + durationSec - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startSec + durationSec);
      osc.start(startSec);
      osc.stop(startSec + durationSec);
    } catch (e) {
      _lastError = String(e && (e.message || e));
    }
  }

  // Sonnerie entrante : deux doubles bips espacés (ring-ring)
  function _ringOnce() {
    var ctx = _getCtx();
    if (!ctx || ctx.state === 'suspended') return;
    var t = ctx.currentTime;
    _synth(880, 0.35, t);
    _synth(1100, 0.35, t);       // harmonique légère
    _synth(880, 0.35, t + 0.5);
    _synth(1100, 0.35, t + 0.5);
  }

  // Tonalité sortante : bip unique doux
  function _outgoingBeep() {
    var ctx = _getCtx();
    if (!ctx || ctx.state === 'suspended') return;
    var t = ctx.currentTime;
    _synth(660, 0.4, t);
  }

  // ── Unlock iOS ───────────────────────────────────────────────────

  function _onUserGesture() {
    unlockFromUserGesture();
    document.removeEventListener('click',      _onUserGesture);
    document.removeEventListener('touchstart', _onUserGesture);
  }

  function unlockFromUserGesture() {
    var ctx = _getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(function () {
        _unlocked = true;
      }).catch(function (e) {
        _lastError   = String(e && (e.message || e));
        _lastBlocked = true;
      });
    } else {
      _unlocked = true;
    }
    // Déverrouillage fallback élément <audio> si src présent
    var audio = _$('callAudioIncoming') || _$('callAudio');
    if (audio && audio.src) {
      try {
        var p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(function () {
            try { audio.pause(); audio.currentTime = 0; } catch (e) {}
          }).catch(function () {});
        }
      } catch (e) {}
    }
  }

  // ── Lecture <audio> (fallback si src configuré) ──────────────────

  function _play(el, loop) {
    if (!el || !el.src) return false;
    try {
      el.loop = !!loop;
      el.currentTime = 0;
      var p = el.play();
      if (p && typeof p.then === 'function') {
        p.catch(function (e) {
          _lastBlocked = true;
          _lastError   = String(e && (e.message || e));
          _currentlyPlaying = null;
        });
      }
      return true;
    } catch (e) {
      _lastError = String(e && (e.message || e));
      return false;
    }
  }

  // ── API audio ────────────────────────────────────────────────────

  function playIncomingRingtone(context) {
    if (!_soundsEnabled()) return;
    stopCallAudio('new_incoming');
    // Préférer fichier <audio> si configuré
    var el = _$('callAudioIncoming') || _$('callAudio');
    if (el && el.src && _play(el, true)) { _currentlyPlaying = 'incoming'; return; }
    // Synthèse Web Audio API
    var ctx = _getCtx();
    if (!ctx) { _lastBlocked = true; return; }
    if (ctx.state === 'suspended') {
      ctx.resume().then(function () {
        _ringOnce();
        _ringingInterval = setInterval(_ringOnce, 2600);
        _currentlyPlaying = 'incoming';
      }).catch(function (e) {
        _lastBlocked = true;
        _lastError   = String(e && (e.message || e));
      });
      return;
    }
    _ringOnce();
    _ringingInterval = setInterval(_ringOnce, 2600);
    _currentlyPlaying = 'incoming';
  }

  function playOutgoingTone(context) {
    if (!_soundsEnabled()) return;
    stopCallAudio('new_outgoing');
    var el = _$('callAudioOutgoing') || _$('callAudio');
    if (el && el.src && _play(el, true)) { _currentlyPlaying = 'outgoing'; return; }
    var ctx = _getCtx();
    if (!ctx) return;
    if (ctx.state !== 'suspended') {
      _outgoingBeep();
      _ringingInterval = setInterval(_outgoingBeep, 3000);
      _currentlyPlaying = 'outgoing';
    }
  }

  function playMessageBeep(context) {
    if (!_soundsEnabled()) return;
    var el = _$('messageAudioBeep') || _$('callAudio');
    if (el && el.src && _play(el, false)) return;
    var ctx = _getCtx();
    if (!ctx || ctx.state === 'suspended') return;
    var t = ctx.currentTime;
    _synth(880,  0.12, t);
    _synth(1320, 0.12, t + 0.13);
  }

  function setVolume(v) {
    _volume = Math.max(0.0001, Math.min(1, v || 0.25));
  }

  // ── Arrêt ────────────────────────────────────────────────────────

  function stopCallAudio(reason) {
    _lastStopReason = reason || null;
    if (_ringingInterval) { clearInterval(_ringingInterval); _ringingInterval = null; }
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
      var ctx = _getCtx();
      var inc  = _$('callAudioIncoming') || _$('callAudio');
      var out  = _$('callAudioOutgoing') || _$('callAudio');
      var beep = _$('messageAudioBeep')  || _$('callAudio');
      return {
        supported:               !!(w.AudioContext || w.webkitAudioContext),
        webAudioContextState:    ctx ? ctx.state : 'unavailable',
        unlockedByUserGesture:   _unlocked,
        incomingRingtoneReady:   !!(inc  && inc.src  && !inc.error),
        outgoingToneReady:       !!(out  && out.src  && !out.error),
        messageBeepReady:        !!(beep && beep.src && !beep.error),
        synthAvailable:          !!ctx,
        currentlyPlaying:        _currentlyPlaying,
        lastAudioError:          _lastError,
        lastAudioBlocked:        _lastBlocked,
        lastStopReason:          _lastStopReason,
        soundsEnabled:           _soundsEnabled(),
        hasCallAudioIncoming:    !!_$('callAudioIncoming'),
        hasCallAudioOutgoing:    !!_$('callAudioOutgoing'),
        hasMessageAudioBeep:     !!_$('messageAudioBeep'),
        hasCallAudioLegacy:      !!_$('callAudio'),
      };
    } catch (e) {
      return { supported: false, error: String(e && (e.message || e)) };
    }
  }

  // ── Init ─────────────────────────────────────────────────────────

  function init() {
    try {
      document.addEventListener('click',      _onUserGesture, { once: true, passive: true });
      document.addEventListener('touchstart', _onUserGesture, { once: true, passive: true });
    } catch (e) {}
  }

  w.AudioManager = {
    init:                  init,
    unlockFromUserGesture: unlockFromUserGesture,
    playMessageBeep:       playMessageBeep,
    playIncomingRingtone:  playIncomingRingtone,
    playOutgoingTone:      playOutgoingTone,
    stopCallAudio:         stopCallAudio,
    stopAll:               stopAll,
    setVolume:             setVolume,
    getRuntimeState:       getRuntimeState,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
