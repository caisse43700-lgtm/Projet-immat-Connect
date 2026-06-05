'use strict';
/**
 * communication-selftest.js — SESSION OBD-003c
 *
 * CommunicationSelfTest : vérifications structurelles de cohérence de l'organe Communication.
 * Ce test vérifie que le système nerveux de communication est complet et cohérent.
 *
 * Émet COMMUNICATION_SELFTEST_PASS si 0 échec, COMMUNICATION_SELFTEST_FAIL sinon.
 *
 * Exécution : node tests/organism/communication-selftest.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let passed = 0, failed = 0, warned = 0;

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function assert(condition, label, detail) {
  if (condition) {
    passed++;
    console.log(`    ${PASS} ${label}`);
  } else {
    failed++;
    console.error(`    ${FAIL} ${label}`);
    if (detail) console.error(`       → ${detail}`);
  }
}

function warn(label) {
  warned++;
  console.log(`    ${WARN} ${label}`);
}

console.log('\n[OBD-003c] CommunicationSelfTest — Cohérence organe Communication\n');

// ── Charger les référentiels ───────────────────────────────────────────────

const featuresData    = load('knowledge/features.json');
const intentsData     = load('knowledge/intentions.json');
const flowData        = load('architecture/IMMAT-FLOW-INDEX.json');
const comInvData      = load('knowledge/communication-invariants.json');
const interactData    = load('knowledge/interactions.json');
const contradictData  = load('knowledge/contradiction-rules.json');
const futureData      = load('knowledge/future-components.json');
const supabData       = load('knowledge/supabase-dependencies.json');
const angeCmdData     = load('knowledge/ange-commands.json');

const features     = featuresData.features;
const intentions   = intentsData.intentions || [];
const flows        = flowData.flows || [];
const comInvs      = comInvData.invariants || [];
const interactions = interactData.interactions || [];
const contrRules   = contradictData.rules || [];
const futureComps  = futureData.components || [];
const angeCommands = angeCmdData.commands || [];

const intentSet    = new Set(intentions.map(i => i.id));
const flowSet      = new Set(flows.map(f => f.id));
const comInvSet    = new Set(comInvs.map(i => i.id));
const featureSet   = new Set(features.map(f => f.id));

// ── Bloc 1 : Intégrité des fichiers knowledge OBD-003c ────────────────────

console.log('Bloc 1 : Fichiers knowledge OBD-003c présents et valides');

assert(Array.isArray(interactions) && interactions.length >= 8,
  `interactions.json : ${interactions.length} interactions documentées (min 8)`);

assert(Array.isArray(angeCommands) && angeCommands.length >= 12,
  `ange-commands.json : ${angeCommands.length} commandes Ange (min 12)`);

assert(Array.isArray(contrRules) && contrRules.length >= 5,
  `contradiction-rules.json : ${contrRules.length} règles de conflit (min 5)`);

assert(Array.isArray(futureComps) && futureComps.length >= 5,
  `future-components.json : ${futureComps.length} composants réservés (min 5)`);

assert(Array.isArray(supabData.tables) && supabData.tables.length >= 3,
  `supabase-dependencies.json : ${supabData.tables.length} tables documentées (min 3)`);

assert(Array.isArray(supabData.edge_functions) && supabData.edge_functions.length >= 1,
  `supabase-dependencies.json : ${supabData.edge_functions.length} edge functions documentées`);

// ── Bloc 2 : Cohérence de la chaîne communication ─────────────────────────

console.log('\nBloc 2 : Cohérence chaîne feature→intention→flow des interactions');

for (const inter of interactions) {
  const label = `INTER-${inter.id} (${inter.titre?.substring(0, 40) || '?'})`;

  assert(typeof inter.feature_id === 'string' && featureSet.has(inter.feature_id),
    `${label} : feature_id '${inter.feature_id}' déclaré dans features.json`);

  if (inter.intention_id) {
    assert(intentSet.has(inter.intention_id),
      `${label} : intention_id '${inter.intention_id}' déclaré dans intentions.json`);
  }

  assert(typeof inter.flow_id === 'string' && flowSet.has(inter.flow_id),
    `${label} : flow_id '${inter.flow_id}' déclaré dans IMMAT-FLOW-INDEX.json`);

  assert(Array.isArray(inter.events_obd) && inter.events_obd.length > 0,
    `${label} : events_obd[] non vide`);

  assert(Array.isArray(inter.invariants) && inter.invariants.length > 0,
    `${label} : invariants[] référencés`);

  // Vérifier que chaque invariant référencé existe
  for (const invId of (inter.invariants || [])) {
    assert(comInvSet.has(invId),
      `${label} : invariant '${invId}' déclaré dans communication-invariants.json`);
  }
}

// ── Bloc 3 : Invariants INV-COM-011 à INV-COM-015 ─────────────────────────

console.log('\nBloc 3 : Invariants INV-COM-011 à INV-COM-015 (OBD-003c)');

for (let n = 11; n <= 15; n++) {
  const id = `INV-COM-0${n}`;
  const inv = comInvs.find(i => i.id === id);
  assert(!!inv, `${id} déclaré dans communication-invariants.json`);
  if (inv) {
    assert(typeof inv.rule === 'string' && inv.rule.length > 20,
      `${id} : champ 'rule' substantiel (> 20 chars)`);
    assert(typeof inv.check === 'string' && inv.check.length > 0,
      `${id} : champ 'check' présent`);
  }
}

// ── Bloc 4 : Contradiction rules — tous les conflits ont un winner ─────────

console.log('\nBloc 4 : Règles de contradiction — cohérence');

const requiredContracts = ['CONTR-001', 'CONTR-002', 'CONTR-003', 'CONTR-004', 'CONTR-005'];
for (const cid of requiredContracts) {
  const rule = contrRules.find(r => r.id === cid);
  assert(!!rule, `${cid} déclaré dans contradiction-rules.json`);
  if (rule) {
    assert(typeof rule.resolution_winner === 'string' && rule.resolution_winner.length > 0,
      `${cid} : champ 'resolution_winner' présent ("${rule.resolution_winner}")`);
    assert(typeof rule.invariant === 'string',
      `${cid} : champ 'invariant' présent`);
  }
}

// Vérifier que BLOCKED > TRUSTED (CONTR-001) est bien documenté
const contr1 = contrRules.find(r => r.id === 'CONTR-001');
if (contr1) {
  assert(contr1.resolution_winner === 'BLOCKED',
    `CONTR-001 : resolution_winner = 'BLOCKED' (BLOCKED prime sur TRUSTED)`);
}

// Vérifier que SOS > INVISIBLE (CONTR-003)
const contr3 = contrRules.find(r => r.id === 'CONTR-003');
if (contr3) {
  assert(contr3.resolution_winner === 'SOS',
    `CONTR-003 : resolution_winner = 'SOS' (SOS prime sur INVISIBLE)`);
}

// ── Bloc 5 : Commandes Ange — chaîne referentielle ────────────────────────

console.log('\nBloc 5 : Commandes Ange — cohérence referentielle');

assert(angeCommands.length >= 16,
  `ange-commands.json : ${angeCommands.length} commandes (min 16)`);

const requiredAngeCommands = [
  'ANGE_OPEN_CONVERSATION', 'ANGE_SIGNAL_ROAD', 'ANGE_REPORT_VEHICLE',
  'ANGE_SOS', 'ANGE_MANAGE_TRUST', 'ANGE_START_NAVIGATION',
];
for (const cmdId of requiredAngeCommands) {
  const cmd = angeCommands.find(c => c.id === cmdId);
  assert(!!cmd, `${cmdId} déclaré dans ange-commands.json`);
  if (cmd && cmd.flow_id) {
    assert(flowSet.has(cmd.flow_id),
      `${cmdId} : flow_id '${cmd.flow_id}' déclaré dans IMMAT-FLOW-INDEX.json`);
  }
}

// Invariant global : toutes les commandes respectent INV-COM-015 (aucun contenu message à l'Ange)
const globalInvs = angeCmdData._invariants_globaux || [];
assert(globalInvs.includes('INV-COM-015'),
  `ange-commands.json : INV-COM-015 déclaré comme invariant global`);
assert(globalInvs.includes('INV-COM-010'),
  `ange-commands.json : INV-COM-010 déclaré comme invariant global`);

// ── Bloc 6 : Composants futurs — statuts validés ──────────────────────────

console.log('\nBloc 6 : Composants futurs — statuts documentés');

const webrtcComp = futureComps.find(c => c.id === 'COMP-B-001');
assert(!!webrtcComp, `COMP-B-001 (WebRTCTransport) déclaré dans future-components.json`);
if (webrtcComp) {
  assert(webrtcComp.status === 'reserved',
    `COMP-B-001 : status = 'reserved' (pas activé sans validation Gardien)`);
  assert(Array.isArray(webrtcComp.preconditions) && webrtcComp.preconditions.length >= 2,
    `COMP-B-001 : préconditions listées (${webrtcComp.preconditions?.length || 0})`);
}

// Aucun composant ne doit avoir status='active' sans feature_id correspondant actif
for (const comp of futureComps) {
  if (comp.status === 'active') {
    warn(`${comp.id} : status='active' — vérifier que la feature est bien déployée en production`);
  }
}

// ── Bloc 7 : Supabase — cohérence dépendances ─────────────────────────────

console.log('\nBloc 7 : Dépendances Supabase — cohérence');

const requiredTables = ['profiles', 'reports', 'messages', 'call_requests'];
for (const tbl of requiredTables) {
  const t = supabData.tables.find(t => t.name === tbl);
  assert(!!t, `Table Supabase '${tbl}' documentée dans supabase-dependencies.json`);
}

const edgeFn = supabData.edge_functions.find(e => e.name === 'immat-brain-dialog');
assert(!!edgeFn, `Edge Function 'immat-brain-dialog' documentée`);
if (edgeFn) {
  assert(typeof edgeFn.api_key === 'string' && edgeFn.api_key.includes('secrets'),
    `immat-brain-dialog : ANTHROPIC_API_KEY référencée en Supabase secrets uniquement`);
  const snap = edgeFn.snapshot_champs || [];
  assert(!snap.includes('message_content') && !snap.includes('plate'),
    `immat-brain-dialog : snapshot ne contient ni 'message_content' ni 'plate' (INV-COM-015)`);
}

// ── Bloc 8 : Invariant INV-COM-014 — sécurité prime ──────────────────────

console.log('\nBloc 8 : Invariant INV-COM-014 — résolutions sécurisées');

const inv14 = comInvs.find(i => i.id === 'INV-COM-014');
assert(!!inv14, `INV-COM-014 déclaré dans communication-invariants.json`);

// Vérifier que les 3 contradictions critiques de sécurité ont le bon winner
const securityConflicts = {
  'CONTR-001': 'BLOCKED',  // BLOCKED > TRUSTED
  'CONTR-003': 'SOS',      // SOS > INVISIBLE
  'CONTR-009': 'SOFT_DELETE_LOCAL_ONLY', // historique partner inviolable
};
for (const [cid, expectedWinner] of Object.entries(securityConflicts)) {
  const rule = contrRules.find(r => r.id === cid);
  if (rule) {
    assert(rule.resolution_winner === expectedWinner,
      `${cid} : resolution_winner = '${expectedWinner}' conforme INV-COM-014`);
  } else {
    warn(`${cid} non trouvé dans contradiction-rules.json`);
  }
}

// ── Résumé + OBD event ────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;
const selfTestResult = failed === 0 ? 'PASS' : 'FAIL';

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Interactions vérifiées : ${interactions.length}`);
console.log(`   Commandes Ange         : ${angeCommands.length}`);
console.log(`   Règles contradiction   : ${contrRules.length}`);
console.log(`   Composants futurs      : ${futureComps.length}`);
console.log(`   Assertions             : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   Taux de succès         : ${successRate}%`);
console.log(`   CommunicationSelfTest  : ${selfTestResult}`);

if (warned > 0) {
  console.log(`\n   Note : ${warned} avertissement(s) — éléments délibérément Phase B/C ou simulés.`);
}

// Émettre l'événement OBD (si ImmatOrganism disponible en mode Node)
const obdEvent = failed === 0 ? 'COMMUNICATION_SELFTEST_PASS' : 'COMMUNICATION_SELFTEST_FAIL';
console.log(`\n   OBD event → ${obdEvent} (score: ${successRate}%)`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
