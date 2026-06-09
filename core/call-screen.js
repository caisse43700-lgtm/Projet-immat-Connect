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

  function _$(id) { return document.getElementById(id); }

  // ── Actions déclenchées par les boutons ──────────────────────────
  function _accept() {
    var rid = _state.requestId;
    try { if (w.AudioManager && w.AudioManager.stopCallAudio) w.AudioManager.stopCallAudio('CallScreen.accept'); } catch(e) {}
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

  // ── Rendu ────────────────────────────────────────────────────────
  var _BTN = {
    accept:  '<button type="button" id="csAccept"  class="cs-btn cs-btn-accept">Accepter</button>',
    refuse:  '<button type="button" id="csRefuse"  class="cs-btn cs-btn-refuse">Refuser</button>',
    cancel:  '<button type="button" id="csCancel"  class="cs-btn cs-btn-cancel">Annuler</button>',
    message: '<button type="button" id="csMessage" class="cs-btn cs-btn-msg">💬 Message</button>',
    close:   '<button type="button" id="csClose"   class="cs-btn cs-btn-close">Fermer</button>',
  };

  function _bindButtons() {
    var m = { csAccept: _accept, csRefuse: _refuse, csCancel: _cancel,
              csMessage: _message, csClose: hide };
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

  // ── API publique ─────────────────────────────────────────────────
  function showOutgoing(data) {
    var plate = (data && data.to) || '--';
    var rid   = (data && data.requestId) || null;
    _state = { mode: 'outgoing', plate: plate, requestId: rid };
    _render('outgoing', plate, 'Demande de contact envoyée…',
      _BTN.cancel,
      30000);
  }

  function showIncoming(data) {
    var plate = (data && data.from) || '--';
    var rid   = (data && data.requestId) || null;
    _state = { mode: 'incoming', plate: plate, requestId: rid };
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
    var plate = (data && (data['with'] || data.plate)) || '--';
    _state = { mode: 'accepted', plate: plate, requestId: null };
    _render('accepted', plate, 'Contact accepté',
      _BTN.message + _BTN.close,
      10000);
  }

  function hide() {
    clearTimeout(_autoHideTimer);
    try { if (w.AudioManager && w.AudioManager.stopCallAudio) w.AudioManager.stopCallAudio('CallScreen.hide'); } catch(e) {}
    var ov = _$('callOverlay');
    if (ov) ov.style.display = 'none';
    _state = { mode: 'idle', plate: null, requestId: null };
  }

  function getState() {
    return { mode: _state.mode, plate: _state.plate, requestId: _state.requestId };
  }

  // ── Abonnement ImmatBus ──────────────────────────────────────────
  function _subscribe() {
    var bus = w.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    bus.on('CALL_INITIATED', function (e) { showOutgoing(e.payload); });
    bus.on('CALL_RECEIVED',  function (e) { showIncoming(e.payload); });
    bus.on('CALL_ACCEPTED',  function (e) { showAccepted(e.payload); });
    bus.on('CALL_REFUSED',   function ()  { hide(); });
    bus.on('CALL_CANCELLED', function ()  { hide(); });
    bus.on('CALL_MISSED',    function (e) { showMissed(e.payload); });
  }

  var CallScreen = {
    showOutgoing: showOutgoing,
    showIncoming: showIncoming,
    showMissed:   showMissed,
    showExpired:  showExpired,
    showAccepted: showAccepted,
    hide:         hide,
    getState:     getState,
  };

  w.CallScreen = CallScreen;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _subscribe);
  } else {
    _subscribe();
  }
})(window);
