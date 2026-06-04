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
  let _pendingCallId = null;
  let _visibilityBound = false;

  // ── Init ────────────────────────────────────────────────────────
  function init(sb, uid, myPlate) {
    _sb = sb;
    _uid = uid;
    _myPlate = String(myPlate || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    subscribeIncomingCalls(uid);
    _recoverPendingRequest();
    if (!_visibilityBound) {
      _visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') _recoverPendingRequest();
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
    if (data.expires_at && new Date(data.expires_at) <= new Date()) return;
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
      const { data } = await _sb
        .from('profiles')
        .select('id')
        .eq('owner_plate', plate)
        .maybeSingle();
      receiverId = data?.id || '';
    }
    if (!receiverId) {
      _showError('Conducteur introuvable.');
      return;
    }
    await requestCall(plate, receiverId);
  }

  // ── Envoyer une demande d'appel ──────────────────────────────────
  async function requestCall(receiverPlate, receiverId) {
    if (!_sb || !_uid) return;

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
    try{ window.ImmatOrganism?.observe?.('CALL_INITIATED', {to: receiverPlate, requestId: data.id, _src:'ImmatConnect/calls/requestCall'}); }catch(e){}
  }

  // ── Accepter ─────────────────────────────────────────────────────
  async function acceptCall(requestId) {
    _hideIncomingPopup();
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
      try { window.App?.actOpenConv?.(data.requester_plate); } catch (e) {}
      try{ window.ImmatOrganism?.observe?.('CALL_ACCEPTED', {with: data.requester_plate, requestId: requestId, _src:'ImmatConnect/calls/acceptCall'}); }catch(e){}
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
    try{ window.ImmatOrganism?.observe?.('CALL_REFUSED', {requestId, _src:'ImmatConnect/calls/refuseCall'}); }catch(e){}
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
    try{ window.ImmatOrganism?.observe?.('CALL_CANCELLED', {requestId, _src:'ImmatConnect/calls/cancelCallRequest'}); }catch(e){}
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
        _hideSentBanner();
        _pendingCallId = null;
        if (r.status === 'accepted') {
          try { if (typeof toast === 'function') toast('Demande de contact acceptée. Ouverture de la conversation…', 'ok'); } catch (e) {}
          if (r.receiver_plate) try { window.App?.actOpenConv?.(r.receiver_plate); } catch (e) {}
        } else if (r.status === 'refused') {
          try { if (typeof toast === 'function') toast('Demande de contact refusée.', 'bad'); } catch (e) {}
        }
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[CallManager] realtime KO, reconnexion dans 5s', err);
          setTimeout(() => subscribeIncomingCalls(uid), 5000);
        }
      });
  }

  // ── UI interne ───────────────────────────────────────────────────
  function _showIncomingPopup(req) {
    const popup = document.getElementById('callIncomingPopup');
    if (!popup) return;
    const plate = req.requester_plate || 'Conducteur';
    const el = document.getElementById('callIncomingPlate');
    if (el) el.textContent = plate;
    popup.dataset.requestId = req.id;
    popup.classList.add('show');
    const ms = Math.max(0, new Date(req.expires_at) - new Date());
    if (ms > 0) setTimeout(() => popup.classList.remove('show'), ms);
    try{ window.ImmatOrganism?.observe?.('CALL_RECEIVED', {from: plate, requestId: req.id, _src:'ImmatConnect/calls/subscribeIncomingCalls'}); }catch(e){}
  }

  function _hideIncomingPopup() {
    document.getElementById('callIncomingPopup')?.classList.remove('show');
  }

  function _showSentBanner(plate, requestId) {
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
  };
})();
