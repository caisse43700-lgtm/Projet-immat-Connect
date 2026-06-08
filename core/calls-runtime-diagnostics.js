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
  function copyDataset(el){
    var out = {};
    if(!el || !el.dataset) return out;
    for(var k in el.dataset){ if(Object.prototype.hasOwnProperty.call(el.dataset, k)) out[k] = el.dataset[k]; }
    return out;
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
      dataset: el ? copyDataset(el) : null,
      text: el && visible ? String(el.textContent || '').trim().slice(0,240) : ''
    };
  }
  function callEvents(){
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.call-event, .call-log, [data-call-id], [data-call-status]'));
    return nodes.slice(-20).map(function(el){
      return {
        element: desc(el),
        text: String(el.textContent || '').trim().replace(/\s+/g,' ').slice(0,240),
        dataset: copyDataset(el),
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
  function containsText(haystack, needle){ return String(haystack || '').indexOf(needle) !== -1; }
  function expectedActionsFromText(text){
    var t = String(text || '').toLowerCase();
    if(!t) return [];
    if(containsText(t,'en attente') && (containsText(t,'reçu') || containsText(t,'entrant'))) return ['accept','refuse','message'];
    if(containsText(t,'en attente') && (containsText(t,'émis') || containsText(t,'sortant'))) return ['cancel','message'];
    if(containsText(t,'expired') || containsText(t,'expir')) return ['retry','message','close'];
    if(containsText(t,'accept')) return ['message','close'];
    if(containsText(t,'refus')) return ['message','close'];
    return [];
  }
  function buttonPresence(){
    var labels = ['Accepter','Refuser','Décrocher','Raccrocher','Annuler','Haut-parleur','Message','Je te rappelle','Écris-moi'];
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
    return labels.map(function(label){
      var found = buttons.filter(function(b){ return containsText(String(b.textContent || '').toLowerCase(), label.toLowerCase()); });
      return { label: label, count: found.length, visibleCount: found.filter(function(b){ var r = rectOf(b); return !!(r && r.w > 0 && r.h > 0); }).length };
    });
  }
  function moduleInfo(){
    var cm = w.CallManager;
    return {
      hasCallManager: !!cm,
      hasOpenContactOptions: hasFn(cm, 'openContactOptions'),
      hasContactByMessage: hasFn(cm, 'contactByMessage'),
      hasContactByCall: hasFn(cm, 'contactByCall'),
      hasRequestCall: hasFn(cm, 'requestCall'),
      hasAcceptCall: hasFn(cm, 'acceptCall'),
      hasRefuseCall: hasFn(cm, 'refuseCall'),
      hasCancelCallRequest: hasFn(cm, 'cancelCallRequest'),
      hasSubscribeIncomingCalls: hasFn(cm, 'subscribeIncomingCalls'),
      hasLoadCallPreferences: hasFn(cm, 'loadCallPreferences'),
      hasSetCallPreferences: hasFn(cm, 'setCallPreferences'),
      hasLoadCallLog: hasFn(cm, 'loadCallLog'),
      hasIsCallBlocked: hasFn(cm, 'isCallBlocked'),
      hasGetRuntimeState: hasFn(cm, 'getRuntimeState'),
      hasCallScreen: !!w.CallScreen,
      callScreenState: safe(function(){ return w.CallScreen ? w.CallScreen.getState() : null; }, null)
    };
  }
  function runtimeState(){
    var cm = w.CallManager;
    if(hasFn(cm, 'getRuntimeState')){
      return safe(function(){ return cm.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' });
    }
    return { available:false, reason:'CallManager.getRuntimeState not exposed' };
  }
  function registryRuntime(){
    var ie = w.InteractionEngine;
    if(hasFn(ie, 'getRuntimeState')){
      return safe(function(){ return ie.getRuntimeState(); }, { hasLedger:false, error:'getRuntimeState threw' });
    }
    return { hasLedger:false, reason:'InteractionEngine.getRuntimeState not exposed' };
  }
  function audioRuntime(){
    var am = w.AudioManager;
    if(hasFn(am, 'getRuntimeState')){
      return safe(function(){ return am.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' });
    }
    return { available:false, reason:'AudioManager not loaded or getRuntimeState missing' };
  }
  function notificationRuntime(){
    var nr = w.CallNotificationRuntime;
    if(hasFn(nr, 'getRuntimeState')){
      return safe(function(){ return nr.getRuntimeState(); }, { available:false, error:'getRuntimeState threw' });
    }
    return { available:false, reason:'CallNotificationRuntime not loaded or getRuntimeState missing' };
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
    var structured = callEvents();
    return {
      at: Date.now(),
      build: 'calls-runtime-diagnostics-v1',
      module: moduleInfo(),
      runtimeState: runtimeState(),
      registryRuntime: registryRuntime(),
      audioRuntime: audioRuntime(),
      notificationRuntime: notificationRuntime(),
      storage: storage(),
      dom: {
        callScreen: elState('callScreen'),
        callOverlay: elState('callOverlay'),
        callIncomingPopup: elState('callIncomingPopup'),
        callSentBanner: elState('callSentBanner'),
        callContactModal: elState('callContactModal'),
        callNotAllowedModal: elState('callNotAllowedModal'),
        callAudio: elState('callAudio'),
        callAudioIncoming: elState('callAudioIncoming'),
        callAudioOutgoing: elState('callAudioOutgoing'),
        messageAudioBeep: elState('messageAudioBeep'),
        callIncomingPlate: elState('callIncomingPlate'),
        callSentPlate: elState('callSentPlate')
      },
      visible: {
        structuredCallEventsCount: structured.length,
        structuredCallEvents: structured,
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
