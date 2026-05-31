/* ===== IMMATCONNECT MESSAGES — V12 COMPLET SUPABASE ===== */
(function(){
'use strict';

if(window.__ImmatMessagesV12) return;
window.__ImmatMessagesV12 = true;

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
  const b = $('topMsgBadge');
  if(b){
    b.textContent = n > 99 ? '99+' : String(n);
    b.style.display = n > 0 ? 'flex' : 'none';
  }
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
  channel:null
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
    .select('*')
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

function normalizeRows(rows, profs){
  const mp = nPlate(myPlate());
  const uid = State.user?.id;

  // Récupère les IDs supprimés localement
  let deletedIds = [];
  try{ deletedIds = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]').map(String); }catch(e){}

  return (rows||[]).map(m=>{
    const sp = fPlate(m.sender_plate || m.from_plate || profs[m.sender_id]?.owner_plate || '');
    const rp = fPlate(m.receiver_plate || m.to_plate || profs[m.receiver_id]?.owner_plate || m.target_plate || '');

    // BUG 2 fix: si on est l'expéditeur, on ne peut pas être aussi récepteur (sauf conversation avec soi-même)
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
      // sent → other = receiver (rp) ; received → other = sender (sp)
      // NE PAS tomber sur rp si reçu et sp vide (sinon _otherPlate = MA plaque)
      _otherPlate: sent ? (fPlate(rp) || 'INCONNU') : (fPlate(sp) || 'INCONNU')
    };
  }).filter(m => m._otherPlate && m.status !== 'rejected' && !deletedIds.includes(String(m.id)));
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

  async function q(build){
    try{
      const {data,error} = await build();
      if(!error && Array.isArray(data)) buckets.push(...data);
    }catch(e){}
  }

  await q(()=>client.from('messages').select('*')
    .or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`)
    .order('created_at',{ascending:true})
    .limit(300));

  if(mp){
    await q(()=>client.from('messages').select('*').eq('target_plate',mp).order('created_at',{ascending:true}).limit(300));
    await q(()=>client.from('messages').select('*').eq('sender_plate',mp).order('created_at',{ascending:true}).limit(300));
    await q(()=>client.from('messages').select('*').eq('receiver_plate',mp).order('created_at',{ascending:true}).limit(300));
    await q(()=>client.from('messages').select('*').eq('from_plate',mp).order('created_at',{ascending:true}).limit(300));
    await q(()=>client.from('messages').select('*').eq('to_plate',mp).order('created_at',{ascending:true}).limit(300));
  }

  const map = new Map();
  buckets.forEach(m => { if(m?.id) map.set(m.id,m); });

  const raw = [...map.values()].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
  const profs = await profilesByIds(raw.flatMap(m=>[m.sender_id,m.receiver_id]));
  State.messages = normalizeRows(raw, profs);

  // Connexion messages → Activité
  try{ if(window.S) window.S._actMessages = State.messages; }catch(e){}
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}

  buildThreads();
  render();
  refreshThread();
  subscribe();
}

function buildThreads(){
  // BUG 3: filtrer les messages supprimés localement
  let deletedIds = [];
  try{ deletedIds = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]').map(String); }catch(e){}

  const groups = {};
  State.messages.filter(m => !deletedIds.includes(String(m.id))).forEach(m=>{
    const p = m._otherPlate || 'INCONNU';
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
  State.mode = mode || 'inbox';

  document.querySelectorAll('.ic-msg-tabs button').forEach(b=>{
    b.classList.toggle('on', b.dataset.mode === State.mode);
  });

  const compose = $('icComposePanel');
  if(compose) compose.classList.toggle('show', State.mode === 'compose');

  render();
}

function renderEmpty(text){
  const list = $('icMsgList');
  if(list) list.innerHTML = `<div class="ic-empty">${esc(text||'Aucun message.')}</div>`;
}

function render(){
  const list = $('icMsgList');
  if(!list) return;

  let threads = State.threads;

  if(State.mode === 'sent'){
    threads = threads.filter(t => t.list.some(m=>m._sent));
  }

  if(State.mode === 'inbox'){
    threads = threads.filter(t => t.list.some(m=>m._received));
  }

  if(State.mode === 'compose'){
    list.innerHTML = `<div class="ic-empty">Écris une plaque et un message puis appuie sur ➤.</div>`;
    closeThread();
    return;
  }

  if(!threads.length){
    const helpText = State.mode === 'sent'
      ? 'Aucun message envoyé.'
      : '💬 Aucun message reçu.<br><small style="display:block;margin-top:5px;font-size:11px;color:#9aacc2">Clique sur un véhicule sur la carte pour démarrer une conversation.</small>';
    list.innerHTML = `<div class="ic-empty">${helpText}</div>`;
    closeThread();
    return;
  }

  list.innerHTML = threads.map(t=>{
    const last = t.last || {};
    const timeStr = last.created_at ? new Date(last.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
    return `
      <div class="ic-mail-row ${t.unread?'unread':''} ${State.activePlate===t.plate?'active':''}"
           data-plate="${esc(t.plate)}">
        <div class="ic-avatar">🚗</div>
        <div class="ic-row-body">
          <div class="ic-row-top">
            <span class="ic-plate">${esc(t.plate)}</span>
            <span class="ic-row-time">${esc(timeStr)}</span>
          </div>
          <div class="ic-row-bot">
            <span class="ic-preview">${esc(last.message || '')}</span>
            <span class="ic-unread-dot"></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.ic-mail-row').forEach(row=>{
    row.onclick = () => openThread(row.dataset.plate);
  });
}

