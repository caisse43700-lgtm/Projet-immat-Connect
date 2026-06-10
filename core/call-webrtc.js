/* core/call-webrtc.js — Phase B : Audio P2P via WebRTC + TURN Metered.ca
 *
 * Déclenché par CALL_ACCEPTED sur ImmatBus.
 * Credentials TURN : Supabase Edge Function get-turn-credentials (jamais dans le client).
 * Signalisation : Supabase Realtime Broadcast ic_webrtc_{requestId}.
 *
 * API publique :
 *   CallWebRTC.hangup(reason)
 *   CallWebRTC.setMuted(bool)
 *   CallWebRTC.setSpeaker(bool)
 *   CallWebRTC.getRuntimeState()
 */
(function (w) {
  'use strict';

  var _pc           = null;
  var _localStream  = null;
  var _remoteAudio  = null;
  var _signalCh     = null;
  var _state        = 'idle';
  var _muted        = false;
  var _requestId    = null;
  var _pendingOffer = null;
  var _iceServers   = null; // mis en cache après le premier appel à l'Edge Function

  function _log() {
    try { console.log.apply(console, ['[CallWebRTC]'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function _sbClient() { return w.sb || w.supabaseClient || null; }

  // ── Récupération credentials TURN via Edge Function ──────────────

  function _fetchIceServers() {
    if (_iceServers) return Promise.resolve(_iceServers);
    var client = _sbClient();
    if (!client) return Promise.reject(new Error('Supabase absent'));
    return client.auth.getSession().then(function (r) {
      var token = r && r.data && r.data.session && r.data.session.access_token;
      if (!token) throw new Error('Non authentifié');
      var url = client.supabaseUrl + '/functions/v1/get-turn-credentials';
      return fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    }).then(function (resp) {
      return resp.json();
    }).then(function (body) {
      if (!body.ok || !body.iceServers) throw new Error('TURN non configuré');
      _iceServers = body.iceServers;
      return _iceServers;
    });
  }

  // ── Signalisation Supabase Broadcast ────────────────────────────

  function _openSignalChannel(requestId) {
    var client = _sbClient();
    if (!client) return null;
    var ch = client.channel('ic_webrtc_' + requestId, {
      config: { broadcast: { self: false } }
    });
    ch.on('broadcast', { event: 'signal' }, function (msg) {
      _onSignal(msg && msg.payload);
    }).subscribe(function (status) {
      _log('canal signal', status);
    });
    return ch;
  }

  function _send(msg) {
    if (!_signalCh) return;
    try { _signalCh.send({ type: 'broadcast', event: 'signal', payload: msg }); } catch(e) {}
  }

  function _onSignal(msg) {
    if (!msg) return;
    if (msg.type === 'offer') {
      if (!_pc) { _pendingOffer = msg; return; }
      _pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(function () { return _pc.createAnswer(); })
        .then(function (ans) { return _pc.setLocalDescription(ans); })
        .then(function () { _send({ type: 'answer', sdp: _pc.localDescription }); })
        .catch(function (e) { _log('answer error', e); });
      return;
    }
    if (!_pc) return;
    if (msg.type === 'answer') {
      _pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .catch(function (e) { _log('setRemote error', e); });
    } else if (msg.type === 'ice' && msg.candidate) {
      _pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        .catch(function (e) { _log('ice error', e); });
    } else if (msg.type === 'hangup') {
      _cleanup('remote hangup');
      try { if (w.CallScreen && w.CallScreen.hide) w.CallScreen.hide(); } catch(e) {}
    }
  }

  // ── RTCPeerConnection ────────────────────────────────────────────

  function _createPc(iceServers) {
    var pc = new RTCPeerConnection({ iceServers: iceServers });
    pc.onicecandidate = function (e) {
      if (e.candidate) _send({ type: 'ice', candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = function () {
      _state = pc.connectionState;
      _log('connection', _state);
      try { w.ImmatBus && w.ImmatBus.emit && w.ImmatBus.emit('WEBRTC_CONNECTED', { requestId: _requestId }); } catch(e) {}
    };
    pc.ontrack = function (e) {
      _log('flux distant reçu');
      if (!_remoteAudio) {
        _remoteAudio = document.createElement('audio');
        _remoteAudio.autoplay = true;
        _remoteAudio.setAttribute('playsinline', '');
        document.body && document.body.appendChild(_remoteAudio);
      }
      _remoteAudio.srcObject = e.streams[0];
      try { _remoteAudio.play().catch(function (err) { _log('play error', err); }); } catch(e) {}
    };
    return pc;
  }

  // ── getUserMedia ─────────────────────────────────────────────────

  function _getMedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('getUserMedia non supporté'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  }

  // ── Démarrage requester (crée l'offre) ───────────────────────────

  function _startAsRequester(requestId) {
    _requestId = requestId;
    _state = 'connecting';
    _signalCh = _openSignalChannel(requestId);
    Promise.all([_fetchIceServers(), _getMedia()]).then(function (results) {
      var iceServers = results[0], stream = results[1];
      _localStream = stream;
      _pc = _createPc(iceServers);
      stream.getTracks().forEach(function (t) { _pc.addTrack(t, stream); });
      if (_pendingOffer) { var o = _pendingOffer; _pendingOffer = null; _onSignal(o); return Promise.resolve(); }
      return _pc.createOffer().then(function (offer) {
        return _pc.setLocalDescription(offer);
      }).then(function () {
        _send({ type: 'offer', sdp: _pc.localDescription });
        _log('offre envoyée');
      });
    }).catch(function (e) { _log('erreur requester', e); _state = 'failed'; });
  }

  // ── Démarrage receiver (attend l'offre) ──────────────────────────

  function _startAsReceiver(requestId) {
    _requestId = requestId;
    _state = 'connecting';
    _signalCh = _openSignalChannel(requestId);
    Promise.all([_fetchIceServers(), _getMedia()]).then(function (results) {
      var iceServers = results[0], stream = results[1];
      _localStream = stream;
      _pc = _createPc(iceServers);
      stream.getTracks().forEach(function (t) { _pc.addTrack(t, stream); });
      _log('receiver prêt');
      if (_pendingOffer) { var o = _pendingOffer; _pendingOffer = null; _onSignal(o); }
    }).catch(function (e) { _log('erreur receiver', e); _state = 'failed'; });
  }

  // ── Contrôles ────────────────────────────────────────────────────

  function setMuted(muted) {
    _muted = !!muted;
    if (_localStream) {
      _localStream.getAudioTracks().forEach(function (t) { t.enabled = !_muted; });
    }
  }

  function setSpeaker(speaker) {
    if (_remoteAudio && typeof _remoteAudio.setSinkId === 'function') {
      try { _remoteAudio.setSinkId(speaker ? 'speaker' : '').catch(function () {}); } catch(e) {}
    }
  }

  // ── Raccrocher ───────────────────────────────────────────────────

  function hangup(reason) {
    _send({ type: 'hangup', reason: reason || 'user' });
    _cleanup(reason || 'user');
  }

  function _cleanup(reason) {
    _log('cleanup', reason);
    _state = 'idle'; _requestId = null; _pendingOffer = null;
    if (_localStream) {
      _localStream.getTracks().forEach(function (t) { try { t.stop(); } catch(e) {} });
      _localStream = null;
    }
    if (_remoteAudio) {
      try { _remoteAudio.srcObject = null; _remoteAudio.pause(); } catch(e) {}
      if (_remoteAudio.parentNode) _remoteAudio.parentNode.removeChild(_remoteAudio);
      _remoteAudio = null;
    }
    if (_pc) { try { _pc.close(); } catch(e) {} _pc = null; }
    if (_signalCh) {
      try { var c = _sbClient(); if (c) c.removeChannel(_signalCh); } catch(e) {}
      _signalCh = null;
    }
    _muted = false;
  }

  // ── Diagnostics ──────────────────────────────────────────────────

  function getRuntimeState() {
    return {
      state: _state,
      requestId: _requestId,
      hasLocalStream: !!_localStream,
      hasRemoteAudio: !!_remoteAudio,
      hasPc: !!_pc,
      connectionState: _pc ? _pc.connectionState : null,
      iceState: _pc ? _pc.iceConnectionState : null,
      muted: _muted,
      iceServersCached: !!_iceServers,
    };
  }

  // ── Abonnement ImmatBus ──────────────────────────────────────────

  function _subscribe() {
    var bus = w.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    bus.on('CALL_ACCEPTED', function (e) {
      var p = (e && e.payload) || {};
      if (!p.requestId) return;
      var src = p._src || '';
      if (src.indexOf('outgoingUpdateHandler') !== -1) {
        _startAsRequester(p.requestId);
      } else if (src.indexOf('acceptCall') !== -1) {
        _startAsReceiver(p.requestId);
      }
    });
    bus.on('CALL_REFUSED',   function () { _cleanup('refused'); });
    bus.on('CALL_CANCELLED', function () { _cleanup('cancelled'); });
    bus.on('CALL_MISSED',    function () { _cleanup('missed'); });
  }

  w.CallWebRTC = { hangup: hangup, setMuted: setMuted, setSpeaker: setSpeaker, getRuntimeState: getRuntimeState };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _subscribe);
  } else {
    _subscribe();
  }
})(window);
