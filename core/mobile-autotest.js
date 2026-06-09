/* core/mobile-autotest.js — Autotest mobile OBD lecture seule
 * Objectif: diagnostiquer les écarts entre DOM, taps, handlers et UI.
 * Ne crée aucun signalement, n'envoie aucun message, ne lance aucun appel.
 */
(function(w){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function desc(el){
    if(!el) return '-';
    var id = el.id ? '#' + el.id : '';
    var cls = '';
    try{
      if(typeof el.className === 'string' && el.className.trim()) cls='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');
    }catch(e){}
    return String(el.tagName||'').toLowerCase()+id+cls;
  }
  function rectOf(el){
    if(!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)};
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
    var r=el.getBoundingClientRect();
    if(!r.width || !r.height) return 'no-rect';
    var x=Math.max(1,Math.min(w.innerWidth-1,r.left+r.width/2));
    var y=Math.max(1,Math.min(w.innerHeight-1,r.top+r.height/2));
    return desc(document.elementFromPoint(x,y));
  }
  function basicEl(label, el){
    var cs=cssOf(el), r=rectOf(el);
    var visible=!!(el && r && r.w>0 && r.h>0 && cs && cs.display!=='none' && cs.visibility!=='hidden' && cs.opacity!=='0');
    return {label:label, exists:!!el, visible:visible, topElement:topAt(el), onclick:!!(el && typeof el.onclick==='function'), css:cs, rect:r, element:desc(el)};
  }
  function bySelector(label, sel){ return basicEl(label, document.querySelector(sel)); }
  function byId(label, id){ return basicEl(label, $(id)); }

  function selfMarker(){
    var m = w.S && w.S.myMarker;
    var icon = m && m.options && m.options.icon;
    var opt = icon && icon.options || {};
    var events = m && m._events || {};
    return {
      exists: !!m,
      hasClickHandler: !!events.click,
      clickHandlerCount: Array.isArray(events.click) ? events.click.length : (events.click ? 1 : 0),
      iconExists: !!icon,
      iconClass: icon && icon.constructor && icon.constructor.name || null,
      iconOptionsClassName: opt.className || '',
      iconHtmlSnippet: opt.html ? String(opt.html).slice(0,180) : '',
      latLng: m && typeof m.getLatLng==='function' ? m.getLatLng() : null,
      contextMenu: byId('vehicleContextMenu','vehicleContextMenu')
    };
  }

  function signaler(){
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.sig-cat-btn'));
    return {
      sigStep1: byId('sigStep1','sigStep1'),
      panelAltet: byId('panelAltet','panelAltet'),
      buttonsCount: buttons.length,
      buttons: buttons.map(function(b,i){ return basicEl('sig-cat-btn-'+i,b); }),
      activeStep: desc(document.querySelector('.sig-step.active')),
      hasFns: {
        navSignaler: typeof w.App?.navSignaler === 'function',
        sigStepRoute: typeof w.App?.sigStepRoute === 'function',
        sigStepVehicle: typeof w.App?.sigStepVehicle === 'function',
        sigStepAide: typeof w.App?.sigStepAide === 'function'
      }
    };
  }

  function ange(){
    return {
      fab: byId('angeFab','angeFab'),
      overlay: byId('angeOverlay','angeOverlay'),
      panel: byId('angePanel','angePanel'),
      dialogExists: !!w.AngeDialog,
      openExists: typeof w.AngeDialog?.open === 'function',
      sendExists: typeof w.AngeDialog?.send === 'function',
      responseEl: byId('angeResponse','angeResponse')
    };
  }

  function modules(){
    return {
      App: !!w.App,
      ImmatBus: !!w.ImmatBus,
      ImmatBusGetJournal: typeof w.ImmatBus?.getJournal === 'function',
      ImmatMessages: !!w.ImmatMessages,
      ImmatMessagesRuntimeDiagnostics: !!w.ImmatMessagesRuntimeDiagnostics,
      CallManager: !!w.CallManager,
      CallScreen: !!w.CallScreen,
      AudioManager: !!w.AudioManager,
      AudioManagerGetRuntimeState: typeof w.AudioManager?.getRuntimeState === 'function',
      CallNotificationRuntime: !!w.CallNotificationRuntime,
      CallNotificationRuntimeGetRuntimeState: typeof w.CallNotificationRuntime?.getRuntimeState === 'function',
      InteractionEngine: !!w.InteractionEngine,
      InteractionEngineGetRuntimeState: typeof w.InteractionEngine?.getRuntimeState === 'function',
      GuardianLoop: !!w.GuardianLoop,
      GuardianLoopGetRuntimeState: typeof w.GuardianLoop?.getRuntimeState === 'function',
      AngeDialog: !!w.AngeDialog,
      journalCount: (typeof w.ImmatBus?.getJournal === 'function') ? w.ImmatBus.getJournal().length : null,
      appFns: {
        openDrawer: typeof w.App?.openDrawer === 'function',
        openNearby: typeof w.App?.openNearby === 'function',
        closeOverlay: typeof w.App?.closeOverlay === 'function',
        panel: typeof w.App?.panel === 'function',
        locate: typeof w.App?.locate === 'function',
        recenter: typeof w.App?.recenter === 'function',
        navSignaler: typeof w.App?.navSignaler === 'function',
        navActivite: typeof w.App?.navActivite === 'function'
      }
    };
  }

  function messagesRuntime(){
    try{
      if(w.ImmatMessagesRuntimeDiagnostics && typeof w.ImmatMessagesRuntimeDiagnostics.run === 'function'){
        return w.ImmatMessagesRuntimeDiagnostics.run();
      }
      return {available:false, reason:'ImmatMessagesRuntimeDiagnostics not loaded'};
    }catch(e){
      return {available:false, error:String(e && (e.stack || e.message) || e)};
    }
  }

  function callsRuntime(){
    try{
      if(w.ImmatCallsRuntimeDiagnostics && typeof w.ImmatCallsRuntimeDiagnostics.run === 'function'){
        return w.ImmatCallsRuntimeDiagnostics.run();
      }
      return {available:false, reason:'ImmatCallsRuntimeDiagnostics not loaded'};
    }catch(e){
      return {available:false, error:String(e && (e.stack || e.message) || e)};
    }
  }

  function panels(){
    var ids=['appScreen','sheet','nearbyPanel','drawer','vehicleContextMenu','angeFab','angeOverlay','angePanel','onboardingOverlay','icSheetBackdrop','icBottomSheet','callContactModal','callIncomingPopup','callSentBanner','callNotAllowedModal','navMap','navSignaler','navActivite',
      'floatingCard','callOverlay'];
    return ids.map(function(id){ return byId(id,id); });
  }

  function sheetState(){
    var sheet=document.getElementById('sheet');
    if(!sheet) return {exists:false};
    var cs=w.getComputedStyle?w.getComputedStyle(sheet):null;
    var cl=sheet.className||'';
    var isMini=sheet.classList.contains('mini');
    var isFull=sheet.classList.contains('full');
    var pe=cs?cs.pointerEvents:'';
    var tr=cs?cs.transform:'';
    return {
      exists:true,
      classes:cl,
      isMini:isMini,
      isFull:isFull,
      pointerEvents:pe,
      transform:tr.slice(0,60),
      rect:rectOf(sheet)
    };
  }

  function activePanels(){
    var panelIds=['panelAltet','panelDrive','panelMessages','panelSettings','panelActivite'];
    var active=panelIds.filter(function(id){
      var el=document.getElementById(id);
      return el&&el.classList.contains('on');
    });
    var content={
      icMsgListDisplay: (function(){var e=document.getElementById('icMsgList');return e?e.style.display||'(css)':'missing';})(),
      icThreadShow: (function(){var e=document.getElementById('icThread');return e?e.classList.contains('show'):'missing';})(),
      icComposePanelShow: (function(){var e=document.getElementById('icComposePanel');return e?e.classList.contains('show'):'missing';})(),
      actCatPanelDisplay: (function(){var e=document.getElementById('actCatPanel');return e?e.style.display||'(css)':'missing';})(),
      sigStep1Active: (function(){var e=document.getElementById('sigStep1');return e?e.classList.contains('active'):'missing';})(),
      floatingCardDisplay: (function(){var e=document.getElementById('floatingCard');return e?e.style.display||'(css)':'missing';})(),
      callOverlayDisplay: (function(){var e=document.getElementById('callOverlay');return e?e.style.display||'(css)':'missing';})()
    };
    return {active:active, content:content};
  }

  function buttons(){
    return [
      bySelector('profileChip','.profile-chip'),
      bySelector('recenterFab','button[title="Recentrer"]'),
      bySelector('nearbyFab','button[title="Conducteurs proches"]'),
      bySelector('viewFab','button[title="Vue"]'),
      byId('navMap','navMap'),
      byId('navSignaler','navSignaler'),
      byId('navActivite','navActivite'),
      byId('angeFab','angeFab')
    ];
  }

  // ── Phase 10 — Expanded autotests ───────────────────────────────────────────

  function messagesAutotest(){
    var im = w.ImmatMessages;
    var ie = w.InteractionEngine;
    var byType = {};
    try{ if(ie && typeof ie.getRuntimeState==='function') byType=ie.getRuntimeState().byType||{}; }catch(e){}
    var orphans = [];
    try{
      orphans = Array.prototype.slice.call(document.querySelectorAll('.conversation,.thread-panel,.message-thread')).filter(function(el){
        return !el.closest('#panelMessages') && el.offsetParent!==null;
      });
    }catch(e){}
    return {
      moduleLoaded: !!im,
      hasSendToPlate: typeof (im && im.sendToPlate)==='function',
      hasSetMode: typeof (im && im.setMode)==='function',
      contextBadgesSupported: typeof (im && im.sendToPlate)==='function',
      dom: {
        panel: byId('panelMessages','panelMessages'),
        composePlate: byId('icComposePlate','icComposePlate'),
        composeText: byId('icComposeText','icComposeText'),
      },
      noParallelThreads: orphans.length===0,
      parallelThreadCount: orphans.length,
      ledgerMessages: (byType.MESSAGE||0)+(byType.THANKS||0),
    };
  }

  function callsAutotest(){
    var callScrMod = w.CallScreen;
    var audioMgr = w.AudioManager;
    var audioBlocked = false;
    var callScreenHiddenByDefault = true;
    var ghostEls = [];
    var privacyOk = true;
    try{
      if(audioMgr && typeof audioMgr.getRuntimeState==='function'){
        var amState = audioMgr.getRuntimeState();
        // Phase 7+ : synthèse Web Audio — audioBlocked seulement si ni fichier ni synthèse disponible
        audioBlocked = !(amState && (amState.synthAvailable || amState.incomingRingtoneReady));
      }
    }catch(e){}
    try{
      var co = $('callOverlay');
      if(co){ var cr = rectOf(co); callScreenHiddenByDefault = !(cr && cr.w>0 && cr.h>0); }
    }catch(e){}
    try{
      var authorizedIds = ['callOverlay','callScreen','angeOverlay','onboardingOverlay','vehicleContextMenu','drawer','nearbyPanel'];
      var allEls = Array.prototype.slice.call(document.body ? document.body.querySelectorAll('*') : []);
      for(var i=0; i<Math.min(allEls.length,2000) && ghostEls.length<5; i++){
        var el = allEls[i];
        var elCss = w.getComputedStyle ? w.getComputedStyle(el) : null;
        if(!elCss) continue;
        var zi = parseInt(elCss.zIndex,10)||0;
        if((elCss.position==='fixed'||elCss.position==='sticky') && zi>100 && elCss.display!=='none' && elCss.visibility!=='hidden'){
          var er = rectOf(el);
          if(er && er.w>0 && er.h>0 && authorizedIds.indexOf(el.id)===-1 && !el.closest('#callOverlay') && !el.closest('#angeOverlay') && !el.closest('#drawer')){
            ghostEls.push(desc(el));
          }
        }
      }
    }catch(e){}
    try{
      if(callScrMod && typeof callScrMod.getState==='function'){
        var csState = callScrMod.getState();
        if(csState && csState.mode && csState.mode!=='accepted' && csState.mode!=='idle'){
          var platEl = $('callScreenPlate')||$('callIncomingPlate');
          if(platEl){ var pr = rectOf(platEl); if(pr && pr.w>0 && pr.h>0) privacyOk=false; }
        }
      }
    }catch(e){}

    // Phase 2 — CallScreen plein écran iOS-style
    var csApi = {};
    var csStateIdle = null;
    try{
      ['showIncoming','showOutgoing','showMissed','showExpired','showAccepted',
       'hide','getState','minimize','expand','toggleSpeaker','toggleMute'].forEach(function(fn){
        csApi[fn] = typeof (callScrMod && callScrMod[fn])==='function';
      });
      if(callScrMod && typeof callScrMod.getState==='function'){
        var s = callScrMod.getState(); csStateIdle = s ? s.mode==='idle' : null;
      }
    }catch(e){}

    return {
      callScreenHiddenByDefault: callScreenHiddenByDefault,
      audioBlocked: audioBlocked,
      visualFallbackAvailable: !!callScrMod,
      privacyPreCallAcceptance: privacyOk,
      ghostOverlayCount: ghostEls.length,
      ghostOverlays: ghostEls,
      dom: {
        callOverlay:       byId('callOverlay','callOverlay'),
        callOvFull:        byId('callOvFull','callOvFull'),
        callOvMini:        byId('callOvMini','callOvMini'),
        callOvActions:     byId('callOvActions','callOvActions'),
        callOvAvatarWrap:  byId('callOvAvatarWrap','callOvAvatarWrap'),
        callOvBtnSpeaker:  byId('callOvBtnSpeaker','callOvBtnSpeaker'),
        callOvBtnMute:     byId('callOvBtnMute','callOvBtnMute'),
        callIncomingPopup: byId('callIncomingPopup','callIncomingPopup'),
        callSentBanner:    byId('callSentBanner','callSentBanner'),
      },
      callScreenApi: csApi,
      callScreenStateIdle: csStateIdle,
    };
  }

  function audioAutotest(){
    var am = w.AudioManager;
    var state = null;
    try{ if(am && typeof am.getRuntimeState==='function') state=am.getRuntimeState(); }catch(e){}
    return {
      moduleLoaded:          !!am,
      hasPlayIncoming:       typeof (am && am.playIncomingRingtone)==='function',
      hasPlayOutgoing:       typeof (am && am.playOutgoingTone)==='function',
      hasStopCallAudio:      typeof (am && am.stopCallAudio)==='function',
      hasStopAll:            typeof (am && am.stopAll)==='function',
      hasSetVolume:          typeof (am && am.setVolume)==='function',
      hasUnlockFromGesture:  typeof (am && am.unlockFromUserGesture)==='function',
      synthAvailable:        state ? !!state.synthAvailable : null,
      webAudioState:         state ? (state.webAudioContextState||null) : null,
      unlockedByGesture:     state ? !!state.unlockedByUserGesture : null,
      currentlyPlaying:      state ? (state.currentlyPlaying||'none') : null,
      soundsEnabled:         state ? state.soundsEnabled : null,
      lastError:             state ? (state.lastAudioError||null) : null,
      lastBlocked:           state ? !!state.lastAudioBlocked : null,
    };
  }

  function contactNavAutotest(){
    return {
      hasSwitchContactTab:  typeof (w.App && w.App.switchContactTab)==='function',
      hasRenderCallJournal: typeof (w.App && w.App.renderCallJournal)==='function',
      hasCallFromJournal:   typeof (w.App && w.App.callFromJournal)==='function',
      dom: {
        tabAppels:   byId('icTabAppels','icTabAppels'),
        tabMessages: byId('icTabMessages','icTabMessages'),
        appelsPane:  byId('icAppelsPane','icAppelsPane'),
        callLog:     byId('icCallLog','icCallLog'),
        msgList:     byId('icMsgList','icMsgList'),
      },
    };
  }

  function helpAutotest(){
    var ie = w.InteractionEngine;
    var byType = {};
    try{ if(ie && typeof ie.getRuntimeState==='function') byType=ie.getRuntimeState().byType||{}; }catch(e){}
    return {
      hasAssistFn: typeof (w.App && w.App.assist)==='function',
      hasMapLink: !!(w.App && (typeof w.App.locate==='function' || typeof w.App.navMap==='function')),
      hasMessageLink: typeof (w.ImmatMessages && w.ImmatMessages.sendToPlate)==='function',
      dom: {
        panelAltet: byId('panelAltet','panelAltet'),
        sigStep1: byId('sigStep1','sigStep1'),
      },
      ledgerHelp: byType.HELP||0,
    };
  }

  function reportsAutotest(){
    var ie = w.InteractionEngine;
    var byType = {};
    try{ if(ie && typeof ie.getRuntimeState==='function') byType=ie.getRuntimeState().byType||{}; }catch(e){}
    var sigBtns = 0;
    try{ sigBtns = document.querySelectorAll('.sig-cat-btn').length; }catch(e){}
    return {
      hasNavSignaler: typeof (w.App && w.App.navSignaler)==='function',
      hasRoadReport: typeof (w.App && w.App.roadReport)==='function',
      hasMessageLink: typeof (w.ImmatMessages && w.ImmatMessages.sendToPlate)==='function',
      hasMapLink: typeof (w.App && w.App.locate)==='function',
      dom: {
        panelAltet: byId('panelAltet','panelAltet'),
        sigCatBtnCount: sigBtns,
      },
      ledgerVehicleAlerts: byType.VEHICLE_ALERT||0,
      ledgerRoadAlerts: byType.ROAD_ALERT||0,
    };
  }

  function registryAutotest(){
    var ie = w.InteractionEngine;
    var state = null;
    try{ if(ie && typeof ie.getRuntimeState==='function') state=ie.getRuntimeState(); }catch(e){}
    return {
      moduleLoaded: !!ie,
      hasGetHistory: typeof (ie && ie.getHistory)==='function',
      hasGetAnalytics: typeof (ie && ie.getAnalytics)==='function',
      state: state,
      readOnly: true,
      noFailedWrites: state ? state.failedWrites===0 : null,
      canRebuildConversation: state ? state.canRebuildConversation : null,
    };
  }

  function angeGuardianAutotest(){
    var gl = w.GuardianLoop;
    var pending = [];
    var allHaveEvidence = true;
    var noAutoApplied = true;
    try{
      if(gl && typeof gl.getPending==='function'){
        pending = gl.getPending()||[];
        allHaveEvidence = pending.every(function(r){ return r.evidence && r.evidence.length>0; });
        if(typeof gl.getAll==='function'){
          var all = gl.getAll(null,{limit:50})||[];
          noAutoApplied = all.every(function(r){ return r.status!=='applied'||r.decision!==null; });
        }
      }
    }catch(e){}
    var angeOrphanThread = false;
    try{
      angeOrphanThread = document.querySelectorAll('[id^="angeThread"],[id^="ange-thread"],.ange-conversation').length>0;
    }catch(e){}
    return {
      ange: {
        moduleLoaded: !!w.AngeDialog,
        hasOpen: typeof (w.AngeDialog && w.AngeDialog.open)==='function',
        hasSend: typeof (w.AngeDialog && w.AngeDialog.send)==='function',
        noOrphanThread: !angeOrphanThread,
        dom: {
          fab: byId('angeFab','angeFab'),
          overlay: byId('angeOverlay','angeOverlay'),
        },
      },
      guardian: {
        moduleLoaded: !!gl,
        hasObserve: typeof (gl && gl.observe)==='function',
        hasValidate: typeof (gl && gl.validate)==='function',
        hasGetRuntimeState: typeof (gl && gl.getRuntimeState)==='function',
        pendingCount: pending.length,
        allHaveEvidence: allHaveEvidence,
        noAutoApplied: noAutoApplied,
      },
    };
  }

  function run(){
    var out={
      at: Date.now(),
      viewport:{w:w.innerWidth,h:w.innerHeight,dpr:w.devicePixelRatio||1},
      modules: modules(),
      buttons: buttons(),
      selfMarker: selfMarker(),
      ange: ange(),
      signaler: signaler(),
      messagesRuntime: messagesRuntime(),
      callsRuntime: callsRuntime(),
      panels: panels(),
      sheetState: sheetState(),
      activePanels: activePanels(),
      messagesAutotest: messagesAutotest(),
      callsAutotest: callsAutotest(),
      audioAutotest: audioAutotest(),
      contactNavAutotest: contactNavAutotest(),
      helpAutotest: helpAutotest(),
      reportsAutotest: reportsAutotest(),
      registryAutotest: registryAutotest(),
      angeGuardianAutotest: angeGuardianAutotest(),
    };
    try{ if(w.ImmatBus) w.ImmatBus.emit('OBD_STATUS_CHECKED',{source:'mobileAutotest', ok:true}); }catch(e){}
    return out;
  }

  w.ImmatMobileAutotest = { run: run };
})(window);
