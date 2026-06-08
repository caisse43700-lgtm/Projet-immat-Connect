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
      GuardianLoop: !!w.GuardianLoop,
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
    var ids=['appScreen','sheet','nearbyPanel','drawer','vehicleContextMenu','angeFab','angeOverlay','angePanel','onboardingOverlay','icSheetBackdrop','icBottomSheet','callContactModal','callIncomingPopup','callSentBanner','callNotAllowedModal','navMap','navSignaler','navActivite'];
    return ids.map(function(id){ return byId(id,id); });
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
      panels: panels()
    };
    try{ if(w.ImmatBus) w.ImmatBus.emit('OBD_STATUS_CHECKED',{source:'mobileAutotest', ok:true}); }catch(e){}
    return out;
  }

  w.ImmatMobileAutotest = { run: run };
})(window);
