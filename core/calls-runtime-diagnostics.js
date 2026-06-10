/* core/calls-runtime-diagnostics.js — diagnostic appels lecture seule
 * Ne modifie aucune donnée, n'ouvre aucun appel, n'écrit pas dans localStorage/Supabase.
 */
(function(w){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ return fn(); }catch(e){ return fallback; } }
  function hasFn(obj, name){ return !!(obj && typeof obj[name] === 'function'); }
  function desc(el){
    if(!el) return '-';
    var id = el.id ? '#' + el.id : '';
    var cls = '';
    try{ if(typeof el.className === 'string' && el.className.trim()){ cls = '.' + el.className.trim().split(/\s+/).slice(0,4).join('.'); } }catch(e){}
    return String(el.tagName || '').toLowerCase() + id + cls;
  }
  function rectOf(el){
    if(!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) };
  }
  function cssOf(el){
    if(!el) return null;
    var cs = w.getComputedStyle ? w.getComputedStyle(el) : null;
    return { display: cs ? cs.display : (el.style && el.style.display || ''), visibility: cs ? cs.visibility : '', opacity: cs ? cs.opacity : '', zIndex: cs ? cs.zIndex : '', pointerEvents: cs ? cs.pointerEvents : '', position: cs ? cs.position : '' };
  }
  function visible(el){
    var css = cssOf(el), r = rectOf(el);
    return !!(el && r && r.w > 0 && r.h > 0 && css && css.display !== 'none' && css.visibility !== 'hidden' && css.opacity !== '0');
  }
  function topAt(el){
    if(!el || !el.getBoundingClientRect || !document.elementFromPoint) return '-';
    var r = el.getBoundingClientRect();
    if(!r.width || !r.height) return 'no-rect';
    var x = Math.max(1, Math.min(w.innerWidth - 1, r.left + r.width / 2));
    var y = Math.max(1, Math.min(w.innerHeight - 1, r.top + r.height / 2));
    return desc(document.elementFromPoint(x, y));
  }
  function copyDataset(el){ var out = {}; if(!el || !el.dataset) return out; for(var k in el.dataset){ if(Object.prototype.hasOwnProperty.call(el.dataset, k)) out[k] = el.dataset[k]; } return out; }
  function elState(id){
    var el = $(id); var isVisible = visible(el);
    return { id: id, exists: !!el, visible: isVisible, element: desc(el), css: cssOf(el), rect: rectOf(el), topElement: topAt(el), dataset: el ? copyDataset(el) : null, text: el && isVisible ? String(el.textContent || '').trim().slice(0,240) : '' };
  }
  function containsText(haystack, needle){ return String(haystack || '').toLowerCase().indexOf(String(needle || '').toLowerCase()) !== -1; }

  function callEvents(){
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.call-event, .call-log, [data-call-id], [data-call-status]'));
    return nodes.slice(-20).map(function(el){ return { element: desc(el), text: String(el.textContent || '').trim().replace(/\s+/g,' ').slice(0,240), dataset: copyDataset(el), rect: rectOf(el), topElement: topAt(el) }; });
  }
  function timelineCallText(){
    var all = Array.prototype.slice.call(document.querySelectorAll('body *'));
    var matches = [];
    for(var i=0;i<all.length;i++){
      var el = all[i]; var t = String(el.textContent || '').trim().replace(/\s+/g,' ');
      if(!t || t.length > 260) continue;
      if(/Appel\s+(reçu|émis|entrant|sortant)|appel\s+(reçu|émis|entrant|sortant)|Contact accepté|conversation ouverte/.test(t)){
        matches.push({ element: desc(el), text: t.slice(0,220), rect: rectOf(el), topElement: topAt(el) });
      }
      if(matches.length >= 30) break;
    }
    return matches;
  }
  function expectedActionsFromText(text){
    var t = String(text || '').toLowerCase();
    if(!t) return [];
    if(containsText(t,'en attente') && (containsText(t,'reçu') || containsText(t,'entrant'))) return ['accept','refuse'];
    if(containsText(t,'en attente') && (containsText(t,'émis') || containsText(t,'sortant'))) return ['cancel'];
    if(containsText(t,'expired') || containsText(t,'expir')) return ['retry','message','close'];
    if(containsText(t,'accept')) return ['message','close'];
    if(containsText(t,'refus')) return ['message','close'];
    return [];
  }
  function buttonPresence(){
    var labels = ['Accepter','Refuser','Décrocher','Raccrocher','Annuler','Haut-parleur','Message','Fermer','Je te rappelle','Écris-moi'];
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
    return labels.map(function(label){ var found = buttons.filter(function(b){ return containsText(String(b.textContent || ''), label); }); return { label: label, count: found.length, visibleCount: found.filter(visible).length }; });
  }

  function moduleInfo(){
    var cm = w.CallManager;
    return { hasCallManager: !!cm, hasOpenContactOptions: hasFn(cm, 'openContactOptions'), hasContactByMessage: hasFn(cm, 'contactByMessage'), hasContactByCall: hasFn(cm, 'contactByCall'), hasRequestCall: hasFn(cm, 'requestCall'), hasAcceptCall: hasFn(cm, 'acceptCall'), hasRefuseCall: hasFn(cm, 'refuseCall'), hasCancelCallRequest: hasFn(cm, 'cancelCallRequest'), hasSubscribeIncomingCalls: hasFn(cm, 'subscribeIncomingCalls'), hasLoadCallPreferences: hasFn(cm, 'loadCallPreferences'), hasSetCallPreferences: hasFn(cm, 'setCallPreferences'), hasLoadCallLog: hasFn(cm, 'loadCallLog'), hasIsCallBlocked: hasFn(cm, 'isCallBlocked'), hasGetRuntimeState: hasFn(cm, 'getRuntimeState'), hasCallScreen: !!w.CallScreen, callScreenState: safe(function(){ return w.CallScreen ? w.CallScreen.getState() : null; }, null) };
  }
  function runtimeState(){ var cm = w.CallManager; return hasFn(cm, 'getRuntimeState') ? safe(function(){ return cm.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' }) : { available:false, reason:'CallManager.getRuntimeState not exposed' }; }
  function registryRuntime(){ var ie = w.InteractionEngine; return hasFn(ie, 'getRuntimeState') ? safe(function(){ return ie.getRuntimeState(); }, { hasLedger:false, error:'getRuntimeState threw' }) : { hasLedger:false, reason:'InteractionEngine.getRuntimeState not exposed' }; }
  function audioRuntime(){ var am = w.AudioManager; return hasFn(am, 'getRuntimeState') ? safe(function(){ return am.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' }) : { available:false, reason:'AudioManager not loaded or getRuntimeState missing' }; }
  function notificationRuntime(){ var nr = w.CallNotificationRuntime; return hasFn(nr, 'getRuntimeState') ? safe(function(){ return nr.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' }) : { available:false, reason:'CallNotificationRuntime not loaded or getRuntimeState missing' }; }
  function guardianRuntime(){ var gl = w.GuardianLoop; return hasFn(gl, 'getRuntimeState') ? safe(function(){ return gl.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' }) : { available:false, reason:'GuardianLoop not loaded or getRuntimeState missing' }; }
  function storage(){ return { blockedCount: safe(function(){ return JSON.parse(localStorage.getItem('ic_blocked') || '[]').length; }, null), blockLevelsCount: safe(function(){ return Object.keys(JSON.parse(localStorage.getItem('ic_block_levels') || '{}')).length; }, null), callPrefsCached: safe(function(){ return localStorage.getItem('ic_call_prefs') || null; }, null) }; }

  function environment(){
    return { href: location.href, pathname: location.pathname, search: location.search, serviceWorkerControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller), userAgent: navigator.userAgent, visibilityState: document.visibilityState, cacheMarker: location.search || '', productionBranchAssumption: 'GitHub Pages serves main' };
  }

  async function dbProbe(){
    var cmState = runtimeState();
    var client = w.sb || w.supabaseClient || null;
    if(!client) return {available:false, reason:'no Supabase client'};
    if(!cmState || !cmState.uidKnown) return {available:false, reason:'uid not known in CallManager runtime'};
    try{
      var auth = await client.auth.getUser();
      var uid = auth && auth.data && auth.data.user && auth.data.user.id;
      if(!uid) return {available:false, reason:'auth user unavailable'};
      var out = {available:true, uidKnown:true};
      var sent = await client.from('call_requests').select('id,receiver_plate,status,expires_at,created_at').eq('requester_id', uid).eq('status','pending').order('created_at',{ascending:false}).limit(5);
      var received = await client.from('call_requests').select('id,requester_plate,status,expires_at,created_at').eq('receiver_id', uid).eq('status','pending').order('created_at',{ascending:false}).limit(5);
      out.pendingOutgoing = sent.data || [];
      out.pendingIncoming = received.data || [];
      out.pendingOutgoingCount = out.pendingOutgoing.length;
      out.pendingIncomingCount = out.pendingIncoming.length;
      out.errors = [sent.error && sent.error.message, received.error && received.error.message].filter(Boolean);
      out.hasDbRuntimeDivergence = (cmState.pendingCallId == null && out.pendingOutgoingCount > 0);
      return out;
    }catch(e){ return {available:false, error:String(e && (e.stack || e.message) || e)}; }
  }

  function messageUiProbe(){
    var activeRows = [];
    try{
      activeRows = Array.prototype.slice.call(document.querySelectorAll('.ic-conv-row,.ic-thread-row,[data-plate]')).slice(0,20).map(function(el){ return {element:desc(el), text:String(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,180), dataset:copyDataset(el), visible:visible(el), topElement:topAt(el), rect:rectOf(el)}; });
    }catch(e){}
    return { activePanel: safe(function(){ return Array.prototype.slice.call(document.querySelectorAll('[id^="panel"].on')).map(function(e){ return e.id; }); }, []), icMessagesPro: elState('icMessagesPro'), icMsgList: elState('icMsgList'), icThread: elState('icThread'), icThreadBody: elState('icThreadBody'), icComposePanel: elState('icComposePanel'), visibleRowsCount: activeRows.filter(function(r){return r.visible;}).length, rowSample: activeRows };
  }

  function blockerProbe(){
    var candidates = ['sheet','nearbyPanel','drawer','vehicleContextMenu','angeOverlay','angePanel','onboardingOverlay','icSheetBackdrop','icBottomSheet','callContactModal','callIncomingPopup','callSentBanner','callNotAllowedModal','floatingCard','callOverlay','guardianDashboard'];
    return candidates.map(function(id){ var s = elState(id); s.blocksCenter = s.visible && s.topElement && s.topElement.indexOf('#'+id) >= 0; return s; }).filter(function(s){ return s.exists; });
  }

  function conclusions(base, db){
    var notes = [];
    var rs = base.runtimeState || {};
    if(rs.realtimeStatus !== 'SUBSCRIBED') notes.push({severity:'warn', code:'REALTIME_NOT_SUBSCRIBED', message:'Realtime not confirmed subscribed.'});
    if(db && db.hasDbRuntimeDivergence) notes.push({severity:'error', code:'DB_RUNTIME_DIVERGENCE', message:'Runtime has no pendingCallId but DB still has outgoing pending rows.'});
    var timeline = base.visible && base.visible.timelineCallTexts || [];
    if(timeline.some(function(x){ return containsText(x.text, 'conversation ouverte'); })) notes.push({severity:'error', code:'LEGACY_ACCEPTED_WORDING', message:'UI still contains legacy “conversation ouverte” wording.'});
    var buttons = base.visible && base.visible.buttonPresence || [];
    var msg = buttons.find(function(b){return b.label==='Message';});
    var close = buttons.find(function(b){return b.label==='Fermer';});
    if(rs.callScreenMode === 'accepted' && (!msg || !msg.visibleCount || !close || !close.visibleCount)) notes.push({severity:'error', code:'ACCEPTED_ACTIONS_MISSING', message:'Accepted state should expose Message and Fermer actions.'});
    return notes;
  }

  async function runDeep(){
    var base = run();
    var db = await dbProbe();
    base.dbProbe = db;
    base.messageUiProbe = messageUiProbe();
    base.blockerProbe = blockerProbe();
    base.conclusions = conclusions(base, db);
    return base;
  }

  function run(){
    var timeline = timelineCallText();
    var structured = callEvents();
    return { at: Date.now(), build: 'calls-runtime-diagnostics-v2-professional', environment: environment(), module: moduleInfo(), runtimeState: runtimeState(), registryRuntime: registryRuntime(), audioRuntime: audioRuntime(), notificationRuntime: notificationRuntime(), guardianRuntime: guardianRuntime(), storage: storage(), dom: { callScreen: elState('callScreen'), callOverlay: elState('callOverlay'), callIncomingPopup: elState('callIncomingPopup'), callSentBanner: elState('callSentBanner'), callContactModal: elState('callContactModal'), callNotAllowedModal: elState('callNotAllowedModal'), callAudio: elState('callAudio'), callAudioIncoming: elState('callAudioIncoming'), callAudioOutgoing: elState('callAudioOutgoing'), messageAudioBeep: elState('messageAudioBeep'), callIncomingPlate: elState('callIncomingPlate'), callSentPlate: elState('callSentPlate') }, visible: { structuredCallEventsCount: structured.length, structuredCallEvents: structured, timelineCallTextsCount: timeline.length, timelineCallTexts: timeline.map(function(x){ x.expectedActions = expectedActionsFromText(x.text); return x; }), buttonPresence: buttonPresence() } };
  }

  w.ImmatCallsRuntimeDiagnostics = { run: run, runDeep: runDeep };
})(window);
