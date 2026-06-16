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
    const btn = document.getElementById('icMarkAllReadBtn');
    if(btn) btn.style.display = n > 0 ? '' : 'none';
  }catch(e){}
}

function timeFR(d){
  try{
    return new Date(d).toLocaleString('fr-FR',{
      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
    });
  }catch(e){return '';}
}

const MSG_MAX_LEN = 1000;

const State = {
  mode:'inbox',
  user:null,
  profile:null,
  messages:[],
  threads:[],
  activePlate:null,
  channel:null,
  searchQuery:'',
  callEventsCache:{},
  pseudoMap:{},
  colorMap:{},
  _typingCh:null,
  _typingBcTimer:null,
  _typingHideTimer:null
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

function compactPlate(v){
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function findProfileByPlate(rawPlate){
  const client = sb();
  if(!client) return null;

  const dashed = fPlate(rawPlate);
  const compact = compactPlate(rawPlate);
  const normalized = nPlate(rawPlate);
  const raw = String(rawPlate || '').trim().toUpperCase();

  const variants = [...new Set([
    dashed,
    compact,
    normalized,
    raw
  ].filter(Boolean))];

  console.log('[OBD_FIND_PROFILE_START]', {
    rawPlate,
    dashed,
    compact,
    normalized,
    variants
  });

  for(const value of variants){
    const { data, error } = await client
      .from('profiles')
      .select('id,owner_plate,pseudo,vehicle_color')
      .eq('owner_plate', value)
      .maybeSingle();

    console.log('[OBD_FIND_PROFILE_TRY]', {
      value,
      found: !!data,
      data,
      error
    });

    if(error){
      console.warn('[findProfileByPlate error]', { value, error });
      return { __error: error };
    }

    if(data) return data;
  }

  return null;
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

  // Batch pseudo lookup pour la liste de conversations (post-render, non-bloquant)
  (async()=>{
    try{
      const plates=[...new Set(State.threads.map(t=>t.plate).filter(Boolean))];
      if(!plates.length) return;
      const need=[];
      plates.forEach(p=>{
        const nb=window.S?.nearby?.find(x=>nPlate(x.plate)===nPlate(p));
        if(nb?.pseudo&&nb.pseudo!=='Conducteur') State.pseudoMap[nPlate(p)]=nb.pseudo;
        if(nb?.color) State.colorMap[nPlate(p)]=nb.color;
        if(!nb?.pseudo||nb.pseudo==='Conducteur') need.push(nPlate(p));
      });
      if(need.length){
        const{data}=await sb().from('profiles').select('owner_plate,pseudo,vehicle_color').in('owner_plate',need);
        (data||[]).forEach(p=>{
          if(p.pseudo) State.pseudoMap[nPlate(p.owner_plate)]=p.pseudo;
          if(p.vehicle_color) State.colorMap[nPlate(p.owner_plate)]=p.vehicle_color;
        });
      }
      render();
    }catch(e){}
  })();
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
      (t.last?.message || '').toUpperCase().includes(q) ||
      (State.pseudoMap[nPlate(t.plate)]||'').toUpperCase().includes(q)
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
    const pseudo = State.pseudoMap[nPlate(t.plate)] || '';
    const _vc = State.colorMap[nPlate(t.plate)] || '';
    const _avBg = (_vc && _vc !== 'other' && window.colorHex) ? window.colorHex(_vc) : '#0b1420';
    const _avStyle = _vc && _vc !== 'other' ? ` style="background:${_avBg};border-color:transparent"` : '';
    const mutedBadge = isMuted(t.plate) ? '<span title="Sourdine" style="font-size:11px;opacity:.6">🔕</span>' : '';
    return `
      <div class="ic-swipe-wrap">
        <div class="ic-mail-row ${t.unread?'unread':''} ${State.activePlate===t.plate?'active':''}"
             data-plate="${esc(t.plate)}">
          <div class="ic-avatar"${_avStyle}>🚗</div>
          <div class="ic-row-body">
            <div class="ic-row-top">
              <span class="ic-plate">${esc(t.plate)}${pseudo?` <span style="font-size:11px;font-weight:400;color:#94a3b8">${esc(pseudo)}</span>`:''}${trustBadge}${mutedBadge}</span>
              <span class="ic-row-time">${esc(timeStr)}</span>
            </div>
            <div class="ic-row-bot">
              <span class="ic-preview">${esc(last.message || '')}</span>
              <span class="ic-unread-dot">${t.unread > 1 ? t.unread : ''}</span>
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

async function markAllRead(){
  const client = sb();
  if(!client || !State.user) return;
  const unread = State.messages.filter(m=>m._received && !m.read_at);
  if(!unread.length) return;
  const now = new Date().toISOString();
  const ids = unread.map(m=>m.id);
  try{
    await client.from('messages').update({read_at:now}).in('id',ids);
    unread.forEach(m=>{ m.read_at = now; });
  }catch(e){}
  buildThreads();
  setBadge(0);
  render();
  try{window.App?.updateActBadge?.()}catch(e){}
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
function _formatMsg(text){
  if(!text) return '';
  const URL_RE = /https?:\/\/[^\s<>"]+/g;
  let result = '', last = 0, m;
  while((m = URL_RE.exec(text)) !== null){
    result += esc(text.slice(last, m.index));
    const url = m[0];
    const display = url.length > 40 ? url.slice(0, 37) + '…' : url;
    result += '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;word-break:break-all">' + esc(display) + '</a>';
    last = m.index + url.length;
  }
  result += esc(text.slice(last));
  return result;
}

function _dayLabel(d){
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - that) / 86400000);
  if(diff === 0) return "Aujourd'hui";
  if(diff === 1) return 'Hier';
  if(diff > 1 && diff < 7) return d.toLocaleDateString('fr-FR',{weekday:'long'});
  return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',...(d.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})});
}

function _renderTimeline(body, messages, callEvents){
  const allEvents = [
    ...(messages||[]).map(m => ({...m, _type:'message', _ts:new Date(m.created_at||0).getTime()})),
    ...(callEvents||[]).map(c => ({...c, _type:'call', _ts:new Date(c.at||0).getTime()}))
  ].sort((a,b) => a._ts - b._ts);

  const firstUnreadIdx = allEvents.findIndex(e => e._type==='message' && !e._sent && !e.read_at);
  const unreadCount = firstUnreadIdx >= 0
    ? allEvents.filter(e => e._type==='message' && !e._sent && !e.read_at).length
    : 0;

  let _prevDayKey = '';
  body.innerHTML = allEvents.map((item, idx) => {
    // Séparateur de jour
    let daySep = '';
    if(item._ts){
      const _d = new Date(item._ts);
      const _dk = _d.getFullYear()+'-'+_d.getMonth()+'-'+_d.getDate();
      if(_dk !== _prevDayKey){
        _prevDayKey = _dk;
        daySep = `<div class="ic-day-sep"><span>${esc(_dayLabel(_d))}</span></div>`;
      }
    }
    const sep = daySep + ((idx === firstUnreadIdx && unreadCount > 0)
      ? `<div class="ic-unread-sep"><span>${unreadCount} non lu${unreadCount>1?'s':''}</span></div>`
      : '');
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
      return sep + `<div class="ic-bubble ${cls}">
        <div class="ic-bubble-text">📞 ${isOut ? 'Appel émis' : 'Appel reçu'} · ${statusLabel}</div>
        <div class="ic-bubble-footer"><span class="ic-time">${esc(timeStr)}</span></div>
      </div>`;
    }
    return sep + `<div class="ic-bubble ${item._sent?'sent':'recv'}">
      <div class="ic-bubble-text">${_formatMsg(item.message||'')}</div>
      <div class="ic-bubble-footer">
        <span class="ic-time">${esc(timeStr)}</span>
        ${item._sent ? `<span class="ic-read-tick" title="${item.read_at?'Vu le '+new Date(item.read_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Envoyé'}">${item.read_at?'<span style="color:#60a5fa">✓✓</span>':'<span style="color:#64748b">✓</span>'}</span>` : ''}
        <button class="ic-copy-msg" aria-label="Copier ce message" title="Copier" onclick="ImmatMessages.copyMessage('${esc(item.id)}')">⧉</button>
        <button class="ic-delete-msg" aria-label="Supprimer ce message" onclick="ImmatMessages.deleteMessage('${esc(item.id)}')">×</button>
      </div>
    </div>`;
  }).join('');
}

function _presenceLabel(plate){
  try{
    const nb = (window.S?.nearby||[]).find(x => nPlate(x.plate) === nPlate(plate));
    if(!nb || !nb.updated_at) return '';
    const ageMin = Math.floor((Date.now() - new Date(nb.updated_at).getTime()) / 60000);
    if(ageMin < 0) return '';
    if(ageMin < 3)  return '<span style="color:#34d399">🟢 Actif à proximité</span>';
    if(ageMin < 10) return '<span style="color:#fb923c">🟡 Vu il y a '+ageMin+' min</span>';
    return '';
  }catch(e){ return ''; }
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

  // Sous-titre : présence (proximité) prioritaire, sinon niveau confiance (F-TRUST)
  if(sub){
    const presence = _presenceLabel(localPlate);
    if(presence){
      sub.innerHTML = presence;
    }else{
      const trust = getTrust(localPlate);
      const subLabels = {
        NONE:     'Appuie sur 📞 pour demander un contact',
        CONTEXT:  '📍 Contexte actif',
        TRUSTED:  '✓ Conducteur de confiance',
        FAVORITE: '⭐ Favori prioritaire'
      };
      sub.textContent = subLabels[trust] || subLabels.NONE;
    }
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
  const _sep = body.querySelector('.ic-unread-sep');
  if(_sep) _sep.scrollIntoView({block:'center'});
  else body.scrollTop = body.scrollHeight;
  // Restaurer le brouillon de réponse s'il existe
  try{
    const _d=localStorage.getItem('ic_draft_reply_'+nPlate(localPlate));
    const _rt=$('icReplyText');
    if(_rt&&_d){_rt.value=_d;try{_rt.dispatchEvent(new Event('input'));}catch(e){}}
  }catch(e){}
  // Canal broadcast pour l'indicateur "est en train d'écrire"
  try{
    clearTimeout(State._typingHideTimer);
    if(State._typingCh){try{sb().removeChannel(State._typingCh);}catch(e){}State._typingCh=null;}
    const _tl=$('icTypingLabel');
    if(_tl) _tl.style.display='none';
    const _mp=nPlate(myPlate()),_op=nPlate(localPlate);
    if(_mp&&_op&&_mp!==_op){
      const _pair=[_mp,_op].sort().join('_');
      State._typingCh=sb().channel('ic_typ_'+_pair)
        .on('broadcast',{event:'typing'},({payload})=>{
          if((payload?.uid)===State.user?.id) return;
          if(State.activePlate!==localPlate) return;
          const _el=$('icTypingLabel');
          if(_el) _el.style.display='';
          clearTimeout(State._typingHideTimer);
          State._typingHideTimer=setTimeout(()=>{
            const _el2=$('icTypingLabel');
            if(_el2) _el2.style.display='none';
          },3000);
        })
        .subscribe();
    }
  }catch(e){}
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
  try{
    clearTimeout(State._typingHideTimer);
    clearTimeout(State._typingBcTimer);
    if(State._typingCh){try{sb().removeChannel(State._typingCh);}catch(e){}State._typingCh=null;}
    const _tl=$('icTypingLabel');
    if(_tl) _tl.style.display='none';
  }catch(e){}
}

function refreshThread(){
  if(!State.activePlate) return;
  const box = $('icThread');
  const body = $('icThreadBody');
  if(!box || !body || !box.classList.contains('show')) return;
  const t = State.threads.find(x => x.plate === State.activePlate);
  if(!t) return;
  if(t.unread > 0) markThreadRead(State.activePlate).catch(()=>{});
  // Rafraîchit l'indicateur de présence dans le sous-titre
  try{
    const sub = $('icThreadSub');
    if(sub){
      const presence = _presenceLabel(State.activePlate);
      if(presence) sub.innerHTML = presence;
    }
  }catch(e){}
  const wasNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 120;
  const prevCount = body.querySelectorAll('.ic-bubble').length;
  const callEvents = State.callEventsCache[nPlate(State.activePlate)] || [];
  _renderTimeline(body, t.list, callEvents);
  const newCount = body.querySelectorAll('.ic-bubble').length;
  const hint = $('icScrollHint');
  if(wasNearBottom || newCount <= prevCount){
    body.scrollTop = body.scrollHeight;
    if(hint) hint.style.display = 'none';
  } else if(hint){
    const n = newCount - prevCount;
    hint.textContent = '↓ ' + n + ' nouveau' + (n > 1 ? 'x' : '') + ' message' + (n > 1 ? 's' : '');
    hint.style.display = '';
  }
}

function _scrollToBottom(){
  const body = $('icThreadBody');
  if(body) body.scrollTop = body.scrollHeight;
  const hint = $('icScrollHint');
  if(hint) hint.style.display = 'none';
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
    try{localStorage.removeItem('ic_draft_reply_'+nPlate(State.activePlate));}catch(e){}
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
  if(text.length > MSG_MAX_LEN){ toast('Message trop long ('+text.length+'/'+MSG_MAX_LEN+' caractères).','bad'); return false; }

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

  console.log('[OBD_SEND_TARGET]', {
    plate,
    target
  });

  if(target?.__error){ toast('Erreur recherche conducteur. Réessaie dans quelques secondes.','bad'); return false; }
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

function copyMessage(id){
  const sid = String(id);
  let txt = '';
  const t = State.threads.find(x => x.plate === State.activePlate);
  const m = (t?.list || []).find(x => String(x.id) === sid);
  txt = m?.message || '';
  if(!txt) return;
  const _done = ()=>toast('Message copié ✓','ok');
  try{
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(txt).then(_done).catch(()=>_copyFallback(txt,_done));
    }else _copyFallback(txt,_done);
  }catch(e){ _copyFallback(txt,_done); }
}
function _copyFallback(txt,done){
  try{
    const ta=document.createElement('textarea');
    ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.focus();ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    done&&done();
  }catch(e){ toast('Copie impossible.','bad'); }
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
        // Bip son + vibration si sons activés, pas d'appel en cours, et conversation non mise en sourdine
        try{
          const _senderPlate = m.sender_plate||m.from_plate||'';
          if(window.S?.sounds!==false&&(window.CallScreen?.getState?.()?.mode||'idle')==='idle'&&!isMuted(_senderPlate)){
            window.AudioManager?.playMessageBeep?.('msg_in_app');
            if(navigator.vibrate) navigator.vibrate(80);
          }
        }catch(e){}
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
  // Touche Échap : ferme le menu (sheet) puis la conversation ouverte
  if(!document.body.dataset.icEscReady){
    document.body.dataset.icEscReady = '1';
    document.addEventListener('keydown', e=>{
      if(e.key !== 'Escape') return;
      const sheet = document.getElementById('icBottomSheet');
      if(sheet && sheet.classList.contains('show')){ closeSheet(); return; }
      const box = $('icThread');
      if(box && box.classList.contains('show')){ closeThread(); }
    });
  }
  // Auto-grow + Ctrl/Cmd+Enter pour les deux textareas
  function _grow(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,160)+'px';el.style.overflowY=el.scrollHeight>160?'auto':'hidden';}
  [['icComposeText','sendNew'],['icReplyText','reply']].forEach(([id,fn])=>{
    const _ta=$(id);
    if(_ta&&!_ta.dataset.enterReady){
      _ta.dataset.enterReady='1';
      _ta.style.resize='none';_ta.style.overflowY='hidden';_ta.style.transition='height .1s';
      try{ _ta.maxLength = MSG_MAX_LEN; }catch(e){}
      // Compteur de caractères (créé une fois, sous le textarea)
      let _counter=document.getElementById(id+'_count');
      if(!_counter&&_ta.parentNode){
        _counter=document.createElement('div');
        _counter.id=id+'_count';
        _counter.className='ic-char-count';
        _counter.style.display='none';
        _ta.parentNode.appendChild(_counter);
      }
      const _updCount=()=>{
        if(!_counter) return;
        const n=_ta.value.length, rem=MSG_MAX_LEN-n;
        if(n>=MSG_MAX_LEN-100){
          _counter.textContent=rem+' caractère'+(Math.abs(rem)>1?'s':'')+' restant'+(Math.abs(rem)>1?'s':'');
          _counter.style.color=rem<=20?'#ff6b81':'#94a3b8';
          _counter.style.display='';
        }else{
          _counter.style.display='none';
        }
      };
      _ta.addEventListener('input',()=>{
        _grow(_ta);
        _updCount();
        if(id==='icReplyText'&&State.activePlate){
          // Brouillon de réponse
          try{
            const _v=_ta.value;
            if(_v.trim()) localStorage.setItem('ic_draft_reply_'+nPlate(State.activePlate),_v);
            else localStorage.removeItem('ic_draft_reply_'+nPlate(State.activePlate));
          }catch(e){}
          // Indicateur "est en train d'écrire" — broadcast debounced
          if(State._typingCh&&State.user?.id&&_ta.value.trim()){
            clearTimeout(State._typingBcTimer);
            State._typingBcTimer=setTimeout(()=>{
              try{State._typingCh.send({type:'broadcast',event:'typing',payload:{uid:State.user.id}});}catch(e){}
            },300);
          }
        }
      });
      _ta.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){
          e.preventDefault();
          try{window.ImmatMessages[fn]?.();}catch(ex){}
        }
      });
      _grow(_ta);
    }
  });
  // Chips conversations récentes sous #icComposePlate (sélection rapide)
  const _rc=$('icRecentChips'),_pi=$('icComposePlate');
  if(_pi&&_rc&&!_pi.dataset.recentReady){
    _pi.dataset.recentReady='1';
    function _showChips(){
      if(_pi.value.trim()){_rc.style.display='none';return;}
      const threads=(State.threads||[]).slice(0,5);
      if(!threads.length){_rc.style.display='none';return;}
      _rc.innerHTML=threads.map(t=>{
        const pseudo=State.pseudoMap[nPlate(t.plate)]||'';
        const label=esc(t.plate)+(pseudo?' · '+esc(pseudo):'');
        return'<button type="button" class="ic-recent-chip" onclick="ImmatMessages._pickChip(\''+js(t.plate)+'\')">'+label+'</button>';
      }).join('');
      _rc.style.display='flex';
    }
    _pi.addEventListener('focus',_showChips);
    _pi.addEventListener('input',()=>{if(_pi.value.trim())_rc.style.display='none';else _showChips();});
    _pi.addEventListener('blur',()=>setTimeout(()=>{_rc.style.display='none';},200));
  }
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

// ── F-MUTE : Sourdine par conversation ──────────────────────────
function getMuted(){
  try{ return JSON.parse(localStorage.getItem('ic_muted')||'[]'); }catch(e){ return []; }
}
function isMuted(plate){
  return getMuted().includes(nPlate(fPlate(plate)));
}
function toggleMute(plate){
  plate = nPlate(fPlate(plate));
  const muted = getMuted();
  const now = muted.includes(plate);
  localStorage.setItem('ic_muted', JSON.stringify(now ? muted.filter(p=>p!==plate) : [...muted, plate]));
  toast(now ? '🔔 Notifications réactivées.' : '🔕 Conversation mise en sourdine.', 'ok');
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

function sharePosition(){
  const lat=window.S?.myLat,lng=window.S?.myLng;
  if(lat==null||lng==null) return toast('Position GPS non disponible.','bad');
  if(!State.activePlate) return toast('Aucune conversation active.','bad');
  const _p=typeof window._fuzzyPos==='function'?window._fuzzyPos(lat,lng):{lat,lng};
  const url='https://www.google.com/maps?q='+_p.lat.toFixed(6)+','+_p.lng.toFixed(6);
  const text='📍 Ma position : '+url;
  const _rt=$('icReplyText');
  if(_rt){_rt.value=text;try{_rt.dispatchEvent(new Event('input'));}catch(e){}_rt.focus();}
}

function _pickChip(plate){
  const _pe=$('icComposePlate');
  if(_pe){_pe.value=fPlate(plate);_pe.dispatchEvent(new Event('input'));}
  const _rc=$('icRecentChips');
  if(_rc) _rc.style.display='none';
  setTimeout(()=>{try{$('icComposeText')?.focus();}catch(e){}},80);
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
  const muteBtn  = document.getElementById('icSheetMute');
  const blockBtn = document.getElementById('icSheetBlock');

  if(favBtn)   favBtn.textContent   = isFav  ? '⭐ Retirer des favoris' : '⭐ Ajouter aux favoris';
  if(archBtn)  archBtn.textContent  = isArch ? '📂 Désarchiver'         : '📁 Archiver';
  if(trustBtn) trustBtn.textContent = trust === 'TRUSTED' ? '✓ Révoquer confiance' : '✓ Marquer de confiance';
  if(muteBtn)  muteBtn.textContent  = isMuted(plate) ? '🔔 Réactiver les notifications' : '🔕 Mettre en sourdine';
  const _blocked = getBlockLevel(plate) !== BLOCK_LEVELS.NONE;
  if(blockBtn) blockBtn.textContent = _blocked ? '✅ Débloquer ce conducteur' : '🚫 Bloquer ce conducteur';

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
  if(action === 'fav')        { isFav  ? unfavoriteConv(plate) : favoriteConv(plate); }
  else if(action === 'arch')  { isArch ? unarchiveConv(plate)  : archiveConv(plate); }
  else if(action === 'trust') { setTrust(plate, trust === 'TRUSTED' ? 'NONE' : 'TRUSTED'); }
  else if(action === 'mute')  { toggleMute(plate); }
  else if(action === 'block') {
    const _blocked = getBlockLevel(plate) !== BLOCK_LEVELS.NONE;
    if(_blocked){
      try{ window.App?.unblockPlate?.(nPlate(plate)); }catch(e){}
      try{ window.App?.closeBlocked?.(); }catch(e){}
      toast('Conducteur débloqué.','ok');
    }else{
      try{ window.App?.blockPlate?.(nPlate(plate)); }catch(e){}
      closeThread();
    }
    refresh();
  }
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
  copyMessage,
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
  markAllRead,
  _pickChip,
  sharePosition,
  _scrollToBottom,
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
