'use strict';
/**
 * no-orphan-feature.test.js — SESSION OBD-002
 *
 * Vérifie la règle NO_ORPHAN_FEATURE :
 * aucun finding HIGH ne doit exister dans le rapport généré.
 *
 * Exécution : node tests/organism/no-orphan-feature.test.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..', '..');
const SCRIPT     = path.join(ROOT, 'scripts', 'detect-orphan-features.js');
const PASS       = '\x1b[32m✔\x1b[0m';
const FAIL       = '\x1b[31m✖\x1b[0m';

let exitCode = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
  } else {
    console.error(`  ${FAIL} ${label}`);
    if (detail) console.error(`    → ${detail}`);
    exitCode = 1;
  }
}

function run() {
  console.log('\n[NO_ORPHAN_FEATURE] Lancement du détecteur…\n');

  let report;
  try {
    const out = execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    report = JSON.parse(out);
  } catch (err) {
    console.error(`${FAIL} Impossible d'exécuter le détecteur :`, err.message);
    process.exit(1);
  }

  // ── Tests ─────────────────────────────────────────────────────────────────

  console.log('Suite : Structure du rapport');
  assert(typeof report === 'object' && report !== null,  'Le rapport est un objet JSON valide');
  assert(Array.isArray(report.findings),                  'report.findings est un tableau');
  assert(Array.isArray(report.scanned_files),             'report.scanned_files est un tableau');
  assert(typeof report.stats === 'object',                'report.stats est un objet');
  assert(report.scanned_files.length > 0,                 'Au moins un fichier scanné', `scanned=${report.scanned_files.length}`);

  console.log('\nSuite : Fichiers obligatoires scannés');
  const scanned = new Set(report.scanned_files);
  for (const f of ['index.html', 'messages.js', 'calls.js']) {
    assert(scanned.has(f), `${f} est scanné`);
  }

  console.log('\nSuite : Règle NO_ORPHAN_FEATURE (sévérité HIGH = bloquant)');
  const high = report.findings.filter(f => f.severity === 'high');
  assert(
    high.length === 0,
    `Aucun finding HIGH (${high.length} trouvé${high.length > 1 ? 's' : ''})`,
    high.length > 0 ? high.map(f => `${f.detected_in}: ${f.symbol} — ${f.reason}`).join('\n    → ') : ''
  );

  console.log('\nSuite : Champs obligatoires sur chaque finding');
  const REQUIRED = ['type', 'severity', 'detected_in', 'symbol', 'reason', 'suggested_action', 'rule_id'];
  const malformed = report.findings.filter(f => REQUIRED.some(k => f[k] === undefined || f[k] === null));
  assert(
    malformed.length === 0,
    `Tous les findings ont les champs requis`,
    malformed.length > 0 ? `${malformed.length} finding(s) mal formé(s)` : ''
  );

  console.log('\nSuite : Validité des sévérités');
  const VALID_SEV = new Set(['high', 'medium', 'low']);
  const invalidSev = report.findings.filter(f => !VALID_SEV.has(f.severity));
  assert(
    invalidSev.length === 0,
    `Toutes les sévérités sont valides (high/medium/low)`,
    invalidSev.length > 0 ? invalidSev.map(f => `${f.symbol}: '${f.severity}'`).join(', ') : ''
  );

  // ── Résumé ────────────────────────────────────────────────────────────────
  const { stats } = report;
  console.log(`\n── Résumé ──────────────────────────────────────────────────`);
  console.log(`   Fichiers scannés : ${report.scanned_files.length}`);
  console.log(`   Findings HIGH    : ${stats.high}`);
  console.log(`   Findings MEDIUM  : ${stats.medium}`);
  console.log(`   Findings LOW     : ${stats.low}`);
  console.log(`   Total            : ${stats.total}`);

  if (stats.medium > 0) {
    console.log('\n── Findings MEDIUM (avertissements) ────────────────────────');
    report.findings.filter(f => f.severity === 'medium').forEach(f => {
      console.log(`   [${f.detected_in}] ${f.symbol}`);
      console.log(`   → ${f.reason}`);
    });
  }

  console.log(`\n── Résultat : ${exitCode === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`} ──────────────────────────────\n`);
  process.exit(exitCode);
}

run();
