/* ===== IMMATCONNECT MESSAGES — V13 DAM-COMMUNICATION PHASE 1 ===== */
(function(){
'use strict';

if(window.__ImmatMessagesV13) return;
window.__ImmatMessagesV13 = true;

const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/[&<>"']/g,m=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));

const nPlate = v => String(v||'')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9-]/g,'');

function fPlate(v){
  let s = String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7);
  if(s.length<=2) return s;
  if(s.length<=5) return s.slice(0,2)+'-'+s.slice(2);
  return s.slice(0,2)+'-'+s.slice(2,5)+'-'+s.slice(5);
}

function toast(msg,type){
  if(window.App?.toast) return window.App.toast(msg,type);
  const t = $('toast');
  if(t){
    t.textContent = msg;
    t.className = 'toast show ' + (type||'');
    setTimeout(()=>t.classList.remove('show'),3000);
  }else{
    alert(msg);
  }
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

function setBadge(n){
  n = Math.max(0, Number(n)||0);
  try{
    localStorage.setItem('ic_unread_msg_count', String(n));
    if(window.S) window.S.unreadMsgCount = n;
  }catch(e){}
}

function timeFR(d){
  try{
    return new Date(d).toLocaleString('fr-FR',{
      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
    });
  }catch(e){return '';}
}

const State = {
  mode:'inbox',
  user:null,
  profile:null,
  messages:[],
  threads:[],
  activePlate:null,
  channel:null,
  searchQuery:'',
  callEventsCache:{}
};

async function getUser(){
  const client = sb();
  if(!client) return null;
  const {data} = await client.auth.getUser();
  State.user = data?.user || null;
  return State.user;
}

async function getProfile(){
  const client = sb();
  const u = State.user || await getUser();
  if(!client || !u) return null;

  const {data} = await client
    .from('profiles')
    .select('id, owner_plate, pseudo, vehicle_color')
    .eq('id', u.id)
    .maybeSingle();

  State.profile = data || null;
  return State.profile;
}

function myPlate(){
  return fPlate(
    State.profile?.owner_plate ||
    window.S?.profile?.owner_plate ||
    $('tbPlate')?.textContent ||
    ''
  );
}

async function findProfileByPlate(plate){
  const client = sb();
  if(!client) return null;

  plate = fPlate(plate);
  const compact = nPlate(plate);

  let r = await client
    .from('profiles')
    .select('id,owner_plate,pseudo,vehicle_color')
    .eq('owner_plate', plate)
    .maybeSingle();

  if(r.data) return r.data;

  r = await client
    .from('profiles')
    .select('id,owner_plate,pseudo,vehicle_color')
    .eq('owner_plate', compact)
    .maybeSingle();

  return r.data || null;
}

async function profilesByIds(ids){
  const client = sb();
  ids = [...new Set((ids||[]).filter(Boolean))];
  if(!client || !ids.length) return {};

  const {data} = await client
    .from('profiles')
    .select('id,owner_plate,pseudo,vehicle_color')
    .in('id', ids);

  const out = {};
  (data||[]).forEach(p => out[p.id] = p);
  return out;
}

// ── Trust & Block levels ─────────────────────────────────────────
const TRUST_LEVELS = { NONE:'TRUST_NONE', CONTEXTUAL:'TRUST_CONTEXTUAL', CONTACT:'TRUST_CONTACT', PERMANENT:'TRUST_PERMANENT' };
const BLOCK_LEVELS = { NONE:'BLOCK_NONE', MESSAGES:'BLOCK_MESSAGES', CALLS:'BLOCK_CALLS', ALL:'BLOCK_ALL' };

function getBlockLevel(plate){
  const p = nPlate(plate);
  if(!p) return BLOCK_LEVELS.NONE;
  try{
    const levels = JSON.parse(localStorage.getItem('ic_block_levels') || '{}');
    if(levels[p]) return levels[p];
  }catch(e){}
  const blocked = window.S?.blocked || [];
  if(blocked.includes(p)) return BLOCK_LEVELS.ALL;
  return BLOCK_LEVELS.NONE;
}

function setContextTrust(plate, source, reason, ttlMs){
  const p = nPlate(plate);
  if(!p) return;
  let ctx = {};
  try{ ctx = JSON.parse(localStorage.getItem('ic_context_trust') || '{}'); }catch(e){}
  ctx[p] = { expiration: Date.now() + (ttlMs || 3600000), context_source: source || 'unknown', trust_reason: reason || '' };
  try{ localStorage.setItem('ic_context_trust', JSON.stringify(ctx)); }catch(e){}
  try{ window.ImmatOrganism?.observe?.('TRUST_CONTEXTUAL_SET',{plate:p,source:source||'unknown',reason:reason||'',ttlMs:ttlMs||3600000,_src:'ImmatConnect/messages/setContextTrust'}); }catch(e){}
}

function getContextTrust(plate){
  const p = nPlate(plate);
  if(!p) return null;
  try{
    const ctx = JSON.parse(localStorage.getItem('ic_context_trust') || '{}');
    const entry = ctx[p];
    if(!entry) return null;
    if(entry.expiration < Date.now()){
      delete ctx[p];
      try{ localStorage.setItem('ic_context_trust', JSON.stringify(ctx)); }catch(e){}
      try{ window.ImmatOrganism?.observe?.('TRUST_CONTEXTUAL_EXPIRED',{plate:p,source:entry.context_source,_src:'ImmatConnect/messages/getContextTrust'}); }catch(e){}
      return null;
    }
    return entry;
  }catch(e){ return null; }
}

function revokePermanentTrust(plate){
  const p = nPlate(plate);
  if(!p) return;
  let contacts = [];
  try{ contacts = JSON.parse(localStorage.getItem('ic_trusted_contacts') || '[]'); }catch(e){}
  const existed = contacts.some(c => nPlate(c.plate) === p);
  if(existed){
    contacts = contacts.filter(c => nPlate(c.plate) !== p);
    try{ localStorage.setItem('ic_trusted_contacts', JSON.stringify(contacts)); }catch(e){}
    try{ window.ImmatOrganism?.observe?.('CONTACT_REVOKED',{plate:p,level:'PERMANENT',_src:'ImmatConnect/messages/revokePermanentTrust'}); }catch(e){}
  }
}

function clearContextTrust(plate){
  const p = nPlate(plate);
  if(!p) return;
  try{
    const ctx = JSON.parse(localStorage.getItem('ic_context_trust') || '{}');
    delete ctx[p];
    localStorage.setItem('ic_context_trust', JSON.stringify(ctx));
  }catch(e){}
}

function getPermanentTrust(plate){
  const p = nPlate(plate);
  if(!p) return null;
  try{
    const contacts = JSON.parse(localStorage.getItem('ic_trusted_contacts') || '[]');
    return contacts.find(c => nPlate(c.plate) === p) || null;
  }catch(e){ return null; }
}

function setTrustPermanent(plate, source){
  const p = nPlate(plate);
  if(!p) return;
  let contacts = [];
  try{ contacts = JSON.parse(localStorage.getItem('ic_trusted_contacts') || '[]'); }catch(e){}
  if(!contacts.find(c => nPlate(c.plate) === p)){
    contacts.push({ plate:p, created_at:new Date().toISOString(), source:source||'manual' });
    try{ localStorage.setItem('ic_trusted_contacts', JSON.stringify(contacts)); }catch(e){}
    try{ window.ImmatOrganism?.observe?.('CONTACT_TRUSTED',{plate:p,level:'PERMANENT',_src:'ImmatConnect/messages/setTrustPermanent'}); }catch(e){}
  }
}

function getTrustLevel(plate){
  if(getPermanentTrust(plate)) return TRUST_LEVELS.PERMANENT;
  const trust = getTrust(plate);
  if(trust === 'TRUSTED') return TRUST_LEVELS.CONTACT;
  if(getContextTrust(plate)) return TRUST_LEVELS.CONTEXTUAL;
  return TRUST_LEVELS.NONE;
}

function normalizeRows(rows, profs){
  const mp = nPlate(myPlate());
  const uid = State.user?.id;

  let deletedIds = [];
  try{ deletedIds = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]').map(String); }catch(e){}

  return (rows||[]).map(m=>{
    const sp = fPlate(m.sender_plate || m.from_plate || profs[m.sender_id]?.owner_plate || '');
    const rp = fPlate(m.receiver_plate || m.to_plate || profs[m.receiver_id]?.owner_plate || m.target_plate || '');

    const sent = (m.sender_id === uid) || (mp && nPlate(sp) === mp);
    const received = !sent && (
      m.receiver_id === uid ||
      (mp && (
        nPlate(rp) === mp ||
        nPlate(m.target_plate) === mp ||
        nPlate(m.receiver_plate) === mp ||
        nPlate(m.to_plate) === mp
      ))
    );

    return {
      ...m,
      _sent: sent,
      _received: received,
      _senderPlate: sp || 'INCONNU',
      _receiverPlate: rp || fPlate(m.target_plate) || 'INCONNU',
      _otherPlate: sent ? (fPlate(rp) || 'INCONNU') : (fPlate(sp) || 'INCONNU')
    };
  }).filter(m => {
    if(!m._otherPlate || m.status === 'rejected' || deletedIds.includes(String(m.id))) return false;
    const bl = getBlockLevel(m._otherPlate);
    return bl !== BLOCK_LEVELS.MESSAGES && bl !== BLOCK_LEVELS.ALL;
  });
}

async function refresh(){
  const client = sb();
  const u = await getUser();
  await getProfile();

  if(!client || !u){
    renderEmpty('Non connecté.');
    return;
  }

  const mp = myPlate();
  const buckets = [];

  // Paralléliser toutes les requêtes (PERF: ~200ms au lieu de ~1200ms)
  const queries = [
    client.from('messages').select('*')
      .or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`)
      .order('created_at',{ascending:true})
      .limit(300)
  ];
  if(mp){
    queries.push(
      client.from('messages').select('*').eq('target_plate',mp).order('created_at',{ascending:true}).limit(300),
      client.from('messages').select('*').eq('sender_plate',mp).order('created_at',{ascending:true}).limit(300),
      client.from('messages').select('*').eq('receiver_plate',mp).order('created_at',{ascending:true}).limit(300),
      client.from('messages').select('*').eq('from_plate',mp).order('created_at',{ascending:true}).limit(300),
      client.from('messages').select('*').eq('to_plate',mp).order('created_at',{ascending:true}).limit(300)
    );
  }
  const results = await Promise.all(queries.map(async q=>{
    try{ const {data,error}=await q; if(!error&&Array.isArray(data)) return data; }catch(e){}
    return [];
  }));
  results.forEach(data=>buckets.push(...data));

  const map = new Map();
  buckets.forEach(m => { if(m?.id) map.set(m.id,m); });

  const raw = [...map.values()].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
  const profs = await profilesByIds(raw.flatMap(m=>[m.sender_id,m.receiver_id]));
  State.messages = normalizeRows(raw, profs);

  try{ if(window.S) window.S._actMessages = State.messages; }catch(e){}
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}

  buildThreads();
  render();
  refreshThread();
  if(!State.channel) subscribe();
}

function buildThreads(){
  let deletedIds = [];
  try{ deletedIds = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]').map(String); }catch(e){}

  const groups = {};
  State.messages.filter(m => !deletedIds.includes(String(m.id)) && m._otherPlate).forEach(m=>{
    const p = m._otherPlate;
    groups[p] = groups[p] || [];
    groups[p].push(m);
  });

  State.threads = Object.keys(groups).map(plate=>{
    const list = groups[plate].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
    const last = list[list.length-1];
    return {
      plate,
      list,
      last,
      unread: list.filter(m=>m._received && !m.read_at).length
    };
  }).sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0));

  const unread = State.threads.reduce((s,t)=>s+t.unread,0);
  setBadge(unread);
}

function setMode(mode){
  // Fermer le thread s'il est ouvert (évite liste + thread simultanés)
  const threadBox = $('icThread');
  if(threadBox && threadBox.classList.contains('show')){
    threadBox.classList.remove('show');
    State.activePlate = null;
    const hdr = document.querySelector('#icMessagesPro .ic-conv-header');
    const sbar = $('icSearchBar');
    if(hdr) hdr.style.display = '';
    if(sbar && localStorage.getItem('_icSearchOpen') === '1') sbar.style.display = '';
  }

  const prev = State.mode;
  State.mode = mode || 'inbox';

  const compose = $('icComposePanel');
  const callLog = $('icCallLog');
  const list    = $('icMsgList');

  if(compose) compose.classList.remove('show');
  if(callLog) callLog.style.display = 'none';

  if(State.mode === 'compose'){
    if(list) list.style.display = 'none';
    if(compose) compose.classList.add('show');
    return;
  }

  if(State.mode === 'calls'){
    if(list) list.style.display = 'none';
    if(callLog) callLog.style.display = '';
    renderCallLog();
    return;
  }

  // inbox / sent / default
  if(list) list.style.display = '';
  render();
}

async function renderCallLog(){
  const list = $('icCallLog');
  if(!list) return;
  list.innerHTML = '<div class="ic-empty">Chargement…</div>';
  let calls = [];
  try{ calls = await (window.CallManager?.loadCallLog?.() || Promise.resolve([])); }catch(e){}
  if(!calls.length){
    list.innerHTML = '<div class="ic-empty ic-empty-help">📞 Aucun appel pour l\'instant.</div>';
    return;
  }
  // Grouper par plaque : 1 entrée par interlocuteur (appel le plus récent en tête)
  const byPlate = new Map();
  for(const c of calls){
    if(!byPlate.has(c.plate)) byPlate.set(c.plate, {latest:c, count:1});
    else byPlate.get(c.plate).count++;
  }
  const statusLabel = {pending:'En attente',accepted:'Accepté ✅',refused:'Refusé',cancelled:'Annulé',missed:'Manqué ☎️',expired:'Expiré'};
  const statusColor = {accepted:'#4caf50',refused:'#e53935',missed:'#e53935',cancelled:'#64748b',expired:'#64748b',pending:'#f0a500'};
  list.innerHTML = [...byPlate.values()].map(({latest:c, count})=>{
    const dir = c.outgoing ? 'Émis' : 'Reçu';
    const sl = statusLabel[c.status] || c.status;
    const col = statusColor[c.status] || '#888';
    const time = c.at ? new Date(c.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
    const countBadge = count > 1 ? `<span style="font-size:10px;background:rgba(255,255,255,.1);color:#aaa;border-radius:10px;padding:1px 6px;margin-left:4px">×${count}</span>` : '';
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="font-size:20px">${c.outgoing?'📤':'📥'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px;color:#e2e8f0">${esc(c.plate)}</div>
        <div style="font-size:11px;margin-top:2px"><span style="color:${col}">${sl}</span><span style="color:#555"> · ${dir}</span>${countBadge}</div>
      </div>
      <div style="font-size:11px;color:#555;flex-shrink:0;text-align:right">${time}</div>
      <button type="button" onclick="CallManager.openContactOptions('${esc(c.plate)}')" style="background:rgba(41,121,255,.15);color:#2979ff;border:1px solid rgba(41,121,255,.3);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;flex-shrink:0;font-weight:600">📞</button>
    </div>`;
  }).join('');
}

