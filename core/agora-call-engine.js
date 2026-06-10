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
      console.error('[AgoraCall] Agora SDK non chargé');
      return;
    }
    if(_joined) await leaveCall();

    _client = w.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    _currentChannel = channelName;

    var uid = Math.floor(Math.random() * 999998) + 1;
    var token = await _fetchToken(channelName, uid);

    await _client.join(APP_ID, channelName, token, uid);
    _joined = true;

    _localTrack = await w.AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' });
    await _client.publish([_localTrack]);

    _client.on('user-published', async function(user, mediaType){
      await _client.subscribe(user, mediaType);
      if(mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
    });

    console.log('[AgoraCall] Canal rejoint :', channelName, '— uid :', uid);
    return uid;
  }

  async function leaveCall(){
    if(_localTrack){
      _localTrack.stop();
      _localTrack.close();
      _localTrack = null;
    }
    if(_client && _joined){
      try{ await _client.leave(); }catch(e){}
    }
    _client = null;
    _joined = false;
    _muted = false;
    _currentChannel = null;
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
  }

  var AgoraCallEngine = {
    joinCall: joinCall,
    leaveCall: leaveCall,
    toggleMute: toggleMute,
    isMuted: isMuted,
    isJoined: isJoined,
    currentChannel: currentChannel
  };

  w.AgoraCallEngine = AgoraCallEngine;
  w.CallWebRTC = AgoraCallEngine; // alias rétrocompatibilité

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _subscribe);
  else _subscribe();
})(window);
