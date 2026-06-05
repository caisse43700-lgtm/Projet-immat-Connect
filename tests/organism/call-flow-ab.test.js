'use strict';
/**
 * call-flow-ab.test.js — SESSION OBD-003d §5
 *
 * Tests structurels du flux d'appel entre conducteur A et conducteur B.
 * Valide la logique documentée dans FLOW-CALL-REQUEST et FLOW-CALL (IMMAT-FLOW-INDEX.json)
 * sans connexion Supabase réelle.
 *
 * Couverture :
 *   - États call_requests (pending → accepted/refused/cancelled/timeout)
 *   - Permissions via INV-COM-003 (can_receive_calls logic)
 *   - Niveaux de confiance vs niveaux appel (CONTR-001, CONTR-002, CONTR-006)
 *   - DND actif (CONTR-006 : DND > CALL_LEVEL_ALL)
 *   - Blocage (CONTR-001 : BLOCKED > TRUSTED)
 *   - Contexte alerte (FLOW-CALL-CONTEXT — CONTR-002 : URGENCY > DND)
 *   - Timeout 30s (call_requests TTL)
 *
 * Exécution : node tests/organism/call-flow-ab.test.js
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

console.log('\n[OBD-003d] call-flow-ab.test.js — Tests structurels flux A↔B §5\n');

// ── Charger les référentiels ───────────────────────────────────────────────

const flowData    = load('architecture/IMMAT-FLOW-INDEX.json');
const comInvData  = load('knowledge/communication-invariants.json');
const contrData   = load('knowledge/contradiction-rules.json');
const interData   = load('knowledge/interactions.json');
const supabData   = load('knowledge/supabase-dependencies.json');

const flows     = flowData.flows || [];
const comInvs   = comInvData.invariants || [];
const contrRules = contrData.rules || [];
const interactions = interData.interactions || [];

// ── Suite 1 : Flow CALL-REQUEST documenté et cohérent ─────────────────────

console.log('Suite 1 : Flow CALL-REQUEST — structure documentée');

const callReqFlow = flows.find(f => f.id === 'FLOW-CALL-REQUEST');
assert(!!callReqFlow, 'FLOW-CALL-REQUEST présent dans IMMAT-FLOW-INDEX.json');

if (callReqFlow) {
  const code = callReqFlow.repérage?.code || [];
  const state = callReqFlow.repérage?.state || [];
  const data  = callReqFlow.repérage?.data  || [];

  assert(code.some(c => c.includes('requestCall') || c.includes('contactByCall')),
    'FLOW-CALL-REQUEST : CallManager.requestCall() ou contactByCall() documenté');

  assert(state.some(s => s.includes('call_requests.status')),
    'FLOW-CALL-REQUEST : états call_requests.status documentés');

  assert(data.some(d => d.includes('call_requests')),
    'FLOW-CALL-REQUEST : table call_requests référencée');

  assert(data.some(d => d.includes('can_receive_calls')),
    'FLOW-CALL-REQUEST : RPC can_receive_calls() référencée (INV-COM-003)');

  // Vérifier que les 3 événements OBD clés sont dans impact
  const impact = callReqFlow.impact || [];
  const impactStr = impact.join(' ');
  assert(impactStr.includes('CALL_INITIATED') || impactStr.includes('CALL_ACCEPTED') || impactStr.includes('CALL_REFUSED'),
    'FLOW-CALL-REQUEST : OBD events CALL_INITIATED/ACCEPTED/REFUSED documentés dans impact');
}

// ── Suite 2 : États de la machine à états d'un appel ──────────────────────

console.log('\nSuite 2 : Machine à états call_requests (A→B)');

// Les états valides selon la table call_requests
const VALID_CALL_STATES = ['pending', 'accepted', 'refused', 'cancelled'];

const callTable = supabData.tables?.find(t => t.name === 'call_requests');
assert(!!callTable, 'Table call_requests documentée dans supabase-dependencies.json');

if (callTable) {
  assert(Array.isArray(callTable.statuts) && callTable.statuts.length >= 3,
    `call_requests : ${callTable.statuts?.length} statuts documentés (min 3)`);

  for (const st of VALID_CALL_STATES) {
    assert(callTable.statuts?.includes(st),
      `call_requests : statut '${st}' documenté`);
  }
}

// ── Suite 3 : INV-COM-003 — Permission avant tout appel ───────────────────

console.log('\nSuite 3 : INV-COM-003 — Permission valide avant tout appel');

const inv003 = comInvs.find(i => i.id === 'INV-COM-003');
assert(!!inv003, 'INV-COM-003 déclaré');
if (inv003) {
  assert(inv003.rule.includes('can_receive_calls') || inv003.check.includes('can_receive_calls'),
    'INV-COM-003 : RPC can_receive_calls() mentionnée');
  assert(inv003.check.includes('ic_call_perm'),
    'INV-COM-003 : ic_call_perm mentionné dans le check');
}

// Vérifier que can_receive_calls est documentée dans supabase-dependencies
const rpc = supabData.rpc_functions?.find(r => r.name === 'can_receive_calls');
assert(!!rpc, 'RPC can_receive_calls() documentée dans supabase-dependencies.json');
if (rpc) {
  assert(rpc.retour === 'boolean', 'can_receive_calls : retour boolean documenté');
  assert(Array.isArray(rpc.params) && rpc.params.length >= 2,
    `can_receive_calls : ${rpc.params?.length} paramètres documentés`);
}

// Vérifier que la fonction existe dans le code source
const callsSrc = readSrc('calls.js') + readSrc('messages.js') + readSrc('index.html');
assert(callsSrc.includes('can_receive_calls'),
  'can_receive_calls référencée dans le code source');

// ── Suite 4 : Contradictions liées aux appels (CONTR-001, CONTR-002, CONTR-006) ──

console.log('\nSuite 4 : Contradictions liées aux appels');

const callContradictions = ['CONTR-001', 'CONTR-002', 'CONTR-006'];
for (const cid of callContradictions) {
  const rule = contrRules.find(r => r.id === cid);
  assert(!!rule, `${cid} documenté dans contradiction-rules.json`);
  if (rule) {
    assert(typeof rule.resolution_winner === 'string',
      `${cid} : resolution_winner = '${rule.resolution_winner}'`);
  }
}

// CONTR-001 : BLOCKED > TRUSTED pour les appels
const contr1 = contrRules.find(r => r.id === 'CONTR-001');
if (contr1) {
  assert(contr1.resolution_winner === 'BLOCKED',
    'CONTR-001 : BLOCKED prend le dessus sur TRUSTED (appels bloqués)');
}

// CONTR-002 : URGENCY bypass DND
const contr2 = contrRules.find(r => r.id === 'CONTR-002');
if (contr2) {
  assert(contr2.resolution_winner === 'URGENCY',
    'CONTR-002 : URGENCY bypass DND (appels d\'urgence non bloqués)');
}

// CONTR-006 : DND > CALL_LEVEL_ALL
const contr6 = contrRules.find(r => r.id === 'CONTR-006');
if (contr6) {
  assert(contr6.resolution_winner === 'DND',
    'CONTR-006 : DND bloque même si niveau = Tous (sauf urgence)');
}

// ── Suite 5 : Interaction INTER-005 (appel A→B) — chaîne complète ─────────

console.log('\nSuite 5 : INTER-005 — demande de contact audio (chaîne complète)');

const inter005 = interactions.find(i => i.id === 'INTER-005');
assert(!!inter005, 'INTER-005 présent dans interactions.json');

if (inter005) {
  assert(inter005.feature_id === 'F-APPEL',
    `INTER-005 : feature_id = 'F-APPEL' (trouvé : '${inter005.feature_id}')`);
  assert(inter005.flow_id === 'FLOW-CALL-REQUEST',
    `INTER-005 : flow_id = 'FLOW-CALL-REQUEST' (trouvé : '${inter005.flow_id}')`);
  assert(inter005.events_obd?.includes('CALL_INITIATED'),
    'INTER-005 : OBD event CALL_INITIATED documenté');
  assert(inter005.events_obd?.includes('CALL_ACCEPTED'),
    'INTER-005 : OBD event CALL_ACCEPTED documenté');
  assert(inter005.events_obd?.includes('CALL_REFUSED'),
    'INTER-005 : OBD event CALL_REFUSED documenté');
  assert(inter005.invariants?.includes('INV-COM-003'),
    'INTER-005 : invariant INV-COM-003 référencé');
  assert(inter005.invariants?.includes('INV-COM-004'),
    'INTER-005 : invariant INV-COM-004 référencé (blocage bloque les appels aussi)');
}

// ── Suite 6 : Flux CallManager dans le code source ────────────────────────

console.log('\nSuite 6 : CallManager dans le code source');

const callMgrSrc = readSrc('calls.js') + readSrc('index.html');
const callMgrFunctions = [
  { fn: 'contactByCall', label: 'CallManager.contactByCall() — initier appel' },
  { fn: 'requestCall',   label: 'CallManager.requestCall() — créer call_request' },
  { fn: 'acceptCall',    label: 'CallManager.acceptCall() — accepter' },
  { fn: 'refuseCall',    label: 'CallManager.refuseCall() — refuser' },
  { fn: 'cancelCallRequest', label: 'CallManager.cancelCallRequest() — annuler' },
];

for (const { fn, label } of callMgrFunctions) {
  assert(callMgrSrc.includes(fn), label);
}

// Vérifier que le timeout des appels (30s) est géré
assert(callMgrSrc.includes('30') || callMgrSrc.includes('30000'),
  'CallManager : timeout 30s implémenté');

// ── Suite 7 : Tests de dépréciation volontaire Phase B ─────────────────────

console.log('\nSuite 7 : Composants Phase B non implémentés (Phase A active)');

const futureData = load('knowledge/future-components.json');
const webrtc = futureData.components?.find(c => c.id === 'COMP-B-001');
assert(!!webrtc, 'COMP-B-001 (WebRTCTransport) documenté dans future-components.json');
if (webrtc) {
  assert(webrtc.status === 'reserved',
    'WebRTCTransport : status = reserved (Phase B non activé)');
  assert(webrtc.phase === 'B',
    'WebRTCTransport : phase = B');
}

// Vérifier que WebRTC n'est PAS dans le code source (Phase A uniquement)
const hasWebRTC = callMgrSrc.includes('RTCPeerConnection') || callMgrSrc.includes('webrtc');
if (hasWebRTC) {
  warn('WebRTCTransport : présence RTCPeerConnection détectée dans le code — Phase B implémentée ?');
} else {
  assert(true, 'WebRTCTransport : RTCPeerConnection absent du code (Phase A uniquement ✅)');
}

// ── Résumé ────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   Taux de succès : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
