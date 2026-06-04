'use strict';
/**
 * interaction-engine-extended.test.js — SESSION 27B→F
 *
 * IEX-001 : 27B — getHistoryUnified() retourne {interactions, unreadCount, lastActivity}
 * IEX-002 : 27C — STATUSES contient les 12 statuts normalisés (INV-INT-003)
 * IEX-003 : 27C — updateStatus() valide le statut avant mise à jour
 * IEX-004 : 27D — createNotification() structure complète (INV-INT-002)
 * IEX-005 : 27D — ic_notifications avec max 100 entrées
 * IEX-006 : 27E — search() filtre par plate, type, date, status
 * IEX-007 : 27F — getAnalytics() couvre tous les types (INV-INT-007)
 * IEX-008 : TYPE_META étendu — 19 types (ABUSE, cycles call + contact)
 * IEX-009 : INV-INT-001 à INV-INT-008 présents dans communication-invariants.json
 * IEX-010 : Knowledge Graph : INV-INT-001→008 indexés
 *
 * Exécution : node tests/organism/interaction-engine-extended.test.js
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

// ── IEX-001 : 27B — getHistoryUnified ────────────────────────────────────────
console.log('\n  IEX-001 — 27B : getHistoryUnified() → {interactions, unreadCount, lastActivity}');

assert(ieContent.includes('getHistoryUnified'), "getHistoryUnified() défini");
assert(ieContent.includes('unreadCount'),       "getHistoryUnified() retourne unreadCount");
assert(ieContent.includes('lastActivity'),      "getHistoryUnified() retourne lastActivity");

// ── IEX-002 : 27C — STATUSES normalisés ──────────────────────────────────────
console.log('\n  IEX-002 — 27C : STATUSES — 12 statuts normalisés (INV-INT-003)');

const REQUIRED_STATUSES = ['pending','received','viewed','responded','accepted','rejected','expired','resolved','archived','cancelled','blocked','failed'];
REQUIRED_STATUSES.forEach(s => {
  assert(ieContent.includes(`'${s}'`), `STATUSES contient '${s}'`);
});
assert(ieContent.includes('VALID_STATUSES'), "VALID_STATUSES Set présent pour validation");

// ── IEX-003 : 27C — updateStatus valide le statut ────────────────────────────
console.log('\n  IEX-003 — 27C : updateStatus() valide avant mise à jour');

assert(ieContent.includes('updateStatus'),                    "updateStatus() défini");
assert(ieContent.includes('VALID_STATUSES.has(newStatus)'),   "updateStatus() vérifie VALID_STATUSES");
assert(ieContent.includes('return false'),                    "updateStatus() retourne false si statut invalide");

// ── IEX-004 : 27D — Notification Engine ──────────────────────────────────────
console.log('\n  IEX-004 — 27D : Notification Engine (INV-INT-002)');

assert(ieContent.includes('createNotification'),              "createNotification() défini");
assert(ieContent.includes('getNotifications'),                "getNotifications() défini");
assert(ieContent.includes('markNotificationViewed'),          "markNotificationViewed() défini");
assert(ieContent.includes('getPendingNotificationCount'),     "getPendingNotificationCount() défini");
assert(ieContent.includes('interaction_id:'),                 "Notification structure contient interaction_id");
assert(ieContent.includes('ic_notifications'),                "storage key = ic_notifications");

// ── IEX-005 : 27D — buffer max 100 notifications ─────────────────────────────
console.log('\n  IEX-005 — 27D : ic_notifications limité à MAX 100 entrées');

assert(ieContent.includes('MAX_NOTIFS       = 100') || ieContent.includes('MAX_NOTIFS=100') || ieContent.includes('MAX_NOTIFS = 100'), "MAX_NOTIFS = 100");
assert(ieContent.includes('slice(-MAX_NOTIFS)'), "_saveNotifs() applique slice(-MAX_NOTIFS)");

// ── IEX-006 : 27E — Moteur de recherche ──────────────────────────────────────
console.log('\n  IEX-006 — 27E : search() filtre par plate / type / date / status');

assert(ieContent.includes('function search('),   "search() défini");
assert(ieContent.includes('dateFrom'),           "search() supporte dateFrom");
assert(ieContent.includes('dateTo'),             "search() supporte dateTo");
assert(ieContent.includes("status)"),            "search() filtre par status");

// ── IEX-007 : 27F — Analytics Engine ─────────────────────────────────────────
console.log('\n  IEX-007 — 27F : getAnalytics() — compteurs par type (INV-INT-007)');

assert(ieContent.includes('getAnalytics'),          "getAnalytics() défini");
assert(ieContent.includes('total_messages'),        "getAnalytics() compte total_messages");
assert(ieContent.includes('total_calls'),           "getAnalytics() compte total_calls");
assert(ieContent.includes('total_alerts'),          "getAnalytics() compte total_alerts");
assert(ieContent.includes('total_help'),            "getAnalytics() compte total_help");
assert(ieContent.includes('total_sos'),             "getAnalytics() compte total_sos");
assert(ieContent.includes('total_trust'),           "getAnalytics() compte total_trust");
assert(ieContent.includes('total_blocks'),          "getAnalytics() compte total_blocks");
assert(ieContent.includes('total_abuse'),           "getAnalytics() compte total_abuse");
assert(ieContent.includes('by_type'),               "getAnalytics() retourne by_type");
assert(ieContent.includes('by_status'),             "getAnalytics() retourne by_status");

// ── IEX-008 : TYPE_META étendu — nouveaux types ───────────────────────────────
console.log('\n  IEX-008 — TYPE_META étendu : ABUSE + cycles call + contact');

const EXTENDED_TYPES = ['ABUSE','CONTACT_REQUEST','CONTACT_ACCEPTED','CONTACT_REJECTED','CALL_REQUEST','CALL_ACCEPTED','CALL_REFUSED','CALL_MISSED','CALL_CANCELLED'];
EXTENDED_TYPES.forEach(t => {
  assert(ieContent.includes(`${t}:`), `TYPE_META contient ${t}`);
});

// ── IEX-009 : INV-INT-001 à INV-INT-008 dans communication-invariants.json ───
console.log('\n  IEX-009 — INV-INT-001 à INV-INT-008 dans communication-invariants.json');

for (let i = 1; i <= 8; i++) {
  const id = `INV-INT-00${i}`;
  const found = invariants.invariants.find(inv => inv.id === id);
  assert(!!found, `${id} présent dans communication-invariants.json`);
}

// ── IEX-010 : Knowledge Graph INV-INT indexés ────────────────────────────────
console.log('\n  IEX-010 — Knowledge Graph : INV-INT-001→008 indexés');

const kgIds = (kgraph.invariants || []).map(i => i.id);
for (let i = 1; i <= 8; i++) {
  const id = `INV-INT-00${i}`;
  assert(kgIds.includes(id), `Knowledge Graph contient ${id}`);
}

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