async function markThreadRead(plate){
  const client = sb();
  if(!client || !State.user) return;

  const unread = State.messages.filter(m=>m._otherPlate===plate && m._received && !m.read_at);
  for(const m of unread){
    try{
      await client.from('messages').update({read_at:new Date().toISOString()}).eq('id',m.id);
      m.read_at = new Date().toISOString();
    }catch(e){}
  }

  buildThreads();
  setBadge(State.threads.reduce((s,t)=>s+t.unread,0));
}

async function openThread(plate){
  State.activePlate = fPlate(plate);
  await markThreadRead(State.activePlate);

  const t = State.threads.find(x=>x.plate===State.activePlate);
  const box = $('icThread');
  const body = $('icThreadBody');
  const title = $('icThreadTitle');

  if(!box || !body || !t) return;

  if(title) title.textContent = State.activePlate;

  body.innerHTML = t.list.map(m=>{
    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
    return `
      <div class="ic-bubble ${m._sent?'sent':'recv'}">
        <div class="ic-bubble-text">${esc(m.message || '')}</div>
        <div class="ic-bubble-footer">
          <span class="ic-time">${esc(timeStr)}</span>
          <button class="ic-delete-msg" onclick="ImmatMessages.deleteMessage('${esc(m.id)}')">×</button>
        </div>
      </div>
    `;
  }).join('');

  box.classList.add('show');
  body.scrollTop = body.scrollHeight;
  render();
}

function closeThread(){
  const box = $('icThread');
  if(box) box.classList.remove('show');
  State.activePlate = null;
}

function refreshThread(){
  if(!State.activePlate) return;
  const box = $('icThread');
  const body = $('icThreadBody');
  if(!box || !body || !box.classList.contains('show')) return;
  const t = State.threads.find(x => x.plate === State.activePlate);
  if(!t) return;
  body.innerHTML = t.list.map(m=>{
    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
    return `<div class="ic-bubble ${m._sent?'sent':'recv'}">
        <div class="ic-bubble-text">${esc(m.message || '')}</div>
        <div class="ic-bubble-footer">
          <span class="ic-time">${esc(timeStr)}</span>
          <button class="ic-delete-msg" onclick="ImmatMessages.deleteMessage('${esc(m.id)}')">×</button>
        </div>
      </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

async function sendNew(){
  // Désactiver le bouton pendant l'envoi pour éviter les doubles clics
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
  // Désactiver le bouton pendant l'envoi
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

async function sendToPlate(plate,text){
  const client = sb();
  const u = await getUser();
  const me = await getProfile();

  plate = fPlate(plate);
  const senderPlate = fPlate(me?.owner_plate || myPlate());

  if(!client || !u){ toast('Reconnecte-toi.','bad'); return false; }
  if(!senderPlate){ toast('Profil conducteur incomplet.','bad'); return false; }
  if(!plate){ toast('Plaque destinataire manquante.','bad'); return false; }
  if(plate === senderPlate){ toast("Impossible de t'envoyer un message à toi-même.",'bad'); return false; }
  if(!text){ toast('Message vide.','bad'); return false; }

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
  await refresh();
  setMode('inbox');
  openThread(receiverPlate);
  return true;
}

async function deleteMessage(id){
  if(!confirm('Supprimer ce message ?')) return;
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
  if(!plate && !confirm('Supprimer cette conversation ?')) return;

  const ids = State.messages
    .filter(m=>m._otherPlate===target)
    .map(m=>String(m.id));

  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  ids.forEach(id => { if(!deleted.includes(id)) deleted.push(id); });
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-500))); }catch(e){}

  if(!plate) closeThread();
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}
}

async function subscribe(){
  const client = sb();
  const u = State.user || await getUser();
  if(!client || !u) return;

  // Si un channel existe déjà et est actif, ne pas recréer
  if(State.channel) {
    try{ client.removeChannel(State.channel); }catch(e){}
    State.channel = null;
  }

  State.channel = client
    .channel('immat_messages_v12_' + u.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages'},async()=>{
      await refresh();
    })
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
  sendToPlate,
  unsubscribe:function(){if(State.channel){const client=sb();if(client){try{client.removeChannel(State.channel)}catch(e){}}State.channel=null;}}
};

window.setUnreadMsgCount = window.setUnreadMsgCount || setBadge;

async function boot(){
  installInputs();
  const u = await getUser();
  if(u) await refresh();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}

})();
