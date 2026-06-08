/* core/calls-runtime-diagnostics.js — diagnostic appels lecture seule
 * Ne modifie aucune donnée, n'ouvre aucun appel, n'écrit pas dans localStorage/Supabase.
 */
(function(w){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ return fn(); }catch(e){ return fallback; } }
  function desc(el){
    if(!el) return '-';
    var id = el.id ? '#' + el.id : '';
    var cls = '';
    try{
      if(typeof el.className === 'string' && el.className.trim()){
        cls = '.' + el.className.trim().split(/\s+/).slice(0,4).join('.');
      }
    }catch(e){}
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
    return {
      display: cs ? cs.display : (el.style && el.style.display || ''),
      visibility: cs ? cs.visibility : '',
      opacity: cs ? cs.opacity : '',
      zIndex: cs ? cs.zIndex : '',
      pointerEvents: cs ? cs.pointerEvents : '',
      position: cs ? cs.position : ''
    };
  }
  function topAt(el){
    if(!el || !el.getBoundingClientRect || !document.elementFromPoint) return '-';
    var r = el.getBoundingClientRect();
    if(!r.width || !r.height) return 'no-rect';
    var x = Math.max(1, Math.min(w.innerWidth - 1, r.left + r.width / 2));
    var y = Math.max(1, Math.min(w.innerHeight - 1, r.top + r.height / 2));
    return desc(document.elementFromPoint(x, y));
  }
  function elState(id){
    var el = $(id);
    var css = cssOf(el);
    var rect = rectOf(el);
    var visible = !!(el && rect && rect.w > 0 && rect.h > 0 && css && css.display !== 'none' && css.visibility !== 'hidden' && css.opacity !== '0');
    return {
      id: id,
      exists: !!el,
      visible: visible,
      element: desc(el),
      css: css,
      rect: rect,
      topElement: topAt(el),
      dataset: el ? Object.assign({}, el.dataset || {}) : null,
      text: el && visible ? String(el.textContent || '').trim().slice(0,240) : ''
    };
  }
  function callEvents(){
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.call-event, .call-log, [data-call-id], [data-call-status]'));
    return nodes.slice(-20).map(function(el){
      return {
        element: desc(el),
        text: String(el.textContent || '').trim().replace(/\s+/g,' ').slice(0,240),
        dataset: Object.assign({}, el.dataset || {}),
        rect: rectOf(el),
        topElement: topAt(el)
      };
    });
  }
  function timelineCallText(){
    var all = Array.prototype.slice.call(document.querySelectorAll('body *'));
    var matches = [];
    for(var i=0;i<all.length;i++){
      var el = all[i];
      var t = String(el.textContent || '').trim().replace(/\s+/g,' ');
      if(!t || t.length > 260) continue;
      if(/Appel\s+(reçu|émis|entrant|sortant)|appel\s+(reçu|émis|entrant|sortant)/.test(t)){
        matches.push({ element: desc(el), text: t.slice(0,220), rect: rectOf(el), topElement: topAt(el) });
      }
      if(matches.length >= 20) break;
    }
    return matches;
  }
  function expectedActionsFromText(text){
    var t = String(text || '').toLowerCase();
    if(!t) return [];
    if(t.includes('en attente') && (t.includes('reçu') || t.includes('entrant'))) return ['accept','refuse','message'];
    if(t.includes('en attente') && (t.includes('émis') || t.includes('sortant'))) return ['cancel','message'];
    if(t.includes('expired') || t.includes('expir')) return ['retry','message','close'];
    if(t.includes('accept')) return ['message','close'];
    if(t.includes('refus')) return ['message','close'];
    return [];
  }
  function buttonPresence(){
    var labels = ['Accepter','Refuser','Décrocher','Raccrocher','Annuler','Haut-parleur','Message','Je te rappelle','Écris-moi'];
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
    return labels.map(function(label){
      var found = buttons.filter(function(b){ return String(b.textContent || '').toLowerCase().includes(label.toLowerCase()); });
      return { label: label, count: found.length, visibleCount: found.filter(function(b){ return !!rectOf(b) && rectOf(b).w > 0 && rectOf(b).h > 0; }).length };
    });
  }
  function moduleInfo(){
    var cm = w.CallManager;
    return {
      hasCallManager: !!cm,
      hasOpenContactOptions: typeof cm?.openContactOptions === 'function',
      hasContactByMessage: typeof cm?.contactByMessage === 'function',
      hasContactByCall: typeof cm?.contactByCall === 'function',
      hasRequestCall: typeof cm?.requestCall === 'function',
      hasAcceptCall: typeof cm?.acceptCall === 'function',
      hasRefuseCall: typeof cm?.refuseCall === 'function',
      hasCancelCallRequest: typeof cm?.cancelCallRequest === 'function',
      hasSubscribeIncomingCalls: typeof cm?.subscribeIncomingCalls === 'function',
      hasLoadCallPreferences: typeof cm?.loadCallPreferences === 'function',
      hasSetCallPreferences: typeof cm?.setCallPreferences === 'function',
      hasLoadCallLog: typeof cm?.loadCallLog === 'function',
      hasIsCallBlocked: typeof cm?.isCallBlocked === 'function',
      hasGetRuntimeState: typeof cm?.getRuntimeState === 'function'
    };
  }
  function runtimeState(){
    var cm = w.CallManager;
    if(cm && typeof cm.getRuntimeState === 'function'){
      return safe(function(){ return cm.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' });
    }
    return { available:false, reason:'CallManager.getRuntimeState not exposed' };
  }
  function storage(){
    return {
      blockedCount: safe(function(){ return JSON.parse(localStorage.getItem('ic_blocked') || '[]').length; }, null),
      blockLevelsCount: safe(function(){ return Object.keys(JSON.parse(localStorage.getItem('ic_block_levels') || '{}')).length; }, null),
      callPrefsCached: safe(function(){ return localStorage.getItem('ic_call_prefs') || null; }, null)
    };
  }
  function run(){
    var timeline = timelineCallText();
    return {
      at: Date.now(),
      build: 'calls-runtime-diagnostics-v1',
      module: moduleInfo(),
      runtimeState: runtimeState(),
      storage: storage(),
      dom: {
        callScreen: elState('callScreen'),
        callOverlay: elState('callOverlay'),
        callIncomingPopup: elState('callIncomingPopup'),
        callSentBanner: elState('callSentBanner'),
        callContactModal: elState('callContactModal'),
        callNotAllowedModal: elState('callNotAllowedModal'),
        callAudio: elState('callAudio'),
        callIncomingPlate: elState('callIncomingPlate'),
        callSentPlate: elState('callSentPlate')
      },
      visible: {
        structuredCallEventsCount: callEvents().length,
        structuredCallEvents: callEvents(),
        timelineCallTextsCount: timeline.length,
        timelineCallTexts: timeline.map(function(x){
          x.expectedActions = expectedActionsFromText(x.text);
          return x;
        }),
        buttonPresence: buttonPresence()
      }
    };
  }

  w.ImmatCallsRuntimeDiagnostics = { run: run };
})(window);
