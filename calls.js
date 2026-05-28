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
 * Anti-abus (frontend) :
 *   - Vérifie allow_calls avant tout INSERT
 *   - Max 3 demandes / 10 min entre les mêmes utilisateurs
 *   - Bloque si une demande pending existe déjà
 *   - Expiration auto 30 s côté UI
 */
const CallManager = (function () {
  'use strict';

  let _sb = null;
  let _uid = null;
  let _myPlate = null;
  let _chCalls = null;
  let _pendingCallId = null;

  // ── Init ────────────────────────────────────────────────────────
  function init(sb, uid, myPlate) {
    _sb = sb;
    _uid = uid;
    _myPlate = String(myPlate || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    subscribeIncomingCalls(uid);
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

    // Vérifier call_preferences
    const { data: pref } = await _sb
      .from('call_preferences')
      .select('allow_calls')
      .eq('user_id', receiverId)
      .maybeSingle();
    if (!pref?.allow_calls) {
      _showCallsNotAllowed(receiverPlate);
      return;
    }

    // Anti-spam : max 3 / 10 min
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await _sb
      .from('call_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', _uid)
      .eq('receiver_id', receiverId)
      .gte('created_at', since);
    if ((count ?? 0) >= 3) {
      _showError('Trop de demandes. Réessaie dans quelques minutes.');
      return;
    }

    // Une seule demande pending entre les mêmes utilisateurs
    const { data: existing } = await _sb
      .from('call_requests')
      .select('id')
      .eq('requester_id', _uid)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      _showError('Une demande est déjà en attente de réponse.');
      return;
    }

    // Créer la demande
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

    if (error || !data) {
      _showError("Impossible d'envoyer la demande d'appel.");
      console.warn('call_requests INSERT error', error);
      return;
    }

    _pendingCallId = data.id;
    _showSentBanner(receiverPlate, data.id);
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
          try { if (typeof toast === 'function') toast('Appel accepté ! Ouverture de la conversation…', 'ok'); } catch (e) {}
          if (r.receiver_plate) try { window.App?.actOpenConv?.(r.receiver_plate); } catch (e) {}
        } else if (r.status === 'refused') {
          try { if (typeof toast === 'function') toast("Demande d'appel refusée.", 'bad'); } catch (e) {}
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
  }

  function _hideIncomingPopup() {
    document.getElementById('callIncomingPopup')?.classList.remove('show');
  }

  function _showSentBanner(plate, requestId) {
    const banner = document.getElementById('callSentBanner');
    if (!banner) return;
    const el = document.getElementById('callSentPlate');
    if (el) el.textContent = plate || 'le conducteur';
    banner.dataset.requestId = requestId;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
      if (_pendingCallId === requestId) _pendingCallId = null;
    }, 31000);
  }

  function _hideSentBanner() {
    document.getElementById('callSentBanner')?.classList.remove('show');
  }

  function _showCallsNotAllowed(plate) {
    const modal = document.getElementById('callNotAllowedModal');
    if (!modal) return;
    const el = document.getElementById('callNotAllowedSub');
    if (el) el.textContent = (plate ? plate + ' n' : 'Ce conducteur n') + '\'a pas activé les appels internes.';
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
  };
})();
