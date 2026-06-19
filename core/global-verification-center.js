/* core/global-verification-center.js — Vérification globale lecture seule
 *
 * Croise tous les diagnostics en une seule vue structurée.
 * Lecture seule : aucune écriture DB, aucun appel lancé, aucun message envoyé.
 *
 * API : window.GlobalVerificationCenter.run() → Promise<result>
 */
(function(w){
  'use strict';

  var BUILD = 'global-verification-center-v1.1';

  function safe(fn, fb){ try{ return fn(); }catch(e){ return fb; } }
  function hasFn(obj, n){ return !!(obj && typeof obj[n] === 'function'); }
  function srank(s){ return s === 'critical' ? 3 : s === 'warning' ? 2 : s === 'ok' ? 1 : 0; }

  function item(name, ok, value, issue, action){
    return { name: name, ok: !!ok, value: String(value == null ? '' : value), issue: issue || '', action: action || '' };
  }

  function makeSection(label, items){
    var issues = [], actions = [];
    items.forEach(function(i){
      if(!i.ok && i.issue) issues.push(i.issue);
      if(!i.ok && i.action) actions.push(i.action);
    });
    var criticals = items.filter(function(i){ return !i.ok && i.issue; });
    var st = criticals.length ? 'critical' : items.every(function(i){ return i.ok; }) ? 'ok' : 'warning';
    return { label: label, status: st, items: items, issues: issues, actions: actions };
  }

  // ── 1. App ───────────────────────────────────────────────────────
  function checkApp(){
    var cm = w.CallManager;
    var rs = hasFn(cm, 'getRuntimeState') ? safe(function(){ return cm.getRuntimeState(); }, {}) : {};
    var hasClient = !!(w.sb || w.supabaseClient);
    var uidOk = !!(rs && rs.uidKnown);
    var plateOk = !!(rs && rs.myPlate);
    return makeSection('app', [
      item('window.App', !!w.App, w.App ? 'présent' : 'absent', !w.App ? 'window.App manquant' : '', !w.App ? 'Recharger l\'app' : ''),
      item('ImmatBus', !!w.ImmatBus, w.ImmatBus ? 'présent' : 'absent', !w.ImmatBus ? 'ImmatBus manquant' : '', ''),
      item('Client Supabase', hasClient, hasClient ? 'présent' : 'absent', !hasClient ? 'Client Supabase absent' : '', !hasClient ? 'Vérifier CDN Supabase' : ''),
      item('Auth UID connue', uidOk, uidOk ? 'oui' : 'non', !uidOk ? 'UID inconnu — connexion non établie' : '', !uidOk ? 'Se connecter / recharger' : ''),
      item('Plaque connue', plateOk, plateOk ? rs.myPlate : 'inconnue', !plateOk ? 'Plaque non définie' : '', !plateOk ? 'Compléter le profil' : '')
    ]);
  }

  // ── 2. Dashboard ─────────────────────────────────────────────────
  function checkDashboard(){
    function el(id){ return !!document.getElementById(id); }
    var gds = w.GuardianDashboardSummary;
    var gse = w.GuardianSummaryEngine;
    var btns = el('guardianSummaryHeaderActions');
    return makeSection('dashboard', [
      item('#gardienDashboard', el('gardienDashboard'), el('gardienDashboard') ? 'présent' : 'absent', !el('gardienDashboard') ? '#gardienDashboard absent du DOM' : '', ''),
      item('#gardienDashboardBody', el('gardienDashboardBody'), el('gardienDashboardBody') ? 'présent' : 'absent', !el('gardienDashboardBody') ? '#gardienDashboardBody absent' : '', ''),
      item('GuardianDashboardSummary', !!gds, gds ? (gds.build || 'présent') : 'absent', !gds ? 'Module UI Guardian absent' : '', ''),
      item('GuardianSummaryEngine', !!gse, gse ? (gse.build || 'présent') : 'absent', !gse ? 'Moteur diagnostic absent' : '', ''),
      item('Boutons Diagnostic/Copier', btns, btns ? 'injectés' : 'pas encore (ouvrir le dashboard d\'abord)', '', '')
    ]);
  }

  // ── 3. Messages ──────────────────────────────────────────────────
  function checkMessages(){
    function el(id){ return !!document.getElementById(id); }
    var im = w.ImmatMessages;
    var imrd = w.ImmatMessagesRuntimeDiagnostics;
    return makeSection('messages', [
      item('ImmatMessages', !!im, im ? 'présent' : 'absent', !im ? 'Module Messages absent' : '', !im ? 'Recharger l\'app' : ''),
      item('Diagnostic messages', !!imrd, imrd ? 'présent' : 'absent', !imrd ? 'Diagnostics messages absents' : '', ''),
      item('#icMessagesPro', el('icMessagesPro'), el('icMessagesPro') ? 'présent' : 'absent', !el('icMessagesPro') ? 'Ouvrir l\'onglet Messages d\'abord' : '', ''),
      item('#icMsgList', el('icMsgList'), el('icMsgList') ? 'présent' : 'absent', '', ''),
      item('sendToPlate', hasFn(im, 'sendToPlate'), hasFn(im, 'sendToPlate') ? 'ok' : 'absent', !hasFn(im, 'sendToPlate') ? 'Envoi de message indisponible' : '', '')
    ]);
  }

  // ── 4. Appels contact ────────────────────────────────────────────
  function checkCalls(){
    var cm = w.CallManager;
    var cs = w.CallScreen;
    var ace = w.AgoraCallEngine;
    var rs = hasFn(cm, 'getRuntimeState') ? safe(function(){ return cm.getRuntimeState(); }, {}) : {};
    var rtOk = !!(rs && rs.realtimeStatus === 'SUBSCRIBED');
    var hasRTC = !!w.AgoraRTC;
    return makeSection('calls', [
      item('CallManager', !!cm, cm ? 'présent' : 'absent', !cm ? 'CallManager absent' : '', !cm ? 'Recharger l\'app' : ''),
      item('CallScreen', !!cs, cs ? 'présent' : 'absent', !cs ? 'CallScreen absent' : '', ''),
      item('Realtime Supabase', rtOk, rs && rs.realtimeStatus ? rs.realtimeStatus : 'inconnu', !rtOk ? 'Realtime non SUBSCRIBED — appels impossibles' : '', !rtOk ? 'Recharger l\'app' : ''),
      item('AgoraCallEngine', !!ace, ace ? 'présent' : 'absent', !ace ? 'Moteur Agora absent — voix impossible' : '', !ace ? 'Vérifier agora-call-engine.js chargé' : ''),
      item('AgoraRTC SDK', hasRTC, hasRTC ? 'v' + (w.AgoraRTC.VERSION || '?') : 'absent', !hasRTC ? 'SDK Agora absent — vérifier CDN' : '', !hasRTC ? 'Vérifier réseau vers download.agora.io' : '')
    ]);
  }

  // ── 5. Audio ─────────────────────────────────────────────────────
  function checkAudio(){
    var am = w.AudioManager;
    var rs = hasFn(am, 'getRuntimeState') ? safe(function(){ return am.getRuntimeState(); }, {}) : {};
    var ctxState = rs && rs.webAudioContextState;
    // 'suspended' est l'état initial normal sur iOS (se débloque au premier tap) — non critique
    var ctxOk = !ctxState || ctxState === 'running' || ctxState === 'suspended';
    var hasGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return makeSection('audio', [
      item('AudioManager', !!am, am ? 'présent' : 'absent', !am ? 'AudioManager absent' : '', ''),
      item('Contexte WebAudio', ctxOk, ctxState || 'inconnu', !ctxOk ? 'Contexte audio non running (' + ctxState + ')' : '', !ctxOk ? 'Tap utilisateur pour débloquer iOS audio' : ''),
      item('Ringtone prête', !!(rs && rs.incomingRingtoneReady), rs && rs.incomingRingtoneReady ? 'oui' : 'non/inconnu', '', ''),
      item('getUserMedia', hasGUM, hasGUM ? 'disponible' : 'absent', !hasGUM ? 'Micro inaccessible (non-HTTPS ou iOS)' : '', !hasGUM ? 'Vérifier HTTPS + autorisation Safari' : ''),
      item('Note', true, 'Voix = Agora | Sonnerie = AudioManager (indépendants)', '', '')
    ]);
  }

  // ── 6. WebRTC / Agora ────────────────────────────────────────────
  function checkWebRTC(){
    var ace = w.AgoraCallEngine;
    var hasGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    var hasRTC = !!w.RTCPeerConnection;
    var hasSDK = !!w.AgoraRTC;
    var hasEng = !!ace;
    var joined = hasFn(ace, 'isJoined') ? safe(function(){ return ace.isJoined(); }, false) : false;
    var ch = hasFn(ace, 'currentChannel') ? safe(function(){ return ace.currentChannel(); }, null) : null;
    return makeSection('webrtc', [
      item('getUserMedia', hasGUM, hasGUM ? 'PRÉSENT' : 'ABSENT', !hasGUM ? 'getUserMedia indisponible' : '', ''),
      item('RTCPeerConnection (natif)', hasRTC, hasRTC ? 'PRÉSENT' : 'ABSENT', '', ''),
      item('AgoraRTC SDK', hasSDK, hasSDK ? 'PRÉSENT v' + (w.AgoraRTC.VERSION || '?') : 'ABSENT', !hasSDK ? 'SDK Agora non chargé' : '', !hasSDK ? 'Vérifier CDN download.agora.io' : ''),
      item('AgoraCallEngine', hasEng, hasEng ? 'PRÉSENT' : 'ABSENT', !hasEng ? 'Moteur Agora non initialisé' : '', ''),
      item('Canal vocal actif', joined, joined ? 'oui — ' + ch : 'non (idle)', '', ''),
      item('Stratégie', true, hasSDK ? 'Agora RTC (WebRTC natif non utilisé)' : 'WebRTC natif (Agora absent)', '', '')
    ]);
  }

  // ── 7. Cache / Service Worker ────────────────────────────────────
  async function checkCache(){
    var swOk = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    var swSupport = !!navigator.serviceWorker;
    var https = location.protocol === 'https:';
    var marker = location.search;
    // Vérification réelle de version : CACHE_NAME du service-worker.js réseau
    // comparé aux caches actifs du navigateur. Pas d'heuristique URL.
    var versionOk = true, versionVal = 'inconnu', versionIssue = '', versionAction = '';
    if(swSupport && w.caches && typeof w.caches.keys === 'function'){
      var expected = null, active = null;
      try{
        var resp = await fetch('./service-worker.js', { cache: 'no-store' });
        if(resp && resp.ok){
          var m = (await resp.text()).match(/CACHE_NAME\s*=\s*'([^']+)'/);
          expected = m ? m[1] : null;
        }
      }catch(e){}
      try{
        var keys = await w.caches.keys();
        active = keys.filter(function(k){ return k.indexOf('immatconnect-pro-') === 0; });
      }catch(e){}
      if(expected && active && active.length){
        versionOk = active.indexOf(expected) !== -1;
        versionVal = versionOk ? expected : active.join(', ') + ' ≠ attendu ' + expected;
        if(!versionOk){
          versionIssue = 'Vieille version en cache (SW pas encore activé)';
          versionAction = 'Recharger l\'app deux fois';
        }
      } else if(expected){
        versionVal = expected + ' (cache pas encore créé)';
      } else if(active && active.length){
        versionVal = active.join(', ') + ' (réseau indisponible — comparaison impossible)';
      }
    }
    return makeSection('cache', [
      item('HTTPS', https, https ? 'oui' : location.protocol, !https ? 'Non-HTTPS : SW et getUserMedia limités' : '', ''),
      item('Service Worker supporté', swSupport, swSupport ? 'oui' : 'non', !swSupport ? 'SW non supporté' : '', ''),
      item('Service Worker actif', swOk, swOk ? 'actif' : 'inactif', !swOk ? 'SW inactif — cache absent ou première visite' : '', !swOk ? 'Recharger une fois' : ''),
      item('Version cache', versionOk, versionVal, versionIssue, versionAction),
      item('Marqueur URL', true, marker || 'aucun (info)', '', ''),
      item('Visibilité', document.visibilityState === 'visible', document.visibilityState, '', '')
    ]);
  }

  // ── 8. Supabase ──────────────────────────────────────────────────
  async function checkSupabase(){
    var client = w.sb || w.supabaseClient;
    if(!client){
      return makeSection('supabase', [
        item('Client Supabase', false, 'absent', 'Client Supabase absent', 'Vérifier CDN @supabase/supabase-js')
      ]);
    }
    var uid = null;
    try{
      var r = await client.auth.getUser();
      uid = r && r.data && r.data.user && r.data.user.id;
    }catch(e){}
    var cm = w.CallManager;
    var rs = hasFn(cm, 'getRuntimeState') ? safe(function(){ return cm.getRuntimeState(); }, {}) : {};
    var rtOk = !!(rs && rs.realtimeStatus === 'SUBSCRIBED');
    return makeSection('supabase', [
      item('Client', true, 'présent', '', ''),
      item('Auth utilisateur', !!uid, uid ? uid.slice(0,8) + '…' : 'non authentifié', !uid ? 'Utilisateur non connecté' : '', !uid ? 'Se connecter' : ''),
      item('Realtime', rtOk, rs && rs.realtimeStatus ? rs.realtimeStatus : 'inconnu', !rtOk ? 'Realtime non SUBSCRIBED' : '', !rtOk ? 'Recharger l\'app' : ''),
      item('Projet', true, 'vemgdkkbldgyvaisudkd', '', '')
    ]);
  }

  // ── Agrégation ───────────────────────────────────────────────────
  function worstOf(sections){
    var best = 'ok';
    Object.keys(sections).forEach(function(k){
      var sec = sections[k];
      if(sec && srank(sec.status) > srank(best)) best = sec.status;
    });
    return best;
  }

  function extractTopIssues(sections){
    var issues = [];
    Object.keys(sections).forEach(function(k){
      var sec = sections[k];
      if(sec && sec.issues) sec.issues.forEach(function(iss){ issues.push('[' + k + '] ' + iss); });
    });
    return issues.slice(0, 8);
  }

  function extractActions(sections){
    var seen = {}, actions = [];
    Object.keys(sections).forEach(function(k){
      var sec = sections[k];
      if(sec && sec.actions) sec.actions.forEach(function(a){ if(!seen[a]){ seen[a] = true; actions.push(a); } });
    });
    return actions.slice(0, 6);
  }

  function makeReport(result){
    var lines = [
      'ImmatConnect — Global Verification Report',
      'Build  : ' + BUILD,
      'Date   : ' + result.at,
      'Statut : ' + (result.globalStatus || '').toUpperCase(),
      ''
    ];
    Object.keys(result.sections).forEach(function(k){
      var sec = result.sections[k];
      lines.push('── ' + k.toUpperCase() + ' : ' + (sec.status || '').toUpperCase());
      sec.items.forEach(function(it){
        lines.push('  ' + (it.ok ? '✓' : '✗') + ' ' + it.name + ' : ' + it.value);
      });
    });
    if(result.topIssues && result.topIssues.length){
      lines.push(''); lines.push('── PROBLÈMES');
      result.topIssues.forEach(function(i){ lines.push('• ' + i); });
    }
    if(result.recommendedActions && result.recommendedActions.length){
      lines.push(''); lines.push('── ACTIONS');
      result.recommendedActions.forEach(function(a){ lines.push('→ ' + a); });
    }
    return lines.join('\n');
  }

  // ── Entrée principale ─────────────────────────────────────────────
  async function run(){
    var sections = {
      app:       checkApp(),
      dashboard: checkDashboard(),
      messages:  checkMessages(),
      calls:     checkCalls(),
      audio:     checkAudio(),
      webrtc:    checkWebRTC(),
      cache:     await checkCache(),
      supabase:  await checkSupabase()
    };
    var globalStatus = worstOf(sections);
    var topIssues = extractTopIssues(sections);
    var recommendedActions = extractActions(sections);
    var at = new Date().toISOString();
    var result = { build: BUILD, at: at, globalStatus: globalStatus, sections: sections, topIssues: topIssues, recommendedActions: recommendedActions, report: '' };
    result.report = makeReport(result);
    return result;
  }

  w.GlobalVerificationCenter = { build: BUILD, run: run };
})(window);
