#!/usr/bin/env node
// scripts/validate-ns-refs.js — DET-001 : vérification anchors symboliques NS
// TRF-003 · INV-015
//
// Vérifie que chaque entrée NS.organs[*].entry[*] pointe vers un symbole
// réellement présent dans la codebase.
//
// Usage:
//   node scripts/validate-ns-refs.js
//   node scripts/validate-ns-refs.js --check  → exit 1 si référence introuvable

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const NS_SRC  = path.join(ROOT, 'immat-nervous-system.json');
const HTML    = path.join(ROOT, 'index.html');
const VERBOSE = process.argv.includes('--verbose');
const CHECK   = process.argv.includes('--check');

const ns        = JSON.parse(fs.readFileSync(NS_SRC, 'utf8'));
const htmlLines = fs.readFileSync(HTML, 'utf8').split('\n');

// ── Résolveurs par préfixe de symbole ──────────────────────────────────────

function findInHtml(pattern) {
  for (let i = 0; i < htmlLines.length; i++) {
    if (htmlLines[i].includes(pattern)) return i + 1;
  }
  return null;
}

function resolveSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return { status: 'skip', detail: 'non-string' };

  // Module externe ou fichier externe → accepté tel quel
  if (symbol === 'module externe') return { status: 'ok', detail: 'module externe (non vérifiable)' };
  if (symbol.startsWith('supabase/functions/')) return { status: 'ok', detail: 'edge function (non vérifiable ici)' };

  // App.methodName → cherche methodName( dans index.html
  const appMatch = symbol.match(/^App\.([A-Za-z_]+)/);
  if (appMatch) {
    const fn = appMatch[1].replace(' (legacy)', '');
    const line = findInHtml(`${fn}(`);
    if (line) return { status: 'ok', detail: `trouvé L${line}` };
    return { status: 'error', detail: `App.${fn} introuvable dans index.html` };
  }

  // fn.functionName → cherche function functionName( ou functionName( dans index.html
  const fnMatch = symbol.match(/^fn\.([A-Za-z_]+)/);
  if (fnMatch) {
    const fn = fnMatch[1];
    const line = findInHtml(`function ${fn}(`) || findInHtml(`${fn}(`);
    if (line) return { status: 'ok', detail: `trouvé L${line}` };
    return { status: 'error', detail: `fn.${fn} introuvable dans index.html` };
  }

  // db.table.op → accepté (Supabase, vérification impossible statiquement)
  if (symbol.startsWith('db.')) return { status: 'ok', detail: 'Supabase (non vérifiable statiquement)' };

  // css.#selector → cherche l'ID ou la classe dans index.html
  const cssMatch = symbol.match(/^css\.(.+)/);
  if (cssMatch) {
    const sel = cssMatch[1].replace('#', '');
    const line = findInHtml(sel);
    if (line) return { status: 'ok', detail: `trouvé L${line}` };
    return { status: 'warn', detail: `css ${sel} non trouvé (peut être dans CSS externe)` };
  }

  // #elementId → cherche id="elementId" dans index.html
  const idMatch = symbol.match(/^#([A-Za-z_-]+)/);
  if (idMatch) {
    const id = idMatch[1];
    const line = findInHtml(`id="${id}"`) || findInHtml(`id='${id}'`) || findInHtml(`$('${id}')`);
    if (line) return { status: 'ok', detail: `trouvé L${line}` };
    return { status: 'error', detail: `#${id} introuvable dans index.html` };
  }

  // Symbole complexe (ex: App.method > #element) → résoudre la partie principale
  const complexApp = symbol.match(/^App\.([A-Za-z_]+) > /);
  if (complexApp) {
    const fn = complexApp[1];
    const line = findInHtml(`${fn}(`);
    if (line) return { status: 'ok', detail: `App.${fn} trouvé L${line}` };
    return { status: 'error', detail: `App.${fn} introuvable` };
  }

  return { status: 'warn', detail: `format symbole inconnu : "${symbol}"` };
}

// ── Exécution ─────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(' VALIDATION ANCHORS SYMBOLIQUES NS — DET-001');
console.log(`${'═'.repeat(60)}\n`);

let ok = 0, errors = 0, warnings = 0;
const errorList = [];

for (const [organ, data] of Object.entries(ns.organs || {})) {
  const entry = data.entry || {};
  const keys  = Object.keys(entry);
  if (keys.length === 0) continue;

  if (VERBOSE) console.log(`\n${organ}:`);

  for (const [key, symbol] of Object.entries(entry)) {
    const result = resolveSymbol(String(symbol));
    if (result.status === 'ok') {
      ok++;
      if (VERBOSE) console.log(`   ✓ ${key} → ${symbol} (${result.detail})`);
    } else if (result.status === 'warn') {
      warnings++;
      if (VERBOSE) console.log(`   ⚠ ${key} → ${symbol} (${result.detail})`);
    } else if (result.status === 'error') {
      errors++;
      errorList.push({ organ, key, symbol, detail: result.detail });
      console.log(`   ✗ ${organ}.${key} → ${symbol}`);
      console.log(`     ${result.detail}`);
    } else {
      if (VERBOSE) console.log(`   ○ ${key} → ${symbol} (skipped)`);
    }
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ✓ ${ok} anchors résolus`);
if (warnings > 0) console.log(`  ⚠ ${warnings} avertissements`);
if (errors > 0)   console.log(`  ✗ ${errors} anchors introuvables`);
else              console.log(`  ✓ Aucun anchor introuvable`);

if (errors > 0) {
  console.log('\n  ANCHORS INTROUVABLES :');
  for (const e of errorList) {
    console.log(`  · ${e.organ}.${e.key} → "${e.symbol}"`);
    console.log(`    ${e.detail}`);
  }
}

console.log();

if (CHECK && errors > 0) {
  console.error(`[validate-ns-refs] ✗ ${errors} anchor(s) introuvable(s) — exit 1`);
  process.exit(1);
} else if (CHECK) {
  console.log(`[validate-ns-refs] ✓ Tous les anchors NS résolus`);
  process.exit(0);
}
