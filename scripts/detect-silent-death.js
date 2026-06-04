#!/usr/bin/env node
/**
 * detect-silent-death.js — SESSION OBD-003d §30
 *
 * Règle SILENT_DEATH : détecter les flows, intentions, features et events
 * qui existent dans les référentiels mais ne sont jamais utilisés dans le code.
 *
 * Signale aussi : fichiers source jamais importés, panels jamais ouverts,
 * localStorage keys jamais lus/écrits dans le code.
 *
 * Usage :
 *   node scripts/detect-silent-death.js
 *   node scripts/detect-silent-death.js --check   # exit 1 si morts trouvés
 *   node scripts/detect-silent-death.js --save    # écrit reports/silent-death-report.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const SAVE  = process.argv.includes('--save');

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readSrc(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch(_) { return ''; }
}

// ── 1. Charger les référentiels ────────────────────────────────────────────

const features    = read('knowledge/features.json').features;
const intentions  = read('knowledge/intentions.json').intentions || [];
const flows       = read('architecture/IMMAT-FLOW-INDEX.json').flows || [];

// ── 2. Scanner les sources ─────────────────────────────────────────────────

const SOURCE_FILES = ['index.html', 'messages.js', 'calls.js', 'core/brain.js',
                      'core/bus.js', 'core/governance.js', 'core/immatOrganism.js'];

let combinedSrc = '';
for (const f of SOURCE_FILES) {
  combinedSrc += readSrc(f) + '\n';
}

// ── 3. Flows orphelins (dans FLOW-INDEX mais aucune feature ne les référence) ─

const featureFlows = new Set(features.flatMap(f => f.flows || []));
const orphanFlows = flows.filter(fl => !featureFlows.has(fl.id));

// ── 4. Intentions orphelines (dans intentions.json mais aucune feature ne les ref) ─

const featureIntents = new Set(features.flatMap(f => f.intentions || []));
const orphanIntentions = intentions.filter(i => !featureIntents.has(i.id));

// ── 5. Features fantômes (dans features.json mais jamais mentionnées dans le code source) ─

const phantomFeatures = features.filter(f => !combinedSrc.includes(f.id));

// ── 6. Clés localStorage mortes (dans supabase-dependencies mais jamais dans src) ───

let lsKeys = [];
try {
  lsKeys = read('knowledge/supabase-dependencies.json').localStorage_keys || [];
} catch(_) {}

const deadLocalStorage = lsKeys.filter(entry => {
  const key = entry.key || '';
  const fullKey = `ic_${key}`;
  return !combinedSrc.includes(fullKey) && !combinedSrc.includes(`'${key}'`) && !combinedSrc.includes(`"${key}"`);
});

// ── 7. Events OBD jamais émis dans le code (dans whitelist mais pas dans source) ─

let whitelistedEvents = [];
try {
  const dfSrc = readSrc('scripts/detect-orphan-features.js');
  // Chercher d'abord un tableau JSON explicite knownObserveEvents = [...]
  const arrMatch = dfSrc.match(/knownObserveEvents\s*=\s*\[([\s\S]*?)\]/);
  if (arrMatch) {
    for (const m of arrMatch[1].matchAll(/'([A-Z][A-Z0-9_]+)'/g)) {
      if (m[1].length > 4) whitelistedEvents.push(m[1]);
    }
  } else {
    // Fallback : scanner toutes les constantes uppercase entre guillemets simples
    for (const m of dfSrc.matchAll(/'([A-Z][A-Z0-9_]+)'/g)) {
      if (m[1].length > 4) whitelistedEvents.push(m[1]);
    }
  }
} catch(_) {}
whitelistedEvents = [...new Set(whitelistedEvents)];

const RE_OBD = /\.observe(?:\?\.)?(?:\s*)\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g;
const emittedEvents = new Set();
for (const m of combinedSrc.matchAll(RE_OBD)) emittedEvents.add(m[1]);

const neverEmittedEvents = whitelistedEvents.filter(ev =>
  !emittedEvents.has(ev) &&
  !ev.startsWith('ORPHAN_') &&         // systèmes de détection
  !ev.startsWith('COMMUNICATION_SELFTEST') // réservé aux tests
);

// ── 8. Flows jamais exécutés (flow dans FLOW-INDEX mais aucune trace dans src) ──

const silentFlows = flows.filter(fl => !combinedSrc.includes(fl.id));

// ── 9. Construire le rapport ───────────────────────────────────────────────

const PASS = '\x1b[32m✔\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const DEAD = '\x1b[31m✖\x1b[0m';

console.log('\n[OBD-003d] detect-silent-death — Mort silencieuse §30\n');

function section(title, items, kind) {
  console.log(`── ${title} (${items.length}) ──────────────────────────────`);
  if (items.length === 0) {
    console.log(`  ${PASS} Aucun mort silencieux`);
  } else {
    for (const item of items) {
      const id = item.id || item.key || item;
      const label = item.nom || item.besoin || item.intention || item.titre || '';
      console.log(`  ${kind} ${id}${label ? ' — ' + label.substring(0, 60) : ''}`);
    }
  }
  console.log('');
}

section('Flows orphelins (dans FLOW-INDEX, aucune feature ne les référence)', orphanFlows, WARN);
section('Intentions orphelines (dans intentions.json, aucune feature ne les référence)', orphanIntentions, WARN);
section('Features fantômes (features.json, jamais mentionnées dans le code source)', phantomFeatures, WARN);
section('Clés localStorage mortes (documentées, jamais lues dans le code)', deadLocalStorage, WARN);
section('Flows jamais exécutés (aucune trace du FLOW-ID dans le code source)', silentFlows, WARN);
section('Events OBD jamais émis (dans whitelist, jamais dans .observe())', neverEmittedEvents.slice(0, 20), WARN);

const totalDeaths = orphanFlows.length + orphanIntentions.length + phantomFeatures.length;
const totalWarnings = deadLocalStorage.length + silentFlows.length + neverEmittedEvents.length;

console.log('── Résumé ──────────────────────────────────────────────────');
console.log(`   Flows orphelins     : ${orphanFlows.length}`);
console.log(`   Intentions orphelines: ${orphanIntentions.length}`);
console.log(`   Features fantômes   : ${phantomFeatures.length}`);
console.log(`   LS keys mortes      : ${deadLocalStorage.length}`);
console.log(`   Flows muets         : ${silentFlows.length}`);
console.log(`   Events jamais émis  : ${neverEmittedEvents.length} (sur ${whitelistedEvents.length} whitelistés)`);
console.log(`\n   Morts structurels   : ${totalDeaths}`);
console.log(`   Avertissements      : ${totalWarnings}`);

if (SAVE) {
  const report = {
    _generated_at: new Date().toISOString(),
    _rule: 'SILENT_DEATH',
    _session: 'OBD-003d',
    orphan_flows: orphanFlows.map(f => ({ id: f.id, intention: f.intention?.substring(0, 80) })),
    orphan_intentions: orphanIntentions.map(i => ({ id: i.id, besoin: i.besoin })),
    phantom_features: phantomFeatures.map(f => ({ id: f.id, nom: f.nom })),
    dead_localStorage: deadLocalStorage,
    silent_flows: silentFlows.map(f => ({ id: f.id })),
    never_emitted_events: neverEmittedEvents,
    stats: { totalDeaths, totalWarnings },
  };
  const out = path.join(ROOT, 'reports', 'silent-death-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n   Rapport sauvegardé : reports/silent-death-report.json`);
}

const icon = totalDeaths === 0 ? `${PASS} PROPRE` : `${DEAD} MORTS DÉTECTÉS`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

if (CHECK && totalDeaths > 0) process.exit(1);
