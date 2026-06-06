'use strict';
/**
 * guardian-loop.test.js — SESSION 28 Guardian Intelligence Loop
 *
 * G-001 : Initialisation GuardianLoop
 * G-002 : recommend() crée une Recommendation avec interaction_ids
 * G-003 : INV-GUARD-001 — recommend() rejette interaction_ids vide
 * G-004 : validate() approve / reject
 * G-005 : validate() échoue si déjà décidée (INV-GUARD-002)
 * G-006 : markApplied() depuis APPROVED seulement
 * G-007 : expire() sur PENDING seulement
 * G-008 : HEURISTIC-001 — blocages répétés
 * G-009 : HEURISTIC-002 — signalements d'abus
 * G-010 : HEURISTIC-003 — appels manqués excessifs
 * G-011 : HEURISTIC-004 — interactions positives → confiance
 * G-012 : observe() déduplique (pas deux PENDING du même heuristic)
 * G-013 : getAll() + filtres status
 * G-014 : getStats() structure complète
 * G-015 : INV-GUARD-003 — OBD GUARDIAN_RECOMMENDATION_CREATED émis
 * G-016 : OBD GUARDIAN_RECOMMENDATION_DECIDED émis
 * G-017 : constantes SEVERITIES / CATEGORIES / REC_STATUS / HEURISTICS exportées
 * G-018 : ic_guardian_recommendations — STORAGE_KEY bien utilisé
 * G-019 : MAX_RECS — fenêtre glissante
 * G-020 : guard window.__GuardianLoopV1 — pas double init
 *
 * Exécution : node tests/organism/guardian-loop.test.js
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

// ── Lecture du source ─────────────────────────────────────────────────────────
const src = fs.readFileSync(path.join(ROOT, 'core', 'guardian-loop.js'), 'utf8');

// ── Simulation de l'environnement browser minimal ─────────────────────────────
const localStorage = (() => {
  const store = {};
  return {
    getItem:    k      => store[k] !== undefined ? store[k] : null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: k      => { delete store[k]; },
  };
})();

const obd_log = [];
const window  = {
  __GuardianLoopV1: false,
  localStorage,
  ImmatOrganism: {
    observe: (ev, data) => obd_log.push({ event: ev, data }),
  },
  InteractionEngine: null,
};

// Injection localStorage dans global scope du module
global.localStorage = localStorage;
global.window       = window;
// crypto.randomUUID() est disponible nativement en Node 22

// Exécution du module — wrappé dans une fonction pour autoriser le `return` guard
(new Function('window', 'localStorage', src))(window, localStorage);  // eslint-disable-line no-new-func
const GL = window.GuardianLoop;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRec(overrides = {}) {
  return GL.recommend({
    category:       'review',
    severity:       'medium',
    plate:          'AA123BB',
    evidence:       [{ type: 'BLOCK', timestamp: '2026-01-01T00:00:00.000Z' }],
    interaction_ids: ['int-001'],
    heuristic:      'HEURISTIC-TEST',
    flow_id:        'FLOW-BLOCK',
    invariant_id:   'INV-GUARD-001',
    message:        'test recommendation',
    ...overrides,
  });
}

function makeInteraction(type, id) {
  return { id: id || ('int-' + Math.random().toString(36).slice(2)), type, timestamp: new Date().toISOString(), target: 'BB456CC' };
}

// ── G-001 : Initialisation ────────────────────────────────────────────────────
console.log('\n  G-001 — Initialisation GuardianLoop');

assert(typeof GL === 'object' && GL !== null,   "GuardianLoop est un objet");
assert(typeof GL.recommend   === 'function',    "recommend() est une fonction");
assert(typeof GL.validate    === 'function',    "validate() est une fonction");
assert(typeof GL.observe     === 'function',    "observe() est une fonction");
assert(typeof GL.getPending  === 'function',    "getPending() est une fonction");
assert(typeof GL.getAll      === 'function',    "getAll() est une fonction");
assert(typeof GL.getStats    === 'function',    "getStats() est une fonction");
assert(typeof GL.markApplied === 'function',    "markApplied() est une fonction");
assert(typeof GL.expire      === 'function',    "expire() est une fonction");

// ── G-002 : recommend() ───────────────────────────────────────────────────────
console.log('\n  G-002 — recommend() crée une Recommendation');

const rec1 = makeRec();
assert(rec1 !== null,                           "recommend() retourne un objet");
assert(typeof rec1.id === 'string',             "Recommendation possède un id");
assert(rec1.status === 'pending',               "status initial = pending");
assert(Array.isArray(rec1.evidence),            "evidence[] est un tableau");
assert(Array.isArray(rec1.interaction_ids),     "interaction_ids[] est un tableau");
assert(rec1.interaction_ids.length === 1,       "interaction_ids contient l'entrée fournie");
assert(rec1.plate === 'AA123BB',                "plaque normalisée correctement");
assert(rec1.decided_at === null,                "decided_at null à la création");

// ── G-003 : INV-GUARD-001 — interaction_ids obligatoire ──────────────────────
console.log('\n  G-003 — INV-GUARD-001 : interaction_ids vide → null');

const recNull = GL.recommend({
  category: 'review', severity: 'medium', plate: 'AA123BB',
  evidence: [], interaction_ids: [], message: 'sans preuve',
});
assert(recNull === null, "recommend() retourne null si interaction_ids vide");

const recNullUndef = GL.recommend({
  category: 'review', severity: 'medium', plate: 'AA123BB',
  message: 'sans interaction_ids du tout',
});
assert(recNullUndef === null, "recommend() retourne null si interaction_ids absent");

// ── G-004 : validate() ───────────────────────────────────────────────────────
console.log('\n  G-004 — validate() approve / reject');

const rec2 = makeRec();
const approved = GL.validate(rec2.id, 'approved', 'Test approve');
assert(approved === true,                       "validate() retourne true sur PENDING");

const allAfterApprove = GL.getAll('AA123BB', { status: 'approved' });
const found = allAfterApprove.find(r => r.id === rec2.id);
assert(found?.status === 'approved',            "status passe à approved");
assert(found?.decision === 'approved',          "decision = approved");
assert(found?.decision_reason === 'Test approve', "decision_reason conservé");
assert(found?.decided_at !== null,              "decided_at renseigné");

const rec3 = makeRec();
const rejected = GL.validate(rec3.id, 'rejected', 'Faux positif');
assert(rejected === true,                       "validate() retourne true pour rejected");

// ── G-005 : INV-GUARD-002 — pas de double validation ─────────────────────────
console.log('\n  G-005 — INV-GUARD-002 : validate() échoue si déjà décidée');

const double = GL.validate(rec2.id, 'rejected');
assert(double === false, "validate() retourne false sur déjà approved");

const invalid = GL.validate(rec2.id, 'applied');
assert(invalid === false, "validate() refuse decision=applied (non autorisé)");

// ── G-006 : markApplied() ────────────────────────────────────────────────────
console.log('\n  G-006 — markApplied() depuis APPROVED seulement');

const rec4 = makeRec();
const notApplied = GL.markApplied(rec4.id); // encore PENDING
assert(notApplied === false, "markApplied() échoue sur PENDING");

GL.validate(rec4.id, 'approved');
const applied = GL.markApplied(rec4.id);
assert(applied === true, "markApplied() réussit sur APPROVED");

const appliedRec = GL.getAll('AA123BB', { status: 'applied' }).find(r => r.id === rec4.id);
assert(appliedRec?.status === 'applied', "status = applied après markApplied()");

// ── G-007 : expire() ─────────────────────────────────────────────────────────
console.log('\n  G-007 — expire() sur PENDING seulement');

const rec5 = makeRec();
const expired = GL.expire(rec5.id);
assert(expired === true, "expire() réussit sur PENDING");

const expiredRec = GL.getAll('AA123BB', { status: 'expired' }).find(r => r.id === rec5.id);
assert(expiredRec?.status === 'expired', "status = expired après expire()");

const alreadyExpired = GL.expire(rec5.id); // plus PENDING
assert(alreadyExpired === false, "expire() échoue sur status != PENDING");

// ── G-008 → G-011 : observe() heuristiques ───────────────────────────────────
// Simulation InteractionEngine
function setupIE(interactions) {
  window.InteractionEngine = {
    getHistoryUnified: () => ({ interactions, unreadCount: 0, lastActivity: null }),
  };
}

// Nettoyer recommendations pending pour les heuristiques
localStorage.removeItem('ic_guardian_recommendations');

console.log('\n  G-008 — HEURISTIC-001 : blocages répétés');

setupIE([
  makeInteraction('BLOCK', 'b1'),
  makeInteraction('BLOCK', 'b2'),
  makeInteraction('BLOCK', 'b3'),
]);
const obs1 = GL.observe('AA123BB');
assert(obs1.length >= 1,                         "observe() génère une Recommendation pour 3 BLOCKs");
assert(obs1[0]?.heuristic === 'HEURISTIC-001',   "heuristic = HEURISTIC-001");
assert(obs1[0]?.category === 'block',            "category = block");
assert(obs1[0]?.severity === 'high',             "severity = high");
assert(obs1[0]?.interaction_ids.length === 3,    "interaction_ids contient les 3 BLOCKs");

console.log('\n  G-009 — HEURISTIC-002 : signalements d\'abus');

localStorage.removeItem('ic_guardian_recommendations');
setupIE([
  makeInteraction('ABUSE', 'a1'),
  makeInteraction('ABUSE', 'a2'),
]);
const obs2 = GL.observe('AA123BB');
assert(obs2.length >= 1,                         "observe() génère une Recommendation pour 2 ABUSEs");
assert(obs2[0]?.heuristic === 'HEURISTIC-002',   "heuristic = HEURISTIC-002");
assert(obs2[0]?.category === 'abuse',            "category = abuse");
assert(obs2[0]?.severity === 'critical',         "severity = critical");

console.log('\n  G-010 — HEURISTIC-003 : appels manqués excessifs');

localStorage.removeItem('ic_guardian_recommendations');
setupIE([
  makeInteraction('CALL_MISSED', 'm1'),
  makeInteraction('CALL_MISSED', 'm2'),
  makeInteraction('CALL_MISSED', 'm3'),
  makeInteraction('CALL_MISSED', 'm4'),
  makeInteraction('CALL_MISSED', 'm5'),
]);
const obs3 = GL.observe('AA123BB');
assert(obs3.length >= 1,                         "observe() génère une Recommendation pour 5 CALL_MISSED");
assert(obs3[0]?.heuristic === 'HEURISTIC-003',   "heuristic = HEURISTIC-003");
assert(obs3[0]?.category === 'review',           "category = review");
assert(obs3[0]?.severity === 'medium',           "severity = medium");
assert(obs3[0]?.flow_id === 'FLOW-008',          "flow_id = FLOW-008");

console.log('\n  G-011 — HEURISTIC-004 : interactions positives → confiance');

localStorage.removeItem('ic_guardian_recommendations');
setupIE([
  makeInteraction('THANKS', 't1'),
  makeInteraction('MESSAGE', 't2'),
  makeInteraction('HELP', 't3'),
  makeInteraction('CONTACT_ACCEPTED', 't4'),
  makeInteraction('THANKS', 't5'),
]);
const obs4 = GL.observe('AA123BB');
assert(obs4.length >= 1,                         "observe() génère une Recommendation pour 5 interactions positives");
assert(obs4[0]?.heuristic === 'HEURISTIC-004',   "heuristic = HEURISTIC-004");
assert(obs4[0]?.category === 'trust',            "category = trust");
assert(obs4[0]?.severity === 'low',              "severity = low");
assert(obs4[0]?.flow_id === 'FLOW-TRUST',        "flow_id = FLOW-TRUST");

// ── G-012 : déduplication ────────────────────────────────────────────────────
console.log('\n  G-012 — observe() déduplication (pas deux PENDING même heuristique)');

setupIE([
  makeInteraction('BLOCK', 'db1'),
  makeInteraction('BLOCK', 'db2'),
  makeInteraction('BLOCK', 'db3'),
]);
const obs5a = GL.observe('CC789DD');
const obs5b = GL.observe('CC789DD'); // second appel — doit retourner []
assert(obs5a.length === 1,  "premier observe() crée 1 Recommendation HEURISTIC-001");
assert(obs5b.length === 0,  "second observe() ne duplique pas (pending déjà présent)");

// ── G-013 : getAll() + filtres ───────────────────────────────────────────────
console.log('\n  G-013 — getAll() + filtres status');

localStorage.removeItem('ic_guardian_recommendations');
const r1 = makeRec({ plate: 'EE111FF' });
const r2 = makeRec({ plate: 'EE111FF' });
GL.validate(r1.id, 'approved');
GL.validate(r2.id, 'rejected');

const allEE = GL.getAll('EE111FF');
assert(allEE.length === 2,                              "getAll() retourne les 2 Recommendations");

const approvedList = GL.getAll('EE111FF', { status: 'approved' });
assert(approvedList.length === 1,                       "filtre status=approved → 1 résultat");
assert(approvedList[0]?.id === r1.id,                   "résultat approuvé correct");

const rejectedList = GL.getAll('EE111FF', { status: 'rejected' });
assert(rejectedList.length === 1,                       "filtre status=rejected → 1 résultat");

// ── G-014 : getStats() ───────────────────────────────────────────────────────
console.log('\n  G-014 — getStats() structure complète');

const stats = GL.getStats('EE111FF');
assert(typeof stats === 'object',                        "getStats() retourne un objet");
assert(typeof stats.total   === 'number',                "stats.total est un nombre");
assert(typeof stats.pending === 'number',                "stats.pending est un nombre");
assert(stats.total === 2,                                "stats.total = 2 pour EE111FF");
assert(stats.pending === 0,                              "stats.pending = 0 (toutes décidées)");
assert(stats.approved === 1,                             "stats.approved = 1");
assert(stats.rejected === 1,                             "stats.rejected = 1");
assert(typeof stats.by_category === 'object',            "stats.by_category présent");
assert(typeof stats.by_severity === 'object',            "stats.by_severity présent");

// ── G-015 : INV-GUARD-003 — OBD GUARDIAN_RECOMMENDATION_CREATED ──────────────
console.log('\n  G-015 — INV-GUARD-003 : OBD GUARDIAN_RECOMMENDATION_CREATED émis');

const obd_before = obd_log.length;
makeRec({ plate: 'GG222HH' });
const obd_created = obd_log.slice(obd_before).find(e => e.event === 'GUARDIAN_RECOMMENDATION_CREATED');
assert(obd_created !== undefined,                         "OBD GUARDIAN_RECOMMENDATION_CREATED émis");
assert(obd_created?.data?.recommendation_id !== undefined, "OBD contient recommendation_id");
assert(obd_created?.data?.category !== undefined,          "OBD contient category");
assert(obd_created?.data?.severity !== undefined,          "OBD contient severity");

// ── G-016 : OBD GUARDIAN_RECOMMENDATION_DECIDED ──────────────────────────────
console.log('\n  G-016 — OBD GUARDIAN_RECOMMENDATION_DECIDED émis');

const rec6     = makeRec({ plate: 'GG222HH' });
const obd_bef2 = obd_log.length;
GL.validate(rec6.id, 'approved', 'Validation test');
const obd_decided = obd_log.slice(obd_bef2).find(e => e.event === 'GUARDIAN_RECOMMENDATION_DECIDED');
assert(obd_decided !== undefined,                         "OBD GUARDIAN_RECOMMENDATION_DECIDED émis");
assert(obd_decided?.data?.decision === 'approved',        "OBD contient decision=approved");
assert(obd_decided?.data?.reason === 'Validation test',   "OBD contient reason");

// ── G-017 : Constantes exportées ─────────────────────────────────────────────
console.log('\n  G-017 — Constantes SEVERITIES / CATEGORIES / REC_STATUS / HEURISTICS exportées');

assert(typeof GL.SEVERITIES          === 'object',  "SEVERITIES exporté");
assert(GL.SEVERITIES.CRITICAL        === 'critical', "SEVERITIES.CRITICAL correct");
assert(typeof GL.CATEGORIES          === 'object',  "CATEGORIES exporté");
assert(GL.CATEGORIES.ABUSE           === 'abuse',   "CATEGORIES.ABUSE correct");
assert(typeof GL.REC_STATUS          === 'object',  "REC_STATUS exporté");
assert(GL.REC_STATUS.PENDING         === 'pending', "REC_STATUS.PENDING correct");
assert(typeof GL.HEURISTICS          === 'object',  "HEURISTICS exporté");
assert(GL.HEURISTICS.BLOCK_THRESHOLD === 3,         "HEURISTICS.BLOCK_THRESHOLD = 3");
assert(GL.HEURISTICS.ABUSE_THRESHOLD === 2,         "HEURISTICS.ABUSE_THRESHOLD = 2");
assert(GL.HEURISTICS.TRUST_THRESHOLD === 5,         "HEURISTICS.TRUST_THRESHOLD = 5");

// ── G-018 : STORAGE_KEY ───────────────────────────────────────────────────────
console.log('\n  G-018 — ic_guardian_recommendations STORAGE_KEY');

assert(src.includes("'ic_guardian_recommendations'"), "STORAGE_KEY = ic_guardian_recommendations dans le source");

// ── G-019 : MAX_RECS fenêtre glissante ───────────────────────────────────────
console.log('\n  G-019 — MAX_RECS fenêtre glissante (100)');

assert(src.includes('MAX_RECS') && src.includes('100'), "MAX_RECS = 100 dans le source");
assert(src.includes('slice(-MAX_RECS)'),                "slice(-MAX_RECS) appliqué à _save()");

// ── G-020 : Guard double init ─────────────────────────────────────────────────
console.log('\n  G-020 — Guard window.__GuardianLoopV1 — pas double init');

assert(src.includes('__GuardianLoopV1'),             "__GuardianLoopV1 guard dans le source");
assert(src.includes('window.__GuardianLoopV1 = true'), "guard marqué true après init");

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
