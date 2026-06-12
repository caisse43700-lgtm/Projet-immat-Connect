/* calls.js — CallManager : appels internes ImmatConnect Phase 1
 *
 * Flux : demande de contact temps réel, sans voix WebRTC.
 */
const CallManager = (function () {
  'use strict';

  let _sb = null;
  let _uid = null;
  let _myPlate = null;
  let _chCalls = null;
  let _lastSubscribeStatus = null;
  let _pendingCallId = null;
  const _recentOutgoingIds = new Set();
  let _visibilityBound = false;
  const _missedCallIds = new Set();
  const _seenIncomingCallIds = new Set();
  const _missedTimers = new Map(); // requestId → timerHandle — annulé dans acceptCall()
  let _signalChannel = null;    // canal Supabase broadcast pour signaler raccroché
  let _signalRequestId = null;  // requestId de l'appel en cours
  let _signalReady = null;      // Promise qui résout quand le canal signal est SUBSCRIBED
  let _pendingCallPlate = null;  // plaque mémorisée côté appelant (fallback si DB null)
  let _incomingCallPlate = null; // plaque de l'appelant mémorisée à la réception (fallback acceptCall)
  let _busSignalBound = false;   // guard — subscriptions CALL_ENDED/CALL_MISSED une seule fois

  function _emitCallEvent(eventName, payload) {
    const p = payload || {};
    try { window.ImmatBus?.emit?.(eventName, p); } catch(e) {}
    try { window.ImmatOrganism?.observe?.(eventName, p); } catch(e) {}
  }

  function init(sb, uid, myPlate) {
    _sb = sb;
    _uid = uid;
    _myPlate = String(myPlate || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    subscribeIncomingCalls(uid);
    _recoverPendingRequest();
    _recoverIncomingPendingCalls();
    _startIncomingRecoveryPolling();
    // Nettoyer le canal signal si l'appel se termine hors raccrochage local
    if (!_busSignalBound) {
      try {
        const _bus = window.ImmatBus;
        if (_bus && typeof _bus.on === 'function') {
          _bus.on('CALL_ENDED',    function() { _leaveCallSignal(); });
          _bus.on('CALL_MISSED',   function() { _leaveCallSignal(); });
          _busSignalBound = true;
        }
      } catch(e) {}
    }
    if (!_visibilityBound) {
      _visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          _recoverPendingRequest();
          _recoverIncomingPendingCalls();
        }
      });
    }
  }

  async function _recoverPendingRequest() {
    if (!_sb || !_uid) return;
    const { data } = await _sb
      .from('call_requests')
      .select('id, receiver_plate, receiver_id, expires_at')
      .eq('requester_id', _uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return;
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      try {
        await _sb.from('call_requests')
          .update({ status: 'expired' })
          .eq('id', data.id)
          .eq('requester_id', _uid)
          .eq('status', 'pending');
      } catch (_) {}
      return;
    }
    let receiverPlate = data.receiver_plate;
    if (!receiverPlate && data.receiver_id) {
      const { data: prof } = await _sb
        .from('profiles')
        .select('owner_plate')
        .eq('id', data.receiver_id)
        .maybeSingle();
      receiverPlate = prof?.owner_plate || null;
    }
    _pendingCallId = data.id;
    // Fallback : plaque mémorisée côté appelant si DB null
    if (!receiverPlate && _pendingCallPlate) receiverPlate = _pendingCallPlate;
    // Ne pas afficher l'overlay si la plaque est inconnue — évite '--' en recovery
    if (!receiverPlate) return;
    _showSentBanner(receiverPlate, data.id);
  }

  function _startIncomingRecoveryPolling() {
    let n = 0;
    const id = setInterval(async () => {
      n++;
      if (n >= 12) clearInterval(id);
      await _recoverIncomingPendingCalls();
    }, 5000);
  }

  async function _recoverIncomingPendingCalls() {
    if (!_sb || !_uid) return;
    const { data } = await _sb
      .from('call_requests')
      .select('id, requester_id, requester_plate, receiver_id, receiver_plate, status, expires_at, created_at')
      .eq('receiver_id', _uid)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return;
    if (_seenIncomingCallIds.has(data.id)) return;
    _seenIncomingCallIds.add(data.id);
    _showIncomingPopup(data);
  }

  function openContactOptions(plate, uid) {
    const modal = document.getElementById('callContactModal');
    if (!modal) return;
    const cleanPlate = String(plate || '').toUpperCase();
    const el = document.getElementById('callContactPlate');
    if (el) el.textContent = cleanPlate || 'ce conducteur';
    modal.dataset.plate = cleanPlate;
    modal.dataset.uid = uid || '';
    modal.classList.add('show');
  }

  function closeContactModal() {
    document.getElementById('callContactModal')?.classList.remove('show');
  }

  function contactByMessage(plate) {
    closeContactModal();
    try { window.App?.actOpenConv?.(plate); } catch (e) {}
  }

  async function contactByCall(plate, uid) {
    closeContactModal();
    // iOS : pré-créer le track micro dans le geste utilisateur (avant tout await)
    var _AgoraRTC = window.AgoraRTC;
    if (_AgoraRTC && typeof _AgoraRTC.createMicrophoneAudioTrack === 'function') {
      // Stocker la Promise pour éviter la race condition si CALL_ACCEPTED arrive
      // avant que la création du track soit terminée
      window.__preMicTrackPromise = _AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' })
        .then(function(track) { window.__preMicTrack = track; console.log('[calls] preMicTrack prêt (contactByCall)'); return track; })
        .catch(function() {
          window.__preMicTrackPromise = null;
          if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(function(s) { window.__preMicStream = s; })
              .catch(function() {});
          }
          return null;
        });
    } else if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(s) { window.__preMicStream = s; })
        .catch(function() {});
    }
    if (!_sb || !_uid) return;
    let receiverId = uid || '';
    if (!receiverId && plate) {
      let { data } = await _sb.from('profiles').select('id').eq('owner_plate', plate).maybeSingle();
      if (!data) {
        const withDashes = plate.replace(/[\s-]/g, '').replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/i, '$1-$2-$3');
        if (withDashes !== plate) {
          ({ data } = await _sb.from('profiles').select('id').eq('owner_plate', withDashes).maybeSingle());
        }
      }
      receiverId = data?.id || '';
    }
    if (!receiverId) {
      _showError('Conducteur introuvable.');
      return;
    }
    await requestCall(plate, receiverId);
  }

  function _isCallBlocked(plate) {
    const p = String(plate || '').replace(/[\s-]/g,'').toUpperCase();
    if(!p) return false;
    try{
      const levels = JSON.parse(localStorage.getItem('ic_block_levels') || '{}');
      const lv = levels[p];
      if(lv === 'BLOCK_CALLS' || lv === 'BLOCK_ALL') return true;
    }catch(e){}
    try{
      const blocked = JSON.parse(localStorage.getItem('ic_blocked') || '[]');
      return blocked.includes(p);
    }catch(e){}
    return false;
  }

  async function _expireMyPendingCalls(receiverId) {
    if (!_sb || !_uid || !receiverId) return;
    try {
      // RLS call_req_cancel n'autorise que 'cancelled' pour le requester (pas 'expired')
      await _sb.from('call_requests')
        .update({ status: 'cancelled' })
        .eq('requester_id', _uid)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending');
    } catch (e) {
      console.warn('expire pending before call failed', e);
    }
    _pendingCallId = null;
  }

  async function _insertCallRequest(receiverPlate, receiverId) {
    return _sb
      .from('call_requests')
      .insert({
        requester_id: _uid,
        receiver_id: receiverId,
        requester_plate: _myPlate || null,
        receiver_plate: receiverPlate || null,
        source: 'vehicle_contact',
      })
      .select()
      .maybeSingle();
  }

  async function requestCall(receiverPlate, receiverId) {
    if (!_sb || !_uid) return;

    if(_isCallBlocked(receiverPlate)){
      _showCallsNotAllowed(receiverPlate);
      return;
    }

    await _expireMyPendingCalls(receiverId);

    const { data: canCall, error: rpcErr } = await _sb
      .rpc('can_receive_calls', { target_uid: receiverId });
    if (rpcErr) {
      console.warn('can_receive_calls RPC error', rpcErr);
      _showError("Impossible de vérifier les préférences d'appel.");
      return;
    }
    if (!canCall) {
      _showCallsNotAllowed(receiverPlate);
      return;
    }

    let { data, error } = await _insertCallRequest(receiverPlate, receiverId);
    if (error && error.code === '23505') {
      await _expireMyPendingCalls(receiverId);
      ({ data, error } = await _insertCallRequest(receiverPlate, receiverId));
    }

    if (error) {
      if (error.code === '23505') {
        _showError('Une demande est déjà en attente de réponse.');
      } else if (error.message?.includes('spam_limit')) {
        _showError('Trop de demandes. Réessaie dans quelques minutes.');
      } else if (error.message?.includes('cooldown_active')) {
        _showError('Demande refusée récemment. Réessaie dans quelques minutes.');
      } else {
        _showError("Impossible d'envoyer la demande d'appel.");
        console.warn('call_requests INSERT error', error);
      }
      return;
    }
    if (!data) {
      _showError("Impossible d'envoyer la demande d'appel.");
      return;
    }

    _pendingCallId = data.id;
    _pendingCallPlate = receiverPlate || null; // mémoriser pour le fallback recovery
    _recentOutgoingIds.add(data.id);
    setTimeout(function() { _recentOutgoingIds.delete(data.id); }, 90000);
    console.log('[CallManager] requestCall → plaque:', receiverPlate, 'id:', data.id);
    // Toast de diagnostic visible — montre exactement quelle plaque est transmise
    try { if (typeof toast === 'function') toast('Appel → ' + (receiverPlate || '(vide)'), receiverPlate ? 'ok' : 'bad'); } catch(e) {}
    _joinCallSignal(data.id); // A rejoint le canal signal dès l'envoi pour pouvoir diffuser CANCEL
    _emitCallEvent('CALL_INITIATED', {to: receiverPlate, requestId: data.id, _src:'ImmatConnect/calls/requestCall'});
    _showSentBanner(receiverPlate, data.id); // après CALL_INITIATED — dedup si CallScreen déjà ouvert
    try{ window.InteractionEngine?.create?.({type:'CALL_REQUEST', initiator:_myPlate||'', target:receiverPlate||null, payload:{requestId:data.id}, status:'pending'}); }catch(e){}
  }

  async function acceptCall(requestId) {
    // Annuler le timer d'expiration entrant — empêche CALL_MISSED sur un appel accepté
    const tid = _missedTimers.get(requestId);
    if (tid) clearTimeout(tid);
    _missedTimers.delete(requestId);

    document.getElementById('callIncomingPopup')?.classList.remove('show');
    if (!_sb || !requestId) return;
    const { data, error } = await _sb
      .from('call_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', _uid)
      .eq('status', 'pending')
      .select()
      .maybeSingle();
    if (data) {
      // Appel bien accepté — plaque depuis DB ou fallback mémorisé à la réception
      const callerPlate = data.requester_plate || _incomingCallPlate || null;
      _incomingCallPlate = null;
      _emitCallEvent('CALL_ACCEPTED', {with: callerPlate, plate: callerPlate, requestId: requestId, _src:'ImmatConnect/calls/acceptCall'});
      _joinCallSignal(requestId);
      try{ window.InteractionEngine?.create?.({type:'CALL_ACCEPTED', initiator:_myPlate||'', target:callerPlate||null, payload:{requestId}, status:'resolved'}); }catch(e){}
    } else {
      // Aucune ligne mise à jour — appel annulé ou expiré par A entre-temps
      _incomingCallPlate = null;
      try { if (window.AudioManager?.stopCallAudio) window.AudioManager.stopCallAudio('accept-no-row'); } catch(e) {}
      _hideIncomingPopup();
      _showError('Appel annulé ou expiré.');
    }
    if (error) console.warn('acceptCall UPDATE error', error);
  }

  async function refuseCall(requestId) {
    // Annuler aussi le timer sur refus
    const tid = _missedTimers.get(requestId);
    if (tid) clearTimeout(tid);
    _missedTimers.delete(requestId);

    _leaveCallSignal();
    _hideIncomingPopup();
    if (!_sb || !requestId) return;
    await _sb
      .from('call_requests')
      .update({ status: 'refused', responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', _uid)
      .eq('status', 'pending');
    _emitCallEvent('CALL_REFUSED', {requestId, _src:'ImmatConnect/calls/refuseCall'});
    try{ window.InteractionEngine?.create?.({type:'CALL_REFUSED', initiator:_myPlate||'', target:null, payload:{requestId}, status:'resolved'}); }catch(e){}
  }

  async function cancelCallRequest(requestId) {
    // Diffuser CANCEL — attendre que le canal soit SUBSCRIBED avant d'envoyer
    const ch = _signalChannel;
    const rid = requestId || _signalRequestId;
    if (ch && rid) {
      try {
        // Attendre SUBSCRIBED max 3s pour éviter un send avant la connexion Supabase
        if (_signalReady) await Promise.race([_signalReady, new Promise(r => setTimeout(r, 3000))]);
        await ch.send({ type: 'broadcast', event: 'CANCEL', payload: { requestId: rid } });
        console.log('[CallManager] CANCEL diffusé :', rid);
      } catch(e) { console.warn('[CallManager] CANCEL send échoué :', e); }
    }
    _leaveCallSignal();
    _hideSentBanner();
    if (!_sb || !requestId) return;
    await _sb
      .from('call_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('requester_id', _uid)
      .eq('status', 'pending');
    _pendingCallId = null;
    _pendingCallPlate = null;
    _missedTimers.delete(requestId); // nettoyage défensif — évite poll fantôme si appelant avait une entrée
    _emitCallEvent('CALL_CANCELLED', {requestId, _src:'ImmatConnect/calls/cancelCallRequest'});
    try{ window.InteractionEngine?.create?.({type:'CALL_CANCELLED', initiator:_myPlate||'', target:null, payload:{requestId}, status:'cancelled'}); }catch(e){}
  }

  function subscribeIncomingCalls(uid) {
    if (!_sb || !uid) return;
    try { if (_chCalls) _sb.removeChannel(_chCalls); } catch (e) {}

    _chCalls = _sb.channel('ic_calls_' + uid)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'call_requests', filter: 'receiver_id=eq.' + uid,
      }, p => {
        const r = p.new;
        if (!r || r.status !== 'pending') return;
        if (r.expires_at && new Date(r.expires_at) <= new Date()) {
          try { _sb.from('call_requests').update({status:'expired'}).eq('id', r.id).eq('status','pending'); } catch(e) {}
          return;
        }
        _showIncomingPopup(r);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'call_requests', filter: 'requester_id=eq.' + uid,
      }, p => {
        const r = p.new;
        if (!r || (r.id !== _pendingCallId && !_recentOutgoingIds.has(r.id))) return;
        _pendingCallId = null;
        _recentOutgoingIds.delete(r.id);
        if (r.status === 'accepted') {
          try { document.getElementById('callSentBanner')?.classList.remove('show'); } catch(e) {}
          // receiver_plate peut être null en DB — fallback sur la plaque mémorisée à l'envoi
          const acceptedPlate = r.receiver_plate || _pendingCallPlate || null;
          _emitCallEvent('CALL_ACCEPTED', {'with': acceptedPlate, plate: acceptedPlate, requestId: r.id, _src:'ImmatConnect/calls/outgoingUpdateHandler'});
          _joinCallSignal(r.id);
        } else if (r.status === 'refused') {
          _hideSentBanner();
          try { if (typeof toast === 'function') toast('Demande de contact refusée.', 'bad'); } catch (e) {}
        } else {
          _hideSentBanner();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'call_requests', filter: 'receiver_id=eq.' + uid,
      }, p => {
        // Statut terminal côté récepteur — A a annulé/expiré avant que B accepte
        const r = p.new;
        if (!r) return;
        if (['cancelled', 'expired', 'refused', 'ended'].indexOf(r.status) === -1) return;
        console.log('[CallManager] postgres_changes UPDATE entrant terminal:', r.status, r.id);
        try { if (typeof toast === 'function') toast('📡 PG-UPDATE: ' + r.status, 'ok'); } catch(e) {}
        const tid = _missedTimers.get(r.id);
        if (tid) clearTimeout(tid);
        _missedTimers.delete(r.id);
        try { if (window.AudioManager?.stopCallAudio) window.AudioManager.stopCallAudio('remote-terminal'); } catch(e) {}
        _hideIncomingPopup();
        _seenIncomingCallIds.add(r.id);
        if (r.status === 'cancelled') {
          _emitCallEvent('CALL_CANCELLED', { requestId: r.id, _src: 'ImmatConnect/calls/incomingUpdateHandler' });
        } else if (r.status === 'expired' && !_missedCallIds.has(r.id)) {
          _missedCallIds.add(r.id);
          _emitCallEvent('CALL_MISSED', { requestId: r.id, from: r.requester_plate || '', _src: 'ImmatConnect/calls/incomingUpdateHandler' });
        }
      })
      .subscribe((status, err) => {
        _lastSubscribeStatus = status;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[CallManager] realtime KO, reconnexion dans 5s', err);
          setTimeout(() => subscribeIncomingCalls(uid), 5000);
        }
      });
  }

  // Poll DB toutes les 1.5s tant que l'appel entrant est affiché
  // Filet de sécurité si broadcast CANCEL / postgres_changes n'arrivent pas
  function _startCancelPoll(requestId) {
    if (!_sb || !requestId) return;
    var checks = 0;
    try { if (typeof toast === 'function') toast('📡 Poll lancé #' + requestId.slice(-4), 'ok'); } catch(e) {}
    var pollId = setInterval(async function() {
      checks++;
      if (checks > 25 || !_missedTimers.has(requestId)) {
        clearInterval(pollId);
        if (checks <= 25) {
          console.warn('[CallManager] Poll stoppé — _missedTimers absent (accept/refuse/cancel)', requestId);
        }
        return;
      }
      try {
        var res = await _sb.from('call_requests').select('status').eq('id', requestId).maybeSingle();
        var st = res && res.data && res.data.status;
        var err = res && res.error;
        if (err) {
          console.warn('[CallManager] Poll DB error:', err);
          try { if (typeof toast === 'function') toast('⚠️ Poll err: ' + (err.message||err.code||'?'), 'bad'); } catch(e2) {}
        }
        console.log('[CallManager] Poll #' + checks + ' status:', st, 'err:', err?.code);
        if (st && ['cancelled','expired','refused','ended'].indexOf(st) !== -1) {
          clearInterval(pollId);
          var tid = _missedTimers.get(requestId);
          if (tid) clearTimeout(tid);
          _missedTimers.delete(requestId);
          try { if (window.AudioManager?.stopCallAudio) window.AudioManager.stopCallAudio('poll-cancel'); } catch(e) {}
          _seenIncomingCallIds.add(requestId);
          _hideIncomingPopup();
          _leaveCallSignal();
          console.log('[CallManager] Poll : appel terminal :', st, requestId);
          try { if (typeof toast === 'function') toast('📵 Poll: annulé détecté! (' + st + ')', 'ok'); } catch(e) {}
          if (st === 'cancelled') _emitCallEvent('CALL_CANCELLED', { requestId: requestId, reason: 'poll' });
        }
      } catch(e) {
        console.warn('[CallManager] Poll exception:', e);
        try { if (typeof toast === 'function') toast('⚠️ Poll exc: ' + (e?.message||e), 'bad'); } catch(e2) {}
      }
    }, 1500);
  }

  function _showIncomingPopup(req) {
    const plate = req.requester_plate || 'Conducteur';
    _incomingCallPlate = req.requester_plate || null; // fallback pour acceptCall si DB retourne null
    _joinCallSignal(req.id); // B rejoint le canal signal dès la réception pour recevoir CANCEL
    _startCancelPoll(req.id); // Filet de sécurité — détecte annulation en 2s si broadcast raté
    _emitCallEvent('CALL_RECEIVED', {from: plate, requestId: req.id, _src:'ImmatConnect/calls/subscribeIncomingCalls'});
    const _onMissed = () => {
      if (_missedCallIds.has(req.id)) return;
      _missedCallIds.add(req.id);
      _missedTimers.delete(req.id);
      _emitCallEvent('CALL_MISSED',{requestId:req.id,from:plate,_src:'ImmatConnect/calls/subscribeIncomingCalls'});
      try{ window.InteractionEngine?.create?.({type:'CALL_MISSED', initiator:plate||'', target:_myPlate||null, payload:{requestId:req.id}, status:'received'}); }catch(e){}
    };
    if (window.CallScreen && typeof window.CallScreen.showIncoming === 'function') {
      const ms = Math.max(0, new Date(req.expires_at) - new Date());
      if (ms > 0) {
        const tid = setTimeout(_onMissed, ms);
        _missedTimers.set(req.id, tid);
      } else {
        _missedTimers.set(req.id, null); // sentinel — appel expiré à réception, poll tourne quand même
      }
      return;
    }
    try { if (window.AudioManager && window.AudioManager.playIncomingRingtone) window.AudioManager.playIncomingRingtone({from: plate, source: 'legacy-popup'}); } catch(e) {}
    const popup = document.getElementById('callIncomingPopup');
    if (!popup) return;
    const el = document.getElementById('callIncomingPlate');
    if (el) el.textContent = plate;
    popup.dataset.requestId = req.id;
    popup.classList.add('show');
    const ms = Math.max(0, new Date(req.expires_at) - new Date());
    if (ms > 0) setTimeout(() => {
      popup.classList.remove('show');
      try { if (window.AudioManager && window.AudioManager.stopCallAudio) window.AudioManager.stopCallAudio('legacy-popup-expired'); } catch(e) {}
      _onMissed();
    }, ms);
  }

  function _hideIncomingPopup() {
    console.log('[CallManager] _hideIncomingPopup appelé, mode=', window.CallScreen?.getState?.().mode);
    try { if (typeof toast === 'function') toast('🔇 hideIncomingPopup', 'ok'); } catch(e) {}
    document.getElementById('callIncomingPopup')?.classList.remove('show');
    try{ if (window.CallScreen?.getState?.().mode === 'incoming') window.CallScreen.hide(); }catch(e){}
  }

  function _showSentBanner(plate, requestId) {
    setTimeout(async () => {
      if (_pendingCallId !== requestId) return;
      _pendingCallId = null;
      try {
        // RLS n'autorise que 'cancelled' pour le requester — pg_cron gère 'expired' côté serveur
        await _sb.from('call_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId)
          .eq('requester_id', _uid)
          .eq('status', 'pending');
      } catch (_) {}
    }, 31000);
    // Guard : ne jamais afficher '--' dans l'overlay — plate toujours requise
    const effectivePlate = plate || _pendingCallPlate || null;
    if (window.CallScreen && typeof window.CallScreen.showOutgoing === 'function') {
      // Déduplication : CALL_INITIATED (émis avant) a déjà ouvert l'overlay pour ce requestId
      const csState = typeof window.CallScreen.getState === 'function' ? window.CallScreen.getState() : null;
      if (csState && csState.mode === 'outgoing' && csState.requestId === requestId) return;
      if (effectivePlate) {
        window.CallScreen.showOutgoing({ to: effectivePlate, plate: effectivePlate, requestId: requestId });
        return;
      }
      // Plaque inconnue : ne pas ouvrir l'overlay avec '--', passer au banner legacy
    }
    const banner = document.getElementById('callSentBanner');
    if (!banner) return;
    const el = document.getElementById('callSentPlate');
    if (el) el.textContent = (plate && plate.trim()) ? plate.trim().toUpperCase() : '';
    banner.dataset.requestId = requestId;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
      if (_pendingCallId === requestId) _pendingCallId = null;
    }, 8000);
  }

  function _hideSentBanner() {
    document.getElementById('callSentBanner')?.classList.remove('show');
    try{ if (window.CallScreen?.getState?.().mode === 'outgoing') window.CallScreen.hide(); }catch(e){}
  }

  function _showCallsNotAllowed(plate) {
    const modal = document.getElementById('callNotAllowedModal');
    if (!modal) return;
    const el = document.getElementById('callNotAllowedSub');
    if (el) el.textContent = (plate ? plate + ' n' : 'Ce conducteur n') + '\'a pas activé les demandes de contact.';
    modal.dataset.plate = plate || '';
    modal.classList.add('show');
  }

  function closeNotAllowedModal() {
    const modal = document.getElementById('callNotAllowedModal');
    if (!modal) return;
    const plate = modal.dataset.plate;
    modal.classList.remove('show');
    if (plate) try { window.App?.actOpenConv?.(plate); } catch (e) {}
  }

  function _joinCallSignal(requestId) {
    if (!_sb || !requestId) return;
    // Déjà abonné à ce canal — ne pas recréer
    if (_signalRequestId === requestId && _signalChannel) return;
    _leaveCallSignal();
    _signalRequestId = requestId;
    // Promise qui résout dès que le canal est SUBSCRIBED (max ~3s)
    _signalReady = new Promise(function(resolve) {
      _signalChannel = _sb.channel('ic_call_signal_' + requestId)
        .on('broadcast', { event: 'HANGUP' }, function() {
          console.log('[CallManager] HANGUP broadcast reçu → CALL_ENDED');
          _leaveCallSignal();
          _emitCallEvent('CALL_ENDED', { reason: 'remote-hangup', requestId: requestId });
        })
        .on('broadcast', { event: 'CANCEL' }, function() {
          console.log('[CallManager] CANCEL broadcast reçu → fermeture UI entrante');
          try { if (typeof toast === 'function') toast('📡 CANCEL broadcast reçu!', 'ok'); } catch(e) {}
          const tid = _missedTimers.get(requestId);
          if (tid) clearTimeout(tid);
          _missedTimers.delete(requestId);
          try { if (window.AudioManager?.stopCallAudio) window.AudioManager.stopCallAudio('remote-cancel'); } catch(e) {}
          _seenIncomingCallIds.add(requestId);
          _hideIncomingPopup();
          _leaveCallSignal();
          _emitCallEvent('CALL_CANCELLED', { reason: 'remote-cancel', requestId: requestId });
        })
        .subscribe(function(status) {
          if (status === 'SUBSCRIBED') {
            resolve();
            // Vérifier si l'appel a déjà été annulé pendant la fenêtre d'abonnement
            if (_sb && requestId && _missedTimers.has(requestId)) {
              _sb.from('call_requests').select('status').eq('id', requestId).maybeSingle()
                .then(function(res) {
                  const st = res && res.data && res.data.status;
                  if (st && ['cancelled','expired','refused','ended'].includes(st)) {
                    console.log('[CallManager] Post-subscribe : appel déjà terminal :', st);
                    const tid = _missedTimers.get(requestId);
                    if (tid) clearTimeout(tid);
                    _missedTimers.delete(requestId);
                    try { if (window.AudioManager?.stopCallAudio) window.AudioManager.stopCallAudio('post-subscribe'); } catch(e) {}
                    _seenIncomingCallIds.add(requestId);
                    _hideIncomingPopup();
                    _leaveCallSignal();
                    if (st === 'cancelled') _emitCallEvent('CALL_CANCELLED', { reason: 'post-subscribe', requestId: requestId });
                  }
                })
                .catch(function(){});
            }
          }
        });
    });
    console.log('[CallManager] Signal canal rejoint :', requestId);
  }

  function _leaveCallSignal() {
    if (_signalChannel && _sb) {
      try { _sb.removeChannel(_signalChannel); } catch(e) {}
    }
    _signalChannel = null;
    _signalRequestId = null;
    _signalReady = null;
  }

  async function broadcastHangup(requestId) {
    const rid = requestId || _signalRequestId;
    const ch = _signalChannel;
    // Envoyer AVANT de quitter le canal — removeChannel coupe la connexion
    if (ch && rid) {
      try { await ch.send({ type: 'broadcast', event: 'HANGUP', payload: { requestId: rid } }); } catch(e) {}
      console.log('[CallManager] HANGUP diffusé :', rid);
    }
    _leaveCallSignal();
  }

  function _showError(msg) { try { if (typeof toast === 'function') toast(msg, 'bad'); } catch (e) {} }

  async function loadCallPreferences() {
    if (!_sb || !_uid) return false;
    const { data } = await _sb.from('call_preferences').select('allow_calls').eq('user_id', _uid).maybeSingle();
    return data?.allow_calls === true;
  }

  async function setCallPreferences(allow) {
    if (!_sb || !_uid) return;
    await _sb.from('call_preferences').upsert({ user_id: _uid, allow_calls: allow, updated_at: new Date().toISOString() });
  }

  async function loadCallLog(limit) {
    if (!_sb || !_uid) return [];
    const { data } = await _sb
      .from('call_requests')
      .select('id, requester_id, requester_plate, receiver_plate, status, created_at')
      .or(`requester_id.eq.${_uid},receiver_id.eq.${_uid}`)
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    return (data || []).map(r => ({
      id: r.id, outgoing: r.requester_id === _uid,
      plate: r.requester_id === _uid ? (r.receiver_plate || '?') : (r.requester_plate || '?'),
      status: r.status, at: r.created_at,
    }));
  }

  function getRuntimeState() {
    try {
      const callOverlay = document.getElementById('callOverlay');
      const callScreenState = window.CallScreen?.getState?.() || null;
      const busJournal = window.ImmatBus?.getJournal?.() || [];
      return {
        initialized: !!_sb && !!_uid, uidKnown: !!_uid, myPlate: _myPlate || null,
        pendingCallId: _pendingCallId || null,
        recentOutgoingCount: _recentOutgoingIds.size,
        recentOutgoingIds: Array.from(_recentOutgoingIds).slice(-5),
        hasPendingOutgoing: !!_pendingCallId,
        realtimeSubscribed: !!_chCalls, realtimeStatus: _lastSubscribeStatus || null,
        missedCallsCount: _missedCallIds.size, seenIncomingCount: _seenIncomingCallIds.size,
        pendingMissedTimers: _missedTimers.size,
        callOverlayVisible: !!(callOverlay && callOverlay.style.display !== 'none'),
        callScreenMode: callScreenState?.mode || null,
        callScreenPlate: callScreenState?.plate || null,
        callScreenRequestId: callScreenState?.requestId || null,
        sentBannerVisible: !!document.getElementById('callSentBanner')?.classList.contains('show'),
        incomingPopupVisible: !!document.getElementById('callIncomingPopup')?.classList.contains('show'),
        contactModalVisible: !!document.getElementById('callContactModal')?.classList.contains('show'),
        notAllowedModalVisible: !!document.getElementById('callNotAllowedModal')?.classList.contains('show'),
        lastCallEvents: busJournal.filter(e => String(e.event || '').startsWith('CALL_')).slice(-8),
        visibilityState: document.visibilityState || 'unknown',
      };
    } catch (e) { return { initialized: false, error: String(e?.message || e) }; }
  }

  return {
    init, openContactOptions, closeContactModal, contactByMessage, contactByCall,
    requestCall, acceptCall, refuseCall, cancelCallRequest, subscribeIncomingCalls,
    closeNotAllowedModal, loadCallPreferences, setCallPreferences, loadCallLog,
    isCallBlocked: _isCallBlocked, getRuntimeState, broadcastHangup,
  };
})();

window.CallManager = CallManager;
