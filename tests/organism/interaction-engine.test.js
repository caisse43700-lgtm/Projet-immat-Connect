'use strict';
/**
 * interaction-engine.test.js — SESSION 27
 *
 * IE-001 : core/interaction-engine.js existe
 * IE-002 : window.InteractionEngine exposé
 * IE-003 : TYPE_META couvre les 9 types avec OBD + flow + invariant
 * IE-004 : create() stocke dans ic_interactions (structure complète)
 * IE-005 : getHistory() filtre par getBlockLevel (INV-COM-025)
 * IE-006 : observe() émet OBD avec flow_id + invariant (INV-OBD-001)
 * IE-007 : ic_interactions limité à MAX 200 entrées (buffer circulaire)
 * IE-008 : InteractionEngine chargé avant calls.js dans index.html
 * IE-009 : AngeAction.execute() alimente InteractionEngine
 * IE-010 : Knowledge Graph : GAP-010 RÉSOLU + spec Phase 1/2 IMPLÉMENTÉ
 *
 * Exécution : node tests/organism/interaction-engine.test.js
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

const ieContent    = fs.readFileSync(path.join(ROOT, 'core', 'interaction-engine.js'), 'utf8');
const indexContent = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const specContent  = fs.readFileSync(path.join(ROOT, 'architecture', 'INTERACTION-ENGINE-SPEC.md'), 'utf8');
const kgraph       = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'immat-knowledge-graph.json'), 'utf8'));

// ── IE-001 : fichier existe ───────────────────────────────────────────────────
console.log('\n  IE-001 — core/interaction-engine.js existe');

assert(
  fs.existsSync(path.join(ROOT, 'core', 'interaction-engine.js')),
  'core/interaction-engine.js présent'
);
assert(
  ieContent.includes('__InteractionEngineV1') || ieContent.includes('__InteractionEngineV2'),
  'Guard idempotence présent'
);

// ── IE-002 : window.InteractionEngine exposé ─────────────────────────────────
console.log('\n  IE-002 — window.InteractionEngine exposé');

assert(
  ieContent.includes('window.InteractionEngine = InteractionEngine'),
  'window.InteractionEngine assigné'
);
assert(
  ieContent.includes('create') && ieContent.includes('getHistory') && ieContent.includes('notifyPending'),
  'create / getHistory / notifyPending dans l\'API publique'
);

// ── IE-003 : TYPE_META couvre 9 types ────────────────────────────────────────
console.log('\n  IE-003 — TYPE_META : 9 types avec OBD + flow + invariant');

const REQUIRED_TYPES = ['MESSAGE','THANKS','CALL','VEHICLE_ALERT','ROAD_ALERT','HELP','SOS','TRUST','BLOCK'];
REQUIRED_TYPES.forEach(t => {
  assert(
    ieContent.includes(`${t}:`),
    `TYPE_META contient le type ${t}`
  );
});
assert(ieContent.includes("flow: 'FLOW-"),   "TYPE_META contient des flow_id");
assert(ieContent.includes("invariants: ['"), "TYPE_META contient des invariants");

// ── IE-004 : structure complète de l'objet Interaction ───────────────────────
console.log('\n  IE-004 — create() produit un objet Interaction complet');

assert(ieContent.includes("id:          _uuid()"),        "create() génère un UUID");
assert(ieContent.includes("timestamp:   new Date().toISOString()"), "create() ajoute timestamp ISO8601");
assert(ieContent.includes("status || 'pending'") || ieContent.includes("STATUSES.PENDING") || ieContent.includes("'pending'"), "create() initialise status à pending");
assert(ieContent.includes("obd_events:  meta.obd ? [meta.obd] : []"), "create() initialise obd_events");
assert(ieContent.includes("flow_id:     flow_id || meta.flow || null"), "create() résout flow_id");
assert(ieContent.includes("invariants:  invariants || meta.invariants || []"), "create() résout invariants");
assert(ieContent.includes("'ic_interactions'"), "storage key = ic_interactions");

// ── IE-005 : getHistory filtre via getBlockLevel ─────────────────────────────
console.log('\n  IE-005 — getHistory() filtre via Permissions Matrix (INV-COM-025)');

assert(
  ieContent.includes("window.ImmatMessages?.getBlockLevel?."),
  "getHistory() consulte window.ImmatMessages?.getBlockLevel?."
);
assert(
  ieContent.includes("bl !== 'BLOCK_ALL'") || ieContent.includes("!== 'BLOCK_ALL'"),
  "getHistory() exclut les interactions BLOCK_ALL"
);
assert(
  ieContent.includes(".reverse()"),
  "getHistory() retourne les résultats en ordre DESC"
);

// ── IE-006 : observe() émet avec flow_id + invariant (INV-OBD-001) ───────────
console.log('\n  IE-006 — observe() / _emitObd() : OBD avec flow_id + invariant');

assert(
  ieContent.includes("flow_id:       flow"),
  "_emitObd() inclut flow_id dans le payload OBD"
);
assert(
  ieContent.includes("invariant:     inv"),
  "_emitObd() inclut invariant dans le payload OBD"
);
assert(
  ieContent.includes("'ImmatConnect/InteractionEngine'"),
  "_emitObd() identifie la source comme InteractionEngine"
);

// ── IE-007 : buffer circulaire MAX_INTERACTIONS ───────────────────────────────
console.log('\n  IE-007 — Buffer circulaire MAX 200 interactions');

assert(
  ieContent.includes('MAX_INTERACTIONS = 200') || ieContent.includes('MAX_INTERACTIONS=200'),
  "MAX_INTERACTIONS = 200"
);
assert(
  ieContent.includes('.slice(-MAX_INTERACTIONS)'),
  "_save() applique slice(-MAX_INTERACTIONS)"
);

// ── IE-008 : chargé avant calls.js dans index.html ───────────────────────────
console.log('\n  IE-008 — interaction-engine.js chargé avant calls.js dans index.html');

const iePos    = indexContent.indexOf('interaction-engine.js');
const callsPos = indexContent.indexOf('calls.js');
assert(
  iePos !== -1 && callsPos !== -1 && iePos < callsPos,
  "interaction-engine.js déclaré avant calls.js dans index.html"
);

// ── IE-009 : AngeAction.execute() alimente InteractionEngine ─────────────────
console.log('\n  IE-009 — AngeAction.execute() alimente InteractionEngine');

assert(
  indexContent.includes("window.InteractionEngine?.create?."),
  "AngeAction.execute() appelle window.InteractionEngine?.create?."
);

// ── IE-010 : Knowledge Graph + Spec à jour ───────────────────────────────────
console.log('\n  IE-010 — Knowledge Graph et Spec SESSION 27');

const gap010 = (kgraph.gaps || []).find(g => g.id === 'GAP-010');
assert(gap010?.status?.includes('RÉSOLU'), 'GAP-010 marqué RÉSOLU SESSION-27');

assert(
  specContent.includes('IMPLÉMENTÉ'),
  "INTERACTION-ENGINE-SPEC.md : Phase 1/2 IMPLÉMENTÉ"
);

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  Résultat : ${passed} ✔  ${failed} ✖\n`);
if (failed > 0) process.exit(1);
process.exit(0);
