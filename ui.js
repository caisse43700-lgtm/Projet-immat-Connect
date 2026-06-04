/* ===== IMMATCONNECT UI — V6 FINAL ===== */
(function () {
  'use strict';

  if (window.__ImmatConnectUIV6) return;
  window.__ImmatConnectUIV6 = true;

  const $ = id => document.getElementById(id);

  function normalize(name) {
    name = String(name || '').toLowerCase();

    if (name === 'alert' || name === 'alerte') {
      return 'altet';
    }

    if (
      name === 'contact' ||
      name === 'message' ||
      name === 'reçus' ||
      name === 'received'
    ) {
      return 'messages';
    }

    if (name === 'activité' || name === 'activity') {
      return 'activite';
    }

    return name;
  }

  function hide(el) {
    if (!el) return;

    el.classList.remove(
      'show',
      'open',
      'active'
    );
  }

  const floating = [
    'reportPanel',
    'nearbyPanel',
    'drawer',
    'legal',
    'blocked',
    'recent',
    'vehicleContextMenu'
  ];

  const panels = [
    ['altet', 'Altet'],
    ['drive', 'Drive'],
    ['messages', 'Messages'],
    ['settings', 'Settings'],
    ['activite', 'Activite']
  ];

  function closeFloating(except) {
    floating.forEach(id => {
      if (id !== except) {
        hide($(id));
      }
    });
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

      const panel = $('panel' + id);
      const tab = $('tab' + id);

      if (panel) {
        panel.classList.toggle('on', active);
      }

      if (tab) {
        tab.classList.toggle('on', active);
      }
    });

    const oldContact = $('panelContact');

    if (oldContact) {
      oldContact.classList.remove('on');
    }

    showSheet();

    try {
      window.App?.openSheet?.();
    } catch (e) {}
  }

  function syncBadge() {
    try {
      const count = Number(
        window.S?.unreadMsgCount ||
        localStorage.getItem('ic_unread_msg_count') ||
        0
      );

      if (typeof window.setUnreadMsgCount === 'function') {
        window.setUnreadMsgCount(count);
      }

      document
        .querySelectorAll('.status-mail-badge')
        .forEach(b => {
          b.textContent = '';
          b.style.display = 'none';
        });

    } catch (e) {}
  }

  function openMessagesInbox() {
    showSheet();

    closeFloating(null);

    setPanel('messages');

    setTimeout(() => {
      try {
        window.ImmatMessages?.setMode?.('inbox');
      } catch (e) {}

      try {
        window.ImmatMessages?.refresh?.();
      } catch (e) {}

      syncBadge();
    }, 80);
  }

  window.UIManager = {
    openSheetPanel: setPanel,
    openMessagesInbox,
    closeFloatingPanels: closeFloating,
    hideSheetCompletely: hideSheet,
    showSheetAgain: showSheet,
    syncBadge
  };

  function install() {
    if (!window.App) {
      setTimeout(install, 250);
      return;
    }

    if (App.__ImmatConnectUIV6Patched) {
      return;
    }

    App.__ImmatConnectUIV6Patched = true;

    const oldPanel =
      typeof App.panel === 'function'
        ? App.panel.bind(App)
        : null;

    App.panel = function (name) {
      name = normalize(name);

      closeFloating(null);

      showSheet();

      if (oldPanel) {
        try {
          oldPanel(name);
        } catch (e) {}
      }

      setPanel(name);

      if (name === 'messages') {
        setTimeout(() => {
          try {
            window.ImmatMessages?.refresh?.();
          } catch (e) {}

          syncBadge();
        }, 100);
      }

      if (name === 'altet') {
        setTimeout(() => {
          try {
            App.renderAlerts?.();
          } catch (e) {}

          try {
            App.renderMyAlertsBlock?.();
          } catch (e) {}

          syncBadge();
        }, 100);
      }

      if (name === 'activite') {
        setTimeout(() => {
          try {
            App.renderActivityFeed?.();
          } catch (e) {}

          try {
            App.updateActBadge?.();
          } catch (e) {}
        }, 100);
      }
    };

    App.openInboxBadge = function () {
      openMessagesInbox();
    };

    const oldUpdate =
      typeof App.updateCommunityStatus === 'function'
        ? App.updateCommunityStatus.bind(App)
        : null;

    App.updateCommunityStatus = function () {
      if (oldUpdate) {
        try {
          oldUpdate();
        } catch (e) {}
      }

      syncBadge();
    };

    const oldOpenReport =
      typeof App.openReport === 'function'
        ? App.openReport.bind(App)
        : null;

    App.openReport = function () {
      try { App.panel('altet'); } catch(e) {}
      try { App._sigReset?.(); } catch(e) {}
    };

    const oldOpenNearby =
      typeof App.openNearby === 'function'
        ? App.openNearby.bind(App)
        : null;

    App.openNearby = function () {
      hideSheet();

      closeFloating('nearbyPanel');

      if (oldOpenNearby) {
        oldOpenNearby();
      }

      $('nearbyPanel')?.classList.add('show');
    };

    const oldCloseOverlay =
      typeof App.closeOverlay === 'function'
        ? App.closeOverlay.bind(App)
        : null;

    App.closeOverlay = function (id) {
      if (oldCloseOverlay) {
        oldCloseOverlay(id);
      } else {
        hide($(id));
      }

      setTimeout(() => {
        if (
          !document.querySelector(
            '.overlay.show,.modal.show,.drawer.show'
          )
        ) {
          showSheet();
        }
      }, 30);
    };

    const oldOpenDrawer =
      typeof App.openDrawer === 'function'
        ? App.openDrawer.bind(App)
        : null;

    App.openDrawer = function () {
      hideSheet();

      closeFloating('drawer');

      if (oldOpenDrawer) {
        oldOpenDrawer();
      }

      $('drawer')?.classList.add('show');
    };

    const oldCloseDrawer =
      typeof App.closeDrawer === 'function'
        ? App.closeDrawer.bind(App)
        : null;

    App.closeDrawer = function () {
      if (oldCloseDrawer) {
        oldCloseDrawer();
      } else {
        hide($('drawer'));
      }

      showSheet();
    };

    document.addEventListener('click', function (e) {
      const mailBtn =
        e.target.closest('.top-mail-btn');

      if (!mailBtn) return;

      e.preventDefault();
      e.stopPropagation();

      openMessagesInbox();
    }, true);

    syncBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      install
    );
  } else {
    install();
  }

})();
