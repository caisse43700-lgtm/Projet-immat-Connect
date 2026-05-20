/* ===== IMMATCONNECT MESSAGES — V11 CLEAN ===== */
(function () {
  'use strict';

  if (window.__ImmatMessagesV11) return;
  window.__ImmatMessagesV11 = true;

  const STORAGE_KEY = 'ic_messages_v11';

  function uid() {
    return 'm_' + Math.random().toString(36).slice(2) + Date.now();
  }

  function now() {
    return new Date().toISOString();
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let messages = load();

  function unreadCount() {
    return messages.filter(m => !m.read && m.type !== 'sent').length;
  }

  function syncBadge() {
    const n = unreadCount();

    try {
      if (typeof window.setUnreadMsgCount === 'function') {
        window.setUnreadMsgCount(n);
      }
    } catch (e) {}
  }

  function render() {
    const container =
      document.getElementById('messagesList') ||
      document.getElementById('messagesContainer') ||
      document.querySelector('.messages-list');

    if (!container) return;

    const mode =
      window.ImmatMessages?.mode ||
      'inbox';

    let list = [];

    if (mode === 'sent') {
      list = messages.filter(m => m.type === 'sent');
    } else {
      list = messages.filter(m => m.type !== 'sent');
    }

    list.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    if (!list.length) {
      container.innerHTML = `
        <div class="empty-messages">
          Aucun message
        </div>
      `;
      syncBadge();
      return;
    }

    container.innerHTML = list.map(m => `
      <div class="message-item ${m.read ? 'read' : 'unread'}"
           data-id="${m.id}">
        <div class="message-top">
          <div class="message-name">
            ${escapeHtml(m.name || 'Utilisateur')}
          </div>

          <div class="message-date">
            ${formatDate(m.date)}
          </div>
        </div>

        <div class="message-subject">
          ${escapeHtml(m.subject || '')}
        </div>

        <div class="message-text">
          ${escapeHtml(m.text || '')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.message-item').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.dataset.id;
        openMessage(id);
      });
    });

    syncBadge();
  }

  function openMessage(id) {
    const msg = messages.find(x => x.id === id);
    if (!msg) return;

    msg.read = true;
    save(messages);

    render();

    const panel =
      document.getElementById('messageView') ||
      document.getElementById('messageModal');

    if (!panel) return;

    panel.classList.add('show');

    const body =
      panel.querySelector('.message-body') ||
      panel.querySelector('.content');

    if (!body) return;

    body.innerHTML = `
      <div class="msg-view-name">
        ${escapeHtml(msg.name || '')}
      </div>

      <div class="msg-view-subject">
        ${escapeHtml(msg.subject || '')}
      </div>

      <div class="msg-view-date">
        ${formatDate(msg.date)}
      </div>

      <div class="msg-view-text">
        ${escapeHtml(msg.text || '').replace(/\n/g, '<br>')}
      </div>
    `;

    syncBadge();
  }

  function add(data) {
    messages.unshift({
      id: uid(),
      name: data.name || 'Utilisateur',
      subject: data.subject || '',
      text: data.text || '',
      type: data.type || 'inbox',
      read: false,
      date: now()
    });

    save(messages);
    render();
  }

  function send(data) {
    add({
      ...data,
      type: 'sent',
      read: true
    });
  }

  function markAllRead() {
    messages.forEach(m => {
      m.read = true;
    });

    save(messages);
    render();
  }

  function remove(id) {
    messages = messages.filter(m => m.id !== id);
    save(messages);
    render();
  }

  function clear() {
    messages = [];
    save(messages);
    render();
  }

  function setMode(mode) {
    window.ImmatMessages.mode = mode;
    render();
  }

  function refresh() {
    messages = load();
    render();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleString('fr-FR');
    } catch (e) {
      return '';
    }
  }

  window.ImmatMessages = {
    mode: 'inbox',
    add,
    send,
    open: openMessage,
    remove,
    clear,
    refresh,
    render,
    setMode,
    markAllRead
  };

  function install() {
    render();

    const inboxBtn = document.getElementById('messagesInboxTab');
    const sentBtn = document.getElementById('messagesSentTab');

    if (inboxBtn) {
      inboxBtn.addEventListener('click', () => {
        setMode('inbox');
      });
    }

    if (sentBtn) {
      sentBtn.addEventListener('click', () => {
        setMode('sent');
      });
    }

    syncBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

})();
