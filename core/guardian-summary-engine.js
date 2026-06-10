/* core/guardian-summary-engine.js — Guardian Summary Engine
 *
 * Objectif : transformer les diagnostics techniques en voyants simples.
 * Lecture seule : ne modifie aucune donnée, ne lance aucun appel, n'ouvre aucun écran.
 */
(function(w){
  'use strict';

  var BUILD = 'guardian-summary-engine-v1';

  function nowIso(){
    try { return new Date().toISOString(); } catch(e) { return String(Date.now()); }
  }
  function safe(fn, fallback){
    try { return fn(); } catch(e) { return fallback; }
  }
  function text(v){ return String(v == null ? '' : v); }
  function first(arr){ return Array.isArray(arr) && arr.length ? arr[0] : null; }
  function statusRank(s){ return s === 'critical' ? 3 : s === 'warning' ? 2 : 1; }
  function worst(a,b){ return statusRank(a) >= statusRank(b) ? a : b; }

  function light(area, status, title, cause, action, evidence, code){
    return {
      area: area,
      status: status || 'ok',
      code: code || null,
      title: title || area,
      cause: cause || '',
      action: action || '',
      evidence: evidence || ''
    };
  }

  function ok(area, title){
    return light(area, 'ok', title || area, 'Aucune anomalie détectée.', 'Aucune action requise.', '', null);
  }

  function normalizeRaw(raw){
    raw = raw || {};
    return {
      raw: raw,
      env: raw.environment || {},
      runtime: raw.runtimeState || {},
      db: raw.dbProbe || {},
      messageUi: raw.messageUiProbe || {},
      blockers: raw.blockerProbe || [],
      conclusions: raw.conclusions || [],
      visible: raw.visible || {},
      module: raw.module || {},
      audio: raw.audioRuntime || {},
      notification: raw.notificationRuntime || {},
      guardian: raw.guardianRuntime || {}
    };
  }

  function computeRealtime(n){
    var rs = n.runtime || {};
    if(rs.initialized === false || rs.uidKnown === false){
      return light('realtime','warning','Realtime à vérifier','Utilisateur ou CallManager pas complètement initialisé.','Recharger puis vérifier la connexion.', 'initialized=' + rs.initialized + ', uidKnown=' + rs.uidKnown, 'RUNTIME_NOT_READY');
    }
    if(rs.realtimeStatus && rs.realtimeStatus !== 'SUBSCRIBED'){
      return light('realtime','critical','Realtime non connecté','Le canal Supabase Realtime n’est pas confirmé SUBSCRIBED.','Recharger l’app ou relancer l’abonnement Realtime.', 'realtimeStatus=' + rs.realtimeStatus, 'REALTIME_NOT_SUBSCRIBED');
    }
    if(!rs.realtimeStatus){
      return light('realtime','warning','Realtime inconnu','Aucun statut Realtime fiable n’est disponible.','Ouvrir Guardian après quelques secondes ou recharger.', 'realtimeStatus absent', 'REALTIME_UNKNOWN');
    }
    return ok('realtime','Realtime OK');
  }

  function computeCalls(n){
    var rs = n.runtime || {};
    var c = first((n.conclusions || []).filter(function(x){ return x && x.code === 'ACCEPTED_ACTIONS_MISSING'; }));
    if(c){
      return light('calls','critical','Écran accepté incomplet','L’état Contact accepté n’affiche pas correctement Message/Fermer.','Recharger la dernière version puis retester.', c.message || 'ACCEPTED_ACTIONS_MISSING', 'ACCEPTED_ACTIONS_MISSING');
    }
    c = first((n.conclusions || []).filter(function(x){ return x && x.code === 'LEGACY_ACCEPTED_WORDING'; }));
    if(c){
      return light('calls','critical','Ancienne version détectée','L’interface affiche encore “conversation ouverte”.','Forcer le rechargement/cache et vérifier GitHub Pages.', c.message || 'LEGACY_ACCEPTED_WORDING', 'LEGACY_ACCEPTED_WORDING');
    }
    if(rs.callScreenMode && rs.callScreenMode !== 'idle' && rs.callScreenMode !== 'accepted' && rs.callScreenMode !== 'incoming' && rs.callScreenMode !== 'outgoing'){
      return light('calls','warning','État appel inhabituel','CallScreen est dans un état non standard.','Copier le rapport diagnostic.', 'callScreenMode=' + rs.callScreenMode, 'CALLSCREEN_UNKNOWN_MODE');
    }
    return ok('calls','Appels OK');
  }

  function computeDb(n){
    var db = n.db || {};
    if(db.available === false){
      return light('database','warning','DB non vérifiée','Le diagnostic n’a pas pu lire Supabase en lecture seule.','Recharger ou relancer Diagnostic complet.', db.reason || db.error || 'dbProbe unavailable', 'DB_PROBE_UNAVAILABLE');
    }
    if(db.hasDbRuntimeDivergence){
      return light('database','critical','Pending fantôme détecté','Le téléphone n’a plus d’appel actif mais Supabase contient encore une demande pending.','Expirer les anciens pending puis retester le rappel.', 'pendingCallId=null, pendingOutgoingCount=' + db.pendingOutgoingCount, 'DB_RUNTIME_DIVERGENCE');
    }
    if((db.pendingOutgoing || []).some(function(r){ return r.expires_at && new Date(r.expires_at) < new Date(); })){
      return light('database','critical','Pending expiré encore actif','Une demande pending a dépassé sa date d’expiration.','Expirer les pending orphelins.', 'pendingOutgoing contient expires_at passé', 'PENDING_EXPIRED_STILL_PENDING');
    }
    if((db.pendingIncomingCount || 0) > 1 || (db.pendingOutgoingCount || 0) > 1){
      return light('database','warning','Plusieurs pending détectés','Plusieurs demandes pending existent en même temps.','Copier le rapport et stabiliser le cycle pending.', 'out=' + db.pendingOutgoingCount + ', in=' + db.pendingIncomingCount, 'MULTIPLE_PENDING_ROWS');
    }
    return ok('database','Base appels OK');
  }

  function computeMessages(n){
    var m = n.messageUi || {};
    var rows = m.visibleRowsCount || 0;
    var thread = m.icThread || {};
    var list = m.icMsgList || {};
    if(m.icMessagesPro && m.icMessagesPro.exists === false){
      return light('messages','warning','Messages non trouvés','Le conteneur messages n’est pas présent dans le DOM.','Ouvrir l’onglet Messages puis relancer le diagnostic.', 'icMessagesPro missing', 'MESSAGES_DOM_MISSING');
    }
    if(rows > 0 && list.exists && list.visible === false && !thread.visible){
      return light('messages','warning','Conversation difficile à ouvrir','Des conversations existent mais ni la liste ni le thread ne semblent visibles.','Fermer les panneaux/overlays puis relancer Messages.', 'visibleRows=' + rows + ', icMsgList.visible=' + list.visible + ', icThread.visible=' + thread.visible, 'MESSAGE_UI_HIDDEN');
    }
    return ok('messages','Messages OK');
  }

  function computeOverlays(n){
    var blockers = (n.blockers || []).filter(function(b){
      if(!b || !b.visible) return false;
      var id = b.id || '';
      if(id === 'sheet') return false;
      return b.css && b.css.pointerEvents !== 'none' && b.rect && b.rect.w > 0 && b.rect.h > 0;
    });
    if(blockers.length){
      var names = blockers.slice(0,3).map(function(b){ return '#' + b.id; }).join(', ');
      return light('overlays','warning','Overlay potentiellement bloquant','Un panneau visible peut intercepter les taps.','Fermer les panneaux puis retester le clic.', names, 'OVERLAY_BLOCKING_TAP');
    }
    return ok('overlays','UI/Overlays OK');
  }

  function computeCache(n){
    var env = n.env || {};
    var marker = env.cacheMarker || env.search || '';
    if(!marker){
      return light('cache','warning','Version non marquée','L’URL ne contient pas de marqueur de test/cache.','Ouvrir avec un lien de test versionné après un commit.', 'search vide', 'CACHE_VERSION_UNKNOWN');
    }
    if(env.serviceWorkerControlled){
      return light('cache','warning','Service worker actif','La page est contrôlée par le service worker, donc un vieux cache reste possible.','Recharger ou forcer la nouvelle version si le comportement semble ancien.', 'serviceWorkerControlled=true, marker=' + marker, 'SERVICE_WORKER_ACTIVE');
    }
    return ok('cache','Version/cache OK');
  }

  function computeAudio(n){
    var a = n.audio || {};
    if(a.available === false) return light('audio','warning','Audio non vérifié','AudioManager n’a pas fourni de runtime state.','Tester après un tap utilisateur sur iOS.', a.reason || a.error || '', 'AUDIO_UNKNOWN');
    if(a.webAudioContextState && a.webAudioContextState !== 'running'){
      return light('audio','warning','Audio iOS à activer','Le contexte audio n’est pas running.','Faire un tap utilisateur puis retester la sonnerie.', 'webAudioContextState=' + a.webAudioContextState, 'AUDIO_CONTEXT_NOT_RUNNING');
    }
    return ok('audio','Audio OK');
  }

  function compute(raw){
    var n = normalizeRaw(raw);
    var lights = [
      computeRealtime(n),
      computeCalls(n),
      computeDb(n),
      computeMessages(n),
      computeOverlays(n),
      computeCache(n),
      computeAudio(n)
    ];
    var global = 'ok';
    lights.forEach(function(l){ global = worst(global, l.status); });
    var top = first(lights.filter(function(l){ return l.status === 'critical'; })) || first(lights.filter(function(l){ return l.status === 'warning'; })) || lights[0];
    return {
      build: BUILD,
      at: nowIso(),
      globalStatus: global,
      topDiagnosis: top,
      lights: lights,
      rawAvailable: !!raw
    };
  }

  function formatStatus(s){ return s === 'critical' ? '🔴 Critique' : s === 'warning' ? '🟠 Attention' : '🟢 OK'; }

  function makeReport(summary, raw){
    summary = summary || compute(raw || {});
    var top = summary.topDiagnosis || {};
    var lines = [];
    lines.push('ImmatConnect Guardian Report');
    lines.push('Date: ' + (summary.at || nowIso()));
    lines.push('Global: ' + formatStatus(summary.globalStatus));
    lines.push('Top: ' + (top.code || 'OK') + ' — ' + (top.title || 'OK'));
    if(top.cause) lines.push('Cause: ' + top.cause);
    if(top.action) lines.push('Action: ' + top.action);
    if(top.evidence) lines.push('Evidence: ' + top.evidence);
    lines.push('Lights:');
    (summary.lights || []).forEach(function(l){ lines.push('- ' + l.area + ': ' + formatStatus(l.status) + (l.code ? ' (' + l.code + ')' : '')); });
    var rs = raw && raw.runtimeState || {};
    if(rs){
      lines.push('Runtime: realtime=' + (rs.realtimeStatus || '-') + ', pendingCallId=' + (rs.pendingCallId || 'null') + ', callScreen=' + (rs.callScreenMode || '-'));
    }
    var db = raw && raw.dbProbe || {};
    if(db && db.available !== false){
      lines.push('DB: pendingOut=' + (db.pendingOutgoingCount || 0) + ', pendingIn=' + (db.pendingIncomingCount || 0));
    }
    return lines.join('\n');
  }

  async function run(){
    var raw;
    if(w.ImmatCallsRuntimeDiagnostics && typeof w.ImmatCallsRuntimeDiagnostics.runDeep === 'function'){
      raw = await w.ImmatCallsRuntimeDiagnostics.runDeep();
    } else if(w.ImmatCallsRuntimeDiagnostics && typeof w.ImmatCallsRuntimeDiagnostics.run === 'function'){
      raw = w.ImmatCallsRuntimeDiagnostics.run();
    } else {
      raw = { unavailable:true, reason:'ImmatCallsRuntimeDiagnostics missing' };
    }
    var summary = compute(raw);
    return { summary: summary, report: makeReport(summary, raw), raw: raw };
  }

  w.GuardianSummaryEngine = {
    build: BUILD,
    compute: compute,
    makeReport: makeReport,
    run: run
  };
})(window);
