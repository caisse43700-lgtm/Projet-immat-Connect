/* ===== IMMATCONNECT BADGE — V3 CLEAN ===== */
(function () {
  'use strict';

  if (window.__ImmatBadgeV3) return;
  window.__ImmatBadgeV3 = true;

  const $ = id => document.getElementById(id);

  function setBadge(n) {
    n = Math.max(0, Number(n) || 0);

    try {
      if (window.S) {
        window.S.unreadMsgCount = n;
      }

      localStorage.setItem(
        'ic_unread_msg_count',
        String(n)
      );
    } catch (e) {}

    const badge = $('topMsgBadge');

    if (badge) {
      badge.textContent =
        n > 99 ? '99+' : String(n);

      badge.style.display =
        n > 0 ? 'flex' : 'none';
    }
  }

  function openInbox() {
    try {
      window.UIManager?.openMessagesInbox?.();
    } catch (e) {}

    try {
      window.App?.panel?.('messages');
    } catch (e) {}

    try {
      window.ImmatMessages?.setMode?.('inbox');
    } catch (e) {}

    try {
      window.ImmatMessages?.refresh?.();
    } catch (e) {}
  }

  window.setUnreadMsgCount = setBadge;

  window.ImmatBadge = {
    set: setBadge,
    open: openInbox
  };

  function install() {
    const count = Number(
      localStorage.getItem(
        'ic_unread_msg_count'
      ) || 0
    );

    setBadge(count);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.top-mail-btn');

      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      openInbox();
    }, true);
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
