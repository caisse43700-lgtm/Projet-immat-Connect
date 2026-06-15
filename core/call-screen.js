/* core/call-screen.js — CallScreen Phase 1 squelette
 *
 * Projection visuelle de l'état d'appel. Lecture du business state.
 * Source de vérité : CallManager (call_requests + _pendingCallId).
 * CallScreen = affichage uniquement. Jamais source de vérité.
 *
 * DOM requis dans index.html :
 *   #callOverlay  #callOvPlate  #callOvStatus  #callOvActions
 *
 * API publique :
 *   CallScreen.showOutgoing(data)  data.to, data.requestId
 *   CallScreen.showIncoming(data)  data.from, data.requestId
 *   CallScreen.showMissed(data)    data.from
 *   CallScreen.showExpired(data)   data.plate
 *   CallScreen.showAccepted(data)  data.with | data.plate
 *   CallScreen.hide()
 *   CallScreen.getState()
 */
(function (w) {
  'use strict';

  var _state = { mode: 'idle', plate: null, requestId: null };
  var _autoHideTimer = null;
  var _actionLock = false; // empêche double-tap Accepter/Refuser/Annuler/Raccrocher
  var _terminalRequestIds = new Set(); // ignore les CALL_ACCEPTED périmés
  var _callTimerInterval = null;
  var _callStart = 0;

  function _$(id) { return document.getElementById(id); }

  function _startCallTimer() {
    _stopCallTimer();
    _callStart = Date.now();
    var timerEl = _$('callOvTimer'), miniEl = _$('callOvMiniTimer');
    if (timerEl) { timerEl.textContent = '0:00'; timerEl.style.display = ''; }
    _callTimerInterval = setInterval(function () {
      var secs = Math.floor((Date.now() - _callStart) / 1000);
      var m = Math.floor(secs / 60);
      var s = secs % 60;
      var txt = m + ':' + (s < 10 ? '0' : '') + s;
      var t = _$('callOvTimer'); if (t) t.textContent = txt;
      var mt = _$('callOvMiniTimer'); if (mt) mt.textContent = txt;
    }, 1000);
  }

  function _stopCallTimer() {
    if (_callTimerInterval) { clearInterval(_callTimerInterval); _callTimerInterval = null; }
    var timerEl = _$('callOvTimer'); if (timerEl) timerEl.style.display = 'none';
    var miniEl = _$('callOvMiniTimer'); if (miniEl) miniEl.textContent = '●';
  }

  function _withLock(fn) {
    return function() {
      if (_actionLock) { console.warn('[CallScreen] action ignorée — verrou actif'); return; }
      _actionLock = true;
      try { fn(); } finally {
        // Déverrouille après 1.5s pour absorber les doubles-taps iOS
        setTimeout(function() { _actionLock = false; }, 1500);
      }
    };
  }

  // ── Actions déclenchées par les boutons ──────────────────────────
  function _accept() {
    // iOS : pré-créer le track micro Agora dans le geste utilisateur (avant tout await)
    var AgoraRTC = w.AgoraRTC;
    if (AgoraRTC && typeof AgoraRTC.createMicrophoneAudioTrack === 'function') {
      // Stocker la Promise pour éviter la race condition si joinCall() tourne avant résolution
      w.__preMicTrackPromise = AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' })
        .then(function(track) {
          w.__preMicTrack = track;
          console.log('[CallScreen] preMicTrack Agora prêt');
          return track;
        })
        .catch(function() {
          w.__preMicTrackPromise = null;
          if (w.navigator && w.navigator.mediaDevices && typeof w.navigator.mediaDevices.getUserMedia === 'function') {
            w.navigator.mediaDevices.getUserMedia({ audio: true })
              .then(function(s) { w.__preMicStream = s; console.log('[CallScreen] preMicStream prêt (fallback)'); })
              .catch(function() {});
          }
          return null;
        });
    } else if (w.navigator && w.navigator.mediaDevices && typeof w.navigator.mediaDevices.getUserMedia === 'function') {
      w.navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(s) { w.__preMicStream = s; console.log('[CallScreen] preMicStream prêt (no Agora)'); })
        .catch(function() {});
    }
    try { if (w.AudioManager && w.AudioManager.stopCallAudio) w.AudioManager.stopCallAudio('CallScreen.accept'); } catch(e) {}
    var rid = _state.requestId;
    if (rid && w.CallManager && typeof w.CallManager.acceptCall === 'function') {
      w.CallManager.acceptCall(rid);
    }
  }
  function _refuse() {
    var rid = _state.requestId;
    hide();
    if (rid && w.CallManager && typeof w.CallManager.refuseCall === 'function') {
      w.CallManager.refuseCall(rid);
    }
  }
  function _cancel() {
    var rid = _state.requestId;
    hide();
    if (rid && w.CallManager && typeof w.CallManager.cancelCallRequest === 'function') {
      w.CallManager.cancelCallRequest(rid);
    }
  }
  function _message() {
    var plate = _state.plate;
    hide();
    if (plate && w.App && typeof w.App.actOpenConv === 'function') {
      w.App.actOpenConv(plate);
    }
  }
  function _hangup() {
    var rid = _state.requestId;
    hide();
    if (w.AgoraCallEngine && typeof w.AgoraCallEngine.leaveCall === 'function') {
      w.AgoraCallEngine.leaveCall();
    }
    // Signaler le raccrochage à l'autre téléphone via Supabase broadcast
    if (rid && w.CallManager && typeof w.CallManager.broadcastHangup === 'function') {
      w.CallManager.broadcastHangup(rid);
    }
    try { if (w.ImmatBus && typeof w.ImmatBus.emit === 'function') w.ImmatBus.emit('CALL_ENDED', { reason: 'local-hangup' }); } catch(e) {}
  }
  function _toggleMute() {
    if (!w.AgoraCallEngine || typeof w.AgoraCallEngine.toggleMute !== 'function') return;
    w.AgoraCallEngine.toggleMute().then(function(nowMuted) {
      var btn = _$('csMute');
      if (btn) btn.textContent = nowMuted ? '🔊 Unmute' : '🎤 Muet';
    });
  }

  // ── Rendu ────────────────────────────────────────────────────────
  var _BTN = {
    accept:  '<button type="button" id="csAccept"  class="cs-btn cs-btn-accept">Accepter</button>',
    refuse:  '<button type="button" id="csRefuse"  class="cs-btn cs-btn-refuse">Refuser</button>',
    cancel:  '<button type="button" id="csCancel"  class="cs-btn cs-btn-cancel">Annuler</button>',
    message: '<button type="button" id="csMessage" class="cs-btn cs-btn-msg">💬</button>',
    reduce:  '<button type="button" id="csReduce"  class="cs-btn cs-btn-close">Réduire</button>',
    close:   '<button type="button" id="csClose"   class="cs-btn cs-btn-close">Masquer</button>',
    hangup:  '<button type="button" id="csHangup"  class="cs-btn cs-btn-refuse">📵 Raccrocher</button>',
    mute:    '<button type="button" id="csMute"    class="cs-btn cs-btn-mute">🎤 Muet</button>',
  };

  function _bindButtons() {
    var m = { csAccept: _withLock(_accept), csRefuse: _withLock(_refuse),
              csCancel: _withLock(_cancel), csMessage: _message,
              csClose: hide, csReduce: minimize, csHangup: _withLock(_hangup),
              csMute: _toggleMute };
    Object.keys(m).forEach(function (id) {
      var el = _$(id);
      if (el) el.onclick = m[id];
    });
  }

  function _render(mode, plate, statusText, actionsHtml, autoHideMs) {
    clearTimeout(_autoHideTimer);
    var ov = _$('callOverlay'), pl = _$('callOvPlate'), st = _$('callOvStatus'), ac = _$('callOvActions');
    if (!ov) return;
    if (pl) pl.textContent = plate || '--';
    if (st) st.textContent = statusText || '';
    if (ac) ac.innerHTML  = actionsHtml || '';
    ov.style.display = 'flex';
    _bindButtons();
    if (autoHideMs > 0) {
      _autoHideTimer = setTimeout(function () { if (_state.mode === mode) hide(); }, autoHideMs);
    }
  }

  // ── Phase 2 : minimize / expand / speaker ───────────────────────
  function minimize() {
    var full = _$('callOvFull'), mini = _$('callOvMini');
    if (full) full.style.display = 'none';
    if (mini) {
      var mp = _$('callOvMiniPlate'); if (mp) mp.textContent = _state.plate || '--';
      mini.style.display = 'flex';
    }
  }

  function expand() {
    var full = _$('callOvFull'), mini = _$('callOvMini');
    if (full) full.style.display = '';
    if (mini) mini.style.display = 'none';
  }

  function toggleSpeaker() {
    // Stub — iOS n'expose pas d'API fiable pour forcer le haut-parleur en WebRTC
  }

  function _hangupFromMini() {
    expand();
    _hangup();
  }

  // ── API publique ─────────────────────────────────────────────────
  function showOutgoing(data) {
    var plate = (data && (data.to || data.plate)) || '--';
    var rid   = (data && data.requestId) || null;
    // Dedup — CALL_INITIATED peut être émis 2x (ImmatBus + ImmatOrganism)
    if (_state.mode === 'outgoing' && rid && _state.requestId === rid) return;
    _state = { mode: 'outgoing', plate: plate, requestId: rid };
    try { if (w.AudioManager && w.AudioManager.playOutgoingTone) w.AudioManager.playOutgoingTone({ context: 'outgoing', plate: plate }); } catch(e) {}
    _render('outgoing', plate, 'Demande de contact envoyée…',
      _BTN.cancel,
      30000);
  }

  function showIncoming(data) {
    var plate = (data && data.from) || '--';
    var rid   = (data && data.requestId) || null;
    // Dedup — CALL_RECEIVED peut être émis 2x (ImmatBus + ImmatOrganism)
    if (_state.mode === 'incoming' && rid && _state.requestId === rid) return;
    _state = { mode: 'incoming', plate: plate, requestId: rid };
    try { if (w.AudioManager && w.AudioManager.playIncomingRingtone) w.AudioManager.playIncomingRingtone({ context: 'incoming', plate: plate }); } catch(e) {}
    _render('incoming', plate, 'Demande de contact entrante',
      _BTN.refuse + _BTN.accept,
      0);
  }

  function showMissed(data) {
    var plate = (data && data.from) || '--';
    _state = { mode: 'missed', plate: plate, requestId: null };
    _render('missed', plate, 'Appel manqué',
      _BTN.message + _BTN.close,
      8000);
  }

  function showExpired(data) {
    var plate = (data && data.plate) || '--';
    _state = { mode: 'expired', plate: plate, requestId: null };
    _render('expired', plate, 'Demande expirée',
      _BTN.message + _BTN.close,
      6000);
  }

  function showAccepted(data) {
    var rid   = (data && data.requestId) || null;
    if (rid && _terminalRequestIds.has(rid)) return;
    // Dedup — CALL_ACCEPTED peut être émis 2x (ImmatBus + ImmatOrganism)
    if (_state.mode === 'accepted' && rid && _state.requestId === rid) return;
    // Fallback sur la plaque déjà connue (_state.plate de showOutgoing/showIncoming)
    // car Supabase postgres_changes UPDATE n'inclut pas les colonnes non modifiées
    // si REPLICA IDENTITY FULL n'est pas activé (receiver_plate absent du payload)
    var plate = (data && (data['with'] || data.plate)) || (_state.plate !== '--' && _state.plate) || '--';
    _state = { mode: 'accepted', plate: plate, requestId: rid };
    _render('accepted', plate, '📞 Appel en cours',
      '<div class="cs-actions-grid">' +
        _BTN.mute + _BTN.hangup +
        _BTN.message + _BTN.reduce +
      '</div>',
      0);
    _startCallTimer();
  }

  function hide() {
    clearTimeout(_autoHideTimer);
    _stopCallTimer();
    try { if (w.AudioManager && w.AudioManager.stopCallAudio) w.AudioManager.stopCallAudio('CallScreen.hide'); } catch(e) {}
    var ov = _$('callOverlay');
    if (ov) ov.style.display = 'none';
    var mini = _$('callOvMini'); if (mini) mini.style.display = 'none';
    var full = _$('callOvFull'); if (full) full.style.display = '';
    _state = { mode: 'idle', plate: null, requestId: null };
  }

  function getState() {
    return { mode: _state.mode, plate: _state.plate, requestId: _state.requestId };
  }

  function _addTerminal(e) {
    var rid = e && e.payload && e.payload.requestId;
    if (rid) _terminalRequestIds.add(rid);
  }

  // ── Abonnement ImmatBus ──────────────────────────────────────────
  function _subscribe() {
    var bus = w.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    // Guard requestId : InteractionEngine ré-émet CALL_INITIATED/RECEIVED/ACCEPTED/MISSED
    // avec un payload différent sans requestId au niveau racine — ignorer ces re-émissions
    // pour ne pas écraser _state.requestId avec null (causerait cancel/hangup silencieux)
    bus.on('CALL_INITIATED', function (e) { if (e && e.payload && e.payload.requestId) showOutgoing(e.payload); });
    bus.on('CALL_RECEIVED',  function (e) { if (e && e.payload && e.payload.requestId) showIncoming(e.payload); });
    bus.on('CALL_ACCEPTED',  function (e) { if (e && e.payload && e.payload.requestId) showAccepted(e.payload); });
    bus.on('CALL_REFUSED',   function (e) { _addTerminal(e); hide(); });
    bus.on('CALL_CANCELLED', function (e) { _addTerminal(e); hide(); });
    bus.on('CALL_MISSED',    function (e) { _addTerminal(e); if (e && e.payload && e.payload.requestId) showMissed(e.payload); });
    bus.on('CALL_ENDED',     function (e) { _addTerminal(e); hide(); });
  }

  var CallScreen = {
    showOutgoing: showOutgoing,
    showIncoming: showIncoming,
    showMissed:   showMissed,
    showExpired:  showExpired,
    showAccepted: showAccepted,
    hide:         hide,
    getState:     getState,
    minimize:        minimize,
    expand:          expand,
    toggleSpeaker:   toggleSpeaker,
    toggleMute:      _toggleMute,
    _accept:         _accept,
    _refuse:         _refuse,
    _cancel:         _cancel,
    _hangupFromMini: _hangupFromMini,
  };

  CallScreen.version = 'v8';
  w.CallScreen = CallScreen;
  console.log('[CallScreen] v8 chargé — guard requestId InteractionEngine + dedup show*');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _subscribe);
  } else {
    _subscribe();
  }
})(window);
