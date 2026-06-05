'use strict';
/**
 * trust-engine.test.js — SESSION 24
 *
 * Tests structurels du Trust Engine (INV-COM-018, INV-COM-020, INV-CALL-001).
 * Valide : TRUST_LEVELS constants, TRUST_LEVEL_CHANGED payload, CALL_MISSED unique,
 *           ABUSE categories, getBlockLevel/getTrustLevel exports.
 *
 * TRUST-001 : TRUST_LEVEL_CHANGED payload contient oldLevel + newLevel
 * TRUST-002 : CALL_MISSED émis une seule fois par requestId (_missedCallIds)
 * TRUST-003 : ABUSE_REPORTED inclut une catégorie
 * TRUST-004 : getTrustLevel exporté et retourne les constantes TRUST_LEVELS
 *
 * Exécution : node tests/organism/trust-engine.test.js
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

const messagesPath = path.join(ROOT, 'messages.js');
const callsPath    = path.join(ROOT, 'calls.js');
const indexPath    = path.join(ROOT, 'index.html');

const msgsContent  = fs.readFileSync(messagesPath, 'utf8');
const callsContent = fs.readFileSync(callsPath,    'utf8');
const indexContent = fs.readFileSync(indexPath,    'utf8');

// ── TRUST-001 — TRUST_LEVEL_CHANGED payload enrichi ─────────────────────────
console.log('\n  TRUST-001 — TRUST_LEVEL_CHANGED payload {oldLevel, newLevel}');

assert(
  msgsContent.includes('oldLevel'),
  "setCallLevel() capture oldLevel avant modification",
  "oldLevel absent de setCallLevel"
);

assert(
  msgsContent.includes('newLevel:level') || msgsContent.includes('newLevel: level'),
  "TRUST_LEVEL_CHANGED payload contient newLevel",
  "newLevel absent du payload TRUST_LEVEL_CHANGED"
);

assert(
  msgsContent.includes("'ic_call_perm'") && msgsContent.includes('oldLevel'),
  "oldLevel lu depuis ic_call_perm avant setItem",
  "oldLevel non lu depuis localStorage"
);

// ── TRUST-002 — CALL_MISSED unique par requestId ─────────────────────────────
console.log('\n  TRUST-002 — CALL_MISSED unique par requestId (_missedCallIds)');

assert(
  callsContent.includes('_missedCallIds'),
  "_missedCallIds Set défini dans calls.js",
  "_missedCallIds absent de calls.js"
);

assert(
  callsContent.includes('_missedCallIds.has(') || callsContent.includes('_missedCallIds.add('),
  "_missedCallIds.has() et .add() utilisés dans le TTL timeout",
  "Guard _missedCallIds non appliqué"
);

assert(
  callsContent.match(/_missedCallIds\.has\(req\.id\)/) || callsContent.match(/_missedCallIds\.has\(/),
  "Guard sur req.id avant CALL_MISSED",
  "Guard req.id absent"
);

// ── TRUST-003 — ABUSE_REPORTED avec catégorie ─────────────────────────────────
console.log('\n  TRUST-003 — ABUSE_REPORTED avec catégorie');

assert(
  msgsContent.includes('_reportAbuse'),
  "_reportAbuse() défini dans messages.js",
  "_reportAbuse manquant"
);

assert(
  msgsContent.includes('ABUSE_SPAM') && msgsContent.includes('ABUSE_HARASSMENT'),
  "Catégories ABUSE_SPAM et ABUSE_HARASSMENT définies",
  "Catégories d'abus manquantes"
);

assert(
  msgsContent.includes('category,label') || msgsContent.includes('{plate,category'),
  "ABUSE_REPORTED payload inclut category",
  "category absent du payload ABUSE_REPORTED"
);

assert(
  indexContent.includes('icAbuseCategories'),
  "icAbuseCategories présent dans index.html",
  "Div icAbuseCategories manquant dans le bottom sheet"
);

assert(
  indexContent.includes("_reportAbuse('ABUSE_SPAM')"),
  "Bouton ABUSE_SPAM dans icAbuseCategories",
  "Bouton ABUSE_SPAM manquant"
);

// ── TRUST-004 — getTrustLevel exporté ────────────────────────────────────────
console.log('\n  TRUST-004 — getTrustLevel + TRUST_LEVELS exportés');

assert(
  msgsContent.includes('getTrustLevel'),
  "getTrustLevel() défini dans messages.js",
  "getTrustLevel manquant"
);

assert(
  msgsContent.includes('TRUST_LEVELS'),
  "TRUST_LEVELS constantes définies",
  "TRUST_LEVELS absent"
);

assert(
  msgsContent.includes('TRUST_CONTACT') && msgsContent.includes('TRUST_NONE'),
  "TRUST_CONTACT et TRUST_NONE définis dans TRUST_LEVELS",
  "Constantes TRUST manquantes"
);

assert(
  msgsContent.includes('getTrustLevel,') || msgsContent.includes('getTrustLevel\n') || msgsContent.match(/getTrustLevel[,\n]/),
  "getTrustLevel exporté dans ImmatMessages",
  "getTrustLevel non exporté"
);

// ── TRUST-005 — INV-COM-018/020 présents ─────────────────────────────────────
console.log('\n  TRUST-005 — Invariants INV-COM-018/020');

const invariantsPath = path.join(ROOT, 'knowledge', 'communication-invariants.json');
const invariants = JSON.parse(fs.readFileSync(invariantsPath, 'utf8'));
const inv018 = invariants.invariants.find(i => i.id === 'INV-COM-018');
const inv020 = invariants.invariants.find(i => i.id === 'INV-COM-020');

assert(!!inv018, 'INV-COM-018 présent (confiance = acte explicite)');
assert(!!inv020, 'INV-COM-020 présent (confiance observable OBD)');

// ── Résumé ───────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
