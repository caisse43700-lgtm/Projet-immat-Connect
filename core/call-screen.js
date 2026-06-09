/* core/call-screen.js — CallScreen Phase 2
 * Plein écran iOS-style + barre mini rétractable.
 * Source de vérité : CallManager. Affichage uniquement.
 */
(function (w) {
  'use strict';

  var _state     = { mode: 'idle', plate: null, requestId: null };
  var _speaker   = false;
  var _muted     = false;
  var _minimized = false;
  var _autoHideTimer = null;
  var _timerInterval = null;
  var _timerStart    = null;

  function _$(id) { return document.getElementById(id); }

  // ── Actions ──────────────────────────────────────────────────────
  function _accept() {
    var rid = _state.requestId; hide();
    if (rid && w.CallManager) w.CallManager.acceptCall(rid);
  }
  function _refuse() {
    var rid = _state.requestId; hide();
    if (rid && w.CallManager) w.CallManager.refuseCall(rid);
  }
  function _cancel() {
    var rid = _state.requestId; hide();
    if (rid && w.CallManager) w.CallManager.cancelCallRequest(rid);
  }
  function _hangupIncall() {
    var plate = _state.plate; hide();
    if (plate && w.App && typeof w.App.actOpenConv === 'function') w.App.actOpenConv(plate);
  }
  function _message() {
    var plate = _state.plate; hide();
    if (plate && w.App && typeof w.App.actOpenConv === 'function') w.App.actOpenConv(plate);
  }

  // ── Speaker / Mute ───────────────────────────────────────────────
  function toggleSpeaker() {
    _speaker = !_speaker;
    try { if (w.AudioManager && w.AudioManager.setVolume) w.AudioManager.setVolume(_speaker ? 0.8 : 0.25); } catch(e) {}
    _refreshControls();
  }

  function toggleMute() {
    _muted = !_muted;
    try {
      if (_muted) {
        if (w.AudioManager) w.AudioManager.stopCallAudio('muted');
      } else {
        if (_state.mode === 'incoming' && w.AudioManager) w.AudioManager.playIncomingRingtone();
        else if (_state.mode === 'outgoing' && w.AudioManager) w.AudioManager.playOutgoingTone();
      }
    } catch(e) {}
    _refreshControls();
  }

  function _refreshControls() {
    var sp = _$('callOvBtnSpeaker'), mu = _$('callOvBtnMute');
    if (sp) sp.classList.toggle('cs-mini-ico--active', _speaker);
    if (mu) mu.classList.toggle('cs-mini-ico--active', _muted);
  }

  // ── Minimize / Expand ────────────────────────────────────────────
  function minimize() {
    _minimized = true;
    var full = _$('callOvFull'), mini = _$('callOvMini');
    if (full) full.style.display = 'none';
    if (mini) {
      mini.style.display = 'flex';
      var mp = _$('callOvMiniPlate'); if (mp) mp.textContent = _state.plate || '--';
    }
    _refreshControls();
  }

  function expand() {
    _minimized = false;
    var full = _$('callOvFull'), mini = _$('callOvMini');
    if (full) full.style.display = 'flex';
    if (mini) mini.style.display = 'none';
  }

  // ── Timer ────────────────────────────────────────────────────────
  function _startTimer() {
    _timerStart = Date.now();
    clearInterval(_timerInterval);
    _timerInterval = setInterval(function () {
      if (!_timerStart) return;
      var sec = Math.floor((Date.now() - _timerStart) / 1000);
      var m = Math.floor(sec / 60), s = sec % 60;
      var str = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      var t = _$('callOvTimer'), mt = _$('callOvMiniTimer');
      if (t) t.textContent = str;
      if (mt) mt.textContent = str;
    }, 1000);
  }

  function _stopTimer() {
    clearInterval(_timerInterval); _timerInterval = null; _timerStart = null;
    var t = _$('callOvTimer'); if (t) { t.textContent = '00:00'; t.style.display = 'none'; }
    var mt = _$('callOvMiniTimer'); if (mt) mt.textContent = '●';
  }

  // ── Boutons SVG ──────────────────────────────────────────────────
  var _SVG = {
    phoneOff: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.5 9.5a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>',
    phone:    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.43 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.5l.42.42z"/></svg>',
    speaker:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    mic:      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>',
    micOff:   '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/></svg>',
    msg:      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  function _btn(id, svgKey, label, extraClass, onclick) {
    return '<button type="button" id="' + id + '" class="cs-round-btn ' + (extraClass || '') + '" onclick="' + onclick + '">' +
      '<div class="cs-round-circle">' + (_SVG[svgKey] || '') + '</div>' +
      '<span class="cs-round-label">' + label + '</span>' +
    '</button>';
  }

  function _renderActions() {
    var ac = _$('callOvActions'); if (!ac) return;
    var mode = _state.mode, html = '';
    if (mode === 'incoming') {
      html = '<div class="cs-actions-row">' +
        _btn('csBtnRefuse', 'phoneOff', 'Refuser',   'cs-round-refuse', 'CallScreen._refuse()') +
        _btn('csBtnAccept', 'phone',    'Décrocher',  'cs-round-accept', 'CallScreen._accept()') +
      '</div>';
    } else if (mode === 'outgoing') {
      html = '<div class="cs-actions-row cs-actions-row--single">' +
        _btn('csBtnCancel', 'phoneOff', 'Raccrocher', 'cs-round-refuse', 'CallScreen._cancel()') +
      '</div>';
    } else if (mode === 'accepted') {
      html = '';
    } else if (mode === 'missed' || mode === 'expired') {
      html = '<div class="cs-actions-row">' +
        _btn('csBtnMsg',   'msg',   'Message', 'cs-round-ctrl', 'CallScreen._message()') +
        _btn('csBtnClose', 'close', 'Fermer',  'cs-round-ctrl', 'CallScreen.hide()') +
      '</div>';
    }
    ac.innerHTML = html;
  }

  // ── Render principal ─────────────────────────────────────────────
  function _render(mode, plate, statusText, showTimer, autoHideMs) {
    clearTimeout(_autoHideTimer);
    _stopTimer();
    _speaker = false; _muted = false;

    var ov = _$('callOverlay'); if (!ov) return;
    var pl = _$('callOvPlate'), st = _$('callOvStatus'), tm = _$('callOvTimer');
    if (pl) pl.textContent = plate || '--';
    if (st) st.textContent = statusText || '';
    if (tm) { tm.style.display = showTimer ? 'block' : 'none'; tm.textContent = '00:00'; }
    var mp = _$('callOvMiniPlate'); if (mp) mp.textContent = plate || '--';
    var mt = _$('callOvMiniTimer'); if (mt) mt.textContent = showTimer ? '00:00' : '●';

    var wrap = _$('callOvAvatarWrap');
    if (wrap) wrap.classList.toggle('cs-avatar-wrap--pulse', mode === 'incoming' || mode === 'outgoing');

    expand();
    ov.style.display = 'block';
    _renderActions();
    _refreshControls();

    if (showTimer) _startTimer();
    if (autoHideMs > 0) {
      _autoHideTimer = setTimeout(function () { if (_state.mode === mode) hide(); }, autoHideMs);
    }
  }

  // ── API publique ─────────────────────────────────────────────────
  function showOutgoing(data) {
    var plate = (data && data.to) || '--', rid = (data && data.requestId) || null;
    _state = { mode: 'outgoing', plate: plate, requestId: rid };
    _render('outgoing', plate, 'Demande de contact envoyée…', false, 30000);
    try { if (w.AudioManager && w.AudioManager.playOutgoingTone) w.AudioManager.playOutgoingTone({to: plate}); } catch(e) {}
  }
  function showIncoming(data) {
    var plate = (data && data.from) || '--', rid = (data && data.requestId) || null;
    _state = { mode: 'incoming', plate: plate, requestId: rid };
    _render('incoming', plate, 'Demande de contact', false, 0);
    try { if (w.AudioManager && w.AudioManager.playIncomingRingtone) w.AudioManager.playIncomingRingtone({from: plate}); } catch(e) {}
  }
  function showMissed(data) {
    var plate = (data && data.from) || '--';
    _state = { mode: 'missed', plate: plate, requestId: null };
    _render('missed', plate, 'Appel manqué', false, 8000);
  }
  function showExpired(data) {
    var plate = (data && data.plate) || '--';
    _state = { mode: 'expired', plate: plate, requestId: null };
    _render('expired', plate, 'Demande expirée', false, 6000);
  }
  function showAccepted(data) {
    var plate = (data && (data['with'] || data.plate)) || '--';
    _state = { mode: 'accepted', plate: plate, requestId: null };
    _render('accepted', plate, 'Contact accepté', false, 2500);
    setTimeout(function () {
      if (plate && w.App && typeof w.App.actOpenConv === 'function') {
        try { w.App.actOpenConv(plate); } catch(e) {}
      }
    }, 600);
  }
  function hide() {
    clearTimeout(_autoHideTimer); _stopTimer();
    try { if (w.AudioManager && w.AudioManager.stopCallAudio) w.AudioManager.stopCallAudio('CallScreen.hide'); } catch(e) {}
    var ov = _$('callOverlay'); if (ov) ov.style.display = 'none';
    var mini = _$('callOvMini'); if (mini) mini.style.display = 'none';
    var full = _$('callOvFull'); if (full) full.style.display = 'flex';
    _minimized = false; _speaker = false; _muted = false;
    _state = { mode: 'idle', plate: null, requestId: null };
  }
  function getState() {
    return { mode: _state.mode, plate: _state.plate, requestId: _state.requestId, speaker: _speaker, muted: _muted, minimized: _minimized };
  }

  var CallScreen = {
    showOutgoing: showOutgoing, showIncoming: showIncoming,
    showMissed: showMissed, showExpired: showExpired,
    showAccepted: showAccepted, hide: hide, getState: getState,
    minimize: minimize, expand: expand,
    toggleSpeaker: toggleSpeaker, toggleMute: toggleMute,
    _accept: _accept, _refuse: _refuse, _cancel: _cancel,
    _hangupIncall: _hangupIncall, _message: _message,
    _hangupFromMini: function () {
      if (_state.mode === 'incoming') _refuse();
      else if (_state.mode === 'outgoing') _cancel();
      else hide();
    },
  };

  w.CallScreen = CallScreen;

  function _subscribe() {
    var bus = w.ImmatBus; if (!bus || typeof bus.on !== 'function') return;
    bus.on('CALL_INITIATED', function (e) { showOutgoing(e.payload); });
    bus.on('CALL_RECEIVED',  function (e) { showIncoming(e.payload); });
    bus.on('CALL_ACCEPTED',  function (e) { showAccepted(e.payload); });
    bus.on('CALL_REFUSED',   function ()  { hide(); });
    bus.on('CALL_CANCELLED', function ()  { hide(); });
    bus.on('CALL_MISSED',    function (e) { showMissed(e.payload); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _subscribe);
  } else {
    _subscribe();
  }
})(window);
