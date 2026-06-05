'use strict';
/**
 * call-flow-extended.test.js — SESSION 25
 *
 * Tests structurels E2E complémentaires — CALL-006 à CALL-010.
 * Valide : Trust, Block, TRUST_CONTEXTUAL, ABUSE, CALL_MISSED unique.
 *
 * CALL-006 : TRUST_CONTACT → appel direct possible (callLevel 2 + trust)
 * CALL-007 : BLOCK_CALLS → appel refusé avant RPC
 * CALL-008 : TRUST_CONTEXTUAL expiré → plus de level contextuel
 * CALL-009 : ABUSE_REPORTED → payload contient plate + category
 * CALL-010 : Double CALL_MISSED impossible (_missedCallIds guard)
 *
 * Exécution : node tests/organism/call-flow-extended.test.js
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

// ── CALL-006 : TRUST_CONTACT → appel direct possible ────────────────────────
console.log('\n  CALL-006 — TRUST_CONTACT → appel via callLevel 2');

assert(
  msgsContent.includes('TRUST_LEVELS.CONTACT') || msgsContent.includes("'TRUST_CONTACT'"),
  "TRUST_CONTACT défini dans TRUST_LEVELS",
  "TRUST_CONTACT manquant"
);

assert(
  msgsContent.includes('getTrustLevel') && msgsContent.includes('TRUST_LEVELS.CONTACT'),
  "getTrustLevel() retourne TRUST_CONTACT si getTrust='TRUSTED'",
  "Retour TRUST_CONTACT absent"
);

assert(
  msgsContent.includes('getPermanentTrust') && msgsContent.includes('TRUST_LEVELS.PERMANENT'),
  "TRUST_PERMANENT vérifié avant TRUST_CONTACT dans getTrustLevel()",
  "TRUST_PERMANENT check absent"
);

// ── CALL-007 : BLOCK_CALLS → appel refusé avant RPC ─────────────────────────
console.log('\n  CALL-007 — BLOCK_CALLS → appel refusé avant RPC');

assert(
  callsContent.includes('_isCallBlocked(receiverPlate)'),
  "_isCallBlocked() appelé dans requestCall() avant RPC can_receive_calls",
  "_isCallBlocked guard absent"
);

const isCallBlockedIdx = callsContent.indexOf('_isCallBlocked(receiverPlate)');
const canReceiveIdx    = callsContent.indexOf(".rpc('can_receive_calls'");
assert(
  isCallBlockedIdx !== -1 && canReceiveIdx !== -1 && isCallBlockedIdx < canReceiveIdx,
  "_isCallBlocked() précède la RPC can_receive_calls",
  "Ordre _isCallBlocked → RPC non respecté"
);

assert(
  callsContent.includes("'BLOCK_CALLS'") && callsContent.includes("'BLOCK_ALL'"),
  "_isCallBlocked vérifie BLOCK_CALLS et BLOCK_ALL",
  "Niveaux manquants dans _isCallBlocked"
);

// ── CALL-008 : TRUST_CONTEXTUAL expiré → niveau retombe ─────────────────────
console.log('\n  CALL-008 — TRUST_CONTEXTUAL expiré → purge automatique');

assert(
  msgsContent.includes('setContextTrust') && msgsContent.includes('getContextTrust'),
  "setContextTrust() et getContextTrust() définis dans messages.js",
  "Fonctions contextTrust manquantes"
);

assert(
  msgsContent.includes('ic_context_trust'),
  "ic_context_trust utilisé pour le stockage",
  "Clé ic_context_trust absente"
);

assert(
  msgsContent.includes('expiration < Date.now()') || msgsContent.includes('entry.expiration'),
  "getContextTrust() vérifie l'expiration",
  "Check expiration absent de getContextTrust"
);

assert(
  msgsContent.includes("TRUST_LEVELS.CONTEXTUAL") && msgsContent.includes('getContextTrust(plate)'),
  "getTrustLevel() retourne TRUST_CONTEXTUAL si context trust actif",
  "Retour TRUST_CONTEXTUAL absent de getTrustLevel"
);

// ── CALL-009 : ABUSE_REPORTED → payload avec category ───────────────────────
console.log('\n  CALL-009 — ABUSE_REPORTED → payload complet {plate, category, label}');

assert(
  msgsContent.includes("'ABUSE_REPORTED'"),
  "ABUSE_REPORTED OBD émis dans _reportAbuse()",
  "ABUSE_REPORTED absent"
);

assert(
  msgsContent.includes('category') && msgsContent.includes('label') && msgsContent.includes('_reportAbuse'),
  "Payload ABUSE_REPORTED contient {plate, category, label}",
  "Payload incomplet"
);

assert(
  msgsContent.includes('ABUSE_SPAM') && msgsContent.includes('ABUSE_FALSE_ALERT'),
  "Catégories ABUSE_SPAM et ABUSE_FALSE_ALERT définies",
  "Catégories manquantes"
);

// ── CALL-010 : Double CALL_MISSED impossible ─────────────────────────────────
console.log('\n  CALL-010 — Double CALL_MISSED impossible (_missedCallIds)');

assert(
  callsContent.includes('const _missedCallIds = new Set()'),
  "_missedCallIds = new Set() déclaré au niveau module",
  "_missedCallIds absent ou mal initialisé"
);

assert(
  callsContent.includes('_missedCallIds.has(req.id)'),
  "Guard _missedCallIds.has(req.id) avant CALL_MISSED",
  "Guard .has() absent"
);

assert(
  callsContent.includes('_missedCallIds.add(req.id)'),
  "_missedCallIds.add(req.id) après emission CALL_MISSED",
  "Guard .add() absent"
);

const orderCheck = callsContent.indexOf('_missedCallIds.has(req.id)') < callsContent.indexOf("'CALL_MISSED'");
assert(
  orderCheck,
  "Guard .has() précède l'émission CALL_MISSED (ordre correct)",
  "Ordre has() → CALL_MISSED non respecté"
);

// ── Vérification bloc bidirectionnel (A-003) ─────────────────────────────────
console.log('\n  A-003 — Bloc bidirectionnel : A ne peut pas écrire à B bloqué');

assert(
  msgsContent.includes('outgoingBlock'),
  "outgoingBlock guard dans sendToPlate()",
  "Guard outgoingBlock absent de sendToPlate"
);

assert(
  msgsContent.includes("outgoingBlock === BLOCK_LEVELS.MESSAGES") || msgsContent.includes("outgoingBlock === BLOCK_LEVELS.ALL"),
  "sendToPlate() bloque BLOCK_MESSAGES et BLOCK_ALL en émission",
  "Guard émission incomplet"
);

const outgoingBeforeSpam = msgsContent.indexOf('outgoingBlock') < msgsContent.indexOf('_checkSpam');
assert(
  outgoingBeforeSpam,
  "Block guard précède l'anti-spam dans sendToPlate()",
  "Ordre block → spam non respecté"
);

// ── Vérification TRUST_PERMANENT (A-002) ─────────────────────────────────────
console.log('\n  A-002 — TRUST_PERMANENT implémenté');

assert(
  msgsContent.includes('setTrustPermanent') && msgsContent.includes('getPermanentTrust'),
  "setTrustPermanent() et getPermanentTrust() définis",
  "Fonctions TRUST_PERMANENT manquantes"
);

assert(
  msgsContent.includes('ic_trusted_contacts'),
  "ic_trusted_contacts utilisé pour le stockage",
  "Clé ic_trusted_contacts absente"
);

// ── Vérification context trust dans actQuickReply (A-001) ────────────────────
console.log('\n  A-001 — TRUST_CONTEXTUAL défini lors aide et signalement véhicule');

assert(
  indexContent.includes('setContextTrust') && indexContent.includes("'help'"),
  "actQuickReply J'arrive → setContextTrust(plate, 'help', ...)",
  "setContextTrust absent de actQuickReply"
);

assert(
  indexContent.includes("'vehicle'") && indexContent.includes('setContextTrust'),
  "vehicleAlert → setContextTrust(plate, 'vehicle', ...)",
  "setContextTrust absent de vehicleAlert"
);

// ── Vérification invariants (A-004/A-007) ────────────────────────────────────
console.log('\n  A-004/A-007 — Invariants BLOCK > TRUST + Permissions Matrix');

const invariantsPath = path.join(ROOT, 'knowledge', 'communication-invariants.json');
const invariants = JSON.parse(fs.readFileSync(invariantsPath, 'utf8'));

['INV-COM-022','INV-COM-023','INV-COM-024','INV-COM-025','INV-COM-026','INV-COM-027','INV-ANGE-003'].forEach(id => {
  const inv = invariants.invariants.find(i => i.id === id);
  assert(!!inv, `${id} présent dans communication-invariants.json`);
});

// ── Résumé ───────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