function renderEmpty(text){
  const list = $('icMsgList');
  if(list) list.innerHTML = `<div class="ic-empty">${esc(text||'Aucun message.')}</div>`;
}

// ── Swipe-to-delete helpers ─────────────────────────────────────
const SWIPE_W = 76;

function _closeSwipeWrap(wrap) {
  const r = wrap.querySelector('.ic-mail-row');
  const d = wrap.querySelector('.ic-swipe-del');
  const T = 'transform .22s cubic-bezier(.22,1,.36,1)';
  if(r){ r.style.transition = T; r.style.transform = 'translateX(0)'; }
  if(d){ d.style.transition = T; d.style.transform = 'translateX(100%)'; }
  wrap.dataset.swipeOpen = '0';
}

function _openSwipeWrap(wrap) {
  const r = wrap.querySelector('.ic-mail-row');
  const d = wrap.querySelector('.ic-swipe-del');
  const T = 'transform .22s cubic-bezier(.22,1,.36,1)';
  if(r){ r.style.transition = T; r.style.transform = `translateX(-${SWIPE_W}px)`; }
  if(d){ d.style.transition = T; d.style.transform = 'translateX(0)'; }
  wrap.dataset.swipeOpen = '1';
}

function _initRowSwipe(wrap) {
  const row = wrap.querySelector('.ic-mail-row');
  const del = wrap.querySelector('.ic-swipe-del');
  if(!row) return;
  let startX = 0, startY = 0, curX = 0, tracking = false;

  if(del) del.style.transform = 'translateX(100%)';

  row.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    curX = startX;
    tracking = false;
    row.style.transition = 'none';
    if(del) del.style.transition = 'none';
  }, { passive: true });

  row.addEventListener('touchmove', e => {
    curX = e.touches[0].clientX;
    const dx = curX - startX;
    const dy = e.touches[0].clientY - startY;
    if(!tracking) {
      if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if(Math.abs(dy) > Math.abs(dx)) return;
      tracking = true;
      document.querySelectorAll('.ic-swipe-wrap').forEach(w => {
        if(w !== wrap && w.dataset.swipeOpen === '1') _closeSwipeWrap(w);
      });
    }
    if(!tracking) return;
    const isOpen = wrap.dataset.swipeOpen === '1';
    const clamped = Math.max(Math.min((isOpen ? -SWIPE_W : 0) + dx, 0), -SWIPE_W);
    e.preventDefault();
    row.style.transform = `translateX(${clamped}px)`;
    if(del) del.style.transform = `translateX(${100 + (clamped * 100 / SWIPE_W)}%)`;
  }, { passive: false });

  row.addEventListener('touchend', () => {
    if(!tracking) return;
    tracking = false;
    const dx = curX - startX;
    const isOpen = wrap.dataset.swipeOpen === '1';
    if(!isOpen && dx < -40) _openSwipeWrap(wrap);
    else if(isOpen && dx > 30) _closeSwipeWrap(wrap);
    else if(isOpen) _openSwipeWrap(wrap);
    else _closeSwipeWrap(wrap);
  });

  if(del) del.addEventListener('click', e => {
    e.stopPropagation();
    _closeSwipeWrap(wrap);
    deleteThread(row.dataset.plate);
  });
}

