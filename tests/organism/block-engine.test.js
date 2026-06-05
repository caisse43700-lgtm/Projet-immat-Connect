'use strict';
/**
 * block-engine.test.js — SESSION 24
 *
 * Tests structurels du Block Engine (INV-COM-004, INV-COM-019, INV-COM-021).
 * Valide : getBlockLevel, normalizeRows guard, _isCallBlocked, blockPlate/unblockPlate.
 *
 * BLOCK-001 : A bloque B → messages de B filtrés
 * BLOCK-002 : A bloque B → appels de B rejetés
 * BLOCK-003 : BLOCK_CALLS → messages de B toujours visibles
 * BLOCK-004 : unblockPlate → level supprimé → communications rétablies
 *
 * Exécution : node tests/organism/block-engine.test.js
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

// ── Lecture sources ──────────────────────────────────────────────
const messagesPath = path.join(ROOT, 'messages.js');
const callsPath    = path.join(ROOT, 'calls.js');
const indexPath    = path.join(ROOT, 'index.html');

const msgsContent  = fs.readFileSync(messagesPath, 'utf8');
const callsContent = fs.readFileSync(callsPath,    'utf8');
const indexContent = fs.readFileSync(indexPath,    'utf8');

// ── Suite 1 : BLOCK-001 — Messages filtrés par BLOCK_MESSAGES ───────────────
console.log('\n  BLOCK-001 — Messages filtrés (BLOCK_MESSAGES / BLOCK_ALL)');

assert(
  msgsContent.includes('getBlockLevel'),
  'getBlockLevel() défini dans messages.js',
  'Fonction getBlockLevel manquante'
);

assert(
  msgsContent.includes("'ic_block_levels'"),
  "messages.js lit ic_block_levels",
  "Clé ic_block_levels absente de messages.js"
);

assert(
  msgsContent.includes('BLOCK_LEVELS.MESSAGES') || msgsContent.includes("'BLOCK_MESSAGES'"),
  'normalizeRows utilise BLOCK_MESSAGES',
  'Guard BLOCK_MESSAGES absent dans normalizeRows'
);

assert(
  msgsContent.includes('BLOCK_LEVELS.ALL') || msgsContent.includes("'BLOCK_ALL'"),
  'normalizeRows utilise BLOCK_ALL',
  'Guard BLOCK_ALL absent dans normalizeRows'
);

// ── Suite 2 : BLOCK-002 — Appels rejetés ────────────────────────────────────
console.log('\n  BLOCK-002 — Appels rejetés (_isCallBlocked)');

assert(
  callsContent.includes('_isCallBlocked'),
  '_isCallBlocked() défini dans calls.js',
  'Fonction _isCallBlocked manquante'
);

assert(
  callsContent.includes("'ic_block_levels'"),
  "calls.js lit ic_block_levels",
  "Clé ic_block_levels absente de calls.js"
);

assert(
  callsContent.includes("BLOCK_CALLS") || callsContent.includes("'BLOCK_CALLS'"),
  "_isCallBlocked vérifie BLOCK_CALLS",
  "Guard BLOCK_CALLS absent dans _isCallBlocked"
);

assert(
  callsContent.includes('_isCallBlocked(receiverPlate)'),
  'requestCall() appelle _isCallBlocked avant RPC',
  '_isCallBlocked non appelé dans requestCall'
);

// ── Suite 3 : BLOCK-003 — BLOCK_CALLS ne filtre pas les messages ─────────────
console.log('\n  BLOCK-003 — BLOCK_CALLS ne filtre pas les messages');

// La normalizeRows ne doit pas bloquer BLOCK_CALLS pour les messages
const normSection = msgsContent.match(/\.filter\(m\s*=>\s*\{[\s\S]{0,400}getBlockLevel[\s\S]{0,200}\}\)/);
if(normSection){
  assert(
    !normSection[0].includes('BLOCK_CALLS'),
    "normalizeRows n'utilise pas BLOCK_CALLS (messages toujours visibles avec BLOCK_CALLS)",
    "normalizeRows filtre BLOCK_CALLS à tort"
  );
} else {
  assert(false, "normalizeRows filter avec getBlockLevel trouvé", "Pattern non trouvé");
}

// ── Suite 4 : BLOCK-004 — unblockPlate nettoie ic_block_levels ──────────────
console.log('\n  BLOCK-004 — unblockPlate supprime le level');

assert(
  indexContent.includes('unblockPlate') && indexContent.includes('ic_block_levels'),
  'unblockPlate() nettoie ic_block_levels dans index.html',
  'Nettoyage ic_block_levels absent de unblockPlate'
);

assert(
  indexContent.includes('delete lvls[') || indexContent.includes('delete levels['),
  'unblockPlate() fait delete sur le level',
  'delete du level absent de unblockPlate'
);

// ── Suite 5 : BLOCK_APPLIED OBD ─────────────────────────────────────────────
console.log('\n  BLOCK_APPLIED — OBD traçabilité');

assert(
  indexContent.includes("'BLOCK_APPLIED'"),
  "BLOCK_APPLIED OBD émis dans blockPlate()",
  "BLOCK_APPLIED absent de index.html"
);

assert(
  indexContent.match(/BLOCK_APPLIED.*level/s) || indexContent.includes("level,_src"),
  "BLOCK_APPLIED payload inclut le level",
  "level absent du payload BLOCK_APPLIED"
);

// ── Suite 6 : INV-COM-019 ────────────────────────────────────────────────────
console.log('\n  INV-COM-019 — Blocage avec périmètre défini');

const invariantsPath = path.join(ROOT, 'knowledge', 'communication-invariants.json');
const invariants = JSON.parse(fs.readFileSync(invariantsPath, 'utf8'));
const inv019 = invariants.invariants.find(i => i.id === 'INV-COM-019');
const inv021 = invariants.invariants.find(i => i.id === 'INV-COM-021');
const invCall001 = invariants.invariants.find(i => i.id === 'INV-CALL-001');

assert(!!inv019, 'INV-COM-019 présent dans communication-invariants.json');
assert(!!inv021, 'INV-COM-021 présent dans communication-invariants.json');
assert(!!invCall001, 'INV-CALL-001 présent dans communication-invariants.json');

assert(
  indexContent.includes("'BLOCK_ALL'") || indexContent.includes('BLOCK_ALL'),
  "blockPlate() accepte BLOCK_ALL comme level",
  "BLOCK_ALL absent de blockPlate"
);

// ── Résumé ───────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
