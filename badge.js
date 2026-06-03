/* ===== IMMATCONNECT BADGE — V4 UIManager SAFE ===== */
(function () {
  'use strict';

  if (window.__ImmatBadgeV4) return;
  window.__ImmatBadgeV4 = true;

  const $ = id => document.getElementById(id);
  const STORE_KEY = 'ic_unread_msg_count';

  function setBadge(n) {
    n = Math.max(0, Number(n) || 0);

    try {
      window.S = window.S || {};
      window.S.unreadMsgCount = n;

      localStorage.setItem(
        STORE_KEY,
        String(n)
      );
    } catch (e) {}

    document
      .querySelectorAll('.status-mail-badge')
      .forEach(b => {
        b.textContent = '';
        b.style.display = 'none';
      });
  }

  function getBadge() {
    try {
      return Number(
        localStorage.getItem(STORE_KEY) || 0
      );
    } catch (e) {
      return 0;
    }
  }

  function syncBadge() {
    setBadge(getBadge());
  }

  function openInbox() {
    try {
      if (window.UIManager?.openMessagesInbox) {
        window.UIManager.openMessagesInbox();
      } else {
        window.App?.panel?.('messages');
        window.ImmatMessages?.setMode?.('inbox');
        window.ImmatMessages?.refresh?.();
      }
    } catch (e) {}
  }

  window.setUnreadMsgCount = window.setUnreadMsgCount || setBadge;

  window.ImmatBadge = {
    set: setBadge,
    get: getBadge,
    sync: syncBadge,
    open: openInbox
  };

  function install() {
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
