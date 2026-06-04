'use strict';
/**
 * no-orphan-chain.test.js — SESSION OBD-002b
 *
 * Vérifie la règle ORPHAN_CHAIN :
 * chaque feature déclarée dans knowledge/features.json possède
 * une chaîne complète Feature → Organe → Intention → Flow → Invariant → Observation → Test
 *
 * Seuls les findings HIGH sont bloquants.
 * Les findings LOW (tests manquants) sont informatifs.
 *
 * Exécution : node tests/organism/no-orphan-chain.test.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'detect-orphan-chain.js');
const PASS  = '\x1b[32m✔\x1b[0m';
const FAIL  = '\x1b[31m✖\x1b[0m';
const WARN  = '\x1b[33m⚠\x1b[0m';

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

function warn(label, detail) {
  console.log(`  ${WARN} ${label}`);
  if (detail) console.log(`    → ${detail}`);
}

function run() {
  console.log('\n[ORPHAN_CHAIN] Vérification de la chaîne organique…\n');

  let report;
  try {
    const out = execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    report = JSON.parse(out);
  } catch (err) {
    console.error(`${FAIL} Impossible d'exécuter le détecteur de chaîne :`, err.message);
    process.exit(1);
  }

  // ── Tests ─────────────────────────────────────────────────────────────────

  console.log('Suite : Structure du rapport de chaîne');
  assert(typeof report === 'object' && report !== null,      'Le rapport est un objet JSON valide');
  assert(Array.isArray(report.findings),                      'report.findings est un tableau');
  assert(typeof report.coherence_score === 'object',          'report.coherence_score est présent');
  assert(typeof report.coherence_score.score === 'number',    'score est un nombre');
  assert(typeof report.per_feature === 'object',              'report.per_feature est présent');
  assert(typeof report.features_checked === 'number',         'report.features_checked est un nombre');
  assert(report.features_checked > 0,                         `${report.features_checked} feature(s) vérifiée(s)`);

  console.log('\nSuite : Intégrité des référentiels');
  assert(report.features_checked >= 11,
    `Au moins 11 features vérifiées (trouvé : ${report.features_checked})`);

  console.log('\nSuite : Règle ORPHAN_CHAIN (HIGH = bloquant)');
  const high = report.findings.filter(f => f.severity === 'high');
  assert(
    high.length === 0,
    `Aucun finding HIGH (${high.length} trouvé${high.length !== 1 ? 's' : ''})`,
    high.length > 0
      ? high.map(f => `[${f.feature_id}] ${f.rule} — ${f.reason}`).join('\n    → ')
      : ''
  );

  console.log('\nSuite : Règle ORPHAN_CHAIN (MEDIUM = surveillance)');
  const medium = report.findings.filter(f => f.severity === 'medium');
  if (medium.length > 0) {
    warn(`${medium.length} finding(s) MEDIUM — observations OBD ou invariants manquants`,
      medium.map(f => `[${f.feature_id}] ${f.rule}`).join(', '));
  } else {
    assert(true, 'Aucun finding MEDIUM');
  }

  console.log('\nSuite : Champs requis sur les findings');
  const REQUIRED = ['type', 'rule', 'severity', 'feature_id', 'feature_nom', 'reason', 'suggested_action'];
  const malformed = report.findings.filter(f => REQUIRED.some(k => f[k] === undefined || f[k] === null));
  assert(malformed.length === 0,
    `Tous les findings sont bien formés`,
    malformed.length > 0 ? `${malformed.length} finding(s) mal formé(s)` : '');

  console.log('\nSuite : Score de cohérence');
  const { score, label } = report.coherence_score;
  assert(score >= 0 && score <= 100, `Score valide (${score}%)`);
  assert(score >= 60,
    `Score de cohérence ≥ 60% (actuel : ${score}% — ${label})`,
    score < 60 ? `Score trop bas. Corriger les findings HIGH/MEDIUM.` : '');

  console.log('\nSuite : Chaînes HIGH complètes par feature');
  for (const [id, info] of Object.entries(report.per_feature || {})) {
    const highForFeature = report.findings.filter(f => f.feature_id === id && f.severity === 'high');
    assert(
      highForFeature.length === 0,
      `${id} (${info.organe}) — chaîne structurelle complète`,
      highForFeature.map(f => f.reason).join('; ')
    );
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  const { stats } = report;
  const low = report.findings.filter(f => f.severity === 'low');

  console.log('\n── Résumé ──────────────────────────────────────────────────');
  console.log(`   Score cohérence  : ${score}% — ${label}`);
  console.log(`   Features vérifiées : ${report.features_checked}`);
  console.log(`   Findings HIGH    : ${stats.high}`);
  console.log(`   Findings MEDIUM  : ${stats.medium}`);
  console.log(`   Findings LOW     : ${stats.low}`);

  if (low.length > 0) {
    console.log('\n── Findings LOW (tests manquants — informatif) ─────────────');
    for (const f of low) {
      console.log(`   [${f.feature_id}] ${f.reason.substring(0, 80)}`);
    }
  }

  console.log(`\n── Résultat : ${exitCode === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`} ──────────────────────────────\n`);
  process.exit(exitCode);
}

run();
