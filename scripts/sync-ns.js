#!/usr/bin/env node
// scripts/sync-ns.js — INV-015 · TRF-003
// Génère supabase/functions/_shared/nervous-system.ts depuis immat-nervous-system.json.
// La source canonique est le JSON. Le TS est toujours une transformation, jamais une copie.
//
// Usage:
//   node scripts/sync-ns.js          → génère le TS
//   node scripts/sync-ns.js --check  → vérifie que le TS est à jour (exit 1 si non)

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'immat-nervous-system.json');
const DST  = path.join(ROOT, 'supabase', 'functions', '_shared', 'nervous-system.ts');

function generate() {
  const json = JSON.parse(fs.readFileSync(SRC, 'utf8'));

  return [
    '// _shared/nervous-system.ts',
    '// GÉNÉRÉ AUTOMATIQUEMENT — ne pas modifier manuellement.',
    '// Source canonique : immat-nervous-system.json (racine du projet) — INV-015',
    '// Pour modifier : éditer immat-nervous-system.json puis exécuter : node scripts/sync-ns.js',
    `// _v: ${json._v}`,
    '',
    '// deno-lint-ignore-file',
    `export const NS = ${JSON.stringify(json, null, 2)} as const;`,
    '',
  ].join('\n');
}

const check = process.argv.includes('--check');
const generated = generate();

if (check) {
  const current = fs.existsSync(DST) ? fs.readFileSync(DST, 'utf8') : '';
  if (current === generated) {
    const v = JSON.parse(fs.readFileSync(SRC, 'utf8'))._v;
    console.log(`[sync-ns] ✓ TS à jour (_v:${v})`);
    process.exit(0);
  } else {
    console.error('[sync-ns] ✗ TS désynchronisé — exécuter : node scripts/sync-ns.js');
    process.exit(1);
  }
} else {
  fs.writeFileSync(DST, generated, 'utf8');
  const v = JSON.parse(fs.readFileSync(SRC, 'utf8'))._v;
  console.log(`[sync-ns] ✓ Généré _v:${v} → supabase/functions/_shared/nervous-system.ts`);
}
