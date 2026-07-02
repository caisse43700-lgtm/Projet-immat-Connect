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

  // nextUsefulAction (SPEC-ANGE-NEXT-ACTION §1.2 / §7) — projection pure, ≤3, silence par défaut.
  ok('nextUsefulAction exposé', typeof window.ImmatNexus.nextUsefulAction === 'function');
  // §7-1 silence : aucun voisin, aucun message, aucun à-traiter → tableau vide
  S.nearby = []; S._actMessages = []; App._computeTodo = function () { return { veh: [], st: [], sos: [], total: 0 }; };
  ok('silence par défaut (rien d\'utile → [])', window.ImmatNexus.nextUsefulAction().length === 0);
  // voisin connecté réel → propose un signalement (sigveh)
  S.nearby = [{ plate: 'AB-123-CD', dist: 0.08 }];
  const na1 = window.ImmatNexus.nextUsefulAction();
  ok('voisin proche → geste signaler (sigveh)', na1.some(x => x.run === 'sigveh' && /AB-123-CD/.test(x.label)));
  // plaque de secours VEH- ignorée (pas une vraie cible)
  S.nearby = [{ plate: 'VEH-1A2B', dist: 0.05 }];
  ok('plaque de secours VEH- ignorée', !window.ImmatNexus.nextUsefulAction().some(x => x.run === 'sigveh'));
  // §7-3 kill-switch : signalement_vehicule OFF → pas de geste signaler
  // (la résolution registre passe par la clé legacy `replaces` = 'alertes_vehicule')
  S.nearby = [{ plate: 'AB-123-CD', dist: 0.08 }];
  window._fleetFlagsCache = S._fleetFlags = { alertes_vehicule: false };
  ok('signalement OFF → aucun geste signaler', !window.ImmatNexus.nextUsefulAction().some(x => x.run === 'sigveh'));
  window._fleetFlagsCache = S._fleetFlags = {};
  // §7-2 plafond : beaucoup de signaux → ≤3 gestes
  S._actMessages = [{ id: 'm1', _received: true, context_type: 'vehicle_report', _otherPlate: 'CD-456-EF', created_at: '2026-06-30T00:00:00Z' }];
  App._computeTodo = function () { return { veh: [1, 2], st: [3], sos: [], total: 3 }; };
  ok('plafond ≤ 3 gestes', window.ImmatNexus.nextUsefulAction().length <= 3);
  // message reçu non traité → propose répondre
  ok('message reçu non traité → geste répondre (reply)', window.ImmatNexus.nextUsefulAction().some(x => x.run === 'reply'));
  // restaure
  S.nearby = []; S._actMessages = []; delete App._computeTodo;

  // currentSituation (SPEC-ANGE-NEXT-ACTION §1.1) — le fil rouge, 1 phrase, silence par défaut.
  ok('currentSituation exposé', typeof window.ImmatNexus.currentSituation === 'function');
  S.nearby = []; S._actMessages = []; S._brainOrientation = { urgency: 0 };
  App._computeTodo = function () { return { veh: [], st: [], sos: [], total: 0 }; };
  ok('fil rouge : silence si rien (null)', window.ImmatNexus.currentSituation() === null);
  S.nearby = [{ plate: 'AB-123-CD', dist: 0.08 }];
  const cs1 = window.ImmatNexus.currentSituation();
  ok('fil rouge : voisin connecté → phrase', !!cs1 && /proche d'.{0,3}un véhicule connecté/.test(cs1.phrase));
  S.nearby = [];
  S._actMessages = [{ id: 'm1', _received: true, context_type: 'vehicle_report' }];
  const cs2 = window.ImmatNexus.currentSituation();
  ok('fil rouge : signalement reçu → phrase prioritaire', !!cs2 && /signalement reçu non traité/.test(cs2.phrase));
  S._actMessages = []; delete App._computeTodo; delete S._brainOrientation;

  // angeTurn() : projection mère (situation + actions + hasUseful)
  ok('angeTurn exposé', typeof window.ImmatNexus.angeTurn === 'function');
  const _tn = window.ImmatNexus.angeTurn();
  ok('angeTurn renvoie {situation, actions[], hasUseful}', !!_tn && Array.isArray(_tn.actions) && typeof _tn.hasUseful === 'boolean' && ('situation' in _tn));

  // governance.disabledNotable : ne signale que les fonctions STABLES normalement actives, coupées
  // (les beta off-par-défaut comme zones_accidentogenes ne sont PAS un avertissement).
  window._fleetFlagsCache = S._fleetFlags = {};
  try { window.ImmatBus.emit('FEATURE_GOVERNANCE_CHANGED', {}); } catch (e) {}
  const snG0 = window.ImmatNexus.sense({});
  ok('disabledNotable existe', !!(snG0.governance && Array.isArray(snG0.governance.disabledNotable)));
  // coupe une fonction BETA (analyses proactives via legacy ange_proactive) ET une STABLE (signalement_vehicule via alertes_vehicule)
  window._fleetFlagsCache = S._fleetFlags = { ange_proactive: false, alertes_vehicule: false };
  try { window.ImmatBus.emit('FEATURE_GOVERNANCE_CHANGED', { key: 'ange_proactive', enabled: false }); } catch (e) {}
  const snG1 = window.ImmatNexus.sense({});
  ok('beta coupée (analyses proactives) absente de disabledNotable', !(snG1.governance.disabledNotable || []).some(g => g.key === 'copilote_proactif'));
  ok('stable coupée présente dans disabledNotable', (snG1.governance.disabledNotable || []).some(g => g.key === 'signalement_vehicule'));
  ok('disabledNotable ⊆ disabled', (snG1.governance.disabledNotable || []).length <= (snG1.governance.disabled || []).length);
  window._fleetFlagsCache = S._fleetFlags = {};
  try { window.ImmatBus.emit('FEATURE_GOVERNANCE_CHANGED', {}); } catch (e) {}

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
  ok('close() nettoie la confirmation en attente', /close\(\)\{[\s\S]{0,300}_clearPending/.test(HTML));
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
  // Prochain geste utile (SPEC-ANGE-NEXT-ACTION §1.2) — câblage à l'ouverture, silence par défaut
  ['_nextActionsHTML', '_nextRun', '_replyLatest'].forEach(m => ok('méthode présente : ' + m, has(m + '(') || has(m + ':')));
  ok('_nextActionsHTML consomme Nexus.nextUsefulAction', has('ImmatNexus.nextUsefulAction'));
  ok('anti-répétition (ic_ange_next_prev)', has('ic_ange_next_prev'));
  ok('open() ajoute le prochain geste en tête', /_nextActionsHTML\(\);if\(_na\)resp\.innerHTML=_na\+resp\.innerHTML/.test(HTML));
  ok('_nextRun route reply/sigveh/callveh/todo', has("run==='reply'") && has("run==='sigveh'") && has("run==='todo'"));
  ok('_tryReply réutilise _replyLatest', /_tryReply\(msg\)\{[\s\S]{0,260}return this\._replyLatest\(\)/.test(HTML));
  ok('_nearestInfo tolère dist nulle et exclut VEH-', has('/^VEH-/i') && has('dist==null?1e9'));
  // Fil rouge (SPEC-ANGE-NEXT-ACTION §1.1) — câblage à l'ouverture, en tête
  ok('méthode présente : _situationHTML', has('_situationHTML('));
  ok('_situationHTML consomme Nexus.currentSituation', has('ImmatNexus.currentSituation'));
  ok('open() ajoute le fil rouge en tête', /_situationHTML\(\);if\(_si\)resp\.innerHTML=_si\+resp\.innerHTML/.test(HTML));
  // Tout en vocal : dictée qui s'auto-envoie + réponse à voix haute + bouton micro global
  ok('startVoice onend délègue à _voiceTurn', HTML.includes("rec.onend=()=>{clearTimeout(_at);_reset();this._voiceTurn"));
  ok('_voiceTurn auto-envoie la dictée', /_voiceTurn\(v\)\{[\s\S]{0,1800}this\._voiceMode=true;[\s\S]{0,120}await this\.send\(\)/.test(HTML));
  ok('send() capte le mode vocal', /const _voice=this\._voiceMode===true;this\._voiceMode=false/.test(HTML));
  ok('réponse Nexus lue à voix haute si vocal', HTML.includes('if(_voice)this._speakAnswer'));
  ok('méthode _speakAnswer présente', HTML.includes('_speakAnswer(txt)'));
  ok('commande vocale globale voiceCommand', HTML.includes('voiceCommand(){'));
  ok('bouton micro global fabVoice', HTML.includes('id="fabVoice"') && HTML.includes('AngeDialog.voiceCommand'));
  // Mot d'activation « Ange » (opt-in, écoute continue au premier plan)
  ['_wakeEnabled', '_wakeInit', '_wakeStart', '_wakeStop'].forEach(m => ok('méthode présente : ' + m, HTML.includes(m + '(')));
  ok('réglage toggle angeWakeToggle', HTML.includes('id="angeWakeToggle"') && HTML.includes('App.toggleAngeWake'));
  ok('toggleAngeWake pilote le listener', /toggleAngeWake\(on\)\{[\s\S]{0,200}_wakeInit[\s\S]{0,60}_wakeStop/.test(HTML));
  ok('mot d\'activation = « ange »', /\/\\b\(ok \|h\[eé\] \|hey \|dis \)\?ange\\b\//.test(HTML));
  ok('wake pause si micro occupé (dictée/confirmation)', /_wakeStart\(\)\{[\s\S]{0,260}this\._rec\|\|this\._pendRec\)return/.test(HTML));
  ok('wake pause si Ange ouvert', /_wakeStart\(\)\{[\s\S]{0,700}ange-open'\)\)return/.test(HTML));
  ok('open() coupe le wake (anti-conflit micro)', /open\(\)\{[\s\S]{0,160}try\{this\._wakeStop/.test(HTML));
  ok('wake détecté → voiceCommand', /ange\\b\/\.test\(t\)\)\{this\._wakeFired=true;this\._wakeStop\(\);try\{this\.voiceCommand\(\)/.test(HTML));
  // Conversation continue : le micro se rouvre après chaque tour tant qu'on parle avec Ange
  ['_voiceTurn', '_convoResume', '_convoStop', '_afterConfirm'].forEach(m => ok('méthode présente : ' + m, HTML.includes(m + '(')));
  // Arrêt TOTAL du micro à la fermeture / mise en arrière-plan (bug « le micro reste allumé »)
  ok('méthode _hardStopMic présente', HTML.includes('_hardStopMic()'));
  ok('_hardStopMic coupe dictée + confirmation + wake', /_hardStopMic\(\)\{[\s\S]{0,400}this\._rec\.stop\(\)[\s\S]{0,200}this\._pendRec\.stop\(\)[\s\S]{0,120}this\._wakeStop\(\)/.test(HTML));
  ok('arrière-plan → _hardStopMic (pas juste wakeStop)', /visibilityState==='visible'\)this\._wakeStart\(\);else this\._hardStopMic\(\)/.test(HTML));
  ok('pagehide → _hardStopMic (app fermée)', /pagehide',\(\)=>\{[\s\S]{0,40}this\._hardStopMic\(\)/.test(HTML));
  ok('startVoice ouvre la conversation (_convo=true)', /this\._convo=true;.{0,80}le micro reste ouvert/.test(HTML));
  ok('startVoice onend → _voiceTurn', HTML.includes('this._voiceTurn((_last||\'\').trim())'));
  ok('_voiceTurn ne reprend pas si confirmation en attente', /if\(this\._pending\)return;[\s\S]{0,40}this\._convoResume\(\)/.test(HTML));
  ok('_convoResume attend la fin de la voix (anti auto-écoute)', /speechSynthesis\.speaking\)\{return setTimeout\(go,300\)/.test(HTML));
  ok('_convoResume ne rouvre pas si micro occupé', /_convoResume\(\)\{[\s\S]{0,220}this\._rec\|\|this\._pendRec\)return/.test(HTML));
  ok('mots d\'arrêt stoppent la conversation', /stop\|st\[oe\]p\|merci[\s\S]{0,200}this\._convoStop\(\);try\{this\.close/.test(HTML));
  ok('confirmYes relance la conversation', /confirmYes\(\)\{[\s\S]{0,120}this\._afterConfirm\(\)/.test(HTML));
  ok('confirmation par timeout relance la conversation', /Expiré \(15 s[\s\S]{0,160}this\._afterConfirm\(\)/.test(HTML));
  ok('close() stoppe la conversation', /close\(\)\{[\s\S]{0,120}this\._convo=false;[\s\S]{0,80}this\._convoSilence=0/.test(HTML));
  ok('pause micro après 2 silences', /this\._convoSilence>=2\)\{this\._convoStop\(\)/.test(HTML));
  // Ange pose une question courte à l'appel vocal + réponses parlées courtes
  ok('méthode _voiceGreetQuestion présente', HTML.includes('_voiceGreetQuestion(') && HTML.includes('Que veux-tu faire ?'));
  // Mode « orbe seul » façon Siri : la voix n'ouvre plus le panneau/tableau — juste l'orbe.
  ok('voiceCommand = mode orbe seul (_orbMode, sans panneau)', /voiceCommand\(\)\{[\s\S]{0,700}this\._orbMode=true/.test(HTML));
  ok('voiceCommand coupe la parole proactive en cours', HTML.includes('window.speechSynthesis.cancel()'));
  ok('voiceCommand accuse réception vocal « Je t\'écoute »', HTML.includes("speak('Je t\\'écoute',true,true)"));
  ok('anti double-déclenchement voiceCommand (_orbStarting)', /voiceCommand\(\)\{[\s\S]{0,600}if\(this\._orbStarting\)return/.test(HTML));
  ok('wake ne déclenche qu\'une fois (_wakeFired)', /onresult=e=>\{if\(this\._wakeFired\)return/.test(HTML) && /this\._wakeFired=true;this\._wakeStop\(\)/.test(HTML));
  ok('orbe parle même si voix GPS coupée (ignoreMute)', /function speak\(txt,force=false,ignoreMute=false\)\{if\(\(!S\.voice&&!ignoreMute\)/.test(HTML));
  ok('voiceCommand n\'ouvre pas le panneau (pas de this.open)', !/voiceCommand\(\)\{[\s\S]{0,300}this\.open\(\)/.test(HTML));
  ok('send() ne force pas la fiche en mode orbe', /if\(!this\._orbMode\)this\._showSheet\(\)/.test(HTML));
  ok('orbe ancré sur le bouton Ange (#navAnge)', /getElementById\('navAnge'\)[\s\S]{0,160}o\.style\.left=/.test(HTML));
  ok('orbe pulse à l\'apparition (classe appear)', HTML.includes("angeAppear") && /_wasHidden\?' appear'/.test(HTML));
  ok('mode orbe réinitialisé à l\'ouverture au clic', /open\(\)\{\s*this\._orbMode=false/.test(HTML));
  ok('voiceCommand ouvre le micro avec plafond (jamais bloqué)', HTML.includes('setTimeout(start,150)') && /_w<1400/.test(HTML) && HTML.includes('this.startVoice()'));
  ok('orbe visible immédiatement au réveil vocal', /this\._orbStarting=true;[\s\S]{0,320}this\._setOrb\('listen'\)/.test(HTML));
  ok('copilot ne parle pas pendant une session vocale', require('fs').readFileSync(require('path').join(ROOT,'core/immat-copilot.js'),'utf8').includes('window.AngeDialog._convo) return'));
  // Réponse TOUJOURS à voix haute en mode orbe (LLM/menu/question muets auparavant)
  ok('méthode _speakVoiceResult présente', HTML.includes('_speakVoiceResult()'));
  ok('_voiceTurn dit la réponse à voix haute', /await this\.send\(\);[\s\S]{0,40}this\._speakVoiceResult\(\)/.test(HTML));
  ok('_speakVoiceResult ne double pas si déjà en train de parler', /_speakVoiceResult\(\)\{[\s\S]{0,200}speechSynthesis\.speaking\)return/.test(HTML));
  ok('confirmation vocale : Ange DIT la question puis écoute (anti-écho)', /this\._orbMode\|\|this\._lastVoice\)\{[\s\S]{0,220}speak\(q,true,true\)[\s\S]{0,200}_startPend\(\)/.test(HTML));
  ok('_speakAnswer réponse courte (1re phrase / cap)', /_speakAnswer\(txt\)\{[\s\S]{0,260}\^\[\^\.\?!\]\{0,140\}\[\.\?!\]/.test(HTML));
  // Rail vocal : matcher à vocabulaire fermé sur les choix affichés
  ok('matcher fermé _pickChoice présent', HTML.includes('_pickChoice(text,choices)'));
  ok('_voiceTurn matche les choix avant l\'envoi libre', /this\._choices&&this\._choices\.length\)\{[\s\S]{0,220}this\._pickChoice\(v,this\._choices\)/.test(HTML));
  ok('signalement : problèmes deviennent des choix vocaux', /this\._choices=PROBS\.map\(p=>\(\{words:p\[1\],say:p\[2\],run:\(\)=>this\.angeSignalConfirm/.test(HTML));
  ok('réponses proposées deviennent des choix vocaux', /this\._choices=choices\.map\(c=>\(\{words:[\s\S]{0,120}angeReplyConfirm/.test(HTML));
  ok('« annule/autre » quitte les choix', /annule\|annuler\|retour\|autre[\s\S]{0,60}this\._choices=null/.test(HTML));
  ok('renderResponse efface les choix fermés', /renderResponse\(r\)\{\s*this\._choices=null/.test(HTML));
  ok('close() efface les choix fermés', /close\(\)\{[\s\S]{0,140}this\._choices=null/.test(HTML));
  // Auto-narration : Ange DIT les choix en conversation vocale (usage sans écran)
  ok('méthode _narrateChoices présente', HTML.includes('_narrateChoices(intro)'));
  ok('_narrateChoices gated sur la conversation vocale', /_narrateChoices\(intro\)\{[\s\S]{0,80}if\(!this\._convo\)return/.test(HTML));
  ok('_narrateChoices parle (≤3 + « ou autre »)', /_narrateChoices[\s\S]{0,400}slice\(0,3\)[\s\S]{0,40}ou autre[\s\S]{0,120}speak\(phrase,true\)/.test(HTML));
  ok('signalement : say + narration', /this\._choices=PROBS\.map\(p=>\(\{words:p\[1\],say:p\[2\][\s\S]{0,80}this\._narrateChoices/.test(HTML));
  ok('réponses : say + narration', /say:c\[0\][\s\S]{0,120}this\._narrateChoices\('Réponds/.test(HTML));
  // Confirmation par mot-action (anti faux « oui » radio/passager)
  ok('_armConfirm accepte un mot-action', HTML.includes('_armConfirm(run,word)'));
  ok('_pending mémorise le mot-action', /this\._pending=\{run:run,word:word\|\|null\}/.test(HTML));
  ok('mots-action envoie/appelle/reponds/confirme mappés', /M=\{envoie:[\s\S]{0,200}appelle:[\s\S]{0,120}reponds:[\s\S]{0,120}confirme:/.test(HTML));
  ok('action partagée exige le mot-action (pas oui seul)', /const YES=word\?\(M\[word\]\|\|\/\\b\(oui\|ok\)/.test(HTML));
  ok('annule/stop priment sur oui', /if\(\/\\b\(non\|annule[\s\S]{0,80}confirmNo\(\);[\s\S]{0,40}else if\(YES\.test/.test(HTML));
  ok('signal/message confirmés par « envoie »', /angeSignalConfirm\(plate,label\),'envoie'/.test(HTML) && /angeMessageConfirm\(plate,text\),'envoie'/.test(HTML));
  ok('appel confirmé par « appelle »', /angeCallConfirm\(plate\),'appelle'/.test(HTML));
  ok('gouvernance confirmée par « confirme »', /angeDoAction\(legacy,on,label\),'confirme'/.test(HTML));
  ok('cartes : hint mot-action (plus « oui »/« non »)', !HTML.includes('ou dis « oui » / « non »') && HTML.includes('ou dis « envoie » / « annule »'));
  // Mode Volant auto : détection vitesse + Screen Wake Lock
  ['_driveAutoTick', '_driveAutoSet', '_acquireWakeLock', '_releaseWakeLock', 'isDriving'].forEach(m => ok('méthode présente : ' + m, HTML.includes(m + '(')));
  ok('updateDrivingMode déclenche le Mode Volant auto', /updateDrivingMode\(\)\{try\{this\._driveAutoTick\(\)/.test(HTML));
  ok('Mode Volant : entrée à >= 20 km/h', /if\(!on\)\{if\(sp>=20\)this\._driveAutoSet\(true\)/.test(HTML));
  ok('Mode Volant : sortie temporisée sous 8 km/h', /sp>=8[\s\S]{0,260}_driveAutoSet\(false\)/.test(HTML));
  ok('Screen Wake Lock demandé', HTML.includes("navigator.wakeLock.request('screen')"));
  ok('Wake Lock ré-acquis au retour au premier plan', /visibilitychange[\s\S]{0,320}App\.isDriving[\s\S]{0,40}_acquireWakeLock/.test(HTML));
  // Earcons : sons courts, Web Audio, respectent le réglage Sons
  ok('méthode _earcon présente', HTML.includes('_earcon(type)'));
  ok('_earcon respecte le réglage Sons', /_earcon\(type\)\{try\{\s*if\(!\(window\.S&&window\.S\.sounds!==false\)\)return/.test(HTML));
  ok('_earcon types listen/ok/sent/error/confirm', /listen:\[[\s\S]{0,80}ok:\[[\s\S]{0,40}sent:\[[\s\S]{0,80}error:\[[\s\S]{0,40}confirm:\[/.test(HTML));
  ok('earcon « listen » à l\'ouverture du micro', /this\._convo=true;[\s\S]{0,700}this\._earcon\('listen'\)/.test(HTML));
  ok('earcon « confirm » à l\'armement', /_armConfirm\(run,word\)\{[\s\S]{0,120}this\._earcon\('confirm'\)/.test(HTML));
  ok('earcon « ok » sur choix reconnu', /_earcon\('ok'\)[\s\S]{0,80}c\.run\(\)/.test(HTML));
  ok('earcon sent/error sur signalement', /_earcon\(ok\?'sent':'error'\)/.test(HTML));
  // Projection mère angeTurn() — unification lecture seule
  ok('Nexus expose angeTurn', HTML.includes('ImmatNexus.angeTurn'));
  ok('_voiceGreetQuestion consomme angeTurn', /window\.ImmatNexus\.angeTurn\(\)[\s\S]{0,120}tn\.actions/.test(HTML));
  // Armement vocal en 1 geste + ré-armement en Mode Volant
  ok('bouton d\'armement vocal (_wakeHintHTML)', HTML.includes('_wakeHintHTML()') && HTML.includes('App.toggleAngeWake(true)'));
  ok('_wakeHintHTML masqué si déjà armé', /_wakeHintHTML\(\)\{try\{\s*if\(this\._wakeEnabled&&this\._wakeEnabled\(\)\)return ''/.test(HTML));
  ok('accueil propose l\'armement (open append _wakeHintHTML)', /_wakeHintHTML\(\);if\(_wh\)resp\.innerHTML\+=_wh/.test(HTML));
  ok('Mode Volant ré-arme le wake word', /_driveAutoSet[\s\S]{0,320}AngeDialog\._wakeStart\(\)/.test(HTML));
  // Lanceur vocal : ouvrir les fonctions/catégories à la voix
  ok('méthode _tryOpen présente', HTML.includes('_tryOpen(msg)'));
  ok('table _OPEN présente', HTML.includes('_OPEN:['));
  ok('send() appelle _tryOpen', HTML.includes('this._tryOpen(msg)'));
  ok('_OPEN couvre gps/messages/appels/activite/signaler/reglages/dashboard', /key:'gps'/.test(HTML) && /key:'messages'/.test(HTML) && /key:'appels'/.test(HTML) && /key:'activite'/.test(HTML) && /key:'signaler'/.test(HTML) && /key:'reglages'/.test(HTML) && /key:'dashboard'/.test(HTML));
  ok('_tryOpen exige un verbe d\'ouverture si commande longue', /if\(!hasVerb&&words>3\)return false/.test(HTML));
  ok('_tryOpen respecte le kill-switch (featureStatus + _blockedHTML)', /_tryOpen[\s\S]{0,1200}featureStatus\(hit\.feat\)[\s\S]{0,220}_blockedHTML\(hit\.feat/.test(HTML));
  ok('_tryOpen ouvre via fonctions propriétaires (navMessages/navAppels/panel)', /App\.navMessages/.test(HTML) && /App\.panel&&App\.panel\('drive'\)/.test(HTML));
  // Orbe façon Siri + session vocale qui survit à la navigation
  ok('méthode _setOrb (orbe d\'état)', HTML.includes('_setOrb(state)'));
  ok('orbe : états listen/hear/think/speak', /#angeOrb\.listen[\s\S]{0,200}#angeOrb\.hear[\s\S]{0,200}#angeOrb\.think[\s\S]{0,200}#angeOrb\.speak/.test(HTML));
  ok('helpers _showSheet/_softHide', HTML.includes('_showSheet()') && HTML.includes('_softHide()'));
  ok('startVoice → orbe listen', /this\._convo=true;[\s\S]{0,700}this\._setOrb\('listen'\)/.test(HTML));
  ok('onresult → orbe hear', /interimT\|\|_last\)\{try\{this\._setOrb\('hear'\)/.test(HTML));
  ok('_voiceTurn → orbe think avant envoi', /this\._setOrb\('think'\);[\s\S]{0,40}await this\.send\(\)/.test(HTML));
  ok('_speakAnswer → orbe speak', /this\._setOrb\('speak'\)[\s\S]{0,20}speak\(t,true,true\)/.test(HTML));
  // Session survit à la navigation (plus de dépendance à ange-open)
  ok('_voiceTurn gardé par la session (_convo)', /_voiceTurn\(v\)\{\s*if\(!this\._convo\)return/.test(HTML));
  ok('_convoResume ne dépend plus de ange-open', /_convoResume\(\)\{/.test(HTML) && !/_convoResume\(\)\{[\s\S]{0,400}ange-open/.test(HTML));
  ok('_wakeStart évite la double écoute pendant une session', /if\(this\._convo\)return;\s*\/\/ session vocale active/.test(HTML));
  ok('_tryOpen garde la session (soft-hide + resume)', /if\(this\._convo\)\{try\{this\._softHide\(\)[\s\S]{0,120}this\._convoResume\(\)/.test(HTML));
  ok('send() ré-affiche la fiche', /async send\(\)\{[\s\S]{0,120}this\._showSheet\(\)/.test(HTML));
  // Fix « quand je dis Ange rien ne se passe » : armement dans le geste + relance au 1er contact (iOS)
  ok('_wakeInit : relance discrète à chaque contact (iOS keepalive)', /_wakeKeep=\(\)=>[\s\S]{0,80}_wakeStart\(\)[\s\S]{0,80}addEventListener\('pointerdown',this\._wakeKeep/.test(HTML));
  ok('bouton d\'activation ferme PUIS arme (même geste)', /AngeDialog\.close\(\)\}catch\(_\)\{\};App\.toggleAngeWake\(true\)/.test(HTML));
  ok('close() relance le mot d\'activation dans le geste', /close\(\)\{[\s\S]{0,800}_wakeEnabled\(\)\)this\._wakeStart\(\)/.test(HTML));
  ok('taper le micro arme le mot « Ange »', /if\(!this\._wakeEnabled\(\)\)\{localStorage\.setItem\('ic_ange_wake','1'\)/.test(HTML));
})();

// ─────────────────────────────────────────────────────────────────────────────
// B2. Anti-chevauchement bulle « ✦ » (Narrator) ⇄ monologue parlé (CoPilot)
// ─────────────────────────────────────────────────────────────────────────────
section('B2. Anti-chevauchement Narrator ⇄ CoPilot');
(function () {
  const NAR = fs.readFileSync(path.join(ROOT, 'core/narrator.js'), 'utf8');
  const COP = fs.readFileSync(path.join(ROOT, 'core/immat-copilot.js'), 'utf8');
  // registre partagé
  ok('Narrator utilise le registre partagé window._icSurfaced', NAR.includes('window._icSurfaced'));
  ok('CoPilot utilise le registre partagé window._icSurfaced', COP.includes('window._icSurfaced'));
  // même fenêtre des deux côtés
  ok('Narrator fenêtre 90 s', NAR.includes('SURFACE_WINDOW = 90_000'));
  ok('CoPilot fenêtre 90 s', COP.includes('SURFACE_WINDOW = 90_000'));
  // mapping topics cohérent (swarm / guardian / brain)
  ok('Narrator mappe les sujets (swarm/guardian/brain)', /WHISPER_TOPIC[\s\S]{0,200}swarm[\s\S]{0,200}guardian[\s\S]{0,200}brain/.test(NAR));
  ok('CoPilot mappe les thèmes (swarm/guardian/brain)', /THEME_TOPIC[\s\S]{0,200}swarm_help[\s\S]{0,120}guardian[\s\S]{0,120}brain/.test(COP));
  // garde effective : Narrator saute si sujet déjà surfacé ; CoPilot saute si bulle déjà montrée
  ok('Narrator saute la bulle si déjà surfacé', /_surfacedRecently\(topic\)\)\s*return/.test(NAR));
  ok('CoPilot saute la parole si déjà surfacé', /_surfacedRecently\(_topic\)\)\s*return/.test(COP));
  // Boucle de retour 👍/👎 (device-only) : même clé partagée, mise en sourdine des deux côtés
  ok('Narrator utilise la clé de retour ic_ange_topic_feedback', NAR.includes("'ic_ange_topic_feedback'"));
  ok('CoPilot utilise la clé de retour ic_ange_topic_feedback', COP.includes("'ic_ange_topic_feedback'"));
  // pas de collision avec la clé LLM ic_ange_feedback (tableau {v,t})
  ok('pas de collision : narrator n\'utilise pas ic_ange_feedback (clé LLM)', !/'ic_ange_feedback'/.test(NAR));
  ok('Narrator : _fbRecord + _topicMuted', NAR.includes('_fbRecord(') && NAR.includes('_topicMuted('));
  ok('CoPilot : _fbRecord + _topicMuted', COP.includes('_fbRecord(') && COP.includes('_topicMuted('));
  ok('Narrator : bulle masquée si sujet en sourdine', /topic && _topicMuted\(topic\)\)\s*return/.test(NAR));
  ok('CoPilot : silence si sujet en sourdine', /_topicMuted\(_topic \|\| theme\)\)\s*return/.test(COP));
  ok('Seuil de sourdine cohérent (FB_MUTE_MIN = 3)', NAR.includes('FB_MUTE_MIN = 3') && COP.includes('FB_MUTE_MIN = 3'));
  // « oublie ce que tu as appris » réinitialise aussi le retour
  ok('_tryForget réinitialise ic_ange_topic_feedback', HTML.includes("removeItem('ic_ange_topic_feedback')"));
  // Projection Dashboard (lecture seule) du bilan des retours
  ok('Dashboard : bloc gdAngeFeedbackBlock présent', HTML.includes('gdAngeFeedbackBlock'));
  ok('gdAngeFeedbackBlock lit ic_ange_topic_feedback', /gdAngeFeedbackBlock\(\)\{[\s\S]{0,500}ic_ange_topic_feedback/.test(HTML));
  ok('gdAngeFeedbackBlock rendu dans le Dashboard', HTML.includes('App.gdAngeFeedbackBlock?App.gdAngeFeedbackBlock()'));
  ok('resetAngeFeedback efface ic_ange_topic_feedback (device)', /resetAngeFeedback\(\)\{[\s\S]{0,160}removeItem\('ic_ange_topic_feedback'\)/.test(HTML));
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
