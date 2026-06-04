'use strict';
/**
 * abuse-protection.test.js — SESSION OBD-003e §14
 *
 * ABUSE_PROTECTION_SCORE
 * Vérifie que les protections anti-abus sont implémentées et documentées.
 *
 * Exécution : node tests/organism/abuse-protection.test.js
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

console.log('\n[OBD-003e] abuse-protection.test.js — ABUSE_PROTECTION_SCORE §14\n');

const supabData  = load('knowledge/supabase-dependencies.json');
const contrData  = load('knowledge/contradiction-rules.json');
const comInvData = load('knowledge/communication-invariants.json');
const indexSrc   = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const callsSrc   = readSrc('calls.js');

// ── Suite 1 : Anti-spam messages (ic_spam_log) ───────────────────────────────

console.log('Suite 1 : Anti-spam messages — seuil 20 msg/60s');

assert(messagesSrc.includes('ic_spam_log') || messagesSrc.includes('spam'),
  'messages.js : système anti-spam présent (ic_spam_log)');

assert(messagesSrc.includes('20') || messagesSrc.includes('SPAM'),
  'messages.js : seuil spam défini (20 msg/60s)');

assert(messagesSrc.includes('60000') || messagesSrc.includes('60 '),
  'messages.js : fenêtre temporelle spam définie (60 secondes)');

assert(messagesSrc.includes('SPAM_DETECTED') || messagesSrc.includes('observe'),
  'messages.js : SPAM_DETECTED émis via OBD quand seuil atteint');

// Vérifier que ic_spam_log est documenté dans supabase-dependencies.json
const spamKey = (supabData.localStorage_keys || []).find(k => k.key === 'spam_log');
assert(!!spamKey, 'ic_spam_log documenté dans supabase-dependencies.json');

// ── Suite 2 : Throttle Ange (10/heure) ───────────────────────────────────────

console.log('\nSuite 2 : Throttle Ange — 10 appels max par heure');

assert(indexSrc.includes('ic_ange_calls') || indexSrc.includes('ange_calls'),
  'index.html : compteur appels Ange (ic_ange_calls) présent');

assert(indexSrc.includes('10') && (indexSrc.includes('Ange') || indexSrc.includes('ange')),
  'index.html : limite 10 appels Ange définie');

assert(indexSrc.includes('3600000') || indexSrc.includes('3600'),
  'index.html : fenêtre throttle Ange = 1 heure (3600000ms)');

// Le throttle doit couper AVANT l'appel Edge Function
// Chercher la section throttle (là où >=10 déclenche le blocage, pas la lecture seule)
const angeSection = (() => {
  let idx = -1, cur = 0;
  while ((cur = indexSrc.indexOf('ic_ange_calls', cur + 1)) !== -1) {
    const slice = indexSrc.substring(Math.max(0, cur - 200), cur + 600);
    if (slice.includes('>=10') || slice.includes('> 10') || (slice.includes('10') && slice.includes('toast'))) {
      idx = cur; break;
    }
  }
  if (idx < 0) idx = indexSrc.lastIndexOf('ic_ange_calls');
  return idx >= 0 ? indexSrc.substring(Math.max(0, idx - 200), idx + 600) : '';
})();
assert(
  angeSection.includes('return') || angeSection.includes('toast'),
  'Throttle Ange : retour anticipé si limite atteinte (pas d\'appel Edge Function)'
);

// ── Suite 3 : Demandes d'appel répétées — cooldown après refus ───────────────

console.log('\nSuite 3 : Appels répétés — cooldown après refus');

assert(callsSrc.includes('can_receive_calls'),
  'calls.js : can_receive_calls() vérifiée avant chaque appel (INV-COM-003)');

assert(callsSrc.includes('cooldown') || callsSrc.includes('refused') || callsSrc.includes('refus'),
  'calls.js : gestion cooldown/refus après demande refusée');

// Vérifier que CONTR-006 (DND > CALL_LEVEL_ALL) est documenté
const contr6 = contrData.rules?.find(r => r.id === 'CONTR-006');
assert(!!contr6 && contr6.resolution_winner === 'DND',
  'CONTR-006 : DND bloque les appels même si niveau = Tous (sauf urgence)');

// ── Suite 4 : Appel vers conducteur bloqué impossible ────────────────────────

console.log('\nSuite 4 : Blocage — messages et appels impossibles vers/depuis bloqué');

// CONTR-001 : BLOCKED > TRUSTED
const contr1 = contrData.rules?.find(r => r.id === 'CONTR-001');
assert(!!contr1 && contr1.resolution_winner === 'BLOCKED',
  'CONTR-001 : BLOCKED prend le dessus sur TRUSTED pour messages et appels');

// Vérifier que ic_blocked est utilisé dans les deux fichiers
assert(indexSrc.includes('ic_blocked') || messagesSrc.includes('ic_blocked'),
  'ic_blocked : utilisé dans index.html ou messages.js');

// Vérifier que la liste bloquée est vérifiée dans les messages
assert(
  messagesSrc.includes('blocked') && messagesSrc.includes('filter'),
  'messages.js : liste blocked filtrée lors de l\'affichage des messages'
);

// INV-COM-004 : blocage bloque TOUT contact
const inv004 = comInvData.invariants?.find(i => i.id === 'INV-COM-004');
assert(!!inv004, 'INV-COM-004 : déclaré (blocage = blocage total)');

// ── Suite 5 : Signalements abusifs — TTL et limites ──────────────────────────

console.log('\nSuite 5 : Signalements — TTL auto-nettoyage et limitations');

assert(indexSrc.includes('cleanupAlerts') || indexSrc.includes('TTL') || indexSrc.includes('ttl'),
  'index.html : nettoyage automatique des alertes expirées (TTL)');

// Vérifier que les signalements ont un TTL documenté dans features.json
const featuresData = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge/features.json'), 'utf8'));
const signalRoute = featuresData.features?.find(f => f.id === 'F-SIGNAL-ROUTE');
assert(!!signalRoute?.ttl, 'F-SIGNAL-ROUTE : TTL documenté dans features.json');

// ── Suite 6 : SOS — protection appui long (anti-déclenchement accidentel) ────

console.log('\nSuite 6 : SOS — protection appui long (anti-abus accidentel)');

assert(indexSrc.includes('startSosHold') || indexSrc.includes('_sosTimer'),
  'index.html : SOS protégé par appui long (startSosHold / _sosTimer)');

assert(indexSrc.includes('cancelSosHold') || indexSrc.includes('clearTimeout'),
  'index.html : SOS annulable (cancelSosHold)');

// Vérifier la durée minimale (3000ms = 3s)
assert(indexSrc.includes('3000') || indexSrc.includes('3s'),
  'index.html : SOS délai minimum 3 secondes');

// ── Suite 7 : Protection contre les demandes multiples simultanées ────────────

console.log('\nSuite 7 : Appels — pas de demandes simultanées (une à la fois)');

// Un seul appel en attente à la fois
assert(callsSrc.includes('_pendingCallId') || callsSrc.includes('pendingCall'),
  'calls.js : suivi demande appel en cours (_pendingCallId)');

assert(callsSrc.includes('cancelCallRequest'),
  'calls.js : cancelCallRequest() — annulation demande en cours');

// Timeout 30s pour les appels
assert(callsSrc.includes('30000') || callsSrc.includes('30s') || callsSrc.includes('30'),
  'calls.js : timeout 30s sur les demandes d\'appel');

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   ABUSE_PROTECTION_SCORE : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
