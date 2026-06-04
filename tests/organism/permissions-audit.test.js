'use strict';
/**
 * permissions-audit.test.js — SESSION 25 (Audit Final)
 *
 * Tests d'audit V-001 à V-007 : verrouillage du système avant Ange et WebRTC.
 *
 * V-001 : Source unique des autorisations (INV-COM-028)
 * V-002 : TRUST_CONTEXTUAL cycle complet (INV-COM-022)
 * V-003 : TRUST_PERMANENT révocation (INV-COM-023)
 * V-004 : BLOCK_ALL global — invisible dans tous les canaux
 * V-005 : INV-ANGE-004 spécifié
 * V-006 : INV-OBD-001 — OBD events liés à flow + invariant
 * V-007 : Knowledge Graph 100% — nouveaux éléments S24/S25 présents
 *
 * Exécution : node tests/organism/permissions-audit.test.js
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

const msgsContent  = fs.readFileSync(path.join(ROOT, 'messages.js'),  'utf8');
const callsContent = fs.readFileSync(path.join(ROOT, 'calls.js'),     'utf8');
const indexContent = fs.readFileSync(path.join(ROOT, 'index.html'),   'utf8');
const invariants   = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'communication-invariants.json'), 'utf8'));
const kgraph       = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'immat-knowledge-graph.json'),    'utf8'));

// ── V-001 : Source unique des autorisations ──────────────────────────────────
console.log('\n  V-001 — Source unique des autorisations (INV-COM-028)');

assert(
  msgsContent.includes('getBlockLevel(plate)') || msgsContent.includes('getBlockLevel('),
  "messages.js utilise getBlockLevel() comme unique source block",
  "getBlockLevel absent de messages.js"
);

assert(
  callsContent.includes('_isCallBlocked(receiverPlate)'),
  "calls.js utilise _isCallBlocked() avant RPC",
  "_isCallBlocked absent de calls.js"
);

assert(
  !msgsContent.match(/ic_blocked.*filter.*blocked.*m\._otherPlate/),
  "normalizeRows n'utilise plus l'accès direct ic_blocked pour filtrer",
  "Accès direct ic_blocked dans normalizeRows (logique parallèle)"
);

assert(
  msgsContent.includes('outgoingBlock') && msgsContent.includes('getBlockLevel(plate)'),
  "sendToPlate() utilise getBlockLevel() pour guard outgoing",
  "sendToPlate n'utilise pas getBlockLevel"
);

const inv028 = invariants.invariants.find(i => i.id === 'INV-COM-028');
assert(!!inv028, 'INV-COM-028 présent dans communication-invariants.json');

// ── V-002 : TRUST_CONTEXTUAL cycle complet ───────────────────────────────────
console.log('\n  V-002 — TRUST_CONTEXTUAL cycle complet (INV-COM-022)');

assert(
  msgsContent.includes('setContextTrust') && msgsContent.includes('getContextTrust') && msgsContent.includes('clearContextTrust'),
  "setContextTrust/getContextTrust/clearContextTrust définis dans messages.js"
);

assert(
  msgsContent.includes('TRUST_CONTEXTUAL_EXPIRED'),
  "getContextTrust() émet TRUST_CONTEXTUAL_EXPIRED à l'expiration",
  "OBD TRUST_CONTEXTUAL_EXPIRED absent"
);

assert(
  msgsContent.includes('entry.context_source') && msgsContent.includes('entry.expiration'),
  "Payload TRUST_CONTEXTUAL_EXPIRED inclut context_source",
  "Payload incomplet"
);

assert(
  indexContent.includes("setContextTrust") && indexContent.includes("'help'") && indexContent.includes("'vehicle'"),
  "actQuickReply et vehicleAlert déclenchent setContextTrust avec source",
  "setContextTrust non déclenché dans index.html"
);

// ── V-003 : TRUST_PERMANENT révocation ──────────────────────────────────────
console.log('\n  V-003 — TRUST_PERMANENT révocation (INV-COM-023)');

assert(
  msgsContent.includes('revokePermanentTrust'),
  "revokePermanentTrust() défini dans messages.js"
);

assert(
  msgsContent.includes("'CONTACT_REVOKED'") && msgsContent.includes("level:'PERMANENT'"),
  "revokePermanentTrust() émet CONTACT_REVOKED {level:'PERMANENT'}",
  "OBD payload niveau PERMANENT absent"
);

assert(
  msgsContent.includes("contacts.filter(c => nPlate(c.plate) !== p)"),
  "revokePermanentTrust() retire la plaque de ic_trusted_contacts",
  "Suppression de ic_trusted_contacts absente"
);

// ── V-004 : BLOCK_ALL global ─────────────────────────────────────────────────
console.log('\n  V-004 — BLOCK_ALL global dans tous les canaux');

assert(
  msgsContent.includes("bl !== BLOCK_LEVELS.ALL"),
  "normalizeRows filtre BLOCK_ALL pour les messages entrants",
  "Guard BLOCK_ALL absent dans normalizeRows"
);

assert(
  callsContent.includes("lv === 'BLOCK_ALL'") || callsContent.includes("'BLOCK_ALL'"),
  "_isCallBlocked vérifie BLOCK_ALL",
  "BLOCK_ALL absent de _isCallBlocked"
);

assert(
  msgsContent.includes("outgoingBlock === BLOCK_LEVELS.ALL"),
  "sendToPlate bloque les messages sortants si BLOCK_ALL",
  "Guard outgoing BLOCK_ALL absent"
);

// ── V-005 : INV-ANGE-004 spécifié ───────────────────────────────────────────
console.log('\n  V-005 — INV-ANGE-004 spécifié');

const invAnge004 = invariants.invariants.find(i => i.id === 'INV-ANGE-004');
assert(!!invAnge004, 'INV-ANGE-004 présent dans communication-invariants.json');
assert(
  invAnge004?.rule?.includes('checkPermissions') || false,
  "INV-ANGE-004 mentionne checkPermissions()",
  "checkPermissions absent de la règle INV-ANGE-004"
);

assert(
  fs.existsSync(path.join(ROOT, 'architecture', 'ANGE-ACTION-SPEC.md')),
  "architecture/ANGE-ACTION-SPEC.md existe",
  "Spec SESSION 26 manquante"
);

const angeSpec = fs.readFileSync(path.join(ROOT, 'architecture', 'ANGE-ACTION-SPEC.md'), 'utf8');
assert(
  angeSpec.includes('checkPermissions') && angeSpec.includes('prepareInteraction'),
  "ANGE-ACTION-SPEC.md contient checkPermissions() et prepareInteraction()",
  "Méthodes manquantes dans la spec"
);

// ── V-006 : INV-OBD-001 ─────────────────────────────────────────────────────
console.log('\n  V-006 — INV-OBD-001 — OBD events liés à flow + invariant');

const invObd001 = invariants.invariants.find(i => i.id === 'INV-OBD-001');
assert(!!invObd001, 'INV-OBD-001 présent dans communication-invariants.json');

const kgObd = kgraph.obd_events || [];
const eventsWithInvariant = kgObd.filter(e => e.invariant && e.invariant !== null && !e.invariant.includes('MANQUANT'));
const eventsTotal = kgObd.length;
assert(
  eventsWithInvariant.length / eventsTotal >= 0.8,
  `≥80% des OBD events ont un invariant (${eventsWithInvariant.length}/${eventsTotal})`,
  `Trop d'events sans invariant: ${eventsTotal - eventsWithInvariant.length}`
);

// ── V-007 : Knowledge Graph 100% ─────────────────────────────────────────────
console.log('\n  V-007 — Knowledge Graph 100% — S24/S25 présents');

const kgInvIds = (kgraph.invariants || []).map(i => i.id);
const required = ['INV-COM-022','INV-COM-023','INV-COM-024','INV-COM-025','INV-COM-026','INV-COM-027','INV-COM-028','INV-ANGE-003','INV-ANGE-004','INV-OBD-001'];
required.forEach(id => {
  assert(kgInvIds.includes(id), `Knowledge Graph contient ${id}`, `${id} manquant dans immat-knowledge-graph.json`);
});

const ftb = kgraph.features_trust_block || [];
assert(ftb.some(f => f.id === 'F-TRUST-CONTEXTUAL'), 'F-TRUST-CONTEXTUAL dans features_trust_block');
assert(ftb.some(f => f.id === 'F-TRUST-PERMANENT'),   'F-TRUST-PERMANENT dans features_trust_block');
assert(ftb.some(f => f.id === 'F-BLOCK-ALL'),          'F-BLOCK-ALL dans features_trust_block');

const gaps = kgraph.gaps || [];
assert(gaps.some(g => g.id === 'GAP-009'), 'GAP-009 AngeAction SESSION 26 présent');
assert(gaps.some(g => g.id === 'GAP-010'), 'GAP-010 Interaction Engine SESSION 27 présent');

assert(
  fs.existsSync(path.join(ROOT, 'architecture', 'INTERACTION-ENGINE-SPEC.md')),
  "architecture/INTERACTION-ENGINE-SPEC.md existe",
  "Spec SESSION 27 manquante"
);

// ── Résumé ───────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