function render(){
  const list = $('icMsgList');
  if(!list) return;

  let threads = State.threads;

  if(State.mode === 'sent'){
    threads = threads.filter(t => t.list.some(m=>m._sent));
  }
  if(State.mode === 'compose'){
    list.innerHTML = `<div class="ic-empty">Écris une plaque et un message puis appuie sur ➤.</div>`;
    return;
  }

  // Filtre recherche (F-SEARCH)
  if(State.searchQuery){
    const q = State.searchQuery;
    threads = threads.filter(t =>
      nPlate(t.plate).includes(q) ||
      (t.last?.message || '').toUpperCase().includes(q)
    );
  }

  // Filtre archives (F-ARCHIVE)
  const archived = getArchived();
  threads = threads.filter(t => !archived.includes(nPlate(t.plate)));

  // Favoris en tête (F-FAVORITES)
  const favs = getFavorites();
  if(favs.length > 0){
    threads = [
      ...threads.filter(t => favs.includes(nPlate(t.plate))),
      ...threads.filter(t => !favs.includes(nPlate(t.plate)))
    ];
  }

  if(!threads.length){
    const helpText = State.mode === 'sent'
      ? 'Aucun message envoyé.'
      : State.searchQuery
        ? `Aucune conversation pour "${State.searchQuery}".`
        : '💬 Aucun message reçu.<br><small style="display:block;margin-top:5px;font-size:11px;color:#9aacc2">Clique sur un véhicule sur la carte pour démarrer une conversation.</small>';
    list.innerHTML = `<div class="ic-empty">${helpText}</div>`;
    closeThread();
    return;
  }

  list.innerHTML = threads.map(t=>{
    const last = t.last || {};
    const timeStr = last.created_at ? (typeof relTime==='function'?relTime(new Date(last.created_at).getTime()):new Date(last.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})) : '';
    const trust = getTrust(t.plate);
    const isFav = favs.includes(nPlate(t.plate));
    const trustBadge = isFav ? '<span class="ic-trust-fav">⭐</span>' :
      trust === 'TRUSTED'  ? '<span class="ic-trust-ok">✓</span>' :
      trust === 'CONTEXT'  ? '<span class="ic-trust-ctx">📍</span>' : '';
    return `
      <div class="ic-swipe-wrap">
        <div class="ic-mail-row ${t.unread?'unread':''} ${State.activePlate===t.plate?'active':''}"
             data-plate="${esc(t.plate)}">
          <div class="ic-avatar">🚗</div>
          <div class="ic-row-body">
            <div class="ic-row-top">
              <span class="ic-plate">${esc(t.plate)}${trustBadge}</span>
              <span class="ic-row-time">${esc(timeStr)}</span>
            </div>
            <div class="ic-row-bot">
              <span class="ic-preview">${esc(last.message || '')}</span>
              <span class="ic-unread-dot"></span>
            </div>
          </div>
        </div>
        <button class="ic-swipe-del" data-plate="${esc(t.plate)}">Supprimer</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.ic-swipe-wrap').forEach(wrap => {
    const row = wrap.querySelector('.ic-mail-row');
    if(row) row.addEventListener('click', () => {
      if(wrap.dataset.swipeOpen === '1'){ _closeSwipeWrap(wrap); return; }
      openThread(row.dataset.plate);
    });
    _initRowSwipe(wrap);
  });

  // ── Section Archivées ─────────────────────────────────────────
  _renderArchivedSection(list);
}

function _renderArchivedSection(list){
  const archived = getArchived();
  if(!archived.length) return;

  const archThreads = (State.threads || [])
    .filter(t => archived.includes(nPlate(t.plate)))
    .sort((a,b) => new Date(b.last?.created_at||0) - new Date(a.last?.created_at||0));
  if(!archThreads.length) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ic-archived-toggle';
  toggle.innerHTML = `📂 Archivées <span class="ic-arch-count">${archThreads.length}</span>`;

  const section = document.createElement('div');
  section.style.display = 'none';
  section.innerHTML = archThreads.map(t => {
    const last = t.last || {};
    const timeStr = last.created_at ? (typeof relTime==='function'?relTime(new Date(last.created_at).getTime()):new Date(last.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})) : '';
    return `
      <div class="ic-mail-row" data-plate="${esc(t.plate)}" style="opacity:.7">
        <div class="ic-avatar">📂</div>
        <div class="ic-row-body">
          <div class="ic-row-top">
            <span class="ic-plate">${esc(t.plate)}</span>
            <span class="ic-row-time">${esc(timeStr)}</span>
          </div>
          <div class="ic-row-bot">
            <span class="ic-preview">${esc(last.message || '')}</span>
          </div>
        </div>
        <button type="button" style="font-size:11px;padding:4px 8px;background:#1e3252;border:none;border-radius:8px;color:#7ab3e8;cursor:pointer"
                onclick="ImmatMessages._unarchiveFromList('${esc(t.plate)}')">Désarchiver</button>
      </div>`;
  }).join('');

  toggle.addEventListener('click', () => {
    const open = section.style.display !== 'none';
    section.style.display = open ? 'none' : 'block';
    toggle.querySelector('.ic-arch-count').textContent = open ? archThreads.length : '▲';
  });

  section.querySelectorAll?.('.ic-mail-row[data-plate]');
  list.appendChild(toggle);
  list.appendChild(section);

  section.querySelectorAll('.ic-mail-row[data-plate]').forEach(row => {
    row.addEventListener('click', e => {
      if(e.target.tagName === 'BUTTON') return;
      openThread(row.dataset.plate);
    });
  });
}

async function markThreadRead(plate){
  const client = sb();
  if(!client || !State.user) return;

  const unread = State.messages.filter(m=>m._otherPlate===plate && m._received && !m.read_at);
  if(unread.length){
    const now = new Date().toISOString();
    const ids = unread.map(m=>m.id);
    try{
      await client.from('messages').update({read_at:now}).in('id',ids);
      unread.forEach(m=>{ m.read_at = now; });
    }catch(e){}
  }

  buildThreads();
  setBadge(State.threads.reduce((s,t)=>s+t.unread,0));
  try{window.ImmatOrganism?.observe?.('VEHICLE_MESSAGE_RECEIVED',{plate,count:unread.length,_src:'ImmatConnect/messages/markThreadRead'})}catch(e){}
  try{window.App?.updateActBadge?.()}catch(e){}
}

// ── Timeline unifiée (messages + appels) ────────────────────────
function _renderTimeline(body, messages, callEvents){
  const allEvents = [
    ...(messages||[]).map(m => ({...m, _type:'message', _ts:new Date(m.created_at||0).getTime()})),
    ...(callEvents||[]).map(c => ({...c, _type:'call', _ts:new Date(c.at||0).getTime()}))
  ].sort((a,b) => a._ts - b._ts);

  body.innerHTML = allEvents.map(item => {
    const timeStr = item._ts ? (typeof relTime==='function'?relTime(item._ts):new Date(item._ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})) : '';
    if(item._type === 'call'){
      const isOut = item.outgoing;
      const statusLabel = {
        pending:'En attente',accepted:'Accepté ✅',refused:'Refusé ❌',
        cancelled:'Annulé',missed:'Manqué ☎️'
      }[item.status] || item.status;
      const cls = item.status==='missed' ? 'call-missed' :
                  item.status==='refused' ? 'call-refused' :
                  isOut ? 'call-sent' : 'call-recv';
      return `<div class="ic-bubble ${cls}">
        <div class="ic-bubble-text">📞 ${isOut ? 'Appel émis' : 'Appel reçu'} · ${statusLabel}</div>
        <div class="ic-bubble-footer"><span class="ic-time">${esc(timeStr)}</span></div>
      </div>`;
    }
    return `<div class="ic-bubble ${item._sent?'sent':'recv'}">
      <div class="ic-bubble-text">${esc(item.message||'')}</div>
      <div class="ic-bubble-footer">
        <span class="ic-time">${esc(timeStr)}</span>
        ${item._sent ? `<span class="ic-read-tick" title="${item.read_at?'Vu le '+new Date(item.read_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Envoyé'}">${item.read_at?'<span style="color:#60a5fa">✓✓</span>':'<span style="color:#64748b">✓</span>'}</span>` : ''}
        <button class="ic-delete-msg" aria-label="Supprimer ce message" onclick="ImmatMessages.deleteMessage('${esc(item.id)}')">×</button>
      </div>
    </div>`;
  }).join('');
}

async function openThread(plate){
  const localPlate = fPlate(plate);
  State.activePlate = localPlate;
  await markThreadRead(localPlate);

  if(State.activePlate !== localPlate) return;

  const t = State.threads.find(x=>x.plate===localPlate);
  const box = $('icThread');
  const body = $('icThreadBody');
  const title = $('icThreadTitle');
  const sub = $('icThreadSub');

  if(!box || !body || !t) return;

  if(title) title.textContent = localPlate;
  // Enrichit le titre avec le pseudo : cache nearby d'abord, sinon DB
  (async()=>{
    try{
      const _nb=window.S?.nearby?.find(x=>nPlate(x.plate)===nPlate(localPlate));
      if(_nb?.pseudo&&_nb.pseudo!=='Conducteur'){
        if(title&&title.textContent===localPlate)title.textContent=localPlate+' · '+_nb.pseudo;
        return;
      }
      const{data:_pd}=await sb().from('profiles').select('pseudo').eq('owner_plate',nPlate(localPlate)).maybeSingle();
      if(_pd?.pseudo&&title&&title.textContent===localPlate)title.textContent=localPlate+' · '+_pd.pseudo;
    }catch(e){}
  })();

  // Sous-titre : niveau confiance (F-TRUST)
  if(sub){
    const trust = getTrust(localPlate);
    const subLabels = {
      NONE:     'Appuie sur 📞 pour demander un contact',
      CONTEXT:  '📍 Contexte actif',
      TRUSTED:  '✓ Conducteur de confiance',
      FAVORITE: '⭐ Favori prioritaire'
    };
    sub.textContent = subLabels[trust] || subLabels.NONE;
  }

  // Carte contexte alerte active (F-CALL-CONTEXT)
  const ctxCard = $('icContextCard');
  if(ctxCard){
    const alerts = (window.S?.alerts || []).filter(a =>
      a.status !== 'resolved' &&
      (nPlate(a.plate||a.target_plate||'') === nPlate(localPlate) ||
       nPlate(a.sender_plate||'') === nPlate(localPlate))
    );
    if(alerts.length > 0){
      const a = alerts[0];
      ctxCard.style.display = '';
      ctxCard.innerHTML = `⚠️ <strong>Alerte active</strong> : ${esc(a.reason || a.category || 'Signalement')}`;
    } else {
      ctxCard.style.display = 'none';
    }
  }

  // Masquer la liste (thread prend la place)
  const listEl = $('icMsgList');
  const hdr    = document.querySelector('#icMessagesPro .ic-conv-header');
  const sbar   = $('icSearchBar');
  if(listEl) listEl.style.display = 'none';
  if(hdr)    hdr.style.display    = 'none';
  if(sbar)   sbar.style.display   = 'none';

  // Chargement événements d'appel (F-CONVERSATION-ENGINE + F-APPEL)
  let callEvents = [];
  try{
    const allCalls = await (window.CallManager?.loadCallLog?.() || Promise.resolve([]));
    callEvents = (allCalls||[]).filter(c => nPlate(fPlate(c.plate)) === nPlate(localPlate));
    State.callEventsCache[nPlate(localPlate)] = callEvents;
  }catch(e){ callEvents = []; }

  _renderTimeline(body, t.list, callEvents);

  box.classList.add('show');
  body.scrollTop = body.scrollHeight;
  render();
}

function closeThread(){
  const box    = $('icThread');
  const listEl = $('icMsgList');
  const hdr    = document.querySelector('#icMessagesPro .ic-conv-header');
  const sbar   = $('icSearchBar');
  if(box)    box.classList.remove('show');
  if(listEl) listEl.style.display = '';
  if(hdr)    hdr.style.display    = '';
  if(sbar && localStorage.getItem('_icSearchOpen') === '1') sbar.style.display = '';
  State.activePlate = null;
}

function refreshThread(){
  if(!State.activePlate) return;
  const box = $('icThread');
  const body = $('icThreadBody');
  if(!box || !body || !box.classList.contains('show')) return;
  const t = State.threads.find(x => x.plate === State.activePlate);
  if(!t) return;
  if(t.unread > 0) markThreadRead(State.activePlate).catch(()=>{});
  const callEvents = State.callEventsCache[nPlate(State.activePlate)] || [];
  _renderTimeline(body, t.list, callEvents);
  body.scrollTop = body.scrollHeight;
}

async function sendNew(){
  const btn = document.querySelector('#icComposePanel .ic-send-btn');
  if(btn){ btn.disabled=true; btn.textContent='…'; }
  try{
    const plate = fPlate($('icComposePlate')?.value || $('iTarget')?.value || '');
    const text = ($('icComposeText')?.value || $('iMsg')?.value || '').trim();
    await sendToPlate(plate,text);
    if($('icComposeText')) $('icComposeText').value = '';
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='➤'; }
  }
}

async function reply(){
  if(!State.activePlate) return toast('Choisis une conversation.','bad');
  const text = ($('icReplyText')?.value || '').trim();
  const btn = document.querySelector('#icThread .ic-send-btn');
  if(btn){ btn.disabled=true; btn.textContent='…'; }
  try{
    await sendToPlate(State.activePlate,text);
    if($('icReplyText')) $('icReplyText').value = '';
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='➤'; }
  }
}

async function quick(text){
  if(!State.activePlate) return toast('Choisis une conversation.','bad');
  await sendToPlate(State.activePlate,text);
}

async function sendToPlate(plate,text,opts){
  const client = sb();
  const u = await getUser();
  const me = await getProfile();
  const _ctx = opts && typeof opts === 'object' ? opts : {};

  plate = fPlate(plate);
  const senderPlate = fPlate(me?.owner_plate || myPlate());

  if(!client || !u){ toast('Reconnecte-toi.','bad'); return false; }
  if(!senderPlate){ toast('Profil conducteur incomplet.','bad'); return false; }
  if(!plate){ toast('Plaque destinataire manquante.','bad'); return false; }
  if(plate === senderPlate){ toast("Impossible de t'envoyer un message à toi-même.",'bad'); return false; }
  if(!text){ toast('Message vide.','bad'); return false; }

  // Rate limit : max 5 messages par minute (client-side guard)
  try {
    const _now = Date.now(), _win = 60000, _max = 5;
    let _times = JSON.parse(localStorage.getItem('ic_msg_times') || '[]');
    _times = _times.filter(t => _now - t < _win);
    if (_times.length >= _max) {
      toast('⏳ Trop de messages. Patientez une minute avant d\'en envoyer d\'autres.', 'bad');
      return false;
    }
    _times.push(_now);
    localStorage.setItem('ic_msg_times', JSON.stringify(_times));
  } catch(e) {}

  // Bloc bidirectionnel : A ne peut pas contacter une plaque qu'il a bloquée (INV-COM-024)
  const outgoingBlock = getBlockLevel(plate);
  if(outgoingBlock === BLOCK_LEVELS.MESSAGES || outgoingBlock === BLOCK_LEVELS.ALL){
    toast('Vous avez bloqué ce conducteur.','bad'); return false;
  }


  const target = await findProfileByPlate(plate);
  if(!target?.id){ toast('Aucun conducteur ImmatConnect trouvé avec cette plaque.','bad'); return false; }
  if(target.id === u.id){ toast("Impossible de t'envoyer un message à toi-même.",'bad'); return false; }

  const receiverPlate = fPlate(target.owner_plate || plate);

  const base = {
    sender_id:u.id,
    receiver_id:target.id,
    target_plate:receiverPlate,
    message:text,
    status:'accepted'
  };

  const rich = {
    ...base,
    sender_plate:senderPlate,
    receiver_plate:receiverPlate,
    from_plate:senderPlate,
    to_plate:receiverPlate
  };

  let {error} = await client.from('messages').insert(rich);

  if(error && /sender_plate|receiver_plate|from_plate|to_plate|column|schema cache/i.test(String(error.message||''))){
    const r = await client.from('messages').insert(base);
    error = r.error;
  }

  if(error){
    console.error(error);
    toast('Erreur envoi message.','bad');
    return false;
  }

  State.activePlate = receiverPlate;
  toast('Message envoyé à ' + receiverPlate + '.','ok');
  // Push fire-and-forget vers le destinataire (INV-COM-010 : plaque uniquement, pas le contenu)
  try{const _c=sb();if(_c&&target?.id){_c.functions.invoke('send-push-notification',{body:{targetUserId:target.id,title:'💬 ImmatConnect — Nouveau message',body:senderPlate+' vous a envoyé un message',data:{type:'message',plate:senderPlate},tag:'msg-'+senderPlate}}).catch(()=>{});}}catch(e){}
  try{window.ImmatOrganism?.observe?.('VEHICLE_MESSAGE_SENT',{to:receiverPlate,from:senderPlate,_src:'ImmatConnect/messages/sendToPlate'})}catch(e){}
  try{window.ImmatOrganism?.observe?.('MSG_SENT',{to:receiverPlate,_src:'ImmatConnect/messages/sendToPlate'})}catch(e){}
  try{
    const _iePayload = {to:receiverPlate, from:senderPlate};
    if(_ctx.context_type) _iePayload.context_type = _ctx.context_type;
    if(_ctx.context_id)   _iePayload.context_id   = _ctx.context_id;
    window.InteractionEngine?.create?.({
      type:'MESSAGE',
      initiator: senderPlate,
      target: receiverPlate,
      payload: _iePayload,
      status:'resolved'
    });
  }catch(e){}
  await refresh();
  setMode('inbox');
  openThread(receiverPlate);
  return true;
}

async function deleteMessage(id){
  if(!confirm('Supprimer ce message ?')) return;
  // INV-COM-009 : soft-delete local uniquement — pas de DELETE DB
  const sid = String(id);
  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  if(!deleted.includes(sid)) deleted.push(sid);
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-500))); }catch(e){}
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
}

async function deleteThread(plate){
  const target = fPlate(plate || State.activePlate || '');
  if(!target) return;
  // Toujours confirmer, qu'on vienne du swipe ou du header (INV-COM-009)
  if(!confirm('Supprimer cette conversation ?')) return;

  // INV-COM-009 : soft-delete local uniquement — pas de DELETE DB
  const ids = State.messages
    .filter(m=>m._otherPlate===target)
    .map(m=>String(m.id));

  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  ids.forEach(id => { if(!deleted.includes(id)) deleted.push(id); });
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-500))); }catch(e){}

  try{ window.ImmatOrganism?.observe?.('CONV_DELETED',{plate:target,_src:'ImmatConnect/messages/deleteThread'}); }catch(e){}
  closeThread();
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}
}

async function deleteAllMessages(){
  if(!confirm('Masquer TOUS vos messages ? Cette action ne supprime pas les données du correspondant.')) return;
  // INV-COM-009 : soft-delete local uniquement — on ajoute tous les IDs à ic_deleted_msgs
  const ids = State.messages.map(m=>m.id).filter(Boolean).map(String);
  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  ids.forEach(id => { if(!deleted.includes(id)) deleted.push(id); });
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-2000))); }catch(e){}
  closeThread();
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}
}

async function subscribe(){
  const client = sb();
  const u = State.user || await getUser();
  if(!client || !u) return;
  if(State.channel) return;

  State.channel = client
    .channel('immat_messages_v13_' + u.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async(payload)=>{
      const m = payload.new || {};
      // mp/uid relus au moment de l'event (profile peut être chargé après subscribe)
      const mp  = nPlate(myPlate());
      const uid = State.user?.id;
      // MSG_RECEIVED uniquement quand c'est un message adressé à MOI (pas mes propres envois)
      const isForMe = mp && (
        nPlate(m.receiver_plate||'') === mp ||
        nPlate(m.target_plate||'') === mp ||
        nPlate(m.to_plate||'') === mp ||
        (uid && m.receiver_id === uid && m.sender_id !== uid)
      );
      if(isForMe){
        try{window.ImmatOrganism?.observe?.('MSG_RECEIVED',{_src:'ImmatConnect/messages/subscribe'})}catch(e){}
        try{
          const _sp=fPlate(m.sender_plate||m.from_plate||'');
          window.InteractionEngine?.create?.({
            type:'MESSAGE',
            initiator:_sp||'UNKNOWN',
            target:fPlate(myPlate()),
            payload:{from:_sp,to:fPlate(myPlate())},
            status:'resolved'
          });
        }catch(e){}
      }
      await refresh();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},async()=>{ await refresh(); })
    .subscribe((status,err)=>{
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        console.warn('Realtime messages KO', err);
        State.channel = null;
        setTimeout(subscribe, 5000);
      }
    });
}

function installInputs(){
  ['icComposePlate','iTarget'].forEach(id=>{
    const el = $(id);
    if(el && !el.dataset.plateReady){
      el.dataset.plateReady = '1';
      el.addEventListener('input',()=>el.value=fPlate(el.value));
    }
  });
  // Ctrl/Cmd+Enter pour envoyer dans les deux textareas
  [['icComposeText','sendNew'],['icReplyText','reply']].forEach(([id,fn])=>{
    const _ta=$(id);
    if(_ta&&!_ta.dataset.enterReady){
      _ta.dataset.enterReady='1';
      _ta.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){
          e.preventDefault();
          try{window.ImmatMessages[fn]?.();}catch(ex){}
        }
      });
    }
  });
  // Aperçu destinataire sous #icComposePlate
  const _pp=$('icComposePlatePreview'),_pe=$('icComposePlate');
  if(_pe&&_pp&&!_pe.dataset.previewReady){
    _pe.dataset.previewReady='1';
    let _pt=null;
    _pe.addEventListener('input',()=>{
      clearTimeout(_pt);
      const _pl=nPlate(_pe.value||'');
      if(_pl.length<7){_pp.style.display='none';return;}
      _pt=setTimeout(async()=>{
        // Cache nearby en premier (zéro requête DB)
        const _nb=window.S?.nearby?.find(x=>nPlate(x.plate)===_pl);
        if(_nb){
          _pp.textContent=fPlate(_pl)+(_nb.pseudo&&_nb.pseudo!=='Conducteur'?' · '+_nb.pseudo:'');
          _pp.style.color='#4ade80';_pp.style.display='';
          return;
        }
        try{
          const{data:_pd}=await sb().from('profiles').select('pseudo').eq('owner_plate',_pl).maybeSingle();
          if(_pd){
            _pp.textContent=fPlate(_pl)+(_pd.pseudo?' · '+_pd.pseudo:'');
            _pp.style.color='#94a3b8';
          }else{
            _pp.textContent=fPlate(_pl)+' — inconnu';
            _pp.style.color='#64748b';
          }
          _pp.style.display='';
        }catch(e){_pp.style.display='none';}
      },450);
    });
  }
}

// ── F-TRUST : Gestion de confiance ──────────────────────────────
function getTrustMap(){
  try{ return JSON.parse(localStorage.getItem('ic_trust')||'{}'); }catch(e){ return {}; }
}
function getTrust(plate){
  return getTrustMap()[nPlate(fPlate(plate))] || 'NONE';
}
function setTrust(plate,level){
  plate = fPlate(plate);
  if(!plate) return;
  const map = getTrustMap();
  map[nPlate(plate)] = level || 'NONE';
  try{ localStorage.setItem('ic_trust',JSON.stringify(map)); }catch(e){}
  // Émettre l'événement OBD approprié (INV-COM-007) — literals pour la détection statique
  if(!level || level === 'NONE'){
    try{ window.ImmatOrganism?.observe?.('CONTACT_REVOKED',{plate,level,_src:'ImmatConnect/messages/setTrust'}); }catch(e){}
    toast('Confiance révoquée pour '+plate+'.','ok');
  } else {
    try{ window.ImmatOrganism?.observe?.('CONTACT_TRUSTED',{plate,level,_src:'ImmatConnect/messages/setTrust'}); }catch(e){}
    toast('Confiance '+level+' attribuée à '+plate+'.','ok');
  }
  render();
}

// ── F-FAVORITES : Conversations favorites ───────────────────────
function getFavorites(){
  try{ return JSON.parse(localStorage.getItem('ic_favorites')||'[]'); }catch(e){ return []; }
}
function saveFavorites(arr){
  try{ localStorage.setItem('ic_favorites',JSON.stringify(arr)); }catch(e){}
}
function favoriteConv(plate){
  plate = nPlate(fPlate(plate));
  const favs = getFavorites();
  if(!favs.includes(plate)) saveFavorites([...favs,plate]);
  try{ window.ImmatOrganism?.observe?.('CONV_FAVORITED',{plate,_src:'ImmatConnect/messages/favoriteConv'}); }catch(e){}
  render();
}
function unfavoriteConv(plate){
  plate = nPlate(fPlate(plate));
  saveFavorites(getFavorites().filter(p=>p!==plate));
  try{ window.ImmatOrganism?.observe?.('CONV_FAVORITED',{plate,action:'removed',_src:'ImmatConnect/messages/unfavoriteConv'}); }catch(e){}
  render();
}

// ── F-ARCHIVE : Archivage de conversations ──────────────────────
function getArchived(){
  try{ return JSON.parse(localStorage.getItem('ic_archived')||'[]'); }catch(e){ return []; }
}
function saveArchived(arr){
  try{ localStorage.setItem('ic_archived',JSON.stringify(arr)); }catch(e){}
}
function archiveConv(plate){
  plate = nPlate(fPlate(plate));
  const arch = getArchived();
  if(!arch.includes(plate)) saveArchived([...arch,plate]);
  try{ window.ImmatOrganism?.observe?.('CONV_ARCHIVED',{plate,_src:'ImmatConnect/messages/archiveConv'}); }catch(e){}
  render();
}
function unarchiveConv(plate){
  plate = nPlate(fPlate(plate));
  saveArchived(getArchived().filter(p=>p!==plate));
  try{ window.ImmatOrganism?.observe?.('CONV_ARCHIVED',{plate,action:'removed',_src:'ImmatConnect/messages/unarchiveConv'}); }catch(e){}
  render();
}

// ── F-SEARCH : Recherche dans les conversations ─────────────────
function toggleSearch(){
  const bar = $('icSearchBar');
  if(!bar) return;
  const hidden = bar.style.display === 'none' || !bar.style.display;
  bar.style.display = hidden ? '' : 'none';
  try{ localStorage.setItem('_icSearchOpen', hidden ? '1' : '0'); }catch(e){}
  if(hidden){
    const inp = $('icSearchInput');
    if(inp){ inp.value=''; inp.focus(); }
  } else {
    State.searchQuery = '';
    render();
  }
}
function filterConv(query){
  State.searchQuery = (query||'').trim().toUpperCase();
  try{ window.ImmatOrganism?.observe?.('CONV_SEARCHED',{_src:'ImmatConnect/messages/filterConv'}); }catch(e){}
  render();
}

// ── Appel depuis thread (F-APPEL) ────────────────────────────────
function callActive(){
  if(!State.activePlate) return toast('Aucune conversation active.','bad');
  try{
    window.CallManager?.openContactOptions?.(State.activePlate) ||
    window.CallManager?.contactByCall?.(State.activePlate);
  }catch(e){}
}

// ── Fermer composition ───────────────────────────────────────────
function closeCompose(){
  const compose = $('icComposePanel');
  const list    = $('icMsgList');
  if(compose) compose.classList.remove('show');
  if(list)    list.style.display = '';
  State.mode = 'inbox';
  render();
}

// ── Menu thread — bottom sheet ────────────────────────────────────
function openThreadMenu(){
  if(!State.activePlate) return;
  const plate = State.activePlate;
  const isFav  = getFavorites().includes(nPlate(plate));
  const isArch = getArchived().includes(nPlate(plate));
  const trust  = getTrust(plate);

  const favBtn   = document.getElementById('icSheetFav');
  const archBtn  = document.getElementById('icSheetArch');
  const trustBtn = document.getElementById('icSheetTrust');

  if(favBtn)   favBtn.textContent   = isFav  ? '⭐ Retirer des favoris' : '⭐ Ajouter aux favoris';
  if(archBtn)  archBtn.textContent  = isArch ? '📂 Désarchiver'         : '📁 Archiver';
  if(trustBtn) trustBtn.textContent = trust === 'TRUSTED' ? '✓ Révoquer confiance' : '✓ Marquer de confiance';

  const backdrop = document.getElementById('icSheetBackdrop');
  const sheet    = document.getElementById('icBottomSheet');
  _initSheetTouch();
  if(backdrop) backdrop.classList.add('show');
  if(sheet)    sheet.classList.add('show');
  const cats = document.getElementById('icAbuseCategories');
  if(cats) cats.style.display = 'none';
}

function closeSheet(){
  const sheet    = document.getElementById('icBottomSheet');
  const backdrop = document.getElementById('icSheetBackdrop');
  if(sheet){
    sheet.style.transform  = '';
    sheet.style.transition = '';
    sheet.classList.remove('show');
  }
  if(backdrop) backdrop.classList.remove('show');
}

let _sheetTouchInit = false;
function _initSheetTouch(){
  if(_sheetTouchInit) return;
  const sheet = document.getElementById('icBottomSheet');
  if(!sheet) return;
  _sheetTouchInit = true;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    startY   = e.touches[0].clientY;
    dragging = true;
    sheet.style.transition = 'none';
  }, {passive:true});
  sheet.addEventListener('touchmove', e => {
    if(!dragging) return;
    const dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  }, {passive:true});
  sheet.addEventListener('touchend', () => {
    if(!dragging) return;
    dragging = false;
    const m  = sheet.style.transform.match(/translateY\((\d+(?:\.\d+)?)px\)/);
    const dy = m ? parseFloat(m[1]) : 0;
    sheet.style.transition = '';
    if(dy > 60){ closeSheet(); }
    else        { sheet.style.transform = ''; }
  });
}

function _sheetAction(action){
  if(!State.activePlate) return;
  const plate = State.activePlate;
  const isFav  = getFavorites().includes(nPlate(plate));
  const isArch = getArchived().includes(nPlate(plate));
  const trust  = getTrust(plate);
  if(action === 'abuse') {
    const cats = document.getElementById('icAbuseCategories');
    if(cats) cats.style.display = cats.style.display === 'none' ? '' : 'none';
    return;
  }
  closeSheet();
  if(action === 'fav')   { isFav  ? unfavoriteConv(plate)                      : favoriteConv(plate); }
  else if(action === 'arch')  { isArch ? unarchiveConv(plate)                       : archiveConv(plate); }
  else if(action === 'trust') { setTrust(plate, trust === 'TRUSTED' ? 'NONE' : 'TRUSTED'); }
  else if(action === 'del')   { deleteThread(plate); }
}

function _reportAbuse(category){
  const plate = State.activePlate;
  if(!plate) return;
  const labels = {ABUSE_SPAM:'Spam',ABUSE_HARASSMENT:'Harcèlement',ABUSE_INSULT:'Insulte',ABUSE_FALSE_ALERT:'Fausse alerte',ABUSE_CALL_MISUSE:"Abus d'appel",ABUSE_OTHER:'Autre'};
  const label = labels[category] || category;
  if(!confirm('Signaler un abus ('+label+') de '+plate+' ?')) return;
  const cats = document.getElementById('icAbuseCategories');
  if(cats) cats.style.display = 'none';
  closeSheet();
  try{ window.ImmatOrganism?.observe?.('ABUSE_REPORTED',{plate,category,label,_src:'ImmatConnect/messages/_reportAbuse'}); }catch(e){}
  toast('Abus ('+label+') signalé. Merci pour votre vigilance.','ok');
}

// ── F-PRESENCE : Statut de présence ─────────────────────────────
function setPresence(status){
  try{ localStorage.setItem('ic_presence',status); }catch(e){}
  try{ window.ImmatOrganism?.observe?.('PRESENCE_CHANGED',{status,_src:'ImmatConnect/messages/setPresence'}); }catch(e){}
  document.querySelectorAll('.presence-btn').forEach(b=>{
    b.classList.toggle('on', b.dataset.status === status);
  });
  const labels = {disponible:'🟢 Disponible',conduite:'🚗 Conduite',occupé:'🟡 Occupé',invisible:'⚫ Invisible','hors-ligne':'⭕ Hors ligne'};
  toast('Statut : '+(labels[status]||status)+'.','ok');
}

// ── F-CALL-PERMISSIONS : Niveau d'accès appels ──────────────────
function setCallLevel(level){
  let oldLevel = 1;
  try{ oldLevel = parseInt(localStorage.getItem('ic_call_perm') || '1', 10); }catch(e){}
  try{ localStorage.setItem('ic_call_perm',String(level)); }catch(e){}
  document.querySelectorAll('.call-level-btn').forEach(b=>{
    b.classList.toggle('on', String(b.dataset.level) === String(level));
  });
  saveCallSettings();
  try{ window.ImmatOrganism?.observe?.('TRUST_LEVEL_CHANGED',{oldLevel,newLevel:level,_src:'ImmatConnect/messages/setCallLevel'}); }catch(e){}
  const labels = {1:'Personne ne peut vous appeler.',2:'Contacts de confiance uniquement.',3:'Confiance + contexte actif.',4:'Tout le monde peut vous appeler.'};
  toast('Niveau '+level+' : '+(labels[level]||''),'ok');
}

function setDnd(enabled){
  try{ localStorage.setItem('ic_dnd',enabled?'1':'0'); }catch(e){}
  const hours = $('dndHours');
  if(hours) hours.style.display = enabled ? '' : 'none';
  const sub = $('dndSub');
  if(sub) _updateDndSub();
  saveCallSettings();
}

function saveDndHours(){
  const from = $('dndFrom')?.value || '22:00';
  const to   = $('dndTo')?.value   || '07:00';
  try{ localStorage.setItem('ic_dnd_from',from); localStorage.setItem('ic_dnd_to',to); }catch(e){}
  _updateDndSub();
  saveCallSettings();
}

function _updateDndSub(){
  const sub = $('dndSub');
  if(!sub) return;
  const dndOn = localStorage.getItem('ic_dnd') === '1';
  const from  = localStorage.getItem('ic_dnd_from') || '22:00';
  const to    = localStorage.getItem('ic_dnd_to')   || '07:00';
  sub.textContent = dndOn ? 'Activé : '+from+' → '+to : 'Désactivé';
}

function saveCallSettings(){
  try{ window.ImmatOrganism?.observe?.('CALL_PREFERENCES_UPDATED',{_src:'ImmatConnect/messages/saveCallSettings'}); }catch(e){}
}

// ── F-SPAM-PROTECTION : Anti-spam ───────────────────────────────
function _checkSpam(plate){
  plate = nPlate(fPlate(plate));
  const now = Date.now();
  let log = {};
  try{ log = JSON.parse(localStorage.getItem('ic_spam_log')||'{}'); }catch(e){}
  const entry = log[plate] || {count:0,ts:now};
  if(now - entry.ts > 60000){ entry.count = 1; entry.ts = now; }
  else { entry.count++; }
  log[plate] = entry;
  try{ localStorage.setItem('ic_spam_log',JSON.stringify(log)); }catch(e){}
  if(entry.count > 20){
    try{ window.ImmatOrganism?.observe?.('SPAM_DETECTED',{plate,count:entry.count,_src:'ImmatConnect/messages/sendToPlate'}); }catch(e){}
    return true;
  }
  return false;
}

// ── Initialiser les paramètres UI ───────────────────────────────
function initSettings(){
  try{
    const callPerm = localStorage.getItem('ic_call_perm');
    if(callPerm) setCallLevel(parseInt(callPerm,10));
    const presence = localStorage.getItem('ic_presence');
    if(presence) document.querySelectorAll('.presence-btn').forEach(b=>b.classList.toggle('on',b.dataset.status===presence));
    const dnd = localStorage.getItem('ic_dnd') === '1';
    const dndToggle = $('dndToggle');
    if(dndToggle) dndToggle.checked = dnd;
    const hoursEl = $('dndHours');
    if(hoursEl) hoursEl.style.display = dnd ? '' : 'none';
    const from = localStorage.getItem('ic_dnd_from');
    const to   = localStorage.getItem('ic_dnd_to');
    if(from && $('dndFrom')) $('dndFrom').value = from;
    if(to   && $('dndTo'))   $('dndTo').value   = to;
    _updateDndSub();
  }catch(e){}
}

window.ImmatMessages = {
  mode:State.mode,
  refresh,
  render,
  setMode,
  sendNew,
  reply,
  quick,
  openThread,
  closeThread,
  deleteThread,
  deleteMessage,
  deleteAllMessages,
  renderCallLog,
  sendToPlate,
  unsubscribe:function(){if(State.channel){const client=sb();if(client){try{client.removeChannel(State.channel)}catch(e){}}State.channel=null;}},
  // Phase 1 — DAM-COMMUNICATION
  toggleSearch,
  filterConv,
  callActive,
  closeCompose,
  openThreadMenu,
  closeSheet,
  _sheetAction,
  _unarchiveFromList: (plate) => { unarchiveConv(plate); },
  setTrust,
  getTrust,
  getBlockLevel,
  getTrustLevel,
  getPermanentTrust,
  setTrustPermanent,
  setContextTrust,
  getContextTrust,
  clearContextTrust,
  revokePermanentTrust,
  _reportAbuse,
  BLOCK_LEVELS,
  TRUST_LEVELS,
  favoriteConv,
  unfavoriteConv,
  archiveConv,
  unarchiveConv,
  setPresence,
  setCallLevel,
  setDnd,
  saveDndHours,
  saveCallSettings,
};

window.setUnreadMsgCount = window.setUnreadMsgCount || setBadge;

async function boot(){
  installInputs();
  initSettings();
  const u = await getUser();
  if(u) await refresh();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}

})();
