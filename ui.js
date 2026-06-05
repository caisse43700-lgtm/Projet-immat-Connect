/* ===== IMMATCONNECT UI — V6 SAFE AUTH + MAP RECOVERY ===== */
(function () {
  'use strict';

  if (window.__ImmatConnectUISafeAuthBridge) return;
  window.__ImmatConnectUISafeAuthBridge = true;

  const $ = id => document.getElementById(id);
  const SUPABASE_URL = 'https://vemgdkkbldgyvaisudkd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ';

  function exposeAppIfPossible(){ try{ if (!window.App && typeof App !== 'undefined') window.App = App; }catch(e){} }
  function showStatus(message, type){ const el = $('authSt'); if (!el) return; el.textContent = message || ''; el.className = 'status-msg ' + (type || '') + (message ? ' visible' : ''); }
  function authBtnText(){ try { return window.S && window.S.mode === 'signup' ? 'Créer mon compte' : 'Se connecter'; } catch(e){ return 'Se connecter'; } }
  function unlockAuth(){ const b = $('authBtn'); if (b) { b.disabled = false; b.textContent = authBtnText(); } }

  function loadScriptOnce(src){
    return new Promise((resolve, reject) => {
      if (src.includes('supabase') && window.supabase?.createClient) return resolve();
      if (src.includes('leaflet') && window.L?.map) return resolve();
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) { existing.addEventListener('load', resolve, { once:true }); existing.addEventListener('error', reject, { once:true }); setTimeout(resolve, 600); return; }
      const s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Chargement script impossible: ' + src)); document.head.appendChild(s);
    });
  }

  function loadCssOnce(href){
    if (document.querySelector('link[href="' + href + '"]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }

  async function ensureSupabase(){
    if (window.sb && window.sb.auth) return window.sb;
    if (window.supabase && window.supabase.createClient) { window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); return window.sb; }
    try{ await loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js'); }catch(e){ console.warn('[UI bridge] Supabase CDN load failed', e); }
    if (window.supabase && window.supabase.createClient) { window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); return window.sb; }
    return null;
  }

  async function ensureLeaflet(){
    if (window.L?.map) return true;
    try{
      loadCssOnce('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      await loadScriptOnce('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    }catch(e){ console.warn('[UI bridge] Leaflet load failed', e); }
    return !!window.L?.map;
  }

  async function recoverMap(){
    try{
      const mapEl = $('map');
      if (!mapEl) return;
      mapEl.style.minHeight = mapEl.style.minHeight || '100vh';
      mapEl.style.background = '#dfe8ef';
      await ensureLeaflet();
      if (!window.L?.map) return;
      if (window.App?.initMap) {
        try { window.App.initMap(); } catch(e){ console.warn('[UI bridge] App.initMap failed', e); }
      }
      if (!window.S) window.S = {};
      if (!window.S.map) {
        try {
          window.S.map = L.map('map', { zoomControl:false, preferCanvas:true }).setView([46.6,1.9],6);
        } catch(e) { console.warn('[UI bridge] direct map create failed', e); }
      }
      if (window.S.map) {
        try {
          let hasTile = false;
          window.S.map.eachLayer(layer => { if (layer && layer._url) hasTile = true; });
          if (!hasTile) L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(window.S.map);
        } catch(e) {}
        setTimeout(() => { try { window.S.map.invalidateSize(true); } catch(e){} }, 100);
        setTimeout(() => { try { window.S.map.invalidateSize(true); } catch(e){} }, 800);
        setTimeout(() => { try { window.S.map.invalidateSize(true); } catch(e){} }, 1800);
      }
    }catch(e){ console.warn('[UI bridge] recoverMap failed', e); }
  }

  function showAuth(mode){
    exposeAppIfPossible();
    try{ if (window.App && typeof window.App.goAuth === 'function') { window.App.goAuth(mode || 'login'); bindAuthButton(); return; } }catch(e){ console.warn('[UI bridge] App.goAuth failed', e); }
    try{
      ['sw','sa','sp','sr'].forEach(id => $(id)?.classList.remove('active'));
      $('appScreen')?.classList.remove('active'); $('sa')?.classList.add('active');
      const signup = mode === 'signup'; if (window.S) window.S.mode = signup ? 'signup' : 'login';
      if ($('authTitle')) $('authTitle').textContent = signup ? 'Créer un compte' : 'Connexion';
      if ($('authSubtitle')) $('authSubtitle').textContent = signup ? 'Renseigne tes informations conducteur.' : 'Entre ton email et ton mot de passe.';
      if ($('authBtn')) { $('authBtn').disabled = false; $('authBtn').textContent = signup ? 'Créer mon compte' : 'Se connecter'; }
      $('tabSignup')?.classList.toggle('active', signup); $('tabLogin')?.classList.toggle('active', !signup); $('suExtras')?.classList.toggle('hidden', !signup); $('confirmWrap')?.classList.toggle('hidden', !signup); $('forgotPwdBtn')?.classList.toggle('hidden', signup);
      setTimeout(() => $('iEmail')?.focus(), 60); bindAuthButton();
    }catch(e){ console.error('[UI bridge] fallback auth failed', e); }
  }

  async function fallbackLogin(){
    const email = String($('iEmail')?.value || '').trim();
    const password = String($('iPwd')?.value || '');
    if (!email || !password) { showStatus('Email et mot de passe requis.', 'error'); return; }
    const b = $('authBtn'); if (b) { b.disabled = true; b.textContent = 'Connexion…'; }
    showStatus('Initialisation Supabase…', 'success');
    const sb = await ensureSupabase();
    if (!sb || !sb.auth || typeof sb.auth.signInWithPassword !== 'function') { showStatus('Supabase indisponible : CDN ou initialisation bloquée.', 'error'); unlockAuth(); return; }
    showStatus('Connexion en cours…', 'success');
    try{
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showStatus('Connecté. Ouverture…', 'success');
      try{ if (window.App && typeof window.App.afterAuth === 'function') { await window.App.afterAuth(data?.user || null); await recoverMap(); return; } }catch(e){ console.warn('[UI bridge] afterAuth fallback ignored', e); }
      try{ ['sw','sa','sp','sr'].forEach(id => $(id)?.classList.remove('active')); $('appScreen')?.classList.add('active'); }catch(e){}
      await recoverMap();
    }catch(e){ const msg = String(e?.message || 'Connexion impossible.'); showStatus(msg.includes('Invalid login') || msg.includes('Invalid credentials') ? 'Email ou mot de passe incorrect.' : msg, 'error'); }
    finally{ unlockAuth(); }
  }

  async function submitAuth(){ exposeAppIfPossible(); await fallbackLogin(); }
  function bindAuthButton(){ const b = $('authBtn'); if (b && !b.__safeAuthBridge) { b.__safeAuthBridge = true; b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); submitAuth(); }, true); } }
  function bindWelcomeButtons(){ exposeAppIfPossible(); const login = $('welcomeLoginBtn'); if (login && !login.__safeLoginBridge) { login.__safeLoginBridge = true; login.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); showAuth('login'); }, true); } const signup = $('welcomeSignupBtn'); if (signup && !signup.__safeLoginBridge) { signup.__safeLoginBridge = true; signup.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); showAuth('signup'); }, true); } }

  function normalize(name) { name = String(name || '').toLowerCase(); if (name === 'alert' || name === 'alerte') return 'altet'; if (name === 'contact' || name === 'message' || name === 'reçus' || name === 'received') return 'messages'; if (name === 'activité' || name === 'activity') return 'activite'; return name; }
  function hide(el) { if (!el) return; el.classList.remove('show', 'open', 'active'); }
  const floating = ['nearbyPanel','drawer','legal','blocked','recent','vehicleContextMenu'];
  const panels = [['altet','Altet'],['drive','Drive'],['messages','Messages'],['settings','Settings'],['activite','Activite']];
  function closeFloating(except) { floating.forEach(id => { if (id !== except) hide($(id)); }); }
  function showSheet() { const sheet = $('sheet'); if (!sheet) return; sheet.style.display = ''; sheet.classList.remove('mini'); delete sheet.dataset.uiHidden; }
  function hideSheet() { const sheet = $('sheet'); if (!sheet) return; sheet.dataset.uiHidden = '1'; sheet.style.display = 'none'; sheet.classList.add('mini'); sheet.classList.remove('full'); }
  function syncNav(name) { const map = { altet: 'navSignaler', messages: 'navActivite', activite: 'navActivite' }; ['navMap', 'navSignaler', 'navActivite'].forEach(id => { const el = $(id); if (el) el.classList.toggle('on', map[name] === id); }); }
  function setPanel(name) { name = normalize(name); syncNav(name); panels.forEach(([key, id]) => { const active = key === name; $('panel' + id)?.classList.toggle('on', active); $('tab' + id)?.classList.toggle('on', active); }); $('panelContact')?.classList.remove('on'); showSheet(); try { window.App?.openSheet?.(); } catch (e) {} if (name === 'drive') recoverMap(); }
  function syncBadge() { try { const count = Number(window.S?.unreadMsgCount || localStorage.getItem('ic_unread_msg_count') || 0); if (typeof window.setUnreadMsgCount === 'function') window.setUnreadMsgCount(count); document.querySelectorAll('.status-mail-badge').forEach(b => { b.textContent = ''; b.style.display = 'none'; }); } catch (e) {} }
  function openMessagesInbox() { showSheet(); closeFloating(null); setPanel('messages'); setTimeout(() => { try { window.ImmatMessages?.setMode?.('inbox'); } catch (e) {} try { window.ImmatMessages?.refresh?.(); } catch (e) {} syncBadge(); }, 80); }

  window.UIManager = { openSheetPanel: setPanel, openMessagesInbox, closeFloatingPanels: closeFloating, hideSheetCompletely: hideSheet, showSheetAgain: showSheet, syncBadge, showAuth, submitAuth, ensureSupabase, recoverMap };
  function install() {
    exposeAppIfPossible(); bindWelcomeButtons(); bindAuthButton();
    if (!window.App) { setTimeout(install, 250); return; }
    if (window.App.__ImmatConnectUIV6Patched) return; window.App.__ImmatConnectUIV6Patched = true;
    const oldPanel = typeof window.App.panel === 'function' ? window.App.panel.bind(window.App) : null;
    window.App.panel = function (name) { name = normalize(name); closeFloating(null); showSheet(); if (oldPanel) { try { oldPanel(name); } catch (e) {} } setPanel(name); if (name === 'messages') setTimeout(() => { try { window.ImmatMessages?.refresh?.(); } catch (e) {} syncBadge(); }, 100); if (name === 'altet') setTimeout(() => { try { window.App.renderAlerts?.(); } catch (e) {} try { window.App.renderMyAlertsBlock?.(); } catch (e) {} syncBadge(); }, 100); if (name === 'activite') setTimeout(() => { try { window.App.renderActivityFeed?.(); } catch (e) {} try { window.App.updateActBadge?.(); } catch (e) {} }, 100); if(name==='drive') recoverMap(); };
    const oldOpenMap = typeof window.App.openMap === 'function' ? window.App.openMap.bind(window.App) : null;
    if (oldOpenMap && !window.App.openMap.__mapRecoveryPatched) { window.App.openMap = async function(){ const r = await oldOpenMap(...arguments); await recoverMap(); return r; }; window.App.openMap.__mapRecoveryPatched = true; }
    const oldInitMap = typeof window.App.initMap === 'function' ? window.App.initMap.bind(window.App) : null;
    if (oldInitMap && !window.App.initMap.__safePatched) { window.App.initMap = function(){ const r = oldInitMap(...arguments); setTimeout(recoverMap, 100); return r; }; window.App.initMap.__safePatched = true; }
    window.App.openInboxBadge = function () { openMessagesInbox(); };
    const oldUpdate = typeof window.App.updateCommunityStatus === 'function' ? window.App.updateCommunityStatus.bind(window.App) : null;
    window.App.updateCommunityStatus = function () { if (oldUpdate) { try { oldUpdate(); } catch (e) {} } syncBadge(); };
    window.App.openReport = function () { try { window.App.panel('altet'); } catch(e) {} try { window.App._sigReset?.(); } catch(e) {} };
    const oldOpenNearby = typeof window.App.openNearby === 'function' ? window.App.openNearby.bind(window.App) : null;
    window.App.openNearby = function () { hideSheet(); closeFloating('nearbyPanel'); if (oldOpenNearby) oldOpenNearby(); $('nearbyPanel')?.classList.add('show'); };
    const oldCloseOverlay = typeof window.App.closeOverlay === 'function' ? window.App.closeOverlay.bind(window.App) : null;
    window.App.closeOverlay = function (id) { if (oldCloseOverlay) oldCloseOverlay(id); else hide($(id)); setTimeout(() => { if (!document.querySelector('.overlay.show,.modal.show,.drawer.show')) showSheet(); }, 30); };
    const oldOpenDrawer = typeof window.App.openDrawer === 'function' ? window.App.openDrawer.bind(window.App) : null;
    window.App.openDrawer = function () { hideSheet(); closeFloating('drawer'); if (oldOpenDrawer) oldOpenDrawer(); $('drawer')?.classList.add('show'); };
    const oldCloseDrawer = typeof window.App.closeDrawer === 'function' ? window.App.closeDrawer.bind(window.App) : null;
    window.App.closeDrawer = function () { if (oldCloseDrawer) oldCloseDrawer(); else hide($('drawer')); showSheet(); };
    document.addEventListener('click', function (e) { const mailBtn = e.target.closest('.top-mail-btn'); if (!mailBtn) return; e.preventDefault(); e.stopPropagation(); openMessagesInbox(); }, true);
    syncBadge(); setTimeout(recoverMap, 500); setTimeout(recoverMap, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  setTimeout(bindWelcomeButtons, 300); setTimeout(bindWelcomeButtons, 1000); setTimeout(bindAuthButton, 300); setTimeout(bindAuthButton, 1000); setTimeout(recoverMap, 2200);
})();
