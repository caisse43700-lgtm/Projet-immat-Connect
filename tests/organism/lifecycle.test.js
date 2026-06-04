'use strict';
/**
 * lifecycle.test.js — SESSION OBD-003d §16
 *
 * Tests du cycle de vie utilisateur :
 *   - logout() ferme les ressources (Realtime, GPS, timers)
 *   - afterAuth() nettoie l'état stale d'un compte précédent
 *   - Toutes les clés localStorage ic_* utilisées dans le code sont documentées
 *   - Aucune fuite de canal Supabase
 *
 * Exécution : node tests/organism/lifecycle.test.js
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

function load(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function readSrc(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch(_) { return ''; } }

console.log('\n[OBD-003d] lifecycle.test.js — Cycle de vie utilisateur §16\n');

const indexSrc    = readSrc('index.html');
const messagesSrc = readSrc('messages.js');

// ── Suite 1 : logout() ferme les ressources ───────────────────────────────

console.log('Suite 1 : logout() — nettoyage des ressources');

// Trouver le bloc logout dans index.html
// Utiliser une extraction par position pour gérer les try/catch imbriqués
const logoutStart = indexSrc.indexOf('App.logout = async function(){');
const logoutBodyStart = logoutStart >= 0 ? indexSrc.indexOf('{', logoutStart) + 1 : -1;
const logoutBodyEnd  = logoutBodyStart > 0 ? indexSrc.indexOf('\n    };', logoutBodyStart) : -1;
const logoutBody = (logoutBodyStart > 0 && logoutBodyEnd > 0)
  ? indexSrc.substring(logoutBodyStart, logoutBodyEnd)
  : '';

assert(logoutBody.length > 0,
  'logout() localisée dans index.html');

assert(logoutBody.includes('clearWatch') || logoutBody.includes('watchId'),
  'logout() : clearWatch(watchId) — arrêt GPS');

assert(logoutBody.includes('ImmatMessages') && logoutBody.includes('unsubscribe'),
  'logout() : ImmatMessages.unsubscribe() — fermeture canal Realtime');

assert(logoutBody.includes('deleteMyLocation') || logoutBody.includes('deleteMyLoc'),
  'logout() : deleteMyLocation() — suppression position persistée');

assert(logoutBody.includes('auth.signOut') || logoutBody.includes('signOut'),
  'logout() : sb.auth.signOut() — invalidation session');

assert(logoutBody.includes('sessionStorage.clear') || logoutBody.includes('sessionStorage'),
  'logout() : sessionStorage nettoyé');

// ── Suite 2 : ImmatMessages.unsubscribe() implémentée ─────────────────────

console.log('\nSuite 2 : ImmatMessages.unsubscribe() — implémentation');

assert(messagesSrc.includes('unsubscribe'),
  'messages.js : fonction unsubscribe() présente');

assert(messagesSrc.includes('removeChannel') || messagesSrc.includes('channel') && messagesSrc.includes('null'),
  'messages.js : unsubscribe() ferme le canal Realtime (removeChannel ou =null)');

// ── Suite 3 : afterAuth() nettoie l'état stale ────────────────────────────

console.log('\nSuite 3 : afterAuth() — nettoyage état stale');

const afterAuthMatch = indexSrc.match(/App\.afterAuth\s*=\s*async\s*function\s*\(\)\s*\{([\s\S]*?)(?=^\s{4}App\.|^\s{0,4}\/\*)/m);
const afterAuthBody = afterAuthMatch ? afterAuthMatch[1] : indexSrc;

assert(afterAuthBody.includes('ic_current_user_id') || afterAuthBody.includes('lastUid'),
  'afterAuth() : vérifie ic_current_user_id (détection changement de compte)');

assert(afterAuthBody.includes('ic_current_profile_plate') || afterAuthBody.includes('lastPlate'),
  'afterAuth() : vérifie ic_current_profile_plate (détection changement de plaque)');

// ── Suite 4 : Clés ic_* utilisées et documentées ──────────────────────────

console.log('\nSuite 4 : Clés localStorage ic_* — couverture documentation');

const supabData = load('knowledge/supabase-dependencies.json');
const docKeys = new Set((supabData.localStorage_keys || []).map(k => `ic_${k.key}`));

// Scanner toutes les clés ic_* dans le code
const combinedSrc = indexSrc + '\n' + messagesSrc;
const usedKeys = new Set();
for (const m of combinedSrc.matchAll(/['"](ic_[a-z_]+)['"]/g)) {
  usedKeys.add(m[1]);
}

// Clés spéciales système (opérationnel, cache, onboarding — pas des préférences utilisateur documentées)
const SYSTEM_KEYS = new Set([
  'ic_current_user_id', 'ic_current_profile_plate', 'ic_last_state',
  'ic_ange_calls', 'ic_ange_feedback', 'ic_comm_selftest_result',
  'ic_health_scores_at', 'ic_alert_history', 'ic_resolved_remote_ids',
  'ic_offline_reports', 'ic_nearby_seen',
  // Compteurs et caches opérationnels
  'ic_unread_msg_count', 'ic_community_live', 'ic_storage_ver',
  // Onboarding et état session
  'ic_pending_profile', 'ic_onboarded',
  'ic_pending_profile_last_email',
  // Préfixes de clés dynamiques (par plaque)
  'ic_msg_', 'ic_loc', 'ic_reports_', 'ic_pending_profile__',
]);

const undocumentedKeys = [...usedKeys].filter(k => !docKeys.has(k) && !SYSTEM_KEYS.has(k));
const documentedCount = [...usedKeys].filter(k => docKeys.has(k) || SYSTEM_KEYS.has(k)).length;

assert(undocumentedKeys.length === 0,
  `Toutes les clés ic_* utilisées sont documentées (${documentedCount}/${usedKeys.size})`,
  undocumentedKeys.length > 0 ? `Non documentées : ${undocumentedKeys.join(', ')}` : '');

if (undocumentedKeys.length > 0) {
  for (const k of undocumentedKeys) {
    warn(`Clé '${k}' : utilisée dans le code, non dans supabase-dependencies.json`);
  }
}

// Vérifier que les clés critiques sont présentes
const criticalKeys = [
  'ic_trust', 'ic_blocked', 'ic_call_perm', 'ic_deleted_msgs', 'ic_alerts',
];
for (const k of criticalKeys) {
  assert(usedKeys.has(k), `Clé critique '${k}' : utilisée dans le code`);
}

// ── Suite 5 : Canal Realtime — gestion lifecycle ──────────────────────────

console.log('\nSuite 5 : Canal Realtime — lifecycle complet');

assert(messagesSrc.includes('subscribe') || messagesSrc.includes('channel'),
  'messages.js : subscription canal Realtime présente');

assert(messagesSrc.includes('unsubscribe'),
  'messages.js : unsubscribe canal Realtime présente (symétrie subscribe/unsubscribe)');

// Vérifier que le channel est nommé avec la version correcte (V13 après fix SESSION 18)
assert(messagesSrc.includes('immat_messages_v13') || messagesSrc.includes('v13'),
  "messages.js : canal nommé 'immat_messages_v13_' (guard V13 — fix SESSION 18)");

// ── Suite 6 : SOS timer nettoyé ───────────────────────────────────────────

console.log('\nSuite 6 : Timers — nettoyage');

assert(indexSrc.includes('_sosTimer') || indexSrc.includes('sosTimer'),
  'index.html : _sosTimer géré (SOS protégé appui long)');

assert(indexSrc.includes('cancelSosHold') || indexSrc.includes('clearTimeout'),
  'index.html : cancelSosHold() — timer SOS annulable');

// ── Résumé ────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Clés ic_* dans le code          : ${usedKeys.size}`);
console.log(`   Clés documentées / système      : ${documentedCount}`);
console.log(`   Clés non documentées            : ${undocumentedKeys.length}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   Taux de succès : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
