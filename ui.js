/* ===== IMMATCONNECT UI — V6 SAFE LOGIN BRIDGE ===== */
(function () {
  'use strict';

  if (window.__ImmatConnectUISafeLoginBridge) return;
  window.__ImmatConnectUISafeLoginBridge = true;

  const $ = id => document.getElementById(id);

  function exposeAppIfPossible(){
    try{
      if (!window.App && typeof App !== 'undefined') {
        window.App = App;
      }
    }catch(e){}
  }

  function showAuth(mode){
    exposeAppIfPossible();

    try{
      if (window.App && typeof window.App.goAuth === 'function') {
        window.App.goAuth(mode || 'login');
        return;
      }
    }catch(e){
      console.warn('[UI bridge] App.goAuth failed, fallback auth screen', e);
    }

    // Fallback direct : ouvre l'écran auth même si App n'est pas disponible.
    try{
      ['sw','sa','sp','sr'].forEach(id => $(id)?.classList.remove('active'));
      $('appScreen')?.classList.remove('active');
      $('sa')?.classList.add('active');

      const signup = mode === 'signup';
      if ($('authTitle')) $('authTitle').textContent = signup ? 'Créer un compte' : 'Connexion';
      if ($('authSubtitle')) $('authSubtitle').textContent = signup ? 'Renseigne tes informations conducteur.' : 'Entre ton email et ton mot de passe.';
      if ($('authBtn')) {
        $('authBtn').disabled = false;
        $('authBtn').textContent = signup ? 'Créer mon compte' : 'Se connecter';
      }
      $('tabSignup')?.classList.toggle('active', signup);
      $('tabLogin')?.classList.toggle('active', !signup);
      $('suExtras')?.classList.toggle('hidden', !signup);
      $('confirmWrap')?.classList.toggle('hidden', !signup);
      $('forgotPwdBtn')?.classList.toggle('hidden', signup);
      setTimeout(() => $('iEmail')?.focus(), 60);
    }catch(e){
      console.error('[UI bridge] fallback auth failed', e);
    }
  }

  function bindWelcomeButtons(){
    exposeAppIfPossible();

    const login = $('welcomeLoginBtn');
    if (login && !login.__safeLoginBridge) {
      login.__safeLoginBridge = true;
      login.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        showAuth('login');
      }, true);
    }

    const signup = $('welcomeSignupBtn');
    if (signup && !signup.__safeLoginBridge) {
      signup.__safeLoginBridge = true;
      signup.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        showAuth('signup');
      }, true);
    }
  }

  function normalize(name) {
    name = String(name || '').toLowerCase();
    if (name === 'alert' || name === 'alerte') return 'altet';
    if (name === 'contact' || name === 'message' || name === 'reçus' || name === 'received') return 'messages';
    if (name === 'activité' || name === 'activity') return 'activite';
    return name;
  }

  function hide(el) {
    if (!el) return;
    el.classList.remove('show', 'open', 'active');
  }

  const floating = ['nearbyPanel','drawer','legal','blocked','recent','vehicleContextMenu'];
  const panels = [['altet','Altet'],['drive','Drive'],['messages','Messages'],['settings','Settings'],['activite','Activite']];

  function closeFloating(except) {
    floating.forEach(id => { if (id !== except) hide($(id)); });
  }

  function showSheet() {
    const sheet = $('sheet');
    if (!sheet) return;
    sheet.style.display = '';
    sheet.classList.remove('mini');
    delete sheet.dataset.uiHidden;
  }

  function hideSheet() {
    const sheet = $('sheet');
    if (!sheet) return;
    sheet.dataset.uiHidden = '1';
    sheet.style.display = 'none';
    sheet.classList.add('mini');
    sheet.classList.remove('full');
  }

  function syncNav(name) {
    const map = { altet: 'navSignaler', messages: 'navActivite', activite: 'navActivite' };
    ['navMap', 'navSignaler', 'navActivite'].forEach(id => {
      const el = $(id);
      if (el) el.classList.toggle('on', map[name] === id);
    });
  }

  function setPanel(name) {
    name = normalize(name);
    syncNav(name);
    panels.forEach(([key, id]) => {
      const active = key === name;
      $('panel' + id)?.classList.toggle('on', active);
      $('tab' + id)?.classList.toggle('on', active);
    });
    $('panelContact')?.classList.remove('on');
    showSheet();
    try { window.App?.openSheet?.(); } catch (e) {}
  }

  function syncBadge() {
    try {
      const count = Number(window.S?.unreadMsgCount || localStorage.getItem('ic_unread_msg_count') || 0);
      if (typeof window.setUnreadMsgCount === 'function') window.setUnreadMsgCount(count);
      document.querySelectorAll('.status-mail-badge').forEach(b => { b.textContent = ''; b.style.display = 'none'; });
    } catch (e) {}
  }

  function openMessagesInbox() {
    showSheet();
    closeFloating(null);
    setPanel('messages');
    setTimeout(() => {
      try { window.ImmatMessages?.setMode?.('inbox'); } catch (e) {}
      try { window.ImmatMessages?.refresh?.(); } catch (e) {}
      syncBadge();
    }, 80);
  }

  window.UIManager = {
    openSheetPanel: setPanel,
    openMessagesInbox,
    closeFloatingPanels: closeFloating,
    hideSheetCompletely: hideSheet,
    showSheetAgain: showSheet,
    syncBadge,
    showAuth
  };

  function install() {
    exposeAppIfPossible();
    bindWelcomeButtons();

    if (!window.App) {
      setTimeout(install, 250);
      return;
    }

    if (window.App.__ImmatConnectUIV6Patched) return;
    window.App.__ImmatConnectUIV6Patched = true;

    const oldPanel = typeof window.App.panel === 'function' ? window.App.panel.bind(window.App) : null;
    window.App.panel = function (name) {
      name = normalize(name);
      closeFloating(null);
      showSheet();
      if (oldPanel) { try { oldPanel(name); } catch (e) {} }
      setPanel(name);
      if (name === 'messages') setTimeout(() => { try { window.ImmatMessages?.refresh?.(); } catch (e) {} syncBadge(); }, 100);
      if (name === 'altet') setTimeout(() => { try { window.App.renderAlerts?.(); } catch (e) {} try { window.App.renderMyAlertsBlock?.(); } catch (e) {} syncBadge(); }, 100);
      if (name === 'activite') setTimeout(() => { try { window.App.renderActivityFeed?.(); } catch (e) {} try { window.App.updateActBadge?.(); } catch (e) {} }, 100);
    };

    window.App.openInboxBadge = function () { openMessagesInbox(); };

    const oldUpdate = typeof window.App.updateCommunityStatus === 'function' ? window.App.updateCommunityStatus.bind(window.App) : null;
    window.App.updateCommunityStatus = function () { if (oldUpdate) { try { oldUpdate(); } catch (e) {} } syncBadge(); };

    window.App.openReport = function () { try { window.App.panel('altet'); } catch(e) {} try { window.App._sigReset?.(); } catch(e) {} };

    const oldOpenNearby = typeof window.App.openNearby === 'function' ? window.App.openNearby.bind(window.App) : null;
    window.App.openNearby = function () {
      hideSheet();
      closeFloating('nearbyPanel');
      if (oldOpenNearby) oldOpenNearby();
      $('nearbyPanel')?.classList.add('show');
    };

    const oldCloseOverlay = typeof window.App.closeOverlay === 'function' ? window.App.closeOverlay.bind(window.App) : null;
    window.App.closeOverlay = function (id) {
      if (oldCloseOverlay) oldCloseOverlay(id); else hide($(id));
      setTimeout(() => {
        if (!document.querySelector('.overlay.show,.modal.show,.drawer.show')) showSheet();
      }, 30);
    };

    const oldOpenDrawer = typeof window.App.openDrawer === 'function' ? window.App.openDrawer.bind(window.App) : null;
    window.App.openDrawer = function () {
      hideSheet();
      closeFloating('drawer');
      if (oldOpenDrawer) oldOpenDrawer();
      $('drawer')?.classList.add('show');
    };

    const oldCloseDrawer = typeof window.App.closeDrawer === 'function' ? window.App.closeDrawer.bind(window.App) : null;
    window.App.closeDrawer = function () {
      if (oldCloseDrawer) oldCloseDrawer(); else hide($('drawer'));
      showSheet();
    };

    document.addEventListener('click', function (e) {
      const mailBtn = e.target.closest('.top-mail-btn');
      if (!mailBtn) return;
      e.preventDefault();
      e.stopPropagation();
      openMessagesInbox();
    }, true);

    syncBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  setTimeout(bindWelcomeButtons, 300);
  setTimeout(bindWelcomeButtons, 1000);
})();
