'use strict';
/**
 * ange-action.test.js — SESSION 26
 *
 * ANGE-001 : checkPermissions() bloque BLOCK_ALL
 * ANGE-002 : checkPermissions() bloque BLOCK_MESSAGES pour les messages
 * ANGE-003 : checkPermissions() bloque BLOCK_CALLS pour les appels
 * ANGE-004 : checkPermissions() passe pour une plaque non bloquée
 * ANGE-005 : prepareInteraction() requiert checkPermissions() — plate bloquée refusée
 * ANGE-006 : execute() re-vérifie les permissions avant d'agir
 * ANGE-007 : CallManager expose isCallBlocked()
 * ANGE-008 : TRUST_CONTEXTUAL_SET émis par setContextTrust()
 * ANGE-009 : AngeAction disponible sur window
 * ANGE-010 : Knowledge Graph contient INT-ANGE-ACTION
 *
 * Exécution : node tests/organism/ange-action.test.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';

let passed = 0, failed = 0;

function assert(condition, label, detail) {
  if (condition) { passed++; console.log(`    ${PASS} ${label}`); }
  else {
    failed++;
    console.error(`    ${FAIL} ${label}`);
    if (detail) console.error(`       → ${detail}`);
  }
}

const indexContent = fs.readFileSync(path.join(ROOT, 'index.html'),  'utf8');
const callsContent = fs.readFileSync(path.join(ROOT, 'calls.js'),    'utf8');
const msgsContent  = fs.readFileSync(path.join(ROOT, 'messages.js'), 'utf8');
const kgraph       = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'immat-knowledge-graph.json'), 'utf8'));

// ── ANGE-001 : checkPermissions — BLOCK_ALL ──────────────────────────────────
console.log('\n  ANGE-001 — checkPermissions() BLOCK_ALL bloque message + appel');

assert(
  indexContent.includes("blockLevel !== 'BLOCK_MESSAGES' && blockLevel !== 'BLOCK_ALL'"),
  "canMessage exclut BLOCK_MESSAGES et BLOCK_ALL",
  "Condition canMessage absente de AngeAction.checkPermissions"
);

assert(
  indexContent.includes("blockLevel !== 'BLOCK_ALL'") && indexContent.includes('canCall'),
  "canCall exclut BLOCK_ALL",
  "Condition canCall absente de AngeAction.checkPermissions"
);

// ── ANGE-002 : checkPermissions utilise getBlockLevel ────────────────────────
console.log('\n  ANGE-002 — checkPermissions() lit getBlockLevel via window.ImmatMessages');

assert(
  indexContent.includes("window.ImmatMessages?.getBlockLevel?."),
  "checkPermissions appelle window.ImmatMessages?.getBlockLevel?.",
  "getBlockLevel absent de checkPermissions"
);

assert(
  indexContent.includes("window.ImmatMessages?.getTrustLevel?."),
  "checkPermissions appelle window.ImmatMessages?.getTrustLevel?.",
  "getTrustLevel absent de checkPermissions"
);

// ── ANGE-003 : checkPermissions utilise CallManager.isCallBlocked ────────────
console.log('\n  ANGE-003 — checkPermissions() lit window.CallManager?.isCallBlocked?.');

assert(
  indexContent.includes("window.CallManager?.isCallBlocked?."),
  "checkPermissions appelle window.CallManager?.isCallBlocked?.",
  "isCallBlocked absent de checkPermissions"
);

// ── ANGE-004 : guard appliqué dans prepareInteraction ────────────────────────
console.log('\n  ANGE-004 — prepareInteraction() applique le guard selon le type');

assert(
  indexContent.includes("needsMsg && !perms.canMessage"),
  "Guard MESSAGE/THANKS/VEHICLE_ALERT → canMessage dans prepareInteraction",
  "Guard canMessage absent de prepareInteraction"
);

assert(
  indexContent.includes("needsCall && !perms.canCall"),
  "Guard CALL → canCall dans prepareInteraction",
  "Guard canCall absent de prepareInteraction"
);

// ── ANGE-005 : double vérification dans execute() ────────────────────────────
console.log('\n  ANGE-005 — execute() re-vérifie les permissions (INV-ANGE-004)');

assert(
  indexContent.includes('execute(interaction)') && indexContent.includes('this.checkPermissions(target)'),
  "execute() appelle this.checkPermissions(target) avant d'agir",
  "Re-vérification absente de execute()"
);

assert(
  indexContent.includes("Re-vérification — INV-ANGE-004"),
  "Commentaire INV-ANGE-004 dans execute()",
  "Référence INV-ANGE-004 absente de execute()"
);

// ── ANGE-006 : OBD events émis ───────────────────────────────────────────────
console.log('\n  ANGE-006 — OBD ANGE_ACTION_PREPARED + ANGE_ACTION_EXECUTED');

assert(
  indexContent.includes("'ANGE_ACTION_PREPARED'"),
  "ANGE_ACTION_PREPARED émis dans prepareInteraction",
  "ANGE_ACTION_PREPARED absent"
);

assert(
  indexContent.includes("'ANGE_ACTION_EXECUTED'"),
  "ANGE_ACTION_EXECUTED émis dans execute",
  "ANGE_ACTION_EXECUTED absent"
);

// ── ANGE-007 : CallManager expose isCallBlocked ──────────────────────────────
console.log('\n  ANGE-007 — CallManager expose isCallBlocked dans son API publique');

assert(
  callsContent.includes('isCallBlocked: _isCallBlocked'),
  "calls.js : isCallBlocked exposé dans l'API publique",
  "isCallBlocked absent des exports CallManager"
);

// ── ANGE-008 : TRUST_CONTEXTUAL_SET émis ────────────────────────────────────
console.log('\n  ANGE-008 — TRUST_CONTEXTUAL_SET émis dans setContextTrust()');

assert(
  msgsContent.includes("'TRUST_CONTEXTUAL_SET'"),
  "messages.js : setContextTrust() émet TRUST_CONTEXTUAL_SET",
  "TRUST_CONTEXTUAL_SET absent de messages.js"
);

// ── ANGE-009 : AngeAction sur window ─────────────────────────────────────────
console.log('\n  ANGE-009 — AngeAction exposé sur window');

assert(
  indexContent.includes('window.AngeAction = AngeAction'),
  "window.AngeAction = AngeAction présent",
  "AngeAction non exposé sur window"
);

// ── ANGE-010 : Knowledge Graph contient INT-ANGE-ACTION ──────────────────────
console.log('\n  ANGE-010 — Knowledge Graph : INT-ANGE-ACTION + OBD events');

const intAnge = (kgraph.intentions || []).find(i => i.id === 'INT-ANGE-ACTION');
assert(!!intAnge, 'INT-ANGE-ACTION présent dans immat-knowledge-graph.json');
assert(
  intAnge?.obd_events?.includes('ANGE_ACTION_PREPARED') && intAnge?.obd_events?.includes('ANGE_ACTION_EXECUTED'),
  "INT-ANGE-ACTION référence ANGE_ACTION_PREPARED + ANGE_ACTION_EXECUTED"
);
assert(
  intAnge?.invariants?.includes('INV-ANGE-004'),
  "INT-ANGE-ACTION référence INV-ANGE-004",
  "INV-ANGE-004 absent des invariants de INT-ANGE-ACTION"
);

const kgObd = kgraph.obd_events || [];
assert(kgObd.some(e => e.event === 'ANGE_ACTION_PREPARED'), 'ANGE_ACTION_PREPARED dans obd_events du Knowledge Graph');
assert(kgObd.some(e => e.event === 'ANGE_ACTION_EXECUTED'), 'ANGE_ACTION_EXECUTED dans obd_events du Knowledge Graph');
assert(
  !kgObd.find(e => e.event === 'TRUST_CONTEXTUAL_SET')?.status?.includes('PENDING'),
  "TRUST_CONTEXTUAL_SET n'est plus en statut PENDING"
);

const gap009 = (kgraph.gaps || []).find(g => g.id === 'GAP-009');
assert(gap009?.status?.includes('RÉSOLU'), 'GAP-009 marqué RÉSOLU SESSION-26');

// ── Résumé ───────────────────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
