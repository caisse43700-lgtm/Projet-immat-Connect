/* ===== IMMATCONNECT MESSAGES — VERSION UNIFIÉE PROPRE V10 ===== */
(function () {
  'use strict';

  if (window.__ImmatMessagesUnifiedCleanV10) return;
  window.__ImmatMessagesUnifiedCleanV10 = true;

  const el = id => document.getElementById(id);

  const esc = v => String(v || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  const clean = v => String(v || '').replace(/<[^>]*>/g, '').trim();
  const compact = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  function plate(v) {
    const s = compact(v).slice(0, 7);
    if (/^([A-Z]{2})(\d{3})([A-Z]{2})$/.test(s)) {
      return s.slice(0, 2) + '-' + s.slice(2, 5) + '-' + s.slice(5);
    }
    return String(v || '').toUpperCase().trim();
  }

  function say(msg, type) {
    try { if (window.toast) return toast(msg, type || 'ok'); } catch (e) {}
    console.log(msg);
  }

  function shortTime(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    if (d.toDateString() === new Date().toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  function ownPlate() {
    try {
      if (window.App && typeof App.ownPlate === 'function') return plate(App.ownPlate());
    } catch (e) {}

    try {
      if (window.S && S.profile && S.profile.owner_plate) return plate(S.profile.owner_plate);
    } catch (e) {}

    const n = el('tbPlate');
    return n ? plate(n.textContent) : '';
  }

  async function getUser() {
    try {
      if (!window.sb) return null;
      const r = await sb.auth.getUser();
      return r && r.data ? r.data.user : null;
    } catch (e) {
      return null;
    }
  }

  async function profilesMap(ids) {
    ids = Array.from(new Set((ids || []).filter(Boolean)));
    if (!window.sb || !ids.length) return {};

    try {
      const { data } = await sb
        .from('profiles')
        .select('id,owner_plate,pseudo')
        .in('id', ids);

      const out = {};
      (data || []).forEach(p => { out[p.id] = p; });
      return out;
    } catch (e) {
      return {};
    }
  }

  async function findProfileByPlate(rawPlate) {
    if (!window.sb) return null;

    const wanted = compact(rawPlate);
    const variants = Array.from(new Set([
      plate(rawPlate),
      wanted,
      String(rawPlate || '').toUpperCase().trim()
    ])).filter(Boolean);

    for (const v of variants) {
      try {
        const { data } = await sb
          .from('profiles')
          .select('id,owner_plate,pseudo')
          .eq('owner_plate', v)
          .maybeSingle();

        if (data) return data;
      } catch (e) {}
    }

    try {
      const { data } = await sb
        .from('profiles')
        .select('id,owner_plate,pseudo')
        .limit(2000);

      return (data || []).find(p => compact(p.owner_plate) === wanted) || null;
    } catch (e) {
      return null;
    }
  }

  async function fetchMessages() {
    if (!window.sb) return [];

    const user = await getUser();
    if (!user) return [];

    const myPlate = ownPlate();
    const mine = compact(myPlate);
    const bucket = [];

    async function q(fn) {
      try {
        const r = await fn();
        if (r && Array.isArray(r.data)) bucket.push(...r.data);
      } catch (e) {}
    }

    await q(() =>
      sb.from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })
        .limit(500)
    );

    if (myPlate) {
      for (const col of ['target_plate', 'sender_plate', 'receiver_plate', 'from_plate', 'to_plate']) {
        await q(() =>
          sb.from('messages')
            .select('*')
            .eq(col, myPlate)
            .neq('status', 'rejected')
            .order('created_at', { ascending: true })
            .limit(300)
        );
      }
    }

    const unique = new Map();
    bucket.forEach(m => {
      if (!m) return;
      const key = m.id || [m.sender_id, m.receiver_id, m.target_plate, m.message, m.created_at].join('|');
      if (!unique.has(key)) unique.set(key, m);
    });

    const rows = Array.from(unique.values()).sort((a, b) =>
      new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );

    const profiles = await profilesMap(rows.flatMap(m => [m.sender_id, m.receiver_id]));

    return rows.map(m => {
      const senderPlate = plate(
        m.sender_plate ||
        m.from_plate ||
        (profiles[m.sender_id] && profiles[m.sender_id].owner_plate) ||
        ''
      );

      const receiverPlate = plate(
        m.receiver_plate ||
        m.to_plate ||
        (profiles[m.receiver_id] && profiles[m.receiver_id].owner_plate) ||
        m.target_plate ||
        ''
      );

      const isSender = m.sender_id === user.id || Boolean(mine && compact(senderPlate) === mine);

      const isReceiver = m.receiver_id === user.id || Boolean(mine && (
        compact(receiverPlate) === mine ||
        compact(m.target_plate) === mine ||
        compact(m.to_plate) === mine ||
        compact(m.receiver_plate) === mine
      ));

      const sent = isSender && isReceiver ? m.sender_id === user.id : isSender && !isReceiver;

      const displayPlate = sent
        ? (receiverPlate || plate(m.target_plate) || 'VEHICULE')
        : (senderPlate || plate(m.from_plate) || plate(m.sender_plate) || 'VEHICULE');

      return {
        id: m.id,
        raw: m,
        plate: displayPlate,
        text: clean(m.message || m.text || ''),
        sent: Boolean(sent),
        received: !sent,
        read: Boolean(sent || m.status === 'read'),
        created_at: m.created_at,
        time: shortTime(m.created_at),
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        status: m.status
      };
    });
  }

  function unreadMessagesCount() {
    return State.rows.filter(m => !m.sent && !m.read).length;
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
    const map = {};

    State.rows.forEach(m => {
      if (State.mode === 'inbox' && m.sent) return;
      if (State.mode === 'sent' && !m.sent) return;

      const p = plate(m.plate);
      if (!map[p]) {
        map[p] = { plate: p, text: '', time: '', date: 0, unread: false };
      }

      map[p].text = m.text;
      map[p].time = m.time;
      map[p].date = new Date(m.created_at || 0).getTime();

      if (!m.sent && !m.read) map[p].unread = true;
    });

    return Object.values(map).sort((a, b) => b.date - a.date);
  }

  function updateTabs() {
    document.querySelectorAll('.ic-msg-tabs button').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.mode === State.mode);
    });
  }

  function renderCompose() {
    const panel = el('icComposePanel');
    if (!panel) return;

    panel.classList.toggle('show', State.mode === 'compose');

    if (State.mode === 'compose') {
      try {
        const selected = window.S && S.selPlate ? plate(S.selPlate) : '';
        const input = el('icComposePlate');
        if (selected && input && !input.value) input.value = selected;
      } catch (e) {}
    }
  }

  function renderList() {
    const list = el('icMsgList');
    if (!list) return;

    if (State.mode === 'compose') return;

    setBadge(unreadMessagesCount());

    const convs = conversations();

    if (!convs.length) {
      list.innerHTML = '<div class="ic-empty">Aucun message.<br><small>Les conversations apparaîtront ici par immatriculation.</small></div>';
      return;
    }

    list.innerHTML = convs.map(c => `
      <div class="ic-mail-row ${c.unread ? 'unread' : ''} ${State.plate === c.plate ? 'active' : ''}" data-plate="${esc(c.plate)}">
        <div class="ic-avatar">${State.mode === 'sent' ? '↗️' : (c.unread ? '📩' : '🚗')}</div>
        <div class="ic-main">
          <div class="ic-plate">${esc(c.plate)}</div>
          <div class="ic-preview">${esc(c.text.slice(0, 80))}</div>
        </div>
        <div class="ic-meta">
          ${c.unread ? '<div class="ic-badge">●</div>' : ''}
          <div>${esc(c.time)}</div>
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

    const messages = State.rows.filter(m => plate(m.plate) === State.plate);

    if (!messages.length) {
      thread.classList.remove('show');
      return;
    }

    title.textContent = '🚗 ' + State.plate;
    thread.classList.add('show');

    body.innerHTML = messages.map(m => {
      const isSystem = /fiabilité|confirmé utile|signalement confirmé|réceptionné|bien reçu/i.test(m.text);

      if (isSystem) {
        return `<div class="ic-system">${esc(m.text)}<span class="ic-time">${esc(m.time)}</span></div>`;
      }

      const statusLabel = m.sent
        ? (m.status === 'read' ? '✓✓ Lu' : '✓ Envoyé')
        : 'Reçu';

      return `
        <div class="ic-bubble ${m.sent ? 'sent' : 'recv'}">
          <button type="button" class="ic-delete-msg" data-id="${esc(m.id || '')}">×</button>
          ${esc(m.text)}
          <span class="ic-time">${esc(statusLabel)} · ${esc(m.time)}</span>
        </div>
      `;
    }).join('');

    body.querySelectorAll('.ic-delete-msg').forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        deleteMessage(btn.dataset.id);
      };
    });

    body.scrollTop = body.scrollHeight;
  }

  async function markReadInDb() {
    if (!window.sb || !State.plate) return;

    const ids = State.rows
      .filter(m => plate(m.plate) === State.plate && !m.sent && !m.read && m.id)
      .map(m => m.id);

    if (!ids.length) return;

    try {
      await sb.from('messages').update({ status: 'read' }).in('id', ids);

      ids.forEach(id => {
        const row = State.rows.find(m => m.id === id);
        if (row) row.read = true;
      });
    } catch (e) {}
  }

  async function refresh() {
    State.rows = await fetchMessages();

    if (State.mode !== 'compose') renderList();

    renderThread();
    renderCompose();
    updateTabs();
    setBadge(unreadMessagesCount());
  }

  function setMode(mode) {
    State.mode = mode || 'inbox';
    State.plate = null;

    updateTabs();
    renderCompose();

    if (State.mode === 'compose') {
      renderThread();
      return;
    }

    renderList();
    renderThread();
    refresh();
  }

  async function openThread(selectedPlate) {
    State.plate = plate(selectedPlate);

    renderList();
    renderThread();

    await markReadInDb();
    setBadge(unreadMessagesCount());

    await refresh();

    State.plate = plate(selectedPlate);
    renderList();
    renderThread();
    setBadge(unreadMessagesCount());
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
      State.rows = State.rows.filter(m => m.id !== id);
      renderList();
      renderThread();
      setBadge(unreadMessagesCount());
      say('Message supprimé.', 'ok');
    } catch (e) {
      say('Erreur suppression.', 'bad');
    }
  }

  async function deleteThread() {
    if (!State.plate || !confirm('Supprimer toute la conversation avec ' + State.plate + ' ?')) return;

    const ids = State.rows
      .filter(m => plate(m.plate) === State.plate && m.id)
      .map(m => m.id);

    try {
      for (const id of ids) {
        await sb.from('messages').update({ status: 'rejected' }).eq('id', id);
      }

      State.rows = State.rows.filter(m => plate(m.plate) !== State.plate);
      State.plate = null;

      renderList();
      renderThread();
      setBadge(unreadMessagesCount());

      say('Conversation supprimée.', 'ok');
    } catch (e) {
      say('Erreur suppression conversation.', 'bad');
    }
  }

  function patchApp() {
    if (!window.App || App.__messagesUnifiedCleanV10Patched) return;
    App.__messagesUnifiedCleanV10Patched = true;

    const originalPanel = typeof App.panel === 'function' ? App.panel.bind(App) : null;

    App.panel = function (name) {
      if (name === 'contact') name = 'messages';

      const result = originalPanel ? originalPanel(name) : undefined;

      if (name === 'messages') {
        try { if (typeof App.openSheet === 'function') App.openSheet(); } catch (e) {}
        setTimeout(refresh, 100);
      }

      return result;
    };

    App.openInboxBadge = function () {
      App.panel('messages');
      try { if (typeof App.openSheet === 'function') App.openSheet(); } catch (e) {}
      setMode('inbox');
      setTimeout(refresh, 100);
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
    setTimeout(refresh, 80);
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(patchApp, 800);
  setTimeout(patchApp, 2000);
})();
