#!/usr/bin/env node
// scripts/check-knowledge.js
// Controle integre : sync knowledge + auto-audit organique non bloquant.
// Le resultat bloquant reste sync-knowledge --check.

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(label, args, blocking = true) {
  console.log(`[check-knowledge] ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit'
  });

  if (blocking && result.status !== 0) {
    console.error(`[check-knowledge] Echec bloquant: ${label}`);
    process.exit(result.status || 1);
  }

  if (!blocking && result.status !== 0) {
    console.warn(`[check-knowledge] Warning non bloquant: ${label}`);
  }
}

run('verification projections generees', ['scripts/sync-knowledge.js', '--check'], true);
run('auto-audit organique', ['scripts/organic-audit.js'], false);

console.log('[check-knowledge] Controle termine');
