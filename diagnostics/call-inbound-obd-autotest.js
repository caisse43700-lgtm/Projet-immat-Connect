/* diagnostics/call-inbound-obd-autotest.js
 * Lecture seule — BUG B appel entrant invisible.
 * Aucun INSERT / UPDATE / DELETE.
 * Objectif : localiser la rupture entre DB → realtime → _showIncomingPopup → Bus → CallScreen → popup.
 *
 * Usage après chargement dans l'app :
 *   await window.ImmatCallInboundObd.run()
 */
(function(){
  'use strict';

  function nowIso(){ return new Date().toISOString(); }
  function safe(fn, fallback){ try { return fn(); } catch(e) { return fallback; } }
  function pass(label, detail){ return { label, status:'PASS', detail: detail || '' }; }
  function fail(label, detail){ return { label, status:'FAIL', detail: detail || '' }; }
  function unknown(label, detail){ return { label, status:'UNKNOWN', detail: detail || '' }; }

  function uidFromRuntime(){
    try {
      const st = window.CallManager && window.CallManager.getRuntimeState ? window.CallManager.getRuntimeState() : null;
      return st && st.uid ? st.uid : null;
    } catch(e) { return null; }
  }

  function callEventsFromBus(){
    const journal = safe(() => {
      if (window.ImmatBus && typeof window.ImmatBus.getJournal === 'function') return window.ImmatBus.getJournal();
      if (window.ImmatOrganism && typeof window.ImmatOrganism.getJournal === 'function') return window.ImmatOrganism.getJournal();
      return [];
    }, []);
    return (journal || []).filter(e => String(e && e.event || '').includes('CALL'));
  }

  async function latestDbCalls(limit){
    const sb = window.sb || window.supabaseClient || null;
    if (!sb || !sb.from) return { data:null, error:'Supabase client introuvable sur window.sb' };
    try {
      const { data, error } = await sb
        .from('call_requests')
        .select('id,requester_id,receiver_id,requester_plate,receiver_plate,status,created_at,expires_at,responded_at')
        .order('created_at', { ascending:false })
        .limit(limit || 10);
      return { data: data || [], error: error ? (error.message || String(error)) : null };
    } catch(e) {
      return { data:null, error:String(e && e.message || e) };
    }
  }

  async function run(){
    const runtime = safe(() => window.CallManager && window.CallManager.getRuntimeState ? window.CallManager.getRuntimeState() : null, null);
    const callScreenState = safe(() => window.CallScreen && window.CallScreen.getState ? window.CallScreen.getState() : null, null);
    const callEvents = callEventsFromBus();
    const db = await latestDbCalls(10);
    const checks = [];

    checks.push(runtime ? pass('CALLMANAGER_PRESENT', 'CallManager.getRuntimeState() disponible') : fail('CALLMANAGER_PRESENT', 'CallManager absent ou getRuntimeState indisponible'));
    checks.push(runtime && runtime.initialized ? pass('CALLMANAGER_INITIALIZED', 'initialized=true') : fail('CALLMANAGER_INITIALIZED', 'initialized=false ou inconnu'));
    checks.push(runtime && runtime.realtimeSubscribed ? pass('CALL_CHANNEL_OBJECT_EXISTS', 'ATTENTION: prouve seulement que _chCalls existe, pas que le channel est SUBSCRIBED') : fail('CALL_CHANNEL_OBJECT_EXISTS', 'Aucun channel call détecté'));
    checks.push(runtime && runtime.myPlate ? pass('MY_PLATE_PRESENT', runtime.myPlate) : unknown('MY_PLATE_PRESENT', 'Plaque runtime inconnue'));

    if (db.error) checks.push(unknown('DB_LATEST_CALLS_READABLE', db.error));
    else checks.push(pass('DB_LATEST_CALLS_READABLE', String((db.data || []).length) + ' lignes lues'));

    const myPlate = runtime && runtime.myPlate ? String(runtime.myPlate).toUpperCase() : null;
    const related = (db.data || []).filter(r => {
      const rp = String(r.receiver_plate || '').toUpperCase();
      const qp = String(r.requester_plate || '').toUpperCase();
      return myPlate && (rp === myPlate || qp === myPlate);
    });
    const lastRelated = related[0] || null;

    if (lastRelated) {
      checks.push(pass('LAST_CALL_FOR_MY_PLATE_FOUND', lastRelated.id + ' status=' + lastRelated.status));
    } else if (db.data && db.data.length) {
      checks.push(unknown('LAST_CALL_FOR_MY_PLATE_FOUND', 'Des call_requests existent, mais aucune ne matche myPlate=' + (myPlate || '?')));
    } else {
      checks.push(unknown('LAST_CALL_FOR_MY_PLATE_FOUND', 'Aucune ligne call_requests récente visible'));
    }

    const recentCallEvents = callEvents.slice(-10);
    checks.push(recentCallEvents.length ? pass('CALL_EVENTS_IN_BUS', recentCallEvents.map(e => e.event).join(', ')) : fail('CALL_EVENTS_IN_BUS', 'Aucun événement CALL_* dans ImmatBus/ImmatOrganism journal'));

    checks.push(runtime && runtime.incomingPopupVisible ? pass('POPUP_VISIBLE', 'incomingPopupVisible=true') : fail('POPUP_VISIBLE', 'incomingPopupVisible=false'));
    checks.push(runtime && runtime.missedCallsCount > 0 ? pass('MISSED_CALL_RECORDED', 'missedCallsCount=' + runtime.missedCallsCount) : unknown('MISSED_CALL_RECORDED', 'missedCallsCount=0'));
    checks.push(callScreenState ? pass('CALLSCREEN_STATE_READABLE', JSON.stringify(callScreenState)) : unknown('CALLSCREEN_STATE_READABLE', 'CallScreen absent ou getState indisponible'));

    let conclusion = 'UNKNOWN';
    if (runtime && runtime.initialized && runtime.realtimeSubscribed && !recentCallEvents.length && !runtime.incomingPopupVisible) {
      conclusion = 'Rupture probable avant Bus/UI : receiver_id, realtime INSERT call_requests, ou _showIncomingPopup jamais appelé.';
    }
    if (recentCallEvents.length && !runtime.incomingPopupVisible) {
      conclusion = 'CALL event présent mais popup absente : rupture probable Bus → CallScreen/UI.';
    }

    const result = {
      name: 'ImmatCallInboundObd',
      at: nowIso(),
      readonly: true,
      runtime,
      callScreenState,
      latestDbCalls: db.data || [],
      latestRelatedCallForMyPlate: lastRelated,
      recentCallEvents,
      checks,
      conclusion,
      nextTest: 'Lancer depuis B juste avant/après appel A→B, comparer latestRelatedCallForMyPlate + CALL_EVENTS_IN_BUS + POPUP_VISIBLE.'
    };

    try { console.table(checks); console.log('[ImmatCallInboundObd]', result); } catch(e) {}
    return result;
  }

  window.ImmatCallInboundObd = { run };
})();
