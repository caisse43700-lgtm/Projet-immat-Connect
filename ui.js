/* ===== IMMATCONNECT UI — V6 OBD CLOSE MANAGER ===== */
(function(){
  'use strict';
  if(window.__ImmatConnectUIObdCloseManager) return;
  window.__ImmatConnectUIObdCloseManager = true;

  const $ = id => document.getElementById(id);
  const BUS = () => window.ImmatBus || null;

  function emit(event,payload){
    try{ BUS()?.emit?.(event, payload || {}); }catch(e){}
    try{ window.ImmatOrganism?.observe?.(event, payload || {}); }catch(e){}
  }

  function normalize(name){
    name = String(name || '').toLowerCase();
    if(name === 'alert' || name === 'alerte') return 'altet';
    if(name === 'contact' || name === 'message' || name === 'reçus' || name === 'received') return 'messages';
    if(name === 'activité' || name === 'activity') return 'activite';
    return name;
  }

  function hide(el){
    if(!el) return;
    el.classList.remove('show','open','active');
  }

  function closeFloating(except){
    const ids = [
      'nearbyPanel','drawer','legal','blocked','recent','vehicleContextMenu',
      'callContactModal','callNotAllowedModal','callIncomingPopup','callSentBanner'
    ];
    ids.forEach(id => {
      if(except && id === except) return;
      hide($(id));
    });
    document.querySelectorAll('.overlay.show,.modal.show,.drawer.show,.vehicle-context-menu.show').forEach(el => {
      if(except && el.id === except) return;
      hide(el);
    });
    const here = $('fabSignalHere');
    if(here && except !== 'fabSignalHere') here.style.display = 'none';
    emit('UI_FLOATING_CLOSED', { except: except || null });
  }

  function showSheet(){
    const sheet = $('sheet');
    if(!sheet) return;
    sheet.style.display = '';
    sheet.classList.remove('mini');
    delete sheet.dataset.uiHidden;
  }

  function hideSheet(){
    const sheet = $('sheet');
    if(!sheet) return;
    sheet.dataset.uiHidden = '1';
    sheet.style.display = 'none';
    sheet.classList.add('mini');
    sheet.classList.remove('full');
  }

  function syncNav(name){
    const map = { altet:'navSignaler', messages:'navActivite', activite:'navActivite' };
    ['navMap','navSignaler','navActivite'].forEach(id => {
      const el = $(id);
      if(el) el.classList.toggle('on', map[name] === id);
    });
  }

  const panels = [['altet','Altet'],['drive','Drive'],['messages','Messages'],['settings','Settings'],['activite','Activite']];

  function setPanel(name){
    name = normalize(name);
    closeFloating(null);
    syncNav(name);
    panels.forEach(([key,id]) => {
      const active = key === name;
      $('panel' + id)?.classList.toggle('on', active);
      $('tab' + id)?.classList.toggle('on', active);
    });
    $('panelContact')?.classList.remove('on');
    showSheet();
    try{ window.App?.openSheet?.(); }catch(e){}
    emit('UI_PANEL_OPENED', { panel:name });
  }

  function openMessagesInbox(){
    closeFloating(null);
    showSheet();
    setPanel('messages');
    setTimeout(() => {
      try{ window.ImmatMessages?.setMode?.('inbox'); }catch(e){}
      try{ window.ImmatMessages?.refresh?.(); }catch(e){}
      syncBadge();
    }, 80);
  }

  function syncBadge(){
    try{
      const count = Number(window.S?.unreadMsgCount || localStorage.getItem('ic_unread_msg_count') || 0);
      if(typeof window.setUnreadMsgCount === 'function') window.setUnreadMsgCount(count);
      document.querySelectorAll('.status-mail-badge').forEach(b => { b.textContent=''; b.style.display='none'; });
    }catch(e){}
  }

  window.UIManager = {
    openSheetPanel: setPanel,
    openMessagesInbox,
    closeFloatingPanels: closeFloating,
    hideSheetCompletely: hideSheet,
    showSheetAgain: showSheet,
    syncBadge,
    closeAllUI: closeFloating
  };

  function patchApp(){
    if(!window.App){ setTimeout(patchApp, 250); return; }
    if(App.__ImmatConnectUIObdPatched) return;
    App.__ImmatConnectUIObdPatched = true;

    const oldPanel = typeof App.panel === 'function' ? App.panel.bind(App) : null;
    App.panel = function(name){
      name = normalize(name);
      closeFloating(null);
      showSheet();
      try{ oldPanel?.(name); }catch(e){}
      setPanel(name);
      if(name === 'messages') setTimeout(() => { try{ window.ImmatMessages?.refresh?.(); }catch(e){} syncBadge(); }, 100);
      if(name === 'altet') setTimeout(() => { try{ App.renderAlerts?.(); }catch(e){} try{ App.renderMyAlertsBlock?.(); }catch(e){} syncBadge(); }, 100);
      if(name === 'activite') setTimeout(() => { try{ App.renderActivityFeed?.(); }catch(e){} try{ App.updateActBadge?.(); }catch(e){} }, 100);
      emit('UI_PANEL_PATCHED_OPENED', { panel:name });
    };

    App.openInboxBadge = function(){ openMessagesInbox(); };

    const oldUpdate = typeof App.updateCommunityStatus === 'function' ? App.updateCommunityStatus.bind(App) : null;
    App.updateCommunityStatus = function(){
      try{ oldUpdate?.(); }catch(e){}
      syncBadge();
    };

    App.openReport = function(){
      closeFloating(null);
      try{ App.panel('altet'); }catch(e){}
      try{ App._sigReset?.(); }catch(e){}
      emit('UI_REPORT_OPENED', {});
    };

    const oldOpenNearby = typeof App.openNearby === 'function' ? App.openNearby.bind(App) : null;
    App.openNearby = function(){
      hideSheet();
      closeFloating('nearbyPanel');
      try{ oldOpenNearby?.(); }catch(e){}
      $('nearbyPanel')?.classList.add('show');
      emit('UI_OVERLAY_OPENED', { overlay:'nearbyPanel' });
    };

    const oldCloseOverlay = typeof App.closeOverlay === 'function' ? App.closeOverlay.bind(App) : null;
    App.closeOverlay = function(id){
      try{ oldCloseOverlay?.(id); }catch(e){}
      hide($(id));
      setTimeout(() => {
        if(!document.querySelector('.overlay.show,.modal.show,.drawer.show')) showSheet();
      }, 30);
      emit('UI_OVERLAY_CLOSED', { overlay:id || null });
    };

    const oldOpenDrawer = typeof App.openDrawer === 'function' ? App.openDrawer.bind(App) : null;
    App.openDrawer = function(){
      hideSheet();
      closeFloating('drawer');
      try{ oldOpenDrawer?.(); }catch(e){}
      $('drawer')?.classList.add('show');
      emit('UI_OVERLAY_OPENED', { overlay:'drawer' });
    };

    const oldCloseDrawer = typeof App.closeDrawer === 'function' ? App.closeDrawer.bind(App) : null;
    App.closeDrawer = function(){
      try{ oldCloseDrawer?.(); }catch(e){}
      hide($('drawer'));
      showSheet();
      emit('UI_OVERLAY_CLOSED', { overlay:'drawer' });
    };

    document.addEventListener('click', function(e){
      const mailBtn = e.target.closest('.top-mail-btn');
      if(!mailBtn) return;
      e.preventDefault();
      e.stopPropagation();
      openMessagesInbox();
    }, true);

    syncBadge();
    emit('UI_OBD_CLOSE_MANAGER_READY', {});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchApp);
  else patchApp();
})();
