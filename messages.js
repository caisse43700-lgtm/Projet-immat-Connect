/* ===== IMMATCONNECT MESSAGES — VERSION UNIFIÉE PROPRE ===== */
(function () {
  'use strict';

  if (window.__ImmatMessagesUnifiedClean) return;
  window.__ImmatMessagesUnifiedClean = true;

  const el = id => document.getElementById(id);

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  const clean = value => String(value || '').replace(/<[^>]*>/g, '').trim();

  const compact = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  function plate(value) {
    const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (/^([A-Z]{2})(\d{3})([A-Z]{2})$/.test(raw)) {
      return raw.slice(0, 2) + '-' + raw.slice(2, 5) + '-' + raw.slice(5);
    }
    return String(value || '').toUpperCase().trim();
  }

  function say(message, type) {
    try {
      if (window.toast) return window.toast(message, type || 'ok');
    } catch (e) {}
    console.log(message);
  }

  function shortTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  function ownPlate() {
    try {
      if (window.App && typeof App.ownPlate === 'function') return plate(App.ownPlate());
    } catch (e) {}

    try {
      if (window.S && S.profile && S.profile.owner_plate) return plate(S.profile.owner_plate);
    } catch (e) {}

    const node = el('tbPlate');
    return node ? plate(node.textContent) : '';
  }

  async function getUser() {
    try {
      if (!window.sb) return null;
      const result = await sb.auth.getUser();
      return result && result.data ? result.data.user : null;
    } catch (e) {
      return null;
    }
  }

  async function profilesMap(ids) {
    ids = Array.from(new Set((ids || []).filter(Boolean)));
    if (!window.sb || !ids.length) return {};

    try {
      const result = await sb
        .from('profiles')
        .select('id,owner_plate,pseudo')
        .in('id', ids);

      const output = {};
      (result.data || []).forEach(profile => {
        output[profile.id] = profile;
      });
      return output;
    } catch (e) {
      return {};
    }
  }

  async function findProfileByPlate(rawPlate) {
    if (!window.sb) return null;

    const targetCompact = compact(rawPlate);
    const variants = Array.from(new Set([
      plate(rawPlate),
      targetCompact,
      String(rawPlate || '').toUpperCase().trim()
    ])).filter(Boolean);

    for (const variant of variants) {
      try {
        const result = await sb
          .from('profiles')
          .select('id,owner_plate,pseudo')
          .eq('owner_plate', variant)
          .maybeSingle();

        if (result.data) return result.data;
      } catch (e) {}
    }

    try {
      const result = await sb
        .from('profiles')
        .select('id,owner_plate,pseudo')
        .limit(2000);

      return (result.data || []).find(profile => compact(profile.owner_plate) === targetCompact) || null;
    } catch (e) {
      return null;
    }
  }

  async function fetchMessages() {
    if (!window.sb) return [];

    const user = await getUser();
    if (!user) return [];

    const myPlate = ownPlate();
    const myCompactPlate = compact(myPlate);
    const buckets = [];

    async function query(builder) {
      try {
        const result = await builder();
        if (Array.isArray(result.data)) buckets.push(...result.data);
      } catch (e) {}
    }

    await query(() =>
      sb
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })
        .limit(500)
    );

    if (myPlate) {
      for (const column of ['target_plate', 'sender_plate', 'receiver_plate', 'from_plate', 'to_plate']) {
        await query(() =>
          sb
            .from('messages')
            .select('*')
            .eq(column, myPlate)
            .neq('status', 'rejected')
            .order('created_at', { ascending: true })
            .limit(300)
        );
      }
    }

    const unique = new Map();
    buckets.forEach(message => {
      if (!message) return;
      const key = message.id || [
        message.sender_id,
        message.receiver_id,
        message.target_plate,
        message.message,
        message.created_at
      ].join('|');

      if (!unique.has(key)) unique.set(key, message);
    });

    const rows = Array.from(unique.values()).sort((a, b) =>
      new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );

    const profiles = await profilesMap(rows.flatMap(message => [message.sender_id, message.receiver_id]));

    return rows.map(message => {
      const senderPlate = plate(
        message.sender_plate ||
        message.from_plate ||
        (profiles[message.sender_id] && profiles[message.sender_id].owner_plate) ||
        ''
      );

      const receiverPlate = plate(
        message.receiver_plate ||
        message.to_plate ||
        (profiles[message.receiver_id] && profiles[message.receiver_id].owner_plate) ||
        message.target_plate ||
        ''
      );

      const isSender = message.sender_id === user.id || Boolean(myCompactPlate && compact(senderPlate) === myCompactPlate);
      const isReceiver = message.receiver_id === user.id || Boolean(myCompactPlate && (
        compact(receiverPlate) === myCompactPlate ||
        compact(message.target_plate) === myCompactPlate ||
        compact(message.to_plate) === myCompactPlate ||
        compact(message.receiver_plate) === myCompactPlate
      ));

      const sent = isSender && isReceiver ? message.sender_id === user.id : isSender && !isReceiver;

      const displayPlate = sent
        ? (receiverPlate || plate(message.target_plate) || 'VEHICULE')
        : (senderPlate || plate(message.from_plate) || plate(message.sender_plate) || 'VEHICULE');

      return {
        id: message.id,
        raw: message,
        plate: displayPlate,
        text: clean(message.message || message.text || ''),
        sent: Boolean(sent),
        received: !sent,
        read: Boolean(sent || message.status === 'read'),
        created_at: message.created_at,
        time: shortTime(message.created_at),
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        status: message.status
      };
    });
  }

  function setBadge(count) {
    count = Math.max(0, Number(count) || 0);

    try {
      if (window.S) S.unreadMsgCount = count;
      localStorage.setItem('ic_unread_msg_count', String(count));
    } catch (e) {}

    const badge = el('topMsgBadge');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    document.querySelectorAll('.status-mail-badge').forEach(node => {
      node.textContent = count > 99 ? '99+' : String(count);
      node.style.display = count > 0 ? 'inline-grid' : 'none';
    });

    try {
      if (window.App && typeof App.updateCommunityStatus === 'function') App.updateCommunityStatus();
    } catch (e) {}
  }

  const State = {
    mode: 'inbox',
    plate: null,
    rows: []
  };

  function conversations() {
    const grouped = {};

    State.rows.forEach(message => {
      if (State.mode === 'inbox' && message.sent) return;
      if (State.mode === 'sent' && !message.sent) return;

      const currentPlate = plate(message.plate);
      if (!grouped[currentPlate]) {
        grouped[currentPlate] = {
          plate: currentPlate,
          text: '',
          time: '',
          date: 0,
          unread: false
        };
      }

      grouped[currentPlate].text = message.text;
      grouped[currentPlate].time = message.time;
      grouped[currentPlate].date = new Date(message.created_at || 0).getTime();

      if (!message.sent && !message.read) grouped[currentPlate].unread = true;
    });

    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }

  function updateTabs() {
    document.querySelectorAll('.ic-msg-tabs button').forEach(button => {
      button.classList.toggle('on', button.dataset.mode === State.mode);
    });
  }

  function renderCompose() {
    const panel = el('icComposePanel');
    if (!panel) return;

    panel.classList.toggle('show', State.mode === 'compose');

    if (State.mode === 'compose') {
      try {
        const selectedPlate = window.S && S.selPlate ? plate(S.selPlate) : '';
        const input = el('icComposePlate');
        if (selectedPlate && input && !input.value) input.value = selectedPlate;
      } catch (e) {}
    }
  }

  function renderList() {
    const list = el('icMsgList');
    if (!list) return;

    if (State.mode === 'compose') {
      list.innerHTML = '';
      return;
    }

    const unreadCount = State.rows.filter(message => !message.sent && !message.read).length;
    setBadge(unreadCount);

    const items = conversations();

    if (!items.length) {
      list.innerHTML = '<div class="ic-empty">Aucun message.<br><small>Les conversations apparaîtront ici par immatriculation.</small></div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="ic-mail-row ${item.unread ? 'unread' : ''} ${State.plate === item.plate ? 'active' : ''}" data-plate="${esc(item.plate)}">
        <div class="ic-avatar">${State.mode === 'sent' ? '↗️' : (item.unread ? '📩' : '🚗')}</div>
        <div class="ic-main">
          <div class="ic-plate">${esc(item.plate)}</div>
          <div class="ic-preview">${esc(item.text.slice(0, 80))}</div>
        </div>
        <div class="ic-meta">
          ${item.unread ? '<div class="ic-badge">●</div>' : ''}
          <div>${esc(item.time)}</div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.ic-mail-row').forEach(row => {
      row.onclick = () => openThread(row.dataset.plate);
    });
  }

  function renderThread() {
    const thread = el('icThread');
    const body = el('icThreadBody');
    const title = el('icThreadTitle');

    if (!thread || !body || !title) return;

    if (!State.plate) {
      thread.classList.remove('show');
      return;
    }

    const messages = State.rows.filter(message => plate(message.plate) === State.plate);

    title.textContent = '🚗 ' + State.plate;
    thread.classList.add('show');

    body.innerHTML = messages.map(message => {
      const isSystem = /fiabilité|confirmé utile|signalement confirmé|réceptionné|bien reçu/i.test(message.text);

      if (isSystem) {
        return `<div class="ic-system">${esc(message.text)}<span class="ic-time">${esc(message.time)}</span></div>`;
      }

      const statusLabel = message.sent
        ? (message.status === 'read' ? '✓✓ Lu' : '✓ Envoyé')
        : 'Reçu';

      return `
        <div class="ic-bubble ${message.sent ? 'sent' : 'recv'}">
          <button type="button" class="ic-delete-msg" data-message-id="${esc(message.id || '')}">×</button>
          ${esc(message.text)}
          <span class="ic-time">${esc(statusLabel)} · ${esc(message.time)}</span>
        </div>
      `;
    }).join('');

    body.querySelectorAll('.ic-delete-msg').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        deleteMessage(button.dataset.messageId);
      };
    });

    body.scrollTop = body.scrollHeight;
  }

  async function markReadInDb() {
    if (!window.sb || !State.plate) return;

    const ids = State.rows
      .filter(message => plate(message.plate) === State.plate && !message.sent && !message.read && message.id)
      .map(message => message.id);

    if (!ids.length) return;

    try {
      await sb.from('messages').update({ status: 'read' }).in('id', ids);
      ids.forEach(id => {
        const row = State.rows.find(message => message.id === id);
        if (row) row.read = true;
      });
    } catch (e) {}
  }

  async function refresh() {
    State.rows = await fetchMessages();
    renderList();
    renderThread();
    renderCompose();
    updateTabs();
  }

  function setMode(mode) {
    State.mode = mode || 'inbox';
    State.plate = null;

    updateTabs();
    renderCompose();
    renderList();
    renderThread();

    if (State.mode !== 'compose') refresh();
  }

  async function openThread(selectedPlate) {
    State.plate = plate(selectedPlate);
    renderList();
    renderThread();
    await markReadInDb();
    setBadge(State.rows.filter(message => !message.sent && !message.read).length);
  }

  function closeThread() {
    State.plate = null;
    const thread = el('icThread');
    if (thread) thread.classList.remove('show');
    renderList();
  }

  async function sendTo(targetPlate, text) {
    targetPlate = plate(targetPlate);
    text = String(text || '').trim();

    if (!targetPlate) return say('Plaque destinataire manquante.', 'bad');
    if (!text) return say('Message vide.', 'bad');

    const senderPlate = ownPlate();
    if (senderPlate && compact(targetPlate) === compact(senderPlate)) {
      return say("Impossible de t'envoyer un message à toi-même.", 'bad');
    }

    const user = await getUser();
    if (!user) return say('Reconnecte-toi.', 'bad');

    const target = await findProfileByPlate(targetPlate);
    if (!target || !target.id) return say('Aucun utilisateur avec cette plaque : ' + targetPlate, 'bad');

    const receiverPlate = plate(target.owner_plate || targetPlate);

    const basePayload = {
      sender_id: user.id,
      receiver_id: target.id,
      target_plate: receiverPlate,
      message: text,
      status: 'accepted'
    };

    const richPayload = {
      ...basePayload,
      sender_plate: senderPlate,
      receiver_plate: receiverPlate,
      from_plate: senderPlate,
      to_plate: receiverPlate
    };

    let result = await sb.from('messages').insert(richPayload);

    if (result.error && /sender_plate|receiver_plate|from_plate|to_plate|column|schema/i.test(result.error.message || '')) {
      result = await sb.from('messages').insert(basePayload);
    }

    if (result.error) {
      say('Erreur envoi : ' + (result.error.message || 'message non envoyé'), 'bad');
      return false;
    }

    say('Message envoyé à ' + receiverPlate + '.', 'ok');
    return true;
  }

  async function sendNew() {
    const plateInput = el('icComposePlate');
    const textInput = el('icComposeText');

    const targetPlate = plate((plateInput && plateInput.value) || '');
    const text = (textInput && textInput.value.trim()) || '';

    const ok = await sendTo(targetPlate, text);
    if (!ok) return;

    if (textInput) textInput.value = '';

    State.mode = 'sent';
    State.plate = targetPlate;

    updateTabs();
    renderCompose();
    await refresh();
    State.plate = targetPlate;
    renderThread();
  }

  async function reply() {
    const input = el('icReplyText');
    if (!input || !State.plate) return;

    const text = input.value.trim();
    if (!text) return;

    const ok = await sendTo(State.plate, text);
    if (!ok) return;

    input.value = '';
    await refresh();
    renderThread();
  }

  async function quick(text) {
    if (!State.plate) return;

    const ok = await sendTo(State.plate, text);
    if (!ok) return;

    await refresh();
    renderThread();
  }

  async function deleteMessage(id) {
    if (!id || !confirm('Supprimer ce message ?')) return;

    try {
      await sb.from('messages').update({ status: 'rejected' }).eq('id', id);
      State.rows = State.rows.filter(message => message.id !== id);
      renderList();
      renderThread();
      say('Message supprimé.', 'ok');
    } catch (e) {
      say('Erreur suppression.', 'bad');
    }
  }

  async function deleteThread() {
    if (!State.plate || !confirm('Supprimer toute la conversation avec ' + State.plate + ' ?')) return;

    const ids = State.rows
      .filter(message => plate(message.plate) === State.plate && message.id)
      .map(message => message.id);

    try {
      for (const id of ids) {
        await sb.from('messages').update({ status: 'rejected' }).eq('id', id);
      }

      State.rows = State.rows.filter(message => plate(message.plate) !== State.plate);
      State.plate = null;
      renderList();
      renderThread();
      say('Conversation supprimée.', 'ok');
    } catch (e) {
      say('Erreur suppression conversation.', 'bad');
    }
  }

  function patchApp() {
    if (!window.App || App.__messagesUnifiedPatched) return;
    App.__messagesUnifiedPatched = true;

    const originalPanel = typeof App.panel === 'function' ? App.panel.bind(App) : null;
    App.panel = function (name) {
      if (name === 'contact') name = 'messages';
      const result = originalPanel ? originalPanel(name) : undefined;
      if (name === 'messages') setTimeout(refresh, 100);
      return result;
    };

    App.openInboxBadge = function () {
      App.panel('messages');
      try { if (typeof App.openSheet === 'function') App.openSheet(); } catch (e) {}
      setMode('inbox');
    };

    App.pickPlate = function (selectedPlate) {
      const formatted = plate(selectedPlate);
      try {
        if (window.S) {
          S.selPlate = formatted;
          S.conv = formatted;
        }
      } catch (e) {}

      App.panel('messages');
      setMode('compose');

      setTimeout(() => {
        const input = el('icComposePlate');
        if (input) {
          input.value = formatted;
          input.focus();
        }
      }, 120);
    };

    App.vehicleAlert = function (label) {
      const senderPlate = ownPlate();
      let target = '';

      try {
        target = plate(S.selPlate || (S.contextVehicle && S.contextVehicle.plate) || '');
      } catch (e) {}

      if (!target || compact(target) === compact(senderPlate)) {
        return say("Clique d'abord le véhicule concerné sur la carte.", 'bad');
      }

      const urgent = /pneu|roue|fumée|feu|incendie/i.test(label);
      const message = (urgent ? '🚨 SIGNALEMENT URGENT : ' : '⚠️ SIGNALEMENT : ')
        + label + '. Pouvez-vous vérifier votre véhicule ?';

      try { if (typeof App.closeOverlay === 'function') App.closeOverlay('reportPanel'); } catch (e) {}

      App.panel('messages');
      setMode('compose');

      setTimeout(() => {
        const plateInput = el('icComposePlate');
        const textInput = el('icComposeText');
        if (plateInput) plateInput.value = target;
        if (textInput) textInput.value = message;
      }, 120);

      say('Signalement préparé pour ' + target + '.', 'ok');
    };

    const originalLoadMsgs = typeof App.loadMsgs === 'function' ? App.loadMsgs.bind(App) : null;
    App.loadMsgs = async function () {
      const result = originalLoadMsgs ? await originalLoadMsgs() : undefined;
      try { await refresh(); } catch (e) {}
      return result;
    };
  }

  function init() {
    patchApp();
    setTimeout(refresh, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(patchApp, 800);
  setTimeout(patchApp, 2000);

  window.ImmatMessages = {
    setMode,
    refresh,
    openThread,
    closeThread,
    sendNew,
    reply,
    quick,
    deleteMessage,
    deleteThread
  };
})();
