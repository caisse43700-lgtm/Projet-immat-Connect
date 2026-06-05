'use strict';
/**
 * version-compat.test.js — SESSION OBD-003e §15
 *
 * VERSION_COMPATIBILITY_SCORE
 * Vérifie que le versioning est cohérent : service worker, cache,
 * knowledge files, localStorage migrations.
 *
 * Exécution : node tests/organism/version-compat.test.js
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
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

console.log('\n[OBD-003e] version-compat.test.js — VERSION_COMPATIBILITY_SCORE §15\n');

const indexSrc    = readSrc('index.html');
const swSrc       = readSrc('service-worker.js');

// ── Suite 1 : Service Worker — versioning du cache ───────────────────────────

console.log('Suite 1 : Service Worker — CACHE_NAME versionné');

assert(swSrc.length > 0, 'service-worker.js lisible');

// CACHE_NAME doit contenir un numéro de version
const cacheNameMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
assert(!!cacheNameMatch, 'service-worker.js : CACHE_NAME défini');
if (cacheNameMatch) {
  const cacheName = cacheNameMatch[1];
  assert(/v\d+/.test(cacheName),
    `CACHE_NAME = '${cacheName}' — contient un numéro de version (v\\d+)`);
  assert(parseInt((cacheName.match(/v(\d+)/) || ['','0'])[1], 10) >= 5,
    `CACHE_NAME version >= 5 (actuelle: ${cacheName})`);
}

// L'activation doit nettoyer les anciens caches
assert(swSrc.includes('caches.keys') && swSrc.includes('caches.delete'),
  'service-worker.js : activate() nettoie les anciens caches (caches.keys + delete)');

// ── Suite 2 : localStorage — migration ic_storage_ver ────────────────────────

console.log('\nSuite 2 : localStorage — migration ic_storage_ver');

assert(indexSrc.includes('ic_storage_ver'),
  'index.html : ic_storage_ver utilisé pour versionner le schéma localStorage');

assert(indexSrc.includes('ALERTS_STORAGE_VERSION') || indexSrc.includes('storage_ver'),
  'index.html : constante de version schema localStorage définie');

// Migration doit s'exécuter au démarrage (IIFE ou afterAuth)
assert(
  indexSrc.match(/ic_storage_ver[\s\S]{0,300}ALERTS_STORAGE_VERSION/) ||
  indexSrc.match(/ALERTS_STORAGE_VERSION[\s\S]{0,300}ic_storage_ver/),
  'index.html : migration localStorage exécutée au démarrage (comparaison version)'
);

// La migration doit mettre à jour la version après migration
assert(
  indexSrc.match(/set\(['"]ic_storage_ver['"]/),
  'index.html : ic_storage_ver mis à jour après migration réussie'
);

// ── Suite 3 : afterAuth() — nettoyage état stale au changement de compte ─────

console.log('\nSuite 3 : afterAuth() — détection et nettoyage changement de compte');

assert(indexSrc.includes('ic_current_user_id'),
  'index.html : ic_current_user_id — détection changement de compte dans afterAuth()');

assert(indexSrc.includes('ic_current_profile_plate'),
  'index.html : ic_current_profile_plate — détection changement de plaque dans afterAuth()');

// afterAuth doit nettoyer les clés stale sur changement de compte
const afterAuthIdx = indexSrc.indexOf('App.afterAuth = async function(){');
const afterAuthBody = afterAuthIdx >= 0
  ? indexSrc.substring(afterAuthIdx, indexSrc.indexOf('\n    App.', afterAuthIdx))
  : '';
assert(
  afterAuthBody.includes('ic_alerts') || afterAuthBody.includes('ic_unread') || afterAuthBody.includes('safeRemove'),
  'afterAuth() : nettoie les clés stale au changement de compte'
);

// ── Suite 4 : Knowledge files — versionnés (_v) ──────────────────────────────

console.log('\nSuite 4 : Knowledge files — champ _v présent (versioning documental)');

const knowledgeFiles = [
  'knowledge/features.json',
  'knowledge/interactions.json',
  'knowledge/supabase-dependencies.json',
  'knowledge/communication-invariants.json',
  'knowledge/rls-rules.json',
  'knowledge/consent-rules.json',
  'architecture/IMMAT-FLOW-INDEX.json',
];

for (const kf of knowledgeFiles) {
  if (exists(kf)) {
    const data = load(kf);
    assert(typeof data._v === 'number' || typeof data._v === 'string',
      `${kf} : champ _v présent (version documentale)`);
  } else {
    warn(`${kf} : fichier absent (ignoré)`);
  }
}

// ── Suite 5 : Manifest PWA — version et icons ────────────────────────────────

console.log('\nSuite 5 : Manifest PWA — versionné et valide');

assert(exists('manifest.json'), 'manifest.json présent');
if (exists('manifest.json')) {
  const manifest = load('manifest.json');
  assert(typeof manifest.name === 'string' && manifest.name.length > 0,
    `manifest.json : name = '${manifest.name}'`);
  assert(typeof manifest.start_url === 'string',
    'manifest.json : start_url défini');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 1,
    `manifest.json : ${manifest.icons?.length} icône(s) définie(s)`);
}

// ── Suite 6 : Compatibilité CACHE_NAME vs STATIC_CACHE ───────────────────────

console.log('\nSuite 6 : STATIC_CACHE — fichiers essentiels inclus');

assert(swSrc.includes('/index.html'),
  'service-worker.js : /index.html dans STATIC_CACHE');

assert(swSrc.includes('/offline.html'),
  'service-worker.js : /offline.html dans STATIC_CACHE (fallback offline)');

assert(swSrc.includes('/manifest.json'),
  'service-worker.js : /manifest.json dans STATIC_CACHE');

// Vérifier que le SW exclut l'API Supabase du cache (évite de cacher des données dynamiques)
assert(swSrc.includes('supabase.co'),
  'service-worker.js : requêtes Supabase exclues du cache (bypass explicite)');

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Knowledge files vérifiés        : ${knowledgeFiles.filter(f => exists(f)).length}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   VERSION_COMPATIBILITY_SCORE : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
