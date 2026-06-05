'use strict';
/**
 * interaction-engine-audit.test.js — SESSION 27 Audit A-001→A-005
 *
 * A-001 : 12 statuts normalisés (déjà 27C — vérification supplémentaire)
 * A-002 : WebRTC Phase B réservé dans TYPE_META (INV-CALL-002)
 * A-003 : ABUSE dans TYPE_META avec INV-COM-029
 * A-004 : CONTACT_REQUEST/ACCEPTED/REJECTED avec INV-COM-030
 * A-005 : INV-GUARD-001 — Guardian Loop référence Interactions
 *         + INV-CALL-002, INV-COM-029, INV-COM-030 dans invariants.json
 *         + Knowledge Graph indexés
 *
 * Exécution : node tests/organism/interaction-engine-audit.test.js
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

const ieContent  = fs.readFileSync(path.join(ROOT, 'core', 'interaction-engine.js'), 'utf8');
const invariants = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'communication-invariants.json'), 'utf8'));
const kgraph     = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'immat-knowledge-graph.json'), 'utf8'));

const invIds  = invariants.invariants.map(i => i.id);
const kgInvIds = (kgraph.invariants || []).map(i => i.id);

// ── A-001 : 12 statuts normalisés + INV-INT-003 ───────────────────────────────
console.log('\n  A-001 — Statuts normalisés (12 statuts + validation)');

const REQUIRED_STATUSES = ['pending','received','viewed','responded','accepted','rejected','expired','resolved','archived','cancelled','blocked','failed'];
assert(REQUIRED_STATUSES.every(s => ieContent.includes(`'${s}'`)), "Tous les 12 statuts présents dans STATUSES");
assert(ieContent.includes('VALID_STATUSES.has(newStatus)'), "updateStatus() valide via VALID_STATUSES");
assert(invIds.includes('INV-INT-003'), "INV-INT-003 présent dans communication-invariants.json");

// ── A-002 : WebRTC réservé dans TYPE_META (INV-CALL-002) ─────────────────────
console.log('\n  A-002 — WebRTC Phase B réservé dans TYPE_META (INV-CALL-002)');

const WEBRTC_TYPES = ['CALL_CONNECTED','CALL_ENDED','CALL_FAILED','CALL_NETWORK_LOST','CALL_RECONNECTED'];
WEBRTC_TYPES.forEach(t => {
  assert(ieContent.includes(`${t}:`), `TYPE_META contient ${t} (réservé)`);
  assert(ieContent.includes(`reserved: true`), `${t} marqué reserved:true`);
});
assert(ieContent.includes('INV-CALL-002'),       "INV-CALL-002 référencé dans TYPE_META WebRTC");
assert(ieContent.includes('FLOW-008-B'),          "WebRTC types utilisent FLOW-008-B (distinct Phase A)");
assert(invIds.includes('INV-CALL-002'),           "INV-CALL-002 dans communication-invariants.json");
assert(kgInvIds.includes('INV-CALL-002'),         "INV-CALL-002 indexé dans le Knowledge Graph");

// ── A-003 : ABUSE avec INV-COM-029 ────────────────────────────────────────────
console.log('\n  A-003 — ABUSE dans TYPE_META avec INV-COM-029');

assert(ieContent.includes("ABUSE:"), "ABUSE présent dans TYPE_META");
assert(ieContent.includes("'ABUSE_REPORTED'"), "ABUSE → ABUSE_REPORTED OBD");
assert(ieContent.includes("'INV-COM-029'"), "ABUSE référence INV-COM-029");
assert(invIds.includes('INV-COM-029'), "INV-COM-029 dans communication-invariants.json");
assert(kgInvIds.includes('INV-COM-029'), "INV-COM-029 indexé dans le Knowledge Graph");

// ── A-004 : CONTACT_* avec INV-COM-030 ────────────────────────────────────────
console.log('\n  A-004 — CONTACT_REQUEST/ACCEPTED/REJECTED avec INV-COM-030');

['CONTACT_REQUEST','CONTACT_ACCEPTED','CONTACT_REJECTED'].forEach(t => {
  assert(ieContent.includes(`${t}:`), `${t} dans TYPE_META`);
});
assert(ieContent.includes("'INV-COM-030'"), "CONTACT types référencent INV-COM-030");
assert(invIds.includes('INV-COM-030'), "INV-COM-030 dans communication-invariants.json");
assert(kgInvIds.includes('INV-COM-030'), "INV-COM-030 indexé dans le Knowledge Graph");

// ── A-005 : INV-GUARD-001 + architecture Guardian ─────────────────────────────
console.log('\n  A-005 — INV-GUARD-001 Guardian Loop + invariants complémentaires');

assert(invIds.includes('INV-GUARD-001'),   "INV-GUARD-001 dans communication-invariants.json");
assert(kgInvIds.includes('INV-GUARD-001'), "INV-GUARD-001 indexé dans le Knowledge Graph");

const guard001 = invariants.invariants.find(i => i.id === 'INV-GUARD-001');
assert(
  guard001?.rule?.includes('Interaction') && guard001?.rule?.includes('evidence'),
  "INV-GUARD-001 mentionne Interaction + evidence[]"
);

const call002 = invariants.invariants.find(i => i.id === 'INV-CALL-002');
assert(
  call002?.rule?.includes('reserved:true') || call002?.rule?.includes('SESSION 30'),
  "INV-CALL-002 documente la réservation SESSION 30"
);

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
