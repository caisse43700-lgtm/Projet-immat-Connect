/* calls.js — CallManager : appels internes ImmatConnect Phase 1
 *
 * Flux :
 *   openContactOptions(plate) → modal Message/Appel
 *   contactByCall(plate)      → vérifie call_preferences → requestCall()
 *   requestCall()             → INSERT call_requests → bannière envoyée
 *   subscribeIncomingCalls()  → postgres_changes → popup appel entrant
 *   acceptCall(id)            → UPDATE accepted → ouvre conversation
 *   refuseCall(id)            → UPDATE refused
 *
 * Anti-abus :
 *   - Vérifie allow_calls via RPC can_receive_calls() (SECURITY DEFINER)
 *   - Anti-spam + unicité pending garantis par triggers DB (backend)
 *   - Gestion erreurs 23505 / spam_limit / cooldown_active
 *   - Recovery bannière après refresh + visibilitychange
 *   - Expiration auto 30 s côté UI
 */
const CallManager = (function () {
  'use strict';

  let _sb = null;
  let _uid = null;
  let _myPlate = null;
  let _chCalls = null;
  let _lastSubscribeStatus = null;
  let _pendingCallId = null;
  let _visibilityBound = false;
  const _missedCallIds = new Set();
  const _seenIncomingCallIds = new Set();

  function _emitCallEvent(eventName, payload) {
    const p = payload || {};
    try { window.ImmatBus?.emit?.(eventName, p); } catch(e) {}
    try { window.ImmatOrganism?.observe?.(eventName, p); } catch(e) {}
  }

  // ── Init ────────────────────────────────────────────────────────
  function init(sb, uid, myPlate) {
    _sb = sb;
    _uid = uid;
    _myPlate = String(myPlate || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    subscribeIncomingCalls(uid);
    _recoverPendingRequest();
    _recoverIncomingPendingCalls();
    _startIncomingRecoveryPolling();
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

  // ── Recovery : restaure la bannière après refresh ────────────────
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
    _showSentBanner(receiverPlate, data.id);
  }

  // ── Polling recovery entrant : toutes les 5s pendant 60s après init ────
  function _startIncomingRecoveryPolling() {
    let n = 0;
    const id = setInterval(async () => {
      n++;
      if (n >= 12) clearInterval(id);
      await _recoverIncomingPendingCalls();
    }, 5000);
  }

  // ── Recovery : affiche la popup si un appel entrant pending est manqué ──
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

  // ── Ouvrir modal "Contacter" ─────────────────────────────────────
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

  // ── Contacter → Message ──────────────────────────────────────────
  function contactByMessage(plate) {
    closeContactModal();
    try { window.App?.actOpenConv?.(plate); } catch (e) {}
  }

  // ── Contacter → Appel ────────────────────────────────────────────
  async function contactByCall(plate, uid) {
    closeContactModal();
    if (!_sb || !_uid) return;

    // Résoudre receiver_id si absent
    let receiverId = uid || '';
    if (!receiverId && plate) {
      let { data } = await _sb.from('profiles').select('id').eq('owner_plate', plate).maybeSingle();
      if (!data) {
        // Essai avec tirets si la plaque n'en a pas (BE521MM → BE-521-MM)
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

  // ── Envoyer une demande d'appel ──────────────────────────────────
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

  async function requestCall(receiverPlate, receiverId) {
    if (!_sb || !_uid) return;

    if(_isCallBlocked(receiverPlate)){
      _showCallsNotAllowed(receiverPlate);
      return;
    }

    // Vérifier call_preferences via RPC sécurisée (évite d'exposer la table)
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

    // Créer la demande (anti-spam et unicité garantis par triggers DB)
    const { data, error } = await _sb
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
    _showSentBanner(receiverPlate, data.id);
    _emitCallEvent('CALL_INITIATED', {to: receiverPlate, requestId: data.id, _src:'ImmatConnect/calls/requestCall'});
    try{ window.InteractionEngine?.create?.({type:'CALL_REQUEST', initiator:_myPlate||'', target:receiverPlate||null, payload:{requestId:data.id}, status:'pending'}); }catch(e){}
  }

  // ── Accepter ─────────────────────────────────────────────────────
  async function acceptCall(requestId) {
    const wasCallScreenIncoming = window.CallScreen?.getState?.().mode === 'incoming';
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
    if (data?.requester_plate) {
      _emitCallEvent('CALL_ACCEPTED', {with: data.requester_plate, plate: data.requester_plate, requestId: requestId, _src:'ImmatConnect/calls/acceptCall'});
      try{ window.InteractionEngine?.create?.({type:'CALL_ACCEPTED', initiator:_myPlate||'', target:data.requester_plate||null, payload:{requestId}, status:'resolved'}); }catch(e){}
    } else if (wasCallScreenIncoming) {
      // Échec silencieux / RLS / ligne déjà modifiée : ne pas laisser B bloqué en incoming.
      try { window.CallScreen?.hide?.(); } catch(e) {}
    }
    if (error) console.warn('acceptCall UPDATE error', error);
  }

  // ── Refuser ──────────────────────────────────────────────────────
  async function refuseCall(requestId) {
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

  // ── Annuler une demande envoyée ───────────────────────────────────
  async function cancelCallRequest(requestId) {
    _hideSentBanner();
    if (!_sb || !requestId) return;
    await _sb
      .from('call_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('requester_id', _uid)
      .eq('status', 'pending');
    _pendingCallId = null;
    _emitCallEvent('CALL_CANCELLED', {requestId, _src:'ImmatConnect/calls/cancelCallRequest'});
    try{ window.InteractionEngine?.create?.({type:'CALL_CANCELLED', initiator:_myPlate||'', target:null, payload:{requestId}, status:'cancelled'}); }catch(e){}
  }

  // ── Réabonnement realtime ────────────────────────────────────────
  function subscribeIncomingCalls(uid) {
    if (!_sb || !uid) return;
    try { if (_chCalls) _sb.removeChannel(_chCalls); } catch (e) {}

    _chCalls = _sb.channel('ic_calls_' + uid)
      // Appels entrants (je suis le receiver)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_requests',
        filter: 'receiver_id=eq.' + uid,
      }, p => {
        const r = p.new;
        if (!r || r.status !== 'pending') return;
        if (r.expires_at && new Date(r.expires_at) <= new Date()) return;
        _showIncomingPopup(r);
      })
      // Réponses à mes demandes (je suis le requester)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_requests',
        filter: 'requester_id=eq.' + uid,
      }, p => {
        const r = p.new;
        if (!r || r.id !== _pendingCallId) return;
        _pendingCallId = null;
        if (r.status === 'accepted') {
          // Masquer la bannière legacy sans toucher CallScreen
          try { document.getElementById('callSentBanner')?.classList.remove('show'); } catch(e) {}
          // Émettre CALL_ACCEPTED → CallScreen affiche "Contact accepté"
          _emitCallEvent('CALL_ACCEPTED', {
            'with': r.receiver_plate, plate: r.receiver_plate, requestId: r.id,
            _src: 'ImmatConnect/calls/outgoingUpdateHandler',
          });
          // Fallback si CallScreen absent : ouvrir conv directement
          if (!window.CallScreen) {
            try { if (typeof toast === 'function') toast('Demande de contact acceptée. Ouverture de la conversation…', 'ok'); } catch (e) {}
            if (r.receiver_plate) try { window.App?.actOpenConv?.(r.receiver_plate); } catch (e) {}
          }
        } else if (r.status === 'refused') {
          _hideSentBanner();
          try { if (typeof toast === 'function') toast('Demande de contact refusée.', 'bad'); } catch (e) {}
        } else {
          _hideSentBanner();
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

  // ── UI interne ───────────────────────────────────────────────────
  function _showIncomingPopup(req) {
    const plate = req.requester_plate || 'Conducteur';
    // Émet l'événement bus (CallScreen l'écoute si disponible)
    _emitCallEvent('CALL_RECEIVED', {from: plate, requestId: req.id, _src:'ImmatConnect/calls/subscribeIncomingCalls'});

    const _onMissed = () => {
      if (_missedCallIds.has(req.id)) return;
      _missedCallIds.add(req.id);
      _emitCallEvent('CALL_MISSED',{requestId:req.id,from:plate,_src:'ImmatConnect/calls/subscribeIncomingCalls'});
      try{ window.InteractionEngine?.create?.({type:'CALL_MISSED', initiator:plate||'', target:_myPlate||null, payload:{requestId:req.id}, status:'received'}); }catch(e){}
    };

    // Délègue à CallScreen si chargé — pas de double UI
    if (window.CallScreen && typeof window.CallScreen.showIncoming === 'function') {
      const ms = Math.max(0, new Date(req.expires_at) - new Date());
      if (ms > 0) setTimeout(_onMissed, ms);
      return;
    }

    // Fallback : popup legacy + audio (CallScreen absent)
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
    document.getElementById('callIncomingPopup')?.classList.remove('show');
    try{ if (window.CallScreen?.getState?.().mode === 'incoming') window.CallScreen.hide(); }catch(e){}
  }

  function _showSentBanner(plate, requestId) {
    // Dans tous les cas : nettoyer _pendingCallId à l'expiration (30s DB) + libérer l'index UNIQUE
    setTimeout(async () => {
      if (_pendingCallId !== requestId) return;
      _pendingCallId = null;
      try {
        await _sb.from('call_requests')
          .update({ status: 'expired' })
          .eq('id', requestId)
          .eq('requester_id', _uid)
          .eq('status', 'pending');
      } catch (_) {}
    }, 31000);

    // Délègue à CallScreen si chargé (CallScreen gère son propre auto-hide)
    if (window.CallScreen && typeof window.CallScreen.showOutgoing === 'function') {
      return;
    }

    // Fallback : bannière legacy avec auto-hide 8s
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

  function _showError(msg) {
    try { if (typeof toast === 'function') toast(msg, 'bad'); } catch (e) {}
  }

  // ── Préférences d'appel ──────────────────────────────────────────
  async function loadCallPreferences() {
    if (!_sb || !_uid) return false;
    const { data } = await _sb
      .from('call_preferences')
      .select('allow_calls')
      .eq('user_id', _uid)
      .maybeSingle();
    return data?.allow_calls === true;
  }

  async function setCallPreferences(allow) {
    if (!_sb || !_uid) return;
    await _sb.from('call_preferences').upsert({
      user_id: _uid,
      allow_calls: allow,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Journal d'appels ─────────────────────────────────────────────
  async function loadCallLog(limit) {
    if (!_sb || !_uid) return [];
    const { data } = await _sb
      .from('call_requests')
      .select('id, requester_id, requester_plate, receiver_plate, status, created_at')
      .or(`requester_id.eq.${_uid},receiver_id.eq.${_uid}`)
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    return (data || []).map(r => ({
      id: r.id,
      outgoing: r.requester_id === _uid,
      plate: r.requester_id === _uid ? (r.receiver_plate || '?') : (r.requester_plate || '?'),
      status: r.status,
      at: r.created_at,
    }));
  }

  // ── Diagnostic lecture seule ─────────────────────────────────────
  function getRuntimeState() {
    try {
      const callOverlay = document.getElementById('callOverlay');
      const callScreenState = window.CallScreen?.getState?.() || null;
      const busJournal = window.ImmatBus?.getJournal?.() || [];
      return {
        initialized: !!_sb && !!_uid,
        uidKnown: !!_uid,
        myPlate: _myPlate || null,
        pendingCallId: _pendingCallId || null,
        hasPendingOutgoing: !!_pendingCallId,
        realtimeSubscribed: !!_chCalls,
        realtimeStatus: _lastSubscribeStatus || null,
        missedCallsCount: _missedCallIds.size,
        seenIncomingCount: _seenIncomingCallIds.size,
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
    } catch (e) {
      return { initialized: false, error: String(e?.message || e) };
    }
  }

  // ── API publique ─────────────────────────────────────────────────
  return {
    init,
    openContactOptions,
    closeContactModal,
    contactByMessage,
    contactByCall,
    requestCall,
    acceptCall,
    refuseCall,
    cancelCallRequest,
    subscribeIncomingCalls,
    closeNotAllowedModal,
    loadCallPreferences,
    setCallPreferences,
    loadCallLog,
    isCallBlocked: _isCallBlocked,
    getRuntimeState,
  };
})();

window.CallManager = CallManager;
