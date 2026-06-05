/* ===== IMMATCONNECT UI — SAFE AUTH + MAP + BUTTONS RECOVERY ===== */
(function(){
  'use strict';
  if(window.__ImmatConnectSafeUIV7) return;
  window.__ImmatConnectSafeUIV7 = true;

  const $ = id => document.getElementById(id);
  const SUPABASE_URL = 'https://vemgdkkbldgyvaisudkd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ';

  function toastMsg(msg,type){ try{ if(window.toast) return window.toast(msg,type||'ok'); }catch(e){} }
  function exposeApp(){ try{ if(!window.App && typeof App !== 'undefined') window.App = App; }catch(e){} }
  function status(id,msg,type){ const el=$(id); if(!el) return; el.textContent=msg||''; el.className='status-msg '+(type||'')+(msg?' visible':''); }
  function showSheet(){ const s=$('sheet'); if(!s) return; s.style.display=''; s.classList.remove('mini'); delete s.dataset.uiHidden; }
  function hideSheet(){ const s=$('sheet'); if(!s) return; s.dataset.uiHidden='1'; s.style.display='none'; s.classList.add('mini'); s.classList.remove('full'); }
  function hide(el){ if(el) el.classList.remove('show','open','active'); }
  function closeFloating(except){ ['nearbyPanel','drawer','legal','blocked','recent','vehicleContextMenu'].forEach(id=>{ if(id!==except) hide($(id)); }); }

  function loadScript(src,test){
    return new Promise(resolve=>{
      try{ if(test && test()) return resolve(true); }catch(e){}
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){ existing.addEventListener('load',()=>resolve(true),{once:true}); existing.addEventListener('error',()=>resolve(false),{once:true}); setTimeout(()=>resolve(!!(!test||test())),700); return; }
      const s=document.createElement('script'); s.src=src; s.async=true; s.onload=()=>resolve(true); s.onerror=()=>resolve(false); document.head.appendChild(s);
    });
  }
  function loadCss(href){ if(!document.querySelector('link[href="'+href+'"]')){ const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); } }

  async function ensureSupabase(){
    if(window.sb && window.sb.auth) return window.sb;
    if(window.supabase?.createClient){ window.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY); return window.sb; }
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js',()=>!!window.supabase?.createClient);
    if(window.supabase?.createClient){ window.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY); return window.sb; }
    return null;
  }

  async function ensureLeaflet(){
    if(window.L?.map) return true;
    loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',()=>!!window.L?.map);
    return !!window.L?.map;
  }

  async function recoverMap(){
    try{
      const mapEl=$('map'); if(!mapEl) return;
      mapEl.style.minHeight=mapEl.style.minHeight||'100vh';
      mapEl.style.background='#dfe8ef';
      await ensureLeaflet();
      if(!window.L?.map) return;
      if(!window.S) window.S={};
      if(window.App?.initMap){ try{ window.App.initMap(); }catch(e){ console.warn('[safe-ui] initMap failed',e); } }
      if(!window.S.map){
        try{ window.S.map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([46.6,1.9],6); }catch(e){}
      }
      if(window.S.map){
        try{
          let hasTile=false; window.S.map.eachLayer(l=>{ if(l && l._url) hasTile=true; });
          if(!hasTile) L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(window.S.map);
        }catch(e){}
        [80,500,1200,2200].forEach(t=>setTimeout(()=>{try{window.S.map.invalidateSize(true);}catch(e){}},t));
      }
    }catch(e){ console.warn('[safe-ui] recoverMap failed',e); }
  }

  function showAuth(mode){
    exposeApp();
    try{ if(window.App?.goAuth){ window.App.goAuth(mode||'login'); bindAuthButton(); return; } }catch(e){}
    ['sw','sa','sp','sr'].forEach(id=>$(id)?.classList.remove('active'));
    $('appScreen')?.classList.remove('active'); $('sa')?.classList.add('active');
    const signup=mode==='signup'; if(window.S) window.S.mode=signup?'signup':'login';
    if($('authTitle')) $('authTitle').textContent=signup?'Créer un compte':'Connexion';
    if($('authSubtitle')) $('authSubtitle').textContent=signup?'Renseigne tes informations conducteur.':'Entre ton email et ton mot de passe.';
    if($('authBtn')){ $('authBtn').disabled=false; $('authBtn').textContent=signup?'Créer mon compte':'Se connecter'; }
    $('tabSignup')?.classList.toggle('active',signup); $('tabLogin')?.classList.toggle('active',!signup);
    $('suExtras')?.classList.toggle('hidden',!signup); $('confirmWrap')?.classList.toggle('hidden',!signup); $('forgotPwdBtn')?.classList.toggle('hidden',signup);
    setTimeout(()=>$('iEmail')?.focus(),60); bindAuthButton();
  }

  async function loginDirect(){
    const email=String($('iEmail')?.value||'').trim();
    const password=String($('iPwd')?.value||'');
    if(!email||!password){ status('authSt','Email et mot de passe requis.','error'); return; }
    const b=$('authBtn'); if(b){ b.disabled=true; b.textContent='Connexion…'; }
    status('authSt','Connexion en cours…','success');
    try{
      const sb=await ensureSupabase();
      if(!sb?.auth?.signInWithPassword) throw new Error('Supabase indisponible : CDN ou initialisation bloquée.');
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error) throw error;
      status('authSt','Connecté. Ouverture…','success');
      try{ if(window.App?.afterAuth){ await window.App.afterAuth(data?.user||null); await recoverMap(); return; } }catch(e){ console.warn('[safe-ui] afterAuth failed',e); }
      ['sw','sa','sp','sr'].forEach(id=>$(id)?.classList.remove('active'));
      $('appScreen')?.classList.add('active'); await recoverMap();
    }catch(e){
      const msg=String(e?.message||'Connexion impossible.');
      status('authSt',msg.includes('Invalid')?'Email ou mot de passe incorrect.':msg,'error');
    }finally{ if(b){ b.disabled=false; b.textContent=(window.S?.mode==='signup')?'Créer mon compte':'Se connecter'; } }
  }
  function bindAuthButton(){ const b=$('authBtn'); if(b && !b.__safeAuthV7){ b.__safeAuthV7=true; b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();loginDirect();},true); } }

  async function locateDirect(){
    await recoverMap();
    if(!navigator.geolocation){ toastMsg('GPS indisponible.','bad'); return; }
    toastMsg('Localisation en cours…','ok');
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      if(!window.S) window.S={}; S.myLat=lat; S.myLng=lng; S.lastSpeed=Math.max(0,Math.round((Number(pos.coords.speed)||0)*3.6));
      if($('speedVal')) $('speedVal').textContent=String(S.lastSpeed||0);
      try{ S.map?.setView([lat,lng],16,{animate:true}); }catch(e){}
      try{
        if(S.myMarker){ S.myMarker.setLatLng([lat,lng]); }
        else if(window.L?.marker && S.map){ S.myMarker=L.marker([lat,lng]).addTo(S.map); }
      }catch(e){}
      try{ window.App?.saveMyLocation?.(); }catch(e){}
      toastMsg('Position trouvée.','ok');
    },err=>{
      const code=err?.code;
      toastMsg(code===1?'Autorise la position dans Safari.':'Position indisponible.','bad');
    },{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
  }

  function setPanel(name){
    const map={altet:'navSignaler',messages:'navActivite',activite:'navActivite',drive:'navMap',map:'navMap'};
    ['navMap','navSignaler','navActivite'].forEach(id=>$(id)?.classList.toggle('on',map[name]===id));
    [['altet','Altet'],['drive','Drive'],['messages','Messages'],['settings','Settings'],['activite','Activite']].forEach(([k,id])=>{
      const active=k===name; $('panel'+id)?.classList.toggle('on',active); $('tab'+id)?.classList.toggle('on',active);
    });
    if(name==='map'){ hideSheet(); recoverMap(); return; }
    showSheet(); if(name==='drive') recoverMap();
  }

  function bindVisibleButtons(){
    const actions=[
      ['#welcomeLoginBtn',()=>showAuth('login')],['#welcomeSignupBtn',()=>showAuth('signup')],
      ['#navMap',()=>{setPanel('map');recoverMap();}],['#navSignaler',()=>{setPanel('altet');try{window.App?.openReport?.();}catch(e){}}],['#navActivite',()=>{setPanel('activite');try{window.App?.renderActivityFeed?.();window.App?.updateActBadge?.();}catch(e){}}],
      ['button[title="Recentrer"]',()=>{try{window.App?.recenter?.();}catch(e){} locateDirect();}],
      ['button[title="Conducteurs proches"]',()=>{hideSheet();closeFloating('nearbyPanel');try{window.App?.openNearby?.();}catch(e){} $('nearbyPanel')?.classList.add('show');}],
      ['button[title="Vue"]',()=>{try{window.App?.cycleView?.();}catch(e){} recoverMap();}],
      ['#longSos',()=>{try{window.App?.assist?.('sos');}catch(e){} toastMsg('SOS prêt.','ok');}]
    ];
    actions.forEach(([sel,fn])=>document.querySelectorAll(sel).forEach(el=>{
      if(el.__safeBtnV7) return; el.__safeBtnV7=true;
      el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn(e);},true);
    }));
  }

  function patchApp(){
    exposeApp(); if(!window.App) return;
    if(!App.__safeUIV7Patched){
      App.__safeUIV7Patched=true;
      const oldPanel=typeof App.panel==='function'?App.panel.bind(App):null;
      App.panel=function(name){ try{ oldPanel?.(name); }catch(e){} setPanel(String(name||'').toLowerCase()); };
      const oldOpenMap=typeof App.openMap==='function'?App.openMap.bind(App):null;
      if(oldOpenMap) App.openMap=async function(){ const r=await oldOpenMap(...arguments); await recoverMap(); return r; };
      App.openInboxBadge=function(){ setPanel('messages'); try{window.ImmatMessages?.setMode?.('inbox');window.ImmatMessages?.refresh?.();}catch(e){} };
    }
  }

  function install(){ bindAuthButton(); bindVisibleButtons(); patchApp(); recoverMap(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
  [300,900,1800,3500].forEach(t=>setTimeout(install,t));
  window.UIManager={showAuth,submitAuth:loginDirect,ensureSupabase,recoverMap,locateDirect,openSheetPanel:setPanel};
})();