/* core/agora-call-engine.js — Moteur d'appel Agora RTC
 *
 * Remplace call-webrtc.js pour un appel vocal fiable iOS/Android/Desktop.
 * App ID public par conception Agora — App Certificate jamais ici.
 * Token généré server-side par Edge Function get-agora-token.
 * Si pas de certificate configuré → testing mode (token null).
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

  async function joinCall(channelName){
    if(!w.AgoraRTC){
      _lastError = 'Agora SDK non chargé';
      console.error('[AgoraCall] Agora SDK non chargé');
      return;
    }
    if(_joined) await leaveCall();

    _client = w.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    _currentChannel = channelName;
    _remoteUsersCount = 0;

    var uid = Math.floor(Math.random() * 999998) + 1;

    // user-left : l'autre participant a raccroché → terminer l'appel local
    _client.on('user-left', function(user) {
      _remoteUsersCount = Math.max(0, _remoteUsersCount - 1);
      if(_remoteUsersCount === 0) {
        leaveCall().catch(function(){});
        try { if(w.ImmatBus && typeof w.ImmatBus.emit === 'function') w.ImmatBus.emit('CALL_ENDED', { reason: 'remote-left' }); } catch(e) {}
        console.log('[AgoraCall] Partenaire parti — appel terminé');
      }
    });

    var token = await _fetchToken(channelName, uid);

    try{
      await _client.join(APP_ID, channelName, token, uid);
      _joined = true;

      _localTrack = await w.AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' });
      await _client.publish([_localTrack]);

      _client.on('user-published', async function(user, mediaType){
        _remoteUsersCount++;
        await _client.subscribe(user, mediaType);
        if(mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
      });

      _lastError = null;
      console.log('[AgoraCall] Canal rejoint :', channelName, '— uid :', uid);
      return uid;
    }catch(e){
      _lastError = String(e && (e.message || e));
      console.error('[AgoraCall] joinCall échoué :', _lastError);
      _joined = false;
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
  w.CallWebRTC = AgoraCallEngine; // alias rétrocompatibilité

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _subscribe);
  else _subscribe();
})(window);
