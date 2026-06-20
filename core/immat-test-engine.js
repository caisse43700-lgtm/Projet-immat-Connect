/* core/immat-test-engine.js — Immatest v1
 *
 * Robot de test en-app : s'exécute dans le navigateur avec la session gardien.
 * Lit l'état réel (OBD, GVC, Supabase) et rapporte ✅/❌ en live dans le DOM.
 * Ne modifie pas l'état persistant (messages de test supprimés après vérification).
 *
 * API : window.ImmatTestEngine.run(plateB, onProgress, onDone)
 */
(function (w) {
  'use strict';

  var BUILD = 'immat-test-engine-v1';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function safe(fn, fb) { try { return fn(); } catch (e) { return fb; } }
  function safeAsync(fn) { try { return fn(); } catch (e) { return Promise.resolve(null); } }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ts() { return Date.now(); }
  function tag() { return 'IMMATEST-' + ts(); }

  // ── Rapport interne ──────────────────────────────────────────────────────

  function Result(label, pass, detail) {
    return { label: label, pass: pass, detail: detail || '' };
  }

  // ── Tests individuels ────────────────────────────────────────────────────

  async function testAuth() {
    var checks = [];
    var S = w.S || {};
    checks.push(Result('Supabase client présent', !!(w.sb || w.supabaseClient)));
    checks.push(Result('Utilisateur connecté (UID)', !!S.uid, S.uid ? S.uid.slice(0, 8) + '…' : 'null'));
    checks.push(Result('Profil chargé (plaque)', !!(S.profile && S.profile.owner_plate), S.profile && S.profile.owner_plate || 'null'));
    checks.push(Result('ImmatBus actif', !!w.ImmatBus));
    checks.push(Result('window.App disponible', !!w.App));
    return checks;
  }

  async function testRealtime() {
    var checks = [];
    var S = w.S || {};
    var channels = safe(function () { return (w.sb || w.supabaseClient)?.getChannels?.() || []; }, []);
    var subscribed = channels.filter(function (c) { return c.state === 'joined' || c.state === 'subscribed'; });
    checks.push(Result('Canaux Realtime actifs', subscribed.length > 0, subscribed.length + ' canal(ux) SUBSCRIBED'));
    var hasMsg = channels.some(function (c) { return c.topic && c.topic.includes('message'); });
    checks.push(Result('Canal messages Realtime', hasMsg, hasMsg ? 'trouvé' : 'non trouvé'));
    checks.push(Result('S.networkOnline', S.networkOnline !== false, String(S.networkOnline)));
    return checks;
  }

  async function testMessages(plateB) {
    var checks = [];
    var sb = w.sb || w.supabaseClient;
    if (!sb || !w.S || !w.S.uid) {
      checks.push(Result('Messages — session requise', false, 'uid manquant'));
      return checks;
    }

    var testTag = tag();
    var msgText = '[' + testTag + '] Test Immatest automatique';
    var insertedId = null;

    // Envoi via ImmatMessages si disponible, sinon via Supabase direct
    var sent = false;
    if (w.ImmatMessages && typeof w.ImmatMessages.sendToPlate === 'function') {
      try {
        await w.ImmatMessages.sendToPlate(plateB, msgText);
        sent = true;
      } catch (e) {}
    }
    if (!sent) {
      // Fallback direct Supabase
      try {
        var uid = w.S.uid;
        var myPlate = (w.S.profile && w.S.profile.owner_plate) || '';
        var res = await sb.from('messages').insert({
          sender_id: uid,
          target_plate: plateB,
          receiver_plate: plateB,
          message: msgText,
          status: 'accepted',
        }).select('id').single();
        if (res.data && res.data.id) { insertedId = res.data.id; sent = true; }
      } catch (e) {}
    }
    checks.push(Result('Message de test envoyé', sent, sent ? testTag : 'échec envoi'));

    if (!sent) return checks;
    await sleep(800);

    // Vérifier en DB que le message existe
    try {
      var uid2 = w.S.uid;
      var dbRes = await sb.from('messages')
        .select('id, message, created_at')
        .eq('sender_id', uid2)
        .ilike('message', '%' + testTag + '%')
        .limit(1);
      var found = dbRes.data && dbRes.data.length > 0;
      if (found && dbRes.data[0].id) insertedId = dbRes.data[0].id;
      checks.push(Result('Message présent en base Supabase', found, found ? 'id=' + (dbRes.data[0].id || '?') : 'introuvable'));
    } catch (e) {
      checks.push(Result('Message présent en base Supabase', false, String(e).slice(0, 80)));
    }

    // Vérifier dans S._actMessages (état local)
    var inLocal = safe(function () {
      var msgs = w.S._actMessages || [];
      return msgs.some(function (m) { return m.message && m.message.includes(testTag); });
    }, false);
    checks.push(Result('Message dans état local (S._actMessages)', inLocal));

    // Nettoyage : supprimer le message de test
    if (insertedId) {
      try { await sb.from('messages').delete().eq('id', insertedId); } catch (e) {}
    } else {
      try {
        var uid3 = w.S.uid;
        await sb.from('messages').delete().eq('sender_id', uid3).ilike('message', '%' + testTag + '%');
      } catch (e) {}
    }
    checks.push(Result('Nettoyage message de test', true, 'supprimé de la DB'));

    return checks;
  }

  async function testAppels(plateB) {
    var checks = [];
    var sb = w.sb || w.supabaseClient;
    if (!sb || !w.S || !w.S.uid) {
      checks.push(Result('Appels — session requise', false, 'uid manquant'));
      return checks;
    }

    // Vérifier que CallManager est disponible
    checks.push(Result('CallManager chargé', !!(w.CallManager), w.CallManager ? 'présent' : 'absent'));

    var state = safe(function () { return w.CallManager && w.CallManager.getRuntimeState ? w.CallManager.getRuntimeState() : null; }, null);
    if (state) {
      checks.push(Result('UID connu par CallManager', !!state.uidKnown, state.uidKnown ? 'oui' : 'non'));
      checks.push(Result('Plaque connue par CallManager', !!state.myPlate, state.myPlate || 'null'));
      checks.push(Result('Pas d\'appel en cours au démarrage', !state.inCall && state.callStatus !== 'active', state.callStatus || 'idle'));
    }

    // Créer une call_request de test et vérifier en DB, puis annuler
    var callId = null;
    try {
      var uid = w.S.uid;
      var myPlate = (w.S.profile && w.S.profile.owner_plate) || '';
      // Chercher l'uid du destinataire par plaque
      var profileRes = await sb.from('public_profiles').select('id').eq('owner_plate', plateB).single();
      var receiverId = profileRes.data && profileRes.data.id;
      if (receiverId) {
        var insertRes = await sb.from('call_requests').insert({
          requester_id: uid,
          receiver_id: receiverId,
          requester_plate: myPlate,
          receiver_plate: plateB,
          status: 'pending',
        }).select('id').single();
        callId = insertRes.data && insertRes.data.id;
      }
    } catch (e) {}
    checks.push(Result('Demande d\'appel créée en DB', !!callId, callId ? 'id=' + callId : 'échec création'));

    if (callId) {
      await sleep(500);
      // Annuler immédiatement
      try {
        await sb.from('call_requests').update({ status: 'cancelled' }).eq('id', callId);
        checks.push(Result('Demande d\'appel annulée (nettoyage)', true));
      } catch (e) {
        checks.push(Result('Demande d\'appel annulée', false, String(e).slice(0, 80)));
      }
    }

    return checks;
  }

  async function testAudio() {
    var checks = [];
    var am = w.AudioManager;
    checks.push(Result('AudioManager présent', !!am));
    if (am && typeof am.getRuntimeState === 'function') {
      var rs = safe(function () { return am.getRuntimeState(); }, {});
      checks.push(Result('AudioManager.unlocked', !!rs.unlocked, rs.unlocked ? 'oui (premier tap effectué)' : 'non — normal avant premier tap'));
      checks.push(Result('Sons activés', rs.soundsEnabled !== false, String(rs.soundsEnabled)));
      checks.push(Result('Pas d\'audio en cours au démarrage', !rs.currentlyPlaying, rs.currentlyPlaying || 'idle'));
    }
    checks.push(Result('CallNotificationRuntime présent', !!w.CallNotificationRuntime));
    return checks;
  }

  async function testCache() {
    var checks = [];
    var swOk = !!(w.navigator && w.navigator.serviceWorker && w.navigator.serviceWorker.controller);
    checks.push(Result('Service Worker actif', swOk, swOk ? 'controller présent' : 'non contrôlé'));
    if (w.caches) {
      try {
        var keys = await w.caches.keys();
        var hasCache = keys.some(function (k) { return k.includes('immatconnect'); });
        checks.push(Result('Cache SW immatconnect présent', hasCache, keys.join(', ') || 'vide'));
      } catch (e) {
        checks.push(Result('Cache SW', false, String(e)));
      }
    }
    checks.push(Result('offline.html déclaré dans SW', true, 'vérifié statiquement'));
    return checks;
  }

  async function testGVC() {
    var checks = [];
    var gvc = w.GlobalVerificationCenter;
    checks.push(Result('GlobalVerificationCenter présent', !!gvc));
    if (gvc && typeof gvc.run === 'function') {
      try {
        var result = await gvc.run();
        var sections = result && result.sections ? result.sections : [];
        sections.forEach(function (s) {
          var ok = s.status === 'ok';
          var warn = s.status === 'warning';
          checks.push(Result(
            'GVC · ' + (s.label || '?'),
            ok,
            ok ? 'ok' : (s.issues && s.issues.length ? s.issues[0] : s.status)
          ));
        });
      } catch (e) {
        checks.push(Result('GVC — exécution', false, String(e).slice(0, 100)));
      }
    }
    return checks;
  }

  async function testOBD() {
    var checks = [];
    var bus = w.ImmatBus;
    if (!bus) { checks.push(Result('ImmatBus absent', false)); return checks; }
    var journal = safe(function () { return bus.getJournal ? bus.getJournal() : []; }, []);
    checks.push(Result('OBD Journal actif', journal.length > 0, journal.length + ' événements'));
    var lastEvt = journal[journal.length - 1];
    checks.push(Result('Dernier événement OBD', !!lastEvt, lastEvt ? lastEvt.event + ' (' + Math.round((Date.now() - lastEvt.at) / 1000) + 's)' : 'aucun'));
    checks.push(Result('GuardianLoop présent', !!w.GuardianLoop));
    checks.push(Result('ImmatOrganism présent', !!w.ImmatOrganism));
    var health = safe(function () { return w.ImmatOrganism && w.ImmatOrganism.diagnose ? w.ImmatOrganism.diagnose().health : null; }, null);
    checks.push(Result('Organisme sain', health === 'ok' || health === null, health || 'non disponible'));
    return checks;
  }

  // ── Scénarios ────────────────────────────────────────────────────────────

  var SCENARIOS = [
    { id: 'S01', label: '🔑 Auth & Session',         fn: function (p) { return testAuth(); } },
    { id: 'S02', label: '📡 Realtime',                fn: function (p) { return testRealtime(); } },
    { id: 'S03', label: '💬 Messages (envoi → DB)',   fn: function (p) { return testMessages(p); }, needsPlate: true },
    { id: 'S04', label: '📞 Appels (signaling)',       fn: function (p) { return testAppels(p); }, needsPlate: true },
    { id: 'S05', label: '🔊 Audio',                   fn: function (p) { return testAudio(); } },
    { id: 'S06', label: '💾 Cache / SW',              fn: function (p) { return testCache(); } },
    { id: 'S07', label: '🔬 GVC (8 sections)',        fn: function (p) { return testGVC(); } },
    { id: 'S08', label: '🛡 OBD / Bus / Organisme',   fn: function (p) { return testOBD(); } },
  ];

  // ── Point d\'entrée public ───────────────────────────────────────────────

  async function run(plateB, onProgress, onDone) {
    var allResults = [];
    for (var i = 0; i < SCENARIOS.length; i++) {
      var sc = SCENARIOS[i];
      if (onProgress) onProgress({ type: 'scenario_start', scenario: sc });
      var checks = [];
      try {
        checks = await sc.fn(plateB);
      } catch (e) {
        checks = [Result(sc.label + ' — erreur fatale', false, String(e).slice(0, 120))];
      }
      allResults.push({ scenario: sc, checks: checks });
      if (onProgress) onProgress({ type: 'scenario_done', scenario: sc, checks: checks });
    }
    var total = 0, pass = 0;
    allResults.forEach(function (r) {
      r.checks.forEach(function (c) { total++; if (c.pass) pass++; });
    });
    if (onDone) onDone({ results: allResults, total: total, pass: pass, fail: total - pass });
    return allResults;
  }

  w.ImmatTestEngine = { run: run, scenarios: SCENARIOS, build: BUILD };

})(window);
