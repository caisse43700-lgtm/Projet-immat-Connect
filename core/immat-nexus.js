/* core/immat-nexus.js — ImmatNexus : tissu de connexion (façade fine, LECTURE SEULE)
 *
 * Rôle : relier / agréger / expliquer / auditer ce que les modules savent déjà.
 * Interdits : aucun état métier, aucune écriture, aucun pilotage, aucun tick lourd,
 *             aucun journal propre, aucune correction automatique.
 * Voir docs/SPEC-IMMAT-NEXUS.md. Nexus n'émet QUE FEATURE_AUDIT_FINDING (source:'nexus').
 */
'use strict';
(function (w) {
  if (w.ImmatNexus) return;

  var CACHE_TTL = 3000;
  var _cache = null, _cacheAt = 0;

  function _bus() { return w.ImmatBus || null; }
  function _now() { try { return Date.now(); } catch (e) { return 0; } }

  // ── Synonymes langage courant → clé de registre (lecture du registre uniquement) ──
  var SYN = [
    [['appel', 'appels', 'telephone', 'téléphone', 'appeler'], 'appels'],
    [['message', 'messages', 'messagerie', 'ecrire', 'écrire'], 'messages'],
    [['gps', 'localisation', 'navigation', 'naviguer', 'itineraire', 'itinéraire', 'carte'], 'gps'],
    [['ange', 'assistant', 'copilote'], 'ange'],
    [['route', 'circulation', 'incident'], 'signalement_route'],
    [['vehicule', 'véhicule', 'voiture'], 'signalement_vehicule'],
    [['aide', 'assistance', 'sos', 'entraide', 'depannage', 'dépannage'], 'aide'],
    [['stationne', 'stationné', 'stationnement', 'parking', 'gare'], 'signalement_stationne'],
    [['zone', 'accidentogene', 'accidentogène', 'risque'], 'zones_accidentogenes'],
    [['nouveau', 'nouveaux'], 'activite_nouveaux'],
    [['a traiter', 'à traiter', 'traiter'], 'activite_a_traiter'],
    [['traite', 'traités', 'traités', 'traites'], 'activite_traites'],
    [['voir tout', 'tout voir'], 'activite_tout'],
    [['auto-statut', 'auto statut', 'presence', 'présence'], 'auto_status']
  ];

  function _norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  }

  function _featureKeyFrom(text) {
    var t = _norm(text);
    for (var i = 0; i < SYN.length; i++) {
      var kws = SYN[i][0];
      for (var j = 0; j < kws.length; j++) {
        if (t.indexOf(kws[j]) !== -1) return SYN[i][1];
      }
    }
    return null;
  }

  function _featureStatus(key) {
    try {
      if (w.App && typeof w.App.featureStatus === 'function') return w.App.featureStatus(key);
    } catch (e) {}
    return { enabled: true, by: null };
  }

  function _regGet(key) {
    try { return (w.FeatureRegistry && w.FeatureRegistry.get(key)) || null; } catch (e) { return null; }
  }

  // Label lisible depuis une clé (registre ou legacy)
  function _govLabelN(key) {
    try {
      var l = (w.FeatureRegistry && w.FeatureRegistry.list()) || w.FEATURE_REGISTRY || [];
      var e = l.find(function (f) { return (f.replaces || f.key) === key || f.key === key; });
      return e ? e.label : (key || '?');
    } catch (e) { return key || '?'; }
  }

  function _regList() {
    try { return (w.FeatureRegistry && w.FeatureRegistry.list()) || (w.FEATURE_REGISTRY || []); } catch (e) { return w.FEATURE_REGISTRY || []; }
  }

  function _resolveOrigin(key) {
    try { var r = w.FeatureRegistry && w.FeatureRegistry.resolve(key); return r ? r.origin : null; } catch (e) { return null; }
  }

  function _lastGovChange(legacyOrKey) {
    try {
      var j = _bus() ? _bus().getJournal() : [];
      for (var i = j.length - 1; i >= 0; i--) {
        if (j[i].event === 'FEATURE_GOVERNANCE_CHANGED') {
          var k = j[i].payload && j[i].payload.key;
          if (!legacyOrKey || k === legacyOrKey) return j[i];
        }
      }
    } catch (e) {}
    return null;
  }

  // ── EXPLAIN : explique une fonctionnalité depuis registre + featureStatus (lecture seule) ──
  function explain(featureKey) {
    var e = _regGet(featureKey);
    var st = _featureStatus(featureKey);
    var legacy = (e && (e.replaces || e.key)) || featureKey;
    var lc = _lastGovChange(legacy);
    var reason = st.enabled ? null
      : (st.by === 'user' ? "tu l'as désactivée dans les Réglages"
        : "désactivée par l'administrateur");
    return {
      key: featureKey,
      label: (e && e.label) || featureKey,
      enabled: !!st.enabled,
      by: st.by || null,
      scope: (e && e.scope) || null,
      origin: _resolveOrigin(featureKey),
      killSwitch: (e && e.killSwitch) || null,
      dependsOn: (e && e.dependsOn) || [],
      reason: reason,
      lastChange: lc ? { enabled: !!(lc.payload && lc.payload.enabled), at: lc.at } : null
    };
  }

  // ── SENSE : snapshot unifié (lecture seule, cache court) ──
  function _build() {
    var snap = { at: _now() };
    // gouvernance (registre résolu)
    try {
      var list = _regList();
      var gov = list.map(function (f) {
        var st = _featureStatus(f.key);
        return { key: f.key, label: f.label, group: f.group, enabled: !!st.enabled, by: st.by || null, scope: f.scope };
      });
      snap.governance = {
        features: gov,
        total: gov.length,
        enabled: gov.filter(function (g) { return g.enabled; }).length,
        disabled: gov.filter(function (g) { return !g.enabled; })
      };
    } catch (e) { snap.governance = null; }
    // santé organisme
    try { snap.health = (w.ImmatOrganism && w.ImmatOrganism.diagnose) ? w.ImmatOrganism.diagnose() : null; } catch (e) { snap.health = null; }
    // synthèse (lecture des S._*)
    try { snap.consciousness = (w.S && w.S._consciousness) || null; } catch (e) {}
    try { snap.soul = (w.S && w.S._soul) || null; } catch (e) {}
    try { snap.reliability = (w.S && w.S._reliability) || null; } catch (e) {}
    try { snap.orientation = (w.S && w.S._brainOrientation) || null; } catch (e) {}
    // OBD récents (lecture du journal du bus, limité)
    try { var j = _bus() ? _bus().getJournal() : []; snap.recentEvents = j.slice(-25); } catch (e) { snap.recentEvents = []; }
    // lois (invariants exposés sur window._INVARIANTS par core/invariants.js)
    try { var _inv = w._INVARIANTS || w.INVARIANTS; snap.invariants = _inv ? Object.keys(_inv).length : null; } catch (e) { snap.invariants = null; }
    // modération (état local courant)
    try { snap.moderation = { suspended: !!(w.S && w.S._suspEnforced) }; } catch (e) {}
    // phase
    try { snap.phase = (w.ImmatBrain && w.ImmatBrain.getPhase) ? w.ImmatBrain.getPhase() : null; } catch (e) { snap.phase = null; }
    return snap;
  }

  function sense(opts) {
    var fresh = opts && opts.fresh;
    if (!fresh && _cache && (_now() - _cacheAt) < CACHE_TTL) return _cache;
    _cache = _build(); _cacheAt = _now();
    return _cache;
  }

  function _invalidate() { _cache = null; _cacheAt = 0; }

  // ── ASK : intents déclaratifs → resolvers (réponse locale, sans IA) ──
  function _disabledList() {
    var snap = sense({});
    var d = (snap.governance && snap.governance.disabled) || [];
    return d;
  }

  var INTENTS = [
    { id: 'why_blocked', confidence: 0.92, re: /(pourquoi).*(march|fonctionne pas|bloqu|ne s'ouvre|indispo|d[ée]sactiv|marche pas)/, resolver: 'feature' },
    { id: 'feature_status', confidence: 0.9, re: /(statut|[ée]tat|est-ce que).*(appel|message|gps|ange|route|v[ée]hicule|aide|stationn|zone|nouveau|traiter|trait[ée]|tout|localisation|t[ée]l[ée]phone)|(appel|message|gps|ange|route|v[ée]hicule|aide|stationn).*(activ|d[ée]sactiv|marche|bloqu)/, resolver: 'feature' },
    { id: 'disabled_features', confidence: 0.9, re: /(quoi|quelles?|qu.{0,2}est.{0,2}ce|c.{0,2}est quoi).*(d[ée]sactiv|coup[ée]|bloqu|off|indispo)|(liste|montre|affiche).*(d[ée]sactiv|fonctionnalit|coup)|fonctionnalit.{0,6}(d[ée]sactiv|coup|bloqu)|(d[ée]sactiv).{0,8}(quoi|liste|fonctionnalit)/, resolver: 'disabled' },
    { id: 'recent_violations', confidence: 0.88, re: /(violation|enfreint|non.?respect)|(loi|invariant|r[èe]gle).*(viol|cass|enfreint|r[ée]cent|respect[ée])|quelles? (lois|r[èe]gles).*(viol|cass|enfreint)/, resolver: 'violations' },
    { id: 'laws', confidence: 0.8, re: /(quelles?|liste|montre|c.est quoi).{0,20}(lois|r[èe]gles|invariants|adn)|(lois|r[èe]gles|invariants|adn).{0,15}(application|syst[èe]me|organisme|fondament)/, resolver: 'laws' },
    { id: 'governance_changes', confidence: 0.85, re: /(changement|modif|derni[èe]r).*(gouvernance|fonctionnalit|flotte|dashboard)|qu'a fait l'admin/, resolver: 'govchanges' },
    { id: 'organism_health', confidence: 0.88, re: /(sant[ée]|[ée]tat).*(organisme|syst[èe]me|app)|tout va bien|comment.*(va|tourne)/, resolver: 'health' },
    { id: 'danger_urgency', confidence: 0.85, re: /(danger|urgence|risque|dois-je m'inqui[ée]ter|suis-je en s[ée]curit)/, resolver: 'danger' },
    { id: 'reliability_status', confidence: 0.85, re: /(fiabilit|donn[ée]es.{0,15}fiable|gps.{0,15}(fiable|fonctionne|à jour|a jour|perdu)|signal (gps|r[ée]seau|faible|perdu))/, resolver: 'reliability' },
    { id: 'phase_status', confidence: 0.85, re: /(quelle|quel).*(phase|niveau|mode).*(organisme|syst[èe]me)?|phase.*(actuelle|en cours)|en quelle phase/, resolver: 'phase' },
    { id: 'moderation_self', confidence: 0.9, re: /(suis-je|je suis|mon compte).*(suspendu|banni|bloqu)|(compte suspendu)/, resolver: 'moderation' },
    { id: 'recommend_action', confidence: 0.82, re: /(que dois-je|qu'est-ce que je dois|quoi faire|que faire|des conseils?|un conseil|recommand|tu me conseilles|je fais quoi|priorit[ée])/, resolver: 'recommend' },
    { id: 'help_capabilities', confidence: 0.7, re: /(que peux-tu|que sais-tu|qu'est-ce que tu sais|tu peux faire quoi|aide-moi|comment[ ]?[çc]a marche|que puis-je.*(demander|poser)|liste.*(question|capacit))/, resolver: 'help' },
    { id: 'system_summary', confidence: 0.8, re: /(r[ée]sum[ée]|bilan|vue d'ensemble|aper[çc]u|point complet|fais le point)/, resolver: 'summary' }
  ];

  var RESOLVERS = {
    feature: function (q) {
      var key = _featureKeyFrom(q);
      if (!key) return null;
      var ex = explain(key);
      var ans = ex.enabled
        ? '« ' + ex.label + ' » est disponible ✅.'
        : '« ' + ex.label + ' » est indisponible — ' + (ex.reason || 'désactivée') + '.';
      return { answer: ans, facts: [] };
    },
    disabled: function () {
      var d = _disabledList();
      if (!d.length) return { answer: '✅ Tout est actif, rien n\'est désactivé.', facts: [] };
      var ans = d.length + ' chose(s) désactivée(s) : ' + d.map(function (g) { return g.label; }).slice(0, 6).join(', ') + (d.length > 6 ? '…' : '') + '.';
      return { answer: ans, facts: [] };
    },
    health: function () {
      var h = sense({}).health || {};
      var ans = h.health === 'ok' ? '✅ Tout fonctionne bien.'
        : h.health === 'violated' ? '⚠️ Il y a un souci important à surveiller.'
        : h.health === 'degraded' ? "⚠️ L'application est un peu ralentie, mais elle marche."
        : "Je n'ai pas encore assez d'infos sur l'état général.";
      return { answer: ans, facts: [] };
    },
    violations: function () {
      var v = (sense({}).health || {}).violations || [];
      if (!v.length) return { answer: '✅ Tout est en règle, rien à signaler.', facts: [] };
      return { answer: "⚠️ J'ai repéré " + v.length + ' point(s) à vérifier.', facts: v.slice(0, 4).map(function (x) { return x.label || x.invariant || 'point'; }) };
    },
    govchanges: function () {
      // Journal persistant (survit au rechargement) en priorité, sinon journal de session du bus.
      var log = [];
      try { log = JSON.parse(w.localStorage.getItem('ic_gov_log') || '[]'); } catch (e) {}
      if (log && log.length) {
        var last = log.slice(-5).reverse();
        return {
          answer: log.length + ' changement(s) de gouvernance enregistré(s).',
          facts: last.map(function (x) { return _govLabelN(x.key) + ' → ' + (x.enabled ? 'activé' : 'désactivé'); })
        };
      }
      var j = [];
      try { j = (_bus() ? _bus().getJournal() : []).filter(function (e) { return e.event === 'FEATURE_GOVERNANCE_CHANGED'; }).slice(-5).reverse(); } catch (e) {}
      if (!j.length) return { answer: "Aucun changement de gouvernance récent n'est enregistré.", facts: [] };
      var facts = j.map(function (e) { var p = e.payload || {}; return _govLabelN(p.key) + ' → ' + (p.enabled ? 'activé' : 'désactivé'); });
      return { answer: j.length + ' changement(s) de gouvernance récent(s).', facts: facts };
    },
    summary: function () {
      var snap = sense({});
      var h = snap.health || {};
      var head = h.health === 'ok' ? '✅ Tout va bien.' : (h.health ? '⚠️ Quelques points à surveiller.' : '');
      var d = (snap.governance && snap.governance.disabled) || [];
      var gov = d.length ? (d.length + ' chose(s) désactivée(s) : ' + d.map(function (g) { return g.label; }).slice(0, 4).join(', ') + (d.length > 4 ? '…' : '') + '.') : 'Toutes les fonctionnalités sont actives.';
      var u = (snap.orientation && snap.orientation.urgency) || 0;
      var vig = u >= 7 ? ' Sois vigilant sur la route.' : u >= 4 ? ' Reste attentif.' : '';
      return { answer: (head ? head + ' ' : '') + gov + vig, facts: [] };
    },
    danger: function () {
      var o = sense({}).orientation || {};
      var u = (o.urgency != null) ? o.urgency : null;
      var ans;
      if (u == null) ans = "Pas d'alerte particulière pour le moment.";
      else if (u >= 7) ans = '⚠️ Sois vigilant' + (o.summary ? ' : ' + o.summary : '') + '.';
      else if (u >= 4) ans = 'Reste attentif' + (o.summary ? ' : ' + o.summary : '') + '.';
      else ans = '✅ Pas de danger particulier.';
      return { answer: ans, facts: [] };
    },
    reliability: function () {
      var r = sense({}).reliability || {};
      if (r.score == null) return { answer: 'Tout est normal de mon côté.', facts: [] };
      var ans = (r.level === 'low' || r.degraded)
        ? "⚠️ Mes informations sont un peu incertaines en ce moment — vérifie le GPS et la connexion."
        : '✅ Mes informations sont fiables.';
      return { answer: ans, facts: [] };
    },
    phase: function () {
      var p = sense({}).phase;
      var desc = { 1: "L'application surveille et t'informe.", 2: "L'application t'observe et te conseille.", 3: "L'application surveille et protège activement.", 4: "L'application coordonne tout le système.", 5: "L'application fonctionne en pleine autonomie." }[p];
      return { answer: desc || "L'application surveille et t'informe.", facts: [] };
    },
    moderation: function () {
      var snap = sense({});
      var susp = snap.moderation && snap.moderation.suspended;
      if (susp) return { answer: '⛔ Ce compte est suspendu.', facts: [] };
      return { answer: 'Ce compte est actif (non suspendu).', facts: [] };
    },
    recommend: function () {
      var snap = sense({});
      var recs = [];
      // 1) suspension (bloquant)
      if (snap.moderation && snap.moderation.suspended) recs.push("Ton compte est suspendu — contacte un administrateur.");
      // 2) urgence terrain
      var o = snap.orientation || {};
      if (o.urgency != null && o.urgency >= 7) recs.push('Vigilance élevée' + (o.summary ? ' : ' + o.summary : '') + '.');
      // 3) recommandations Guardian (Gardien)
      try { var g = (w.GuardianLoop && w.GuardianLoop.getRuntimeState) ? w.GuardianLoop.getRuntimeState() : null; if (g && g.pendingRecommendations > 0) recs.push(g.pendingRecommendations + ' recommandation(s) de modération à examiner dans le Dashboard.'); } catch (e) {}
      // 4) fiabilité / GPS
      var r = snap.reliability || {};
      if (r.score != null && r.score < 50) recs.push("Mes infos sont incertaines — vérifie ta localisation et ta connexion.");
      // 5) angle mort de l'âme
      try { var bs = snap.soul && snap.soul.blind_spots; if (bs && bs.length) recs.push('À surveiller : ' + bs[0] + '.'); } catch (e) {}
      // 6) fonctionnalités critiques coupées
      try {
        var dis = (snap.governance && snap.governance.disabled) || [];
        var crit = dis.filter(function (x) { return ['appels', 'messages', 'gps'].indexOf(x.key) !== -1; });
        if (crit.length) recs.push('Désactivé par l\'administrateur : ' + crit.map(function (x) { return x.label; }).join(', ') + '.');
      } catch (e) {}
      if (!recs.length) return { answer: "Rien d'urgent : tout est nominal. Continue normalement.", facts: [] };
      return { answer: 'Priorités du moment :', facts: recs.slice(0, 4) };
    },
    laws: function () {
      var inv = w._INVARIANTS || w.INVARIANTS || {};
      var keys = Object.keys(inv);
      var base = "ImmatConnect suit des règles strictes pour ta sécurité et le respect de ta vie privée.";
      if (!keys.length) return { answer: base, facts: [] };
      return { answer: base + ' Par exemple :', facts: keys.slice(0, 4).map(function (k) { var x = inv[k] || {}; return x.rule || x.name || ''; }).filter(Boolean) };
    },
    help: function () {
      var ex = [
        '« pourquoi les appels ne marchent pas ? »',
        '« qu\'est-ce qui est désactivé ? »',
        '« santé de l\'organisme »',
        '« y a-t-il un danger ? »',
        '« les données sont-elles fiables ? »',
        '« quelles lois sont violées ? »',
        '« résumé du système »'
      ];
      return { answer: "Je connais l'état d'ImmatConnect en local (sans réseau). Tu peux me demander, par exemple :", facts: ex };
    }
  };

  function ask(question) {
    var q = _norm(question);
    if (!q) return { answered: false, source: 'local_nexus', reason: 'empty' };
    for (var i = 0; i < INTENTS.length; i++) {
      var it = INTENTS[i];
      if (it.re.test(q)) {
        var out = null;
        try { out = RESOLVERS[it.resolver](q); } catch (e) { out = null; }
        if (out && out.answer) {
          return { answered: true, source: 'local_nexus', intent: it.id, confidence: it.confidence, answer: out.answer, facts: out.facts || [] };
        }
      }
    }
    return { answered: false, source: 'local_nexus', reason: 'unknown_intent' };
  }

  // ── AUDIT : cohérence (lecture seule) → émet FEATURE_AUDIT_FINDING (source:'nexus') ──
  function audit() {
    var findings = [];
    function add(level, code, message) { findings.push({ level: level, code: code, message: message }); }
    var list = _regList();
    // 1) doublons de clés
    var seen = {};
    list.forEach(function (f) { if (seen[f.key]) add('error', 'DUP_KEY', 'Clé dupliquée: ' + f.key); seen[f.key] = 1; });
    // 2) entrées sans kill-switch déclaré
    list.forEach(function (f) { if (!f.killSwitch) add('warn', 'NO_KILLSWITCH', 'Pas de killSwitch déclaré: ' + f.key); });
    // 3) dépendances pointant vers une clé inexistante
    list.forEach(function (f) {
      (f.dependsOn || []).forEach(function (dep) {
        if (!seen[dep] && !list.some(function (x) { return x.key === dep; })) add('warn', 'DEP_MISSING', f.key + ' dépend de ' + dep + ' (absente du registre)');
      });
    });
    // 4) events gouvernance figés dans le bus
    try {
      var EV = _bus() && _bus().EVENTS;
      ['FEATURE_GOVERNANCE_CHANGED', 'FEATURE_BLOCKED', 'FLEET_CONFIG_LOADED', 'FEATURE_AUDIT_FINDING'].forEach(function (e) {
        if (!EV || !EV[e]) add('warn', 'EVENT_UNDECLARED', "Event gouvernance non déclaré dans ImmatBus.EVENTS: " + e);
      });
    } catch (e) {}
    // émission (uniquement findings d'audit, source:'nexus')
    try { if (_bus()) _bus().emit('FEATURE_AUDIT_FINDING', { source: 'nexus', count: findings.length, findings: findings.slice(0, 20), at: _now() }); } catch (e) {}
    return findings;
  }

  function init() {
    if (init._done) return; init._done = true;
    try {
      var b = _bus();
      if (b && typeof b.on === 'function') {
        ['FEATURE_GOVERNANCE_CHANGED', 'INVARIANT_VIOLATED', 'FLEET_CONFIG_LOADED', 'FEATURE_BLOCKED', 'KERNEL_DEGRADED'].forEach(function (ev) {
          b.on(ev, function (entry) {
            // ignore ses propres events (anti-boucle)
            if (entry && entry.payload && entry.payload.source === 'nexus') return;
            _invalidate();
          });
        });
      }
    } catch (e) {}
  }

  // Résolution texte → clé de registre (lecture seule, exposée pour les actions d'Ange — Nexus n'agit pas).
  function featureKeyFromText(t) { return _featureKeyFrom(t); }

  w.ImmatNexus = { init: init, sense: sense, ask: ask, explain: explain, audit: audit, featureKeyFromText: featureKeyFromText };
})(typeof window !== 'undefined' ? window : this);
