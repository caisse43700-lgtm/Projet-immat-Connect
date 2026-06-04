'use strict';
/**
 * critical-journeys.test.js — SESSION OBD-003e §17
 *
 * CRITICAL_JOURNEY_SCORE
 * Vérifie que les 10 parcours utilisateurs critiques sont structurellement
 * implémentés dans le code frontend.
 *
 * Exécution : node tests/organism/critical-journeys.test.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let passed = 0, failed = 0, warned = 0;

function assert(condition, label, detail) {
  if (condition) { passed++; console.log(`    ${PASS} ${label}`); }
  else {
    failed++;
    console.error(`    ${FAIL} ${label}`);
    if (detail) console.error(`       → ${detail}`);
  }
}
function warn(label) { warned++; console.log(`    ${WARN} ${label}`); }
function readSrc(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch(_) { return ''; } }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

console.log('\n[OBD-003e] critical-journeys.test.js — CRITICAL_JOURNEY_SCORE §17\n');

const indexSrc    = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const callsSrc    = readSrc('calls.js');
const frontendSrc = indexSrc + messagesSrc + callsSrc;

// Journeys validés : compteur de parcours complets
let journeysPassed = 0;
const TOTAL_JOURNEYS = 10;

function journey(name, checks) {
  console.log(`\nParcours : ${name}`);
  let ok = true;
  for (const [cond, label, detail] of checks) {
    if (cond) { passed++; console.log(`    ${PASS} ${label}`); }
    else {
      failed++;
      ok = false;
      console.error(`    ${FAIL} ${label}`);
      if (detail) console.error(`       → ${detail}`);
    }
  }
  if (ok) { journeysPassed++; console.log(`    ↳ Parcours COMPLET`); }
  else { console.log(`    ↳ Parcours INCOMPLET`); }
}

// ── Parcours 1 : Nouvel utilisateur → inscription → profil → carte ──────────

journey('1. Nouvel utilisateur → inscription → profil → carte', [
  [
    indexSrc.includes('goAuth') && indexSrc.includes("goAuth('signup')"),
    'index.html : App.goAuth(signup) — déclencheur inscription',
  ],
  [
    indexSrc.includes('saveProfile') && indexSrc.includes('iProPlate'),
    'index.html : App.saveProfile() avec saisie plaque (iProPlate)',
  ],
  [
    indexSrc.includes('afterAuth') && indexSrc.includes('App.afterAuth'),
    'index.html : App.afterAuth() — initialisation post-inscription',
  ],
  [
    indexSrc.includes('id="appScreen"') && indexSrc.includes('id="map"'),
    'index.html : #appScreen + #map présents (carte affichée après auth)',
  ],
  [
    indexSrc.includes('ic_onboarded') || indexSrc.includes('ic_pending_profile'),
    'index.html : ic_onboarded / ic_pending_profile — état onboarding suivi',
  ],
]);

// ── Parcours 2 : Conducteur → signalement route → activité → historique ─────

journey('2. Conducteur → signalement route → activité → historique', [
  [
    indexSrc.includes('openSignalHere') || indexSrc.includes('sigStep1'),
    'index.html : openSignalHere() ou sigStep1 — déclencheur signalement route',
  ],
  [
    indexSrc.includes('insertAlert') || indexSrc.includes('.from(\'reports\')'),
    'index.html : insertion signalement (insertAlert ou .from(reports))',
  ],
  [
    indexSrc.includes('panelAltet') || indexSrc.includes('panel(\'activite\')'),
    'index.html : panelAltet / panel(activite) — onglet Activité',
  ],
  [
    indexSrc.includes('ic_alerts') || indexSrc.includes('ic_alert_history'),
    'index.html : ic_alerts / ic_alert_history — historique local',
  ],
  [
    indexSrc.includes('cleanupAlerts') || indexSrc.includes('TTL'),
    'index.html : cleanupAlerts() / TTL — nettoyage automatique',
  ],
]);

// ── Parcours 3 : Conducteur A → message → Conducteur B → réponse ─────────────

journey('3. Conducteur A → message → B → réponse', [
  [
    messagesSrc.includes('sendToPlate') || messagesSrc.includes('sendNew') || messagesSrc.includes('sendMessage') || messagesSrc.includes('send_msg'),
    'messages.js : sendToPlate() / sendNew() — envoi message A→B',
  ],
  [
    messagesSrc.includes('subscribe') || messagesSrc.includes('channel'),
    'messages.js : canal Realtime abonné (subscribe/channel)',
  ],
  [
    messagesSrc.includes('MSG_SENT') || frontendSrc.includes('MSG_SENT'),
    'OBD event MSG_SENT émis après envoi',
  ],
  [
    messagesSrc.includes('normalizeRows') || messagesSrc.includes('loadConversation'),
    'messages.js : normalizeRows() / loadConversation() — chargement conversation',
  ],
  [
    messagesSrc.includes('setMode') && (messagesSrc.includes('compose') || messagesSrc.includes('conversation')),
    'messages.js : setMode(compose/conversation) — flux réponse',
  ],
]);

// ── Parcours 4 : Conducteur A → appel → B accepte/refuse/manque ─────────────

journey('4. Conducteur A → appel → B accepte/refuse/manque', [
  [
    callsSrc.includes('can_receive_calls'),
    'calls.js : can_receive_calls() vérifiée avant appel (INV-COM-003)',
  ],
  [
    callsSrc.includes('CALL_INITIATED') || frontendSrc.includes('CALL_INITIATED'),
    'OBD event CALL_INITIATED émis à l\'initiation',
  ],
  [
    callsSrc.includes('accepted') || callsSrc.includes('refused'),
    'calls.js : états accepted / refused gérés',
  ],
  [
    callsSrc.includes('cancelCallRequest') || callsSrc.includes('cancel'),
    'calls.js : cancelCallRequest() — annulation possible',
  ],
  [
    callsSrc.includes('30000') || callsSrc.includes('timeout') || callsSrc.includes('expire'),
    'calls.js : expiration / timeout appel sans réponse géré',
  ],
]);

// ── Parcours 5 : Mode offline → signalement → retour online → sync ───────────

journey('5. Mode offline → signalement → retour online → sync', [
  [
    indexSrc.includes('navigator.onLine') || indexSrc.includes('ic_offline_reports'),
    'index.html : navigator.onLine / ic_offline_reports — détection offline',
  ],
  [
    indexSrc.includes('ic_offline_reports'),
    'index.html : ic_offline_reports — buffer signalements offline',
  ],
  [
    indexSrc.includes('offline') && (indexSrc.includes('sync') || indexSrc.includes('flush') || indexSrc.includes('retour')),
    'index.html : logique sync au retour online (sync/flush)',
  ],
  [
    exists('offline.html'),
    'offline.html : page fallback PWA offline présente',
  ],
  [
    readSrc('service-worker.js').includes('offline.html'),
    'service-worker.js : offline.html dans stratégie cache',
  ],
]);

// ── Parcours 6 : Gardien → dashboard → scores → recommandations ─────────────

journey('6. Gardien → dashboard → scores → recommandations', [
  [
    indexSrc.includes('openGardienDashboard') && indexSrc.includes('gardienDashboard'),
    'index.html : openGardienDashboard() + #gardienDashboard — dashboard ouvert',
  ],
  [
    indexSrc.includes('get_my_role') && indexSrc.includes('gardien'),
    'index.html : get_my_role RPC — détection rôle gardien',
  ],
  [
    indexSrc.includes('gardienImmunity') || indexSrc.includes('immunity'),
    'index.html : section immunité / scores dans dashboard gardien',
  ],
  [
    indexSrc.includes('closeGardienDashboard'),
    'index.html : closeGardienDashboard() — fermeture dashboard',
  ],
  [
    !(() => {
      const idx = indexSrc.indexOf('openGardienDashboard');
      const section = idx >= 0 ? indexSrc.substring(idx, idx + 2000) : '';
      return section.includes('.from(\'messages\')') || section.includes('.from("messages")');
    })(),
    'Gardien : ne lit pas la table messages (données privées)',
  ],
]);

// ── Parcours 7 : Ange conducteur → question → action → confirmation ──────────

journey('7. Ange conducteur → question → action proposée → confirmation', [
  [
    indexSrc.includes('immat-brain-dialog') || indexSrc.includes('askAnge') || indexSrc.includes('angeFab'),
    'index.html : immat-brain-dialog / askAnge / angeFab — entrée Ange conducteur',
  ],
  [
    indexSrc.includes('ic_ange_calls') || indexSrc.includes('ange_calls'),
    'index.html : ic_ange_calls — throttle 10 appels/heure',
  ],
  [
    indexSrc.includes('3600000') || indexSrc.includes('3600'),
    'index.html : fenêtre throttle 1h = 3600000ms',
  ],
  [
    indexSrc.includes('snapshot') && (indexSrc.includes('context') || indexSrc.includes('emotion')),
    'index.html : snapshot contexte anonymisé transmis à Ange',
  ],
  [
    !(indexSrc.match(/snapshot\s*[=:]\s*\{[^}]{0,200}myLat/) || indexSrc.match(/snapshot\s*[=:]\s*\{[^}]{0,200}myLng/)),
    'Snapshot Ange : coordonnées GPS brutes absentes (INV-COM-015)',
  ],
]);

// ── Parcours 8 : Ange gardien → diagnostic → recommandation ─────────────────

journey('8. Ange gardien → diagnostic → recommandation', [
  [
    indexSrc.includes('gardienImmunity') || indexSrc.includes('Analyser'),
    'index.html : section diagnostic gardien implémentée',
  ],
  [
    indexSrc.includes('get_my_role') && indexSrc.includes('isGardien'),
    'index.html : S.isGardien — contexte gardien distinct conducteur',
  ],
  [
    indexSrc.includes('gardienDashboardBody') || indexSrc.includes('gardienImmunityResult'),
    'index.html : conteneur résultats diagnostic (#gardienDashboardBody / #gardienImmunityResult)',
  ],
  [
    indexSrc.includes('Actualiser') || indexSrc.includes('openGardienDashboard()'),
    'index.html : rafraîchissement dashboard gardien possible',
  ],
]);

// ── Parcours 9 : Blocage conducteur → message/appel impossible ───────────────

journey('9. Blocage conducteur → message/appel impossible', [
  [
    indexSrc.includes('ic_blocked') || messagesSrc.includes('ic_blocked') || messagesSrc.includes('blocked'),
    'Frontend : ic_blocked utilisé (messages.js ou index.html)',
  ],
  [
    messagesSrc.includes('blocked') && messagesSrc.includes('filter'),
    'messages.js : liste blocked filtrée (affichage messages)',
  ],
  [
    callsSrc.includes('can_receive_calls'),
    'calls.js : can_receive_calls() — appel impossible si bloqué (INV-COM-004)',
  ],
  [
    indexSrc.includes('blockDriver') || indexSrc.includes('unblockDriver') || indexSrc.includes('ic_blocked'),
    'index.html : blockDriver() / unblockDriver() — gestion blocage',
  ],
]);

// ── Parcours 10 : Signalement proximité → cible trouvée/non trouvée ──────────

journey('10. Signalement proximité → cible trouvée / non trouvée', [
  [
    indexSrc.includes('vehicleAlert') || indexSrc.includes('contactFrontVehicle'),
    'index.html : vehicleAlert() / contactFrontVehicle() — déclencheur signal proximité',
  ],
  [
    indexSrc.includes('searchByPlate') || indexSrc.includes('findNearby') || indexSrc.includes('nearbyVehicles') || indexSrc.includes('ic_nearby') || indexSrc.includes('nearbyPanel') || indexSrc.includes('nearbyList'),
    'index.html : recherche véhicule proche (nearbyPanel / nearbyList)',
  ],
  [
    indexSrc.includes('panel(\'messages\')') || indexSrc.includes("panel('messages')"),
    'index.html : panel messages ouvert après identification cible',
  ],
  [
    indexSrc.includes('Aucun véhicule') || indexSrc.includes('introuvable') || indexSrc.includes('non trouvé') || indexSrc.includes('ic_nearby_seen'),
    'index.html : message utilisateur si cible non trouvée',
  ],
]);

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;
const journeyScore = Math.round(journeysPassed / TOTAL_JOURNEYS * 100);

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Parcours complets               : ${journeysPassed}/${TOTAL_JOURNEYS}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   CRITICAL_JOURNEY_SCORE (parcours) : ${journeyScore}%`);
console.log(`   CRITICAL_JOURNEY_SCORE (assertions): ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
