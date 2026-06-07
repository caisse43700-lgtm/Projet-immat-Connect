#!/usr/bin/env node
/* scripts/safe-patch-check.js
 * Garde-fou local avant commit.
 * Empêche les remplacements accidentels de gros fichiers critiques.
 */
const { execSync } = require('child_process');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fail(msg) {
  console.error('\n❌ SAFE PATCH CHECK FAILED');
  console.error(msg);
  process.exit(1);
}

const stat = sh('git diff --cached --numstat');
if (!stat) {
  console.log('✅ Aucun fichier staged.');
  process.exit(0);
}

const critical = new Set(['index.html', 'core/aiController.js']);
const lines = stat.split(/\r?\n/).filter(Boolean);
const problems = [];

for (const line of lines) {
  const parts = line.split(/\t/);
  const added = Number(parts[0]);
  const deleted = Number(parts[1]);
  const file = parts.slice(2).join('\t');

  if (critical.has(file)) {
    if (added > 80 || deleted > 80) {
      problems.push(`${file}: diff trop grand (+${added}/-${deleted}). Utiliser un patch chirurgical.`);
    }
  }

  if (file === 'index.html' && (added > 20 || deleted > 20)) {
    problems.push(`index.html: modification trop large (+${added}/-${deleted}). Interdit sans revue explicite.`);
  }
}

if (problems.length) fail(problems.join('\n'));

try {
  sh('git diff --cached --check');
} catch (e) {
  fail('git diff --cached --check a détecté un problème de whitespace/conflit.');
}

console.log('✅ SAFE PATCH CHECK PASSED');
console.log(stat);
