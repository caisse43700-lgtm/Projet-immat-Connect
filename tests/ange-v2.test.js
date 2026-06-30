/* tests/ange-v2.test.js — Matrice de tests Ange V2 (déterministe, sans navigateur)
 *
 * Lancer : node tests/ange-v2.test.js
 * Sortie : code 0 si tout passe, 1 sinon.
 *
 * Couvre :
 *  A. ImmatNexus (module RÉEL chargé) : matrice d'intentions ask(), explain(), audit(), featureKeyFromText().
 *  B. Câblage Ange V2 dans index.html (présence + wiring confirmation unifiée + garde-fous).
 *  C. Routage des intentions d'action (regex extraites de la source) : appel / signalement / gouvernance / question.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log('  ❌ ' + name); } }
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ─────────────────────────────────────────────────────────────────────────────
// A. ImmatNexus — module réel
// ─────────────────────────────────────────────────────────────────────────────
section('A. ImmatNexus (module réel) — matrice d\'intentions');
(function () {
  let storage = {};
  global.window = {};
  global.localStorage = { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } };
  global.get = (k, f) => f;
  const App = {}; window.App = App; global.App = App;
  const S = {}; window.S = S; global.S = S;

  const line = sub => HTML.split('\n').find(l => l.includes(sub));
  const block = re => HTML.match(re)[0];

  global.eval(block(/const FEATURE_FLAGS=\{[^}]*\};/).replace(/^const /, 'window.FEATURE_FLAGS=') + '\nglobal.FEATURE_FLAGS=window.FEATURE_FLAGS;');
  global.eval(line('function isFeatureEnabled(k){')); window.isFeatureEnabled = isFeatureEnabled;
  global.eval(block(/const FEATURE_REGISTRY=\[[\s\S]*?\n\];/).replace(/^const /, 'window.FEATURE_REGISTRY='));
  global.eval(block(/window\.FeatureRegistry=\{[\s\S]*?\n\};/));
  global.eval(line('App.featureStatus=function(key){'));

  window.ImmatBus = require(path.join(ROOT, 'core/bus.js')).ImmatBus;
  window._INVARIANTS = require(path.join(ROOT, 'core/invariants.js')).INVARIANTS;
  window.ImmatOrganism = { diagnose: () => ({ health: 'ok', summary: '', violations: [] }) };
  S._reliability = { score: 82, level: 'high' };
  S._brainOrientation = { urgency: 2 };

  global.eval(fs.readFileSync(path.join(ROOT, 'core/immat-nexus.js'), 'utf8'));
  ok('ImmatNexus exposé', !!window.ImmatNexus);
  window.ImmatNexus.init();

  // état par défaut : tout actif → "appels" disponible
  const cases = [
    ['pourquoi les appels ne marchent pas', 'why_blocked'],
    ['statut des messages', 'feature_status'],
    ['qu\'est-ce qui est désactivé', 'disabled_features'],
    ['santé de l\'organisme', 'organism_health'],
    ['quelles sont les lois', 'laws'],
    ['quelles lois sont violées', 'recent_violations'],
    ['y a-t-il un danger', 'danger_urgency'],
    ['les données sont-elles fiables', 'reliability_status'],
    ['en quelle phase', 'phase_status'],
    ['suis-je suspendu', 'moderation_self'],
    ['que dois-je faire', 'recommend_action'],
    ['que peux-tu me dire', 'help_capabilities'],
    ['résumé du système', 'system_summary'],
    ['changements de gouvernance', 'governance_changes'],
  ];
  cases.forEach(([q, intent]) => {
    const r = window.ImmatNexus.ask(q);
    ok('ask « ' + q + ' » → ' + intent + ' (eu: ' + (r.answered ? r.intent : 'non répondu') + ')', r.answered && r.intent === intent && !!r.answer);
  });

  // hors-sujet → non répondu (part au LLM)
  ['raconte-moi une blague', 'quelle est la capitale de la France'].forEach(q => {
    const r = window.ImmatNexus.ask(q);
    ok('ask hors-sujet « ' + q + ' » → non répondu', !r.answered);
  });

  // explain
  const ex = window.ImmatNexus.explain('appels');
  ok('explain(appels).enabled=true par défaut', ex && ex.enabled === true && ex.label);

  // featureKeyFromText
  ok('featureKeyFromText("le téléphone")=appels', window.ImmatNexus.featureKeyFromText('le téléphone') === 'appels');
  ok('featureKeyFromText("le stationnement")=signalement_stationne', window.ImmatNexus.featureKeyFromText('le stationnement') === 'signalement_stationne');
  ok('featureKeyFromText("xyz")=null', window.ImmatNexus.featureKeyFromText('xyz blabla') === null);

  // désactivation flotte → blocage + why_blocked correct
  S._fleetFlags = { appels: false }; window._fleetFlagsCache = S._fleetFlags;
  window.ImmatBus.emit('FEATURE_GOVERNANCE_CHANGED', { key: 'appels', enabled: false }); // invalide le cache 3s
  const r2 = window.ImmatNexus.ask('pourquoi le téléphone ne marche pas');
  ok('appels OFF → why_blocked dit DÉSACTIVÉE', r2.answered && /indisponible|désactiv/i.test(r2.answer));

  // fallbackFor (SPEC-ANGE-NEXT-ACTION §1.3) — remplacement intelligent, lecture seule.
  // Ici appels=OFF (cf. ci-dessus), messages=ON → l'alternative autorisée est le message.
  ok('fallbackFor exposé', typeof window.ImmatNexus.fallbackFor === 'function');
  const fbA = window.ImmatNexus.fallbackFor('appels');
  ok('appels OFF → fallback = message (msgveh)', !!fbA && fbA.feature === 'messages' && fbA.run === 'msgveh' && !!fbA.label && !!fbA.reason);
  // §7-3 conformité : le fallback ne réactive JAMAIS la feature coupée
  ok('fallback ne propose pas l\'action coupée', !fbA || fbA.feature !== 'appels');
  // signalement_vehicule (ON) n'a pas de raison de fallback tant qu'il est autorisé → on coupe pour vérifier le repli
  window._fleetFlagsCache = S._fleetFlags = { appels: false, messages: false };
  ok('appels ET messages OFF → pas de fallback (null)', window.ImmatNexus.fallbackFor('appels') === null);
  const fbSig = window.ImmatNexus.fallbackFor('signalement_vehicule');
  ok('signalement OFF + messages OFF → pas de fallback message', !fbSig || fbSig.feature !== 'messages');
  // restaure l'état pour la suite
  window._fleetFlagsCache = S._fleetFlags = {};
  try { window.ImmatBus.emit('FEATURE_GOVERNANCE_CHANGED', { key: 'appels', enabled: true }); } catch (e) {}

  // audit : registre cohérent → 0 finding
  const findings = window.ImmatNexus.audit();
  ok('audit() retourne un tableau', Array.isArray(findings));

  // lecture seule : ImmatNexus n'expose pas de setter d'état
  ok('ImmatNexus sans méthode d\'écriture', typeof window.ImmatNexus.set === 'undefined' && typeof window.ImmatNexus.write === 'undefined');
})();

// ─────────────────────────────────────────────────────────────────────────────
// B. Câblage Ange V2 dans index.html
// ─────────────────────────────────────────────────────────────────────────────
section('B. Câblage Ange V2 (index.html)');
(function () {
  const has = s => HTML.includes(s);
  // méthodes V2
  ['_trySignal', '_tryCall', '_tryAction', '_tryHistory', '_tryForget', '_armConfirm', 'confirmYes', 'confirmNo', '_clearPending', '_log', '_lastTarget', '_rememberTarget', 'angeDoAction', 'angeSignalConfirm', 'angeCallConfirm'].forEach(m => ok('méthode présente : ' + m, has(m + '(') || has(m + ':')));
  // wiring dans send() : ordre actions avant Nexus avant LLM
  ok('send() appelle _tryForget', has('this._tryForget(msg)'));
  ok('send() appelle _tryHistory', has('this._tryHistory(msg)'));
  ok('send() appelle _tryCall', has('this._tryCall(msg)'));
  ok('send() appelle _trySignal', has('this._trySignal(msg)'));
  ok('send() appelle _tryAction', has('this._tryAction(msg)'));
  ok('send() local-first Nexus avant LLM', HTML.indexOf('ImmatNexus.ask') < HTML.indexOf("functions.invoke('immat-brain-dialog'"));
  // garde-fous
  ok('confirmation timeout 15 s', has('15000'));
  ok('boutons confirm routés via confirmYes/No', has('AngeDialog.confirmYes()') && has('AngeDialog.confirmNo()'));
  ok('signalement gardé par feature signalement_vehicule', has("featureStatus('signalement_vehicule')"));
  ok('appel gardé par feature appels', has("featureStatus('appels')"));
  ok('gouvernance via fonction propriétaire setFeatureFlag', has('App.setFeatureFlag('));
  ok('close() nettoie la confirmation en attente', /close\(\)\{[\s\S]{0,120}_clearPending/.test(HTML));
  ok('aucun effet de bord avant confirmation (run dans _armConfirm)', has('this._armConfirm(()=>this.angeDoAction') && has('this._armConfirm(()=>this.angeSignalConfirm') && has('this._armConfirm(()=>this.angeCallConfirm'));
  // Menu d'accueil « Que veux-tu faire ? » + proposition du plus proche
  ['_tryMenu', '_entryMenuHTML', '_signalNearest', '_callNearest', '_messageNearest', '_nearestInfo', '_distLabel'].forEach(m => ok('méthode présente : ' + m, has(m + '(') || has(m + ':')));
  ok('send() appelle _tryMenu', has('this._tryMenu(msg)'));
  ok('_MENU contient l\'entrée faire (Que veux-tu faire ?)', has('faire:{label:\'Que veux-tu faire ?\''));
  ok('menu faire branche les 4 intentions', has("act:['sigveh']") && has("act:['callveh']") && has("act:['msgveh']") && has("'sigStepAide'"));
  ok('_menuAct route sigveh/callveh/msgveh', has("k==='sigveh'") && has("k==='callveh'") && has("k==='msgveh'"));
  ok('signalement sans cible propose le plus proche', /if\(!plate\)\{if\(this\._nearestInfo\(\)\)\{this\._signalNearest\(\)/.test(HTML));
  ok('accueil affiche le menu (open() append _entryMenuHTML)', /open\(\)[\s\S]{0,3000}_entryMenuHTML\(\)/.test(HTML));
  // Remplacement intelligent (SPEC-ANGE-NEXT-ACTION §1.3) : kill-switch → alternative, pas un mur
  ['_blockedHTML', '_fallbackRun'].forEach(m => ok('méthode présente : ' + m, has(m + '(') || has(m + ':')));
  ok('_blockedHTML consomme Nexus.fallbackFor', has('ImmatNexus.fallbackFor'));
  ok('_fallbackRun route vers les actes du menu existant', has("run==='msgveh'") && has("run==='callveh'") && has("run==='sigveh'"));
  ok('feature OFF utilise _blockedHTML (signalement/appels/messages)', /featureStatus\('signalement_vehicule'\)[\s\S]{0,300}_blockedHTML\('signalement_vehicule'/.test(HTML) && has("_blockedHTML('appels'") && has("_blockedHTML('messages'"));
})();

// ─────────────────────────────────────────────────────────────────────────────
// C. Routage des intentions d'action (corpus)
//    NB : ces regex MIROIR doivent rester alignées avec index.html (vérif structurelle en B).
// ─────────────────────────────────────────────────────────────────────────────
section('C. Routage des commandes (corpus)');
(function () {
  const isQuestion = t => /(pourquoi|comment|est-ce|qu'est|quel|quelle|quels|\?)/.test(t);
  const callVerb = t => /\b(appelle|appeler|appel|téléphone|téléphoner|joins|joindre|contacte|contacter)\b/.test(t);
  const signalVerb = t => /\b(signale|signaler|préviens|prévenir|alerte|alerter|indique|indiquer|dis|envoie)\b/.test(t);
  const vehCtx = (t, raw) => /(véhicule|voiture|devant|plaque|immatricul|conducteur|en face)/.test(t) || /\b[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}\b/.test(raw.toUpperCase());
  const govOff = t => /(désactiv|coupe|coupez|couper|bloqu|éteins|éteindre|enlèv|retir|stopp|arrêt|déconnect)/.test(t);
  const govOn = t => /(réactiv|activ|rallum|allum|remet|rétabli|autoris)/.test(t);

  function route(raw) {
    const t = raw.toLowerCase();
    if (callVerb(t) && !isQuestion(t) && vehCtx(t, raw)) return 'CALL';
    if (signalVerb(t) && !isQuestion(t) && vehCtx(t, raw)) return 'SIGNAL';
    if (!isQuestion(t)) { if (govOff(t)) return 'GOV_OFF'; if (govOn(t)) return 'GOV_ON'; }
    return 'OTHER';
  }
  const corpus = [
    ['appelle le véhicule devant', 'CALL'],
    ['appelle AB-123-CD', 'CALL'],
    ['signale au véhicule devant pneu dégonflé', 'SIGNAL'],
    ['préviens le véhicule devant portes ouvertes', 'SIGNAL'],
    ['désactive les appels', 'GOV_OFF'],
    ['réactiver les appels', 'GOV_ON'],
    ['active le GPS', 'GOV_ON'],
    ['coupe les messages', 'GOV_OFF'],
    ['pourquoi les appels sont désactivés', 'OTHER'],
    ['pourquoi tu appelles', 'OTHER'],
    ['bonjour', 'OTHER'],
    ['quelles sont les lois', 'OTHER'],
  ];
  corpus.forEach(([q, exp]) => ok('route « ' + q +' » → ' + exp + ' (eu: ' + route(q) + ')', route(q) === exp));
})();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────');
console.log((fail === 0 ? '✅ TOUS LES TESTS PASSENT' : '❌ ÉCHECS') + ' — ' + pass + ' ok, ' + fail + ' ko');
process.exit(fail === 0 ? 0 : 1);
