'use strict';
/**
 * rls-audit.test.js — SESSION OBD-003e §12
 *
 * RLS_COVERAGE_SCORE
 * Vérifie que chaque table Supabase a ses règles RLS documentées
 * et que les invariants d'isolation sont respectés structurellement.
 *
 * Exécution : node tests/organism/rls-audit.test.js
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

console.log('\n[OBD-003e] rls-audit.test.js — RLS_COVERAGE_SCORE §12\n');

const rlsData    = load('knowledge/rls-rules.json');
const supabData  = load('knowledge/supabase-dependencies.json');
const indexSrc   = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const callsSrc   = readSrc('calls.js');
const frontendSrc = indexSrc + messagesSrc + callsSrc;

const rlsTables     = rlsData.tables || [];
const supabTables   = supabData.tables || [];

// ── Suite 1 : Couverture RLS — toutes les tables documentées ─────────────────

console.log('Suite 1 : Couverture RLS — toutes les tables Supabase documentées');

assert(rlsTables.length >= supabTables.length,
  `RLS documenté pour toutes les tables (${rlsTables.length}/${supabTables.length})`);

for (const t of supabTables) {
  const rlsEntry = rlsTables.find(r => r.name === t.name);
  assert(!!rlsEntry, `Table '${t.name}' : RLS documenté dans rls-rules.json`);
  if (rlsEntry) {
    assert(rlsEntry.rls_enabled === true,
      `Table '${t.name}' : rls_enabled = true`);
  }
}

// ── Suite 2 : Isolation SELECT — A ne lit pas les données privées de B ────────

console.log('\nSuite 2 : Isolation SELECT — A ne lit pas les données privées de B');

const messagesRLS = rlsTables.find(t => t.name === 'messages');
if (messagesRLS) {
  const selectPolicy = messagesRLS.policies?.find(p => p.type === 'SELECT');
  assert(!!selectPolicy, 'messages : politique SELECT définie');
  assert(
    selectPolicy?.check?.includes('sender_id') && selectPolicy?.check?.includes('receiver_id'),
    'messages SELECT : isolé à sender_id ET receiver_id (A ne lit pas B↔C)'
  );

  // Vérifier que les garanties d'isolation sont documentées
  assert(
    (messagesRLS.isolation_guarantees || []).some(g => g.toLowerCase().includes('privé') || g.toLowerCase().includes('b↔c')),
    'messages : garantie d\'isolation B↔C documentée'
  );
}

const callReqRLS = rlsTables.find(t => t.name === 'call_requests');
if (callReqRLS) {
  const selectPolicy = callReqRLS.policies?.find(p => p.type === 'SELECT');
  assert(
    selectPolicy?.check?.includes('caller_id') && selectPolicy?.check?.includes('callee_id'),
    'call_requests SELECT : isolé à caller_id ET callee_id'
  );
}

// ── Suite 3 : Isolation UPDATE/INSERT — A ne modifie pas les données de B ────

console.log('\nSuite 3 : Isolation UPDATE/INSERT — A ne modifie pas les données de B');

for (const tableName of ['profiles', 'messages', 'call_requests', 'call_preferences']) {
  const tbl = rlsTables.find(t => t.name === tableName);
  if (!tbl) { warn(`Table '${tableName}' absente de rls-rules.json`); continue; }

  const insertPol = tbl.policies?.find(p => p.type === 'INSERT');
  const updatePol = tbl.policies?.find(p => p.type === 'UPDATE');

  if (insertPol) {
    assert(
      insertPol.check?.includes('auth.uid()'),
      `${tableName} INSERT : vérifie auth.uid() (propriétaire seul)`
    );
  }
  if (updatePol) {
    assert(
      updatePol.check?.includes('auth.uid()'),
      `${tableName} UPDATE : vérifie auth.uid() (propriétaire seul)`
    );
  }
}

// ── Suite 4 : INV-COM-009 — pas de DELETE DB pour les messages ───────────────

console.log('\nSuite 4 : INV-COM-009 — pas de DELETE DB pour les messages');

if (messagesRLS) {
  const deletePol = messagesRLS.policies?.find(p => p.type === 'DELETE');
  assert(!!deletePol, 'messages : politique DELETE définie');
  assert(
    deletePol?.check === 'false',
    'messages DELETE : check = false (suppression DB interdite — INV-COM-009)'
  );
}

// Vérifier que le code ne fait pas de DELETE sur messages
assert(!frontendSrc.match(/\.from\(['"]messages['"]\)[\s\S]{0,50}\.delete\(\)/),
  'Frontend : aucun .delete() sur la table messages (soft-delete localStorage uniquement)');

// ── Suite 5 : Gardien — accès limité aux données non individuelles ────────────

console.log('\nSuite 5 : Gardien — accès agrégé uniquement, jamais données privées');

assert(rlsData.gardien_access?.role === 'gardien',
  'Règles accès gardien documentées dans rls-rules.json');

assert(
  (rlsData.conducteur_restrictions || []).length >= 3,
  `Restrictions conducteur documentées (${(rlsData.conducteur_restrictions || []).length} règles)`
);

// Vérifier dans le code que le dashboard gardien ne charge pas les messages privés
const gardienBody = (() => {
  const idx = indexSrc.indexOf('openGardienDashboard');
  return idx >= 0 ? indexSrc.substring(idx, idx + 2000) : '';
})();
assert(
  !gardienBody.includes('.from(\'messages\')') && !gardienBody.includes('.from("messages")'),
  'Dashboard Gardien : ne charge pas la table messages (données privées)'
);

// ── Suite 6 : reports — isolation signalements véhicule vs route ─────────────

console.log('\nSuite 6 : Signalements — isolation véhicule (privé) vs route (community)');

const reportsRLS = rlsTables.find(t => t.name === 'reports');
if (reportsRLS) {
  const selectPol = reportsRLS.policies?.find(p => p.type === 'SELECT');
  assert(!!selectPol, 'reports : politique SELECT définie');
  assert(
    selectPol?.check?.includes("category IN") || selectPol?.rule?.includes('véhicule'),
    'reports SELECT : différenciation catégorie route vs véhicule documentée'
  );
  assert(
    (reportsRLS.isolation_guarantees || []).some(g => g.toLowerCase().includes('véhicule')),
    'reports : garantie isolation signalements véhicule documentée'
  );
}

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Tables Supabase documentées    : ${supabTables.length}`);
console.log(`   Tables avec RLS documenté      : ${rlsTables.length}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   RLS_COVERAGE_SCORE : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
