/* core/agora-call-engine.js — Moteur d'appel Agora RTC
 *
 * Remplace call-webrtc.js pour un appel vocal fiable iOS/Android/Desktop.
 * App ID public par conception Agora — App Certificate jamais ici.
 * Token généré server-side par Edge Function get-agora-token.
 * Si pas de certificate configuré → testing mode (token null).
 *
 * Micro iOS : _accept() / contactByCall() pré-créent le track Agora dans
 * le geste utilisateur (w.__preMicTrack) ou conservent le stream natif
 * (w.__preMicStream). joinCall() les réutilise pour contourner la
 * restriction iOS "getUserMedia doit être dans un geste".
 */
(function(w){
  'use strict';

  var APP_ID = '4771f029e9c6446e872a598870bb74f3';
  var TOKEN_URL = 'https://vemgdkkbldgyvaisudkd.supabase.co/functions/v1/get-agora-token';
  var SUPABASE_KEY = 'sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ';

  var _client = null;
  var _localTrack = null;
  var _joined = false;
  var _muted = false;
  var _currentChannel = null;
  var _remoteUsersCount = 0;
  var _lastError = null;

  // Attend que window.AgoraRTC soit défini (max 8 s — SDK async CDN)
  function _waitForSDK() {
    if (w.AgoraRTC) return Promise.resolve(w.AgoraRTC);
    return new Promise(function(resolve) {
      var checks = 0;
      var id = setInterval(function() {
        checks++;
        if (w.AgoraRTC) { clearInterval(id); resolve(w.AgoraRTC); return; }
        if (checks > 80) { clearInterval(id); resolve(null); }
      }, 100);
    });
  }

  async function _fetchToken(channelName, uid){
    try{
      var resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_KEY
        },
        body: JSON.stringify({ channelName: channelName, uid: uid })
      });
      if(!resp.ok) return null;
      var data = await resp.json();
      return data.token || null;
    }catch(e){
      return null;
    }
  }

  // Obtenir le track micro : réutilise le track pré-créé dans le geste utilisateur
  // (w.__preMicTrack depuis AgoraRTC, ou w.__preMicStream depuis getUserMedia)
  async function _getMicTrack(AgoraRTC) {
    // 1. Track Agora pré-créé dans le geste (optimal)
    if (w.__preMicTrack) {
      var t = w.__preMicTrack;
      w.__preMicTrack = null;
      console.log('[AgoraCall] Réutilise le track mic pré-créé (geste)');
      return t;
    }
    // 2. Stream getUserMedia pré-capturé — wrappé en custom track Agora
    if (w.__preMicStream) {
      var tracks = w.__preMicStream.getAudioTracks();
      w.__preMicStream = null;
      if (tracks.length > 0 && typeof AgoraRTC.createCustomAudioTrack === 'function') {
        try {
          console.log('[AgoraCall] Réutilise stream getUserMedia pré-capturé');
          return await AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: tracks[0] });
        } catch(e) {}
      }
    }
    // 3. Création normale (non-iOS ou permission déjà accordée)
    return await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' });
  }

  async function joinCall(channelName){
    var AgoraRTC = await _waitForSDK();
    if(!AgoraRTC){
      _lastError = 'SDK Agora non chargé après 8s';
      console.error('[AgoraCall]', _lastError);
      try { if(typeof w.toast === 'function') w.toast('Appel vocal indisponible — SDK Agora absent', 'bad'); } catch(e) {}
      return;
    }
    if(_joined) await leaveCall();

    _client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    _currentChannel = channelName;
    _remoteUsersCount = 0;

    // L'autre participant a raccroché → terminer localement
    _client.on('user-left', function(user) {
      _remoteUsersCount = Math.max(0, _remoteUsersCount - 1);
      if(_remoteUsersCount === 0) {
        leaveCall().catch(function(){});
        try { if(w.ImmatBus && typeof w.ImmatBus.emit === 'function') w.ImmatBus.emit('CALL_ENDED', { reason: 'remote-left' }); } catch(e) {}
        console.log('[AgoraCall] Partenaire parti — appel terminé');
      }
    });

    var uid = Math.floor(Math.random() * 999998) + 1;
    var token = await _fetchToken(channelName, uid);

    try{
      await _client.join(APP_ID, channelName, token, uid);
      _joined = true;

      _localTrack = await _getMicTrack(AgoraRTC);
      await _client.publish([_localTrack]);

      _client.on('user-published', async function(user, mediaType){
        _remoteUsersCount++;
        await _client.subscribe(user, mediaType);
        if(mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
      });

      _lastError = null;
      console.log('[AgoraCall] Canal rejoint :', channelName, 'uid :', uid);
      return uid;
    }catch(e){
      _lastError = String(e && (e.message || e));
      console.error('[AgoraCall] joinCall échoué :', _lastError);
      try { if(typeof w.toast === 'function') w.toast('Appel vocal : ' + _lastError, 'bad'); } catch(err) {}
      _joined = false;
      if(_localTrack){ try { _localTrack.stop(); _localTrack.close(); } catch(e2) {} _localTrack = null; }
      throw e;
    }
  }

  async function leaveCall(){
    if(_localTrack){
      try { _localTrack.stop(); _localTrack.close(); } catch(e) {}
      _localTrack = null;
    }
    if(_client && _joined){
      try{ await _client.leave(); }catch(e){}
    }
    _client = null;
    _joined = false;
    _muted = false;
    _currentChannel = null;
    _remoteUsersCount = 0;
    console.log('[AgoraCall] Canal quitté');
  }

  async function toggleMute(){
    if(!_localTrack) return _muted;
    _muted = !_muted;
    await _localTrack.setMuted(_muted);
    return _muted;
  }

  function isMuted(){ return _muted; }
  function isJoined(){ return _joined; }
  function currentChannel(){ return _currentChannel; }

  function getRuntimeState(){
    return {
      available: true,
      joined: _joined,
      channel: _currentChannel,
      localAudioTrackReady: !!_localTrack,
      published: _joined && !!_localTrack,
      muted: _muted,
      remoteUsersCount: _remoteUsersCount,
      hasAgoraRTC: !!w.AgoraRTC,
      agoraRTCVersion: w.AgoraRTC ? (w.AgoraRTC.VERSION || 'unknown') : null,
      preMicTrackReady: !!w.__preMicTrack,
      preMicStreamReady: !!(w.__preMicStream && w.__preMicStream.getAudioTracks().length),
      lastError: _lastError || null,
    };
  }

  function _subscribe(){
    var bus = w.ImmatBus;
    if(!bus || typeof bus.on !== 'function') return;

    bus.on('CALL_ACCEPTED', function(e){
      var rid = e.payload && e.payload.requestId;
      if(!rid) return;
      joinCall(rid).catch(function(err){
        console.error('[AgoraCall] joinCall échoué :', err);
      });
    });

    bus.on('CALL_REFUSED',   function(){ leaveCall(); });
    bus.on('CALL_CANCELLED', function(){ leaveCall(); });
    bus.on('CALL_MISSED',    function(){ leaveCall(); });
    bus.on('CALL_ENDED',     function(){ leaveCall(); });
  }

  var AgoraCallEngine = {
    joinCall: joinCall,
    leaveCall: leaveCall,
    toggleMute: toggleMute,
    isMuted: isMuted,
    isJoined: isJoined,
    currentChannel: currentChannel,
    getRuntimeState: getRuntimeState,
  };

  w.AgoraCallEngine = AgoraCallEngine;
  w.CallWebRTC = AgoraCallEngine;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _subscribe);
  else _subscribe();
})(window);
