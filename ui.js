/* ===== IMMATCONNECT UI — SAFE AUTH + MAP + BUTTONS RECOVERY ===== */
(function(){
  'use strict';
  if(window.__ImmatConnectSafeUIV7) return;
  window.__ImmatConnectSafeUIV7 = true;

  const $ = id => document.getElementById(id);
  const SUPABASE_URL = 'https://vemgdkkbldgyvaisudkd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ';

  function toastMsg(msg,type){ try{ if(window.toast) return window.toast(msg,type||'ok'); }catch(e){} }
  function exposeApp(){
    try{
      if(!window.App && typeof App !== 'undefined') window.App = App;
    }catch(e){}
    if(!window.App) window.App = {};
    return window.App;
  }
  function status(id,msg,type){ const el=$(id); if(!el) return; el.textContent=msg||''; el.className='status-msg '+(type||'')+(msg?' visible':''); }
  function showSheet(){ const s=$('sheet'); if(!s) return; s.style.display=''; s.classList.remove('mini'); delete s.dataset.uiHidden; }
  function hideSheet(){ const s=$('sheet'); if(!s) return; s.dataset.uiHidden='1'; s.style.display='none'; s.classList.add('mini'); s.classList.remove('full'); }
  function hide(el){ if(!el) return; el.classList.remove('show','open','active'); if(el.style.display && el.style.display!=='none') el.style.display='none'; }
  function closeMessagesBottomSheet(){
    ['icSheetBackdrop','icBottomSheet'].forEach(id=>{
      const el=$(id);
      if(!el) return;
      el.classList.remove('show','open','active');
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
    });
    const abuse=$('icAbuseCategories');
    if(abuse) abuse.style.display='none';
  }
  function closeFloating(except){
    closeMessagesBottomSheet();
    ['angeOverlay','angePanel','nearbyPanel','drawer','legal','blocked','recent','vehicleContextMenu','onboardingOverlay'].forEach(id=>{ if(id!==except) hide($(id)); });
  }

  function hideAngeFab(){ const fab=$('angeFab'); if(fab) fab.style.display='none'; }
  function showAngeFab(){ const fab=$('angeFab'); if(fab && $('appScreen')?.classList.contains('active')){ fab.style.display='flex'; fab.style.zIndex='3000'; } }
  function hideAuthScreens(){
    ['sw','sa','sp','sr'].forEach(id=>{
      const el=$(id);
      if(!el) return;
      el.classList.remove('active');
      el.style.display='none';
    });
  }
  async function forceOpenApp(reason){
    try{ console.info('[safe-ui] forceOpenApp', reason||'manual'); }catch(e){}
    hideAuthScreens();
    const app=$('appScreen');
    if(app){ app.classList.add('active'); app.style.display='block'; }
    closeFloating();
    showAngeFab();
    await recoverMap();
  }

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
      if(window.App?.initMap && !window.App.__safeFallbackOnly){ try{ window.App.initMap(); }catch(e){ console.warn('[safe-ui] initMap failed',e); } }
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
    try{ if(window.App?.goAuth && !window.App.__safeFallbackOnly){ window.App.goAuth(mode||'login'); bindAuthButton(); hideAngeFab(); return; } }catch(e){}
    ['sw','sa','sp','sr'].forEach(id=>{ const el=$(id); if(el){ el.classList.remove('active'); el.style.display=''; } });
    $('appScreen')?.classList.remove('active');
    if($('appScreen')) $('appScreen').style.display='none';
    const auth=$('sa'); if(auth){ auth.classList.add('active'); auth.style.display='flex'; }
    hideAngeFab();
    const signup=mode==='signup'; if(window.S) window.S.mode=signup?'signup':'login';
    if($('authTitle')) $('authTitle').textContent=signup?'Créer un compte':'Connexion';
    if($('authSubtitle')) $('authSubtitle').textContent=signup?'Renseigne tes informations conducteur.':'Entre ton email et ton mot de passe.';
    if($('authBtn')){ $('authBtn').disabled=false; $('authBtn').textContent=signup?'Créer mon compte':'Se connecter'; }
    $('tabSignup')?.classList.toggle('active',signup); $('tabLogin')?.classList.toggle('active',!signup);
    $('suExtras')?.classList.toggle('hidden',!signup); $('confirmWrap')?.classList.toggle('hidden',!signup); $('forgotPwdBtn')?.classList.toggle('hidden',signup);
    setTimeout(()=>$('iEmail')?.focus(),60); bindAuthButton();
  }

  function withTimeout(promise, ms){
    return Promise.race([
      promise,
      new Promise((_, reject)=>setTimeout(()=>reject(new Error('afterAuth timeout')), ms))
    ]);
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
      setTimeout(()=>forceOpenApp('auth-success-immediate'), 800);
      const app=ensureAppFallbacks();
      if(app?.afterAuth && !app.__safeFallbackOnly){
        try{
          await withTimeout(app.afterAuth(data?.user||null), 4500);
          await forceOpenApp('afterAuth-ok');
          return;
        }catch(e){
          console.warn('[safe-ui] afterAuth timeout/fallback', e);
          status('authSt','Connecté. Ouverture carte en mode sécurisé…','success');
        }
      }
      await forceOpenApp('auth-fallback');
      setTimeout(()=>locateDirect(),500);
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
        else if(window.L?.marker && S.map){ S.myMarker=L.marker([lat,lng],{zIndexOffset:0}).addTo(S.map); }
      }catch(e){}
      try{ window.App?.saveMyLocation?.(); }catch(e){}
      toastMsg('Position trouvée.','ok');
    },err=>{
      const code=err?.code;
      toastMsg(code===1?'Autorise la position dans Safari.':'Position indisponible.','bad');
    },{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
  }

  function setPanel(name){
    closeFloating();
    const map={altet:'navSignaler',messages:'navActivite',activite:'navActivite',drive:'navMap',map:'navMap'};
    ['navMap','navSignaler','navActivite'].forEach(id=>$(id)?.classList.toggle('on',map[name]===id));
    [['altet','Altet'],['drive','Drive'],['messages','Messages'],['settings','Settings'],['activite','Activite']].forEach(([k,id])=>{
      const active=k===name; $('panel'+id)?.classList.toggle('on',active); $('tab'+id)?.classList.toggle('on',active);
    });
    if(name==='map'){ hideSheet(); recoverMap(); return; }
    showSheet(); if(name==='drive') recoverMap();
  }

  function fallbackOpenDrawer(){ closeFloating('drawer'); const d=$('drawer'); if(d){ d.style.display='block'; d.classList.add('show'); } }
  function fallbackCloseDrawer(){ hide($('drawer')); }
  function fallbackCloseOverlay(){ closeFloating(); hideSheet(); }
  function fallbackOpenNearby(){ closeFloating('nearbyPanel'); const p=$('nearbyPanel'); if(p){ p.style.display='block'; p.classList.add('show'); } }

  function ensureAppFallbacks(){
    const app=exposeApp();
    if(!app.__safeFallbacksInstalled){
      app.__safeFallbacksInstalled=true;
      app.__safeFallbackOnly = !Object.keys(app).length;
      if(typeof app.openDrawer!=='function') app.openDrawer=fallbackOpenDrawer;
      if(typeof app.closeDrawer!=='function') app.closeDrawer=fallbackCloseDrawer;
      if(typeof app.closeOverlay!=='function') app.closeOverlay=fallbackCloseOverlay;
      if(typeof app.openNearby!=='function') app.openNearby=fallbackOpenNearby;
      if(typeof app.locate!=='function') app.locate=locateDirect;
      if(typeof app.recenter!=='function') app.recenter=function(){ if(window.S){ S.autoFollow=true; } if(window.S?.myLat!=null && window.S?.map){ try{S.map.setView([S.myLat,S.myLng],16,{animate:true});}catch(e){} } else locateDirect(); };
      if(typeof app.panel!=='function') app.panel=setPanel;
      if(typeof app.openMap!=='function') app.openMap=async function(){ await forceOpenApp('app-openMap-fallback'); };
    }
    return app;
  }

  function bindVisibleButtons(){
    const actions=[
      ['#welcomeLoginBtn',()=>showAuth('login')],['#welcomeSignupBtn',()=>showAuth('signup')],
      ['.profile-chip',()=>{ensureAppFallbacks(); try{window.App.openDrawer();}catch(e){fallbackOpenDrawer();}}],
      ['#navMap',()=>{setPanel('map');recoverMap();}],['#navSignaler',()=>{setPanel('altet');try{window.App?.openReport?.();}catch(e){}}],['#navActivite',()=>{setPanel('activite');try{window.App?.renderActivityFeed?.();window.App?.updateActBadge?.();}catch(e){}}],
      ['button[title="Recentrer"]',()=>{try{window.App?.recenter?.();}catch(e){locateDirect();}}],
      ['button[title="Conducteurs proches"]',()=>{ensureAppFallbacks(); try{window.App?.openNearby?.();}catch(e){fallbackOpenNearby();}}],
      ['button[title="Vue"]',()=>{try{window.App?.cycleView?.();}catch(e){} recoverMap();}],
      ['#longSos',()=>{try{window.App?.assist?.('sos');}catch(e){} toastMsg('SOS prêt.','ok');}]
    ];
    actions.forEach(([sel,fn])=>document.querySelectorAll(sel).forEach(el=>{
      if(el.__safeBtnV7) return; el.__safeBtnV7=true;
      el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn(e);},true);
    }));
  }

  function patchApp(){
    const app=ensureAppFallbacks();
    if(!app || app.__safeUIV7Patched) return;
    app.__safeUIV7Patched=true;
    const oldPanel=typeof app.panel==='function'?app.panel.bind(app):null;
    app.panel=function(name){ closeFloating(); try{ oldPanel?.(name); }catch(e){} setPanel(String(name||'').toLowerCase()); };
    const oldOpenMap=typeof app.openMap==='function'?app.openMap.bind(app):null;
    if(oldOpenMap) app.openMap=async function(){ const r=await oldOpenMap(...arguments); await forceOpenApp('app-openMap'); return r; };
    app.openInboxBadge=function(){ setPanel('messages'); try{window.ImmatMessages?.setMode?.('inbox');window.ImmatMessages?.refresh?.();}catch(e){} };
  }

  function installAuthOpenWatchdog(){
    if(window.__immatAuthOpenWatchdog) return;
    window.__immatAuthOpenWatchdog = true;
    setInterval(async ()=>{
      try{
        const auth=$('sa');
        const st=$('authSt');
        if(!auth?.classList.contains('active')){ if(auth) auth.dataset.openingSince=''; return; }
        const txt=String(st?.textContent||'');
        const connected=/Connecté/i.test(txt);
        if(!connected){ auth.dataset.openingSince=''; return; }
        const since=Number(auth.dataset.openingSince||0);
        if(!since){ auth.dataset.openingSince=String(Date.now()); return; }
        if(Date.now()-since < 2500) return;
        await forceOpenApp('auth-watchdog');
        setTimeout(()=>locateDirect(),500);
        auth.dataset.openingSince='';
      }catch(e){ console.warn('[safe-ui] auth watchdog failed', e); }
    },700);
  }

  function install(){ ensureAppFallbacks(); bindAuthButton(); bindVisibleButtons(); patchApp(); closeMessagesBottomSheet(); hideAngeFab(); installAuthOpenWatchdog(); recoverMap(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
  [300,900,1800,3500].forEach(t=>setTimeout(install,t));
  window.UIManager={showAuth,submitAuth:loginDirect,ensureSupabase,recoverMap,locateDirect,openSheetPanel:setPanel,closeMessagesBottomSheet,getApp:exposeApp,forceOpenApp};
})();