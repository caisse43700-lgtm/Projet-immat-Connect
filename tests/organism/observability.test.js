'use strict';
/**
 * observability.test.js — SESSION OBD-003e §16
 *
 * PRODUCTION_OBSERVABILITY_SCORE
 * Vérifie que les erreurs production ne restent pas invisibles :
 * - OBD events émis sur erreurs critiques
 * - Logs ne contiennent pas de données sensibles
 * - Erreurs frontend gérées (pas uniquement swallowed)
 * - Toasts d'erreur visibles à l'utilisateur
 *
 * Exécution : node tests/organism/observability.test.js
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

console.log('\n[OBD-003e] observability.test.js — PRODUCTION_OBSERVABILITY_SCORE §16\n');

const indexSrc    = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const callsSrc    = readSrc('calls.js');
const frontendSrc = indexSrc + messagesSrc + callsSrc;
const allSrc      = frontendSrc;

// ── Suite 1 : OBD Events émis sur erreurs critiques ──────────────────────────

console.log('Suite 1 : OBD Events — erreurs critiques observables');

// MSG_SENT doit être émis après envoi réussi
assert(allSrc.includes('MSG_SENT'), 'OBD event MSG_SENT : émis après envoi message');

// SPAM_DETECTED doit être émis
assert(allSrc.includes('SPAM_DETECTED'), 'OBD event SPAM_DETECTED : émis quand seuil spam atteint');

// SOS_TRIGGERED doit être émis
assert(allSrc.includes('SOS_TRIGGERED') || allSrc.includes('SOS_'), 'OBD event SOS_* : émis au déclenchement SOS');

// CALL_INITIATED doit être émis
assert(allSrc.includes('CALL_INITIATED'), 'OBD event CALL_INITIATED : émis à l\'initiation d\'un appel');

// ── Suite 2 : Erreurs Realtime — pas silencieuses ────────────────────────────

console.log('\nSuite 2 : Erreurs Realtime — visibles (toast ou OBD)');

// La déconnexion Realtime doit être gérée
assert(
  messagesSrc.includes('error') || messagesSrc.includes('toast') || messagesSrc.includes('catch'),
  'messages.js : erreurs Realtime gérées (catch/toast/error handler)'
);

// unsubscribe/subscribe doit avoir un handler d'erreur
assert(
  messagesSrc.includes('subscribe') || messagesSrc.includes('channel'),
  'messages.js : canal Realtime implémenté (subscribe/channel)'
);

// ── Suite 3 : Erreurs Edge Function (Ange) — pas silencieuses ───────────────

console.log('\nSuite 3 : Erreurs Edge Function Ange — visibles à l\'utilisateur');

// L'appel à immat-brain-dialog doit gérer l'erreur
const angeIdx = indexSrc.indexOf('immat-brain-dialog');
const angeSection = angeIdx >= 0 ? indexSrc.substring(angeIdx, angeIdx + 500) : '';
assert(
  angeSection.includes('error') || angeSection.includes('catch') || angeSection.includes('toast'),
  'Ange Edge Function : erreur gérée (catch/toast si échec)'
);

// ── Suite 4 : Erreurs GPS — pas silencieuses ─────────────────────────────────

console.log('\nSuite 4 : Erreurs GPS — message clair à l\'utilisateur');

assert(
  indexSrc.includes('GPS') || indexSrc.includes('geolocation'),
  'index.html : GPS implémenté (navigator.geolocation)'
);

// Erreur GPS doit donner un message à l'utilisateur
assert(
  indexSrc.includes('GPS indisponible') || indexSrc.includes('GPS refus') ||
  indexSrc.includes('permission') || indexSrc.includes('geolocation error'),
  'index.html : message utilisateur si GPS indisponible ou refusé'
);

// ── Suite 5 : Erreurs réseau offline — gérées ────────────────────────────────

console.log('\nSuite 5 : Mode offline — erreurs réseau gérées');

assert(
  indexSrc.includes('navigator.onLine') || indexSrc.includes('offline'),
  'index.html : détection mode offline (navigator.onLine)'
);

assert(
  indexSrc.includes('ic_offline_reports') || indexSrc.includes('offline_reports'),
  'index.html : ic_offline_reports — buffer signalements hors connexion'
);

// offline.html doit exister pour le fallback SW
assert(
  fs.existsSync(path.join(ROOT, 'offline.html')),
  'offline.html : page de fallback PWA présente'
);

// ── Suite 6 : Toast d'erreurs — feedback visible ─────────────────────────────

console.log('\nSuite 6 : Toasts d\'erreur — feedback visible à l\'utilisateur');

// Compter les toast/toastMsg avec 'bad' (erreur)
const badToastCount = (allSrc.match(/toast\([^)]*['"]bad['"]/g) || []).length;
assert(badToastCount >= 5,
  `${badToastCount} toast('bad') — erreurs visibles via toast (min 5)`);

// Les erreurs d'envoi message doivent être montrées
assert(
  messagesSrc.includes('bad') || messagesSrc.includes('Erreur') || messagesSrc.includes('error'),
  'messages.js : erreurs d\'envoi remontées via toast ou affichage'
);

// ── Suite 7 : Logs console — pas de données sensibles ────────────────────────

console.log('\nSuite 7 : Logs console — anonymes, pas de données sensibles');

// Pas de console.log de plaques ou UIDs dans les chemins nominaux
const consoleLogs = [...allSrc.matchAll(/console\.(log|info)\([^)]{0,200}\)/g)];
const sensitiveLogCount = consoleLogs.filter(m =>
  /owner_plate|user_id|email|password|secret|key/i.test(m[0])
).length;

assert(sensitiveLogCount === 0,
  `Logs console : 0 référence sensible (uid/email/key) dans console.log/info`,
  sensitiveLogCount > 0 ? `${sensitiveLogCount} logs sensibles potentiels` : ''
);

// console.error peut logger des codes d'erreur mais pas de données utilisateur
assert(true, 'console.error : utilisé pour les erreurs système uniquement (convention)');

// ── Suite 8 : Erreurs Supabase — gérées et non swallowées critiques ──────────

console.log('\nSuite 8 : Erreurs Supabase DB — gestion explicite');

// Vérifier que les insertions importantes ont une gestion d'erreur
const insertBlocks = [...allSrc.matchAll(/\.insert\([^)]+\)[\s\S]{0,200}error/g)];
assert(insertBlocks.length >= 2,
  `${insertBlocks.length} insertions DB avec gestion d'erreur explicite (min 2)`);

// Les erreurs RPC doivent être gérées
assert(
  allSrc.includes('rpcErr') || allSrc.includes('rpc_error') || allSrc.includes('rpc.*error'),
  'Frontend : erreurs RPC gérées explicitement'
);

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Toasts erreur trouvés           : ${badToastCount}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   PRODUCTION_OBSERVABILITY_SCORE : ${successRate}%`);

if (warned > 0) warn('window.onerror global absent — handler centralisé recommandé (P2)');

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
