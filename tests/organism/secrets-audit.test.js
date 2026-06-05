'use strict';
/**
 * secrets-audit.test.js — SESSION OBD-003e §11
 *
 * SECRETS_EXPOSURE_SCORE
 * Vérifie qu'aucun secret ne peut être exposé côté navigateur ou GitHub.
 *
 * Exécution : node tests/organism/secrets-audit.test.js
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
function readSrc(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch(_) { return ''; } }
function exists(rel)  { return fs.existsSync(path.join(ROOT, rel)); }

console.log('\n[OBD-003e] secrets-audit.test.js — SECRETS_EXPOSURE_SCORE §11\n');

const indexSrc    = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const callsSrc    = readSrc('calls.js');
const swSrc       = readSrc('service-worker.js');
const frontendSrc = indexSrc + messagesSrc + callsSrc;

// ── Suite 1 : Clé Supabase côté frontend ─────────────────────────────────────

console.log('Suite 1 : Clé Supabase — anon uniquement, jamais service_role');

// La clé anon Supabase doit être présente (normale pour le frontend)
assert(frontendSrc.includes('supabase') || frontendSrc.includes('sb.'),
  'Supabase utilisé dans le frontend (normal)');

// Aucune clé service_role (préfixe service_role ou eyJhb...service)
assert(!frontendSrc.includes('service_role'),
  'service_role absent du frontend');

// Les JWT Supabase (service role) commencent par eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
// ou eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9. Vérifier qu'aucun long JWT n'est exposé.
const jwtPattern = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/g;
const jwtMatches = [...frontendSrc.matchAll(jwtPattern)];
assert(jwtMatches.length === 0,
  'Aucun JWT encodé en dur dans le frontend (service_role / JWT long)',
  jwtMatches.length > 0 ? `${jwtMatches.length} JWT trouvés` : '');

// La clé anon doit avoir le préfixe sb_publishable_ (Supabase nouveau format)
// ou être une clé anon (non service_role)
const keyMatch = frontendSrc.match(/key:'([^']+)'/);
if (keyMatch) {
  const key = keyMatch[1];
  assert(key.startsWith('sb_publishable_') || key.startsWith('sb_anon_') || (!key.includes('service') && !key.startsWith('eyJhbGci')),
    `Clé Supabase frontend = clé anon/publique (préfixe : ${key.substring(0,20)}...)`);
} else {
  warn('Pattern key:\'\' non trouvé — vérifier manuellement l\'initialisation Supabase');
}

// ── Suite 2 : Secrets et tokens dans le code frontend ─────────────────────────

console.log('\nSuite 2 : Absence de secrets hardcodés dans le frontend');

assert(!frontendSrc.includes('ANTHROPIC_API_KEY'),
  'ANTHROPIC_API_KEY absent du frontend (doit rester dans Supabase secrets)');

assert(!frontendSrc.includes('service_role'),
  'Chaîne "service_role" absente du frontend');

// Pas de mots de passe hardcodés (pattern communs)
assert(!frontendSrc.match(/password\s*[:=]\s*['"][^'"]{8,}['"]/i),
  'Aucun mot de passe hardcodé détecté dans le frontend');

// Pas de secrets AWS/GCP/Azure
const cloudSecretPattern = /AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35}|ya29\.[0-9A-Za-z-_]+/;
assert(!cloudSecretPattern.test(frontendSrc),
  'Aucun token cloud AWS/GCP/Azure dans le frontend');

// ── Suite 3 : Service Worker — pas de secrets ────────────────────────────────

console.log('\nSuite 3 : Service Worker — clean (pas de secrets)');

assert(swSrc.length > 0,
  'service-worker.js lisible');

assert(!swSrc.includes('service_role') && !swSrc.includes('ANTHROPIC'),
  'service-worker.js ne contient aucun secret');

assert(!swSrc.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/),
  'service-worker.js ne contient aucun JWT hardcodé');

// ── Suite 4 : Logs console — pas d'exposition de données sensibles ────────────

console.log('\nSuite 4 : Logs console — pas d\'exposition de données sensibles');

// Vérifier que console.log/error ne logge pas de tokens/clés
const consoleMatches = [...frontendSrc.matchAll(/console\.(log|error|warn|info)\s*\([^)]*key[^)]*\)/gi)];
const sensitiveConsoleLogs = consoleMatches.filter(m =>
  /password|secret|service_role|api_key|token/i.test(m[0])
);
assert(sensitiveConsoleLogs.length === 0,
  'console.log/error ne contient pas de références explicites à des clés/tokens sensibles',
  sensitiveConsoleLogs.length > 0 ? sensitiveConsoleLogs.map(m => m[0].substring(0,80)).join(' | ') : '');

// Vérifier que les erreurs RPC/DB loguées n'exposent pas de données utilisateur
const rpcErrorLogs = [...frontendSrc.matchAll(/console\.(warn|error)\s*\([^)]*rpc[^)]*error[^)]*\)/gi)];
assert(rpcErrorLogs.every(m => !m[0].includes('uid') && !m[0].includes('plate')),
  'Logs d\'erreurs RPC ne contiennent pas d\'identifiants utilisateur (uid, plate)');

// ── Suite 5 : GitHub Actions — secrets bien référencés ───────────────────────

console.log('\nSuite 5 : GitHub Actions — secrets dans variables d\'environnement');

const ghDir = path.join(ROOT, '.github', 'workflows');
if (fs.existsSync(ghDir)) {
  const workflowFiles = fs.readdirSync(ghDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert(workflowFiles.length > 0, `GitHub Actions : ${workflowFiles.length} workflow(s) trouvé(s)`);

  let allWorkflowsSafe = true;
  for (const wf of workflowFiles) {
    const src = readSrc(`.github/workflows/${wf}`);
    // Vérifier que les secrets sont référencés via ${{ secrets.X }} pas hardcodés
    const hardcodedPatterns = src.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/g);
    if (hardcodedPatterns) {
      allWorkflowsSafe = false;
      console.error(`    ${FAIL} ${wf} : JWT hardcodé détecté`);
    }
    // service_role doit être dans ${{ secrets.X }}, pas hardcodé
    if (src.includes('service_role') && !src.includes('secrets.')) {
      allWorkflowsSafe = false;
      console.error(`    ${FAIL} ${wf} : service_role sans référence à secrets.X`);
    }
  }
  assert(allWorkflowsSafe, 'GitHub Actions : tous les workflows utilisent ${{ secrets.X }} correctement');

  // Vérifier que SUPABASE_SERVICE_KEY est bien dans secrets, pas en clair
  const allWorkflowSrc = workflowFiles.map(f => readSrc(`.github/workflows/${f}`)).join('\n');
  assert(
    !allWorkflowSrc.match(/SUPABASE_SERVICE_KEY\s*[:=]\s*['"]{1}[^'"]{10,}/),
    'SUPABASE_SERVICE_KEY jamais hardcodé dans les workflows'
  );
} else {
  warn('Pas de .github/workflows/ trouvé — audit GitHub Actions ignoré');
}

// ── Suite 6 : Edge Functions — ANTHROPIC_API_KEY dans secrets ────────────────

console.log('\nSuite 6 : Edge Functions — ANTHROPIC_API_KEY via Supabase secrets');

// Vérifier que les Edge Functions référencent la clé via Deno.env, pas en dur
const edgeFnDir = path.join(ROOT, 'supabase', 'functions');
if (fs.existsSync(edgeFnDir)) {
  const fnDirs = fs.readdirSync(edgeFnDir).filter(d =>
    fs.statSync(path.join(edgeFnDir, d)).isDirectory()
  );
  let edgeSafe = true;
  for (const fn of fnDirs) {
    const fnSrc = readSrc(`supabase/functions/${fn}/index.ts`) ||
                  readSrc(`supabase/functions/${fn}/index.js`);
    if (fnSrc && fnSrc.match(/ANTHROPIC_API_KEY\s*=\s*['"][^'"]{10,}/)) {
      edgeSafe = false;
      console.error(`    ${FAIL} ${fn}/index.ts : ANTHROPIC_API_KEY hardcodé !`);
    }
    // Doit utiliser Deno.env.get() ou process.env
    if (fnSrc && fnSrc.includes('ANTHROPIC') && !fnSrc.includes('Deno.env') && !fnSrc.includes('process.env')) {
      edgeSafe = false;
    }
  }
  assert(edgeSafe, `Edge Functions (${fnDirs.length}) : ANTHROPIC_API_KEY via Deno.env.get() uniquement`);
} else {
  warn('supabase/functions/ absent — Edge Functions non vérifiables localement');
}

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;
const score = Math.round(passed / (passed + failed + warned * 0.2) * 100);

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   SECRETS_EXPOSURE_SCORE : ${successRate}%`);
console.log(`   Taux de succès : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
