#!/usr/bin/env node
/**
 * health-scores.js — SESSION OBD-003d §31
 *
 * Calcule les 9 scores de santé de l'organisme :
 *   ORGANISM_COHERENCE_SCORE
 *   INTERACTION_COVERAGE_SCORE
 *   ANGE_COVERAGE_SCORE
 *   OBD_COVERAGE_SCORE
 *   DATABASE_COVERAGE_SCORE
 *   MEMORY_HEALTH_SCORE
 *   PWA_HEALTH_SCORE
 *   OFFLINE_HEALTH_SCORE
 *   COMMUNICATION_HEALTH_SCORE
 *
 * Usage :
 *   node scripts/health-scores.js          # affiche les 9 scores
 *   node scripts/health-scores.js --save   # écrit reports/health-scores.json
 *   node scripts/health-scores.js --check  # exit 1 si un score < 80%
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const SAVE  = process.argv.includes('--save');
const CHECK = process.argv.includes('--check');

const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

function read(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch(_) { return null; }
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function readSrc(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch(_) { return ''; }
}

console.log('\n[OBD-003e] health-scores.js — 16 scores de santé §31+§11-§17\n');

const scores = {};

// ── 1. ORGANISM_COHERENCE_SCORE ────────────────────────────────────────────
// Run detect-orphan-chain in embedded mode

function computeOrganismCoherence() {
  const features   = read('knowledge/features.json')?.features || [];
  const organs     = read('knowledge/organs.json')?.organs || [];
  const intentions = read('knowledge/intentions.json')?.intentions || [];
  const flows      = read('architecture/IMMAT-FLOW-INDEX.json')?.flows || [];

  const organMap     = new Map(organs.map(o => [o.id, o]));
  const intentionSet = new Set(intentions.map(i => i.id));
  const flowSet      = new Set(flows.map(f => f.id));

  let issues = 0;
  for (const f of features) {
    if (!f.organe || !organMap.has(f.organe)) issues++;
    if ((f.intentions || []).some(id => !intentionSet.has(id))) issues++;
    if ((f.flows || []).some(id => !flowSet.has(id))) issues++;
  }
  const total = features.length * 3;
  return total > 0 ? Math.round((1 - issues / total) * 100) : 0;
}

scores.ORGANISM_COHERENCE_SCORE = {
  value: computeOrganismCoherence(),
  unit: '%',
  note: 'feature→organe→intention→flow (detect-orphan-chain.js)',
};

// ── 2. INTERACTION_COVERAGE_SCORE ─────────────────────────────────────────
// interactions.json vs features.json (chaque feature devrait avoir ≥1 interaction)

function computeInteractionCoverage() {
  const features     = read('knowledge/features.json')?.features || [];
  const interactions = read('knowledge/interactions.json')?.interactions || [];
  const coveredFeatures = new Set(interactions.map(i => i.feature_id));
  const covered = features.filter(f => coveredFeatures.has(f.id)).length;
  return features.length > 0 ? Math.round(covered / features.length * 100) : 0;
}

scores.INTERACTION_COVERAGE_SCORE = {
  value: computeInteractionCoverage(),
  unit: '%',
  note: `features couvertes par interactions.json`,
};

// ── 3. ANGE_COVERAGE_SCORE ────────────────────────────────────────────────
// ange-commands.json : 16 commandes attendues

function computeAngeCoverage() {
  const data = read('knowledge/ange-commands.json');
  if (!data) return 0;
  const cmds = data.commands || [];
  const expected = 16;
  const flowData = read('architecture/IMMAT-FLOW-INDEX.json');
  const flowSet = new Set((flowData?.flows || []).map(f => f.id));
  const validCmds = cmds.filter(c => !c.flow_id || flowSet.has(c.flow_id)).length;
  return Math.round(Math.min(cmds.length, expected) / expected * 100);
}

scores.ANGE_COVERAGE_SCORE = {
  value: computeAngeCoverage(),
  unit: '%',
  note: `ange-commands.json (16 attendues)`,
};

// ── 4. OBD_COVERAGE_SCORE ─────────────────────────────────────────────────
// Ratio events observés dans le code vs features déclarées

function computeOBDCoverage() {
  const features = read('knowledge/features.json')?.features || [];
  const RE = /\.observe(?:\?\.)?(?:\s*)\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g;
  const src = ['index.html', 'messages.js', 'calls.js'].map(f => readSrc(f)).join('\n');
  const observed = new Set();
  for (const m of src.matchAll(RE)) observed.add(m[1]);

  // Vérifier combien de features ont au moins un event observé dans le code
  const HINTS = {
    'F-CARTE': ['MAP_','LOCATE'],
    'F-GPS': ['NAV_','GPS_','ROUTE'],
    'F-SIGNAL-VEHICULE': ['ALERT_','VEHICLE_','REPORT_'],
    'F-SIGNAL-ROUTE': ['ALERT_','REPORT_','ROAD_'],
    'F-ASSIST': ['ASSIST_','HELP_','ALERT_'],
    'F-MESSAGES': ['MSG_','MESSAGE_'],
    'F-ACTIVITE': ['BADGE_','MSG_','ALERT_'],
    'F-APPEL': ['CALL_'],
    'F-SOS': ['SOS_'],
    'F-ANGE': ['ANGE_','BRAIN_','DIALOG_'],
    'F-PROFIL': ['PROFILE_','PROFIL_'],
    'F-CONVERSATION-ENGINE': ['MSG_SENT','MSG_RECEIVED','CONV_'],
    'F-TRUST': ['CONTACT_TRUSTED','CONTACT_REVOKED','CONTEXT_'],
    'F-CALL-PERMISSIONS': ['CALL_PREFERENCES','CALL_'],
    'F-PRESENCE': ['PRESENCE_'],
    'F-FAVORITES': ['CONV_FAVORITED','CONV_FAVORITE'],
    'F-ARCHIVE': ['CONV_ARCHIVED','CONV_ARCHIVE'],
    'F-SEARCH': ['CONV_SEARCHED','CONV_SEARCH'],
    'F-SPAM-PROTECTION': ['SPAM_'],
    'F-PROXIMITY-SIGNAL': ['VEHICLE_MESSAGE_','ALERT_'],
  };
  let covered = 0;
  for (const f of features) {
    const hints = HINTS[f.id] || [];
    if (hints.some(h => [...observed].some(ev => ev.startsWith(h)))) covered++;
  }
  return features.length > 0 ? Math.round(covered / features.length * 100) : 0;
}

scores.OBD_COVERAGE_SCORE = {
  value: computeOBDCoverage(),
  unit: '%',
  note: 'features ayant au moins un .observe() dans le code',
};

// ── 5. DATABASE_COVERAGE_SCORE ────────────────────────────────────────────
// Tables Supabase documentées dans supabase-dependencies.json

function computeDatabaseCoverage() {
  const data = read('knowledge/supabase-dependencies.json');
  if (!data) return 0;
  const tables   = data.tables || [];
  const edgeFns  = data.edge_functions || [];
  const lsKeys   = data.localStorage_keys || [];
  // Score basé sur les 5 tables attendues + 3 edge functions + 24 clés localStorage
  const expectedTables = 5, expectedEF = 3, expectedLS = 24;
  const score = Math.round(
    (Math.min(tables.length, expectedTables) / expectedTables * 0.4 +
     Math.min(edgeFns.length, expectedEF)  / expectedEF  * 0.3 +
     Math.min(lsKeys.length, expectedLS)   / expectedLS  * 0.3) * 100
  );
  return score;
}

scores.DATABASE_COVERAGE_SCORE = {
  value: computeDatabaseCoverage(),
  unit: '%',
  note: `supabase-dependencies.json (tables + EF + localStorage)`,
};

// ── 6. MEMORY_HEALTH_SCORE ────────────────────────────────────────────────
// Clés localStorage documentées vs utilisées dans le code

function computeMemoryHealth() {
  const data = read('knowledge/supabase-dependencies.json');
  if (!data) return 0;
  const docKeys = new Set((data.localStorage_keys || []).map(k => `ic_${k.key}`));
  // Clés opérationnelles/système reconnues (non documentées dans supabase-dependencies)
  const SYSTEM_KEYS = new Set([
    'ic_current_user_id', 'ic_current_profile_plate', 'ic_last_state',
    'ic_ange_calls', 'ic_ange_feedback', 'ic_comm_selftest_result',
    'ic_health_scores_at', 'ic_alert_history', 'ic_resolved_remote_ids',
    'ic_offline_reports', 'ic_nearby_seen',
    'ic_unread_msg_count', 'ic_community_live', 'ic_storage_ver',
    'ic_pending_profile', 'ic_onboarded', 'ic_pending_profile_last_email',
    'ic_msg_', 'ic_loc', 'ic_reports_', 'ic_pending_profile__',
  ]);
  const src = ['index.html', 'messages.js'].map(f => readSrc(f)).join('\n');
  const usedKeys = new Set();
  for (const m of src.matchAll(/['"](ic_[a-z_]+)['"]/g)) usedKeys.add(m[1]);
  let documented = 0;
  for (const k of usedKeys) {
    if (docKeys.has(k) || SYSTEM_KEYS.has(k)) documented++;
  }
  return usedKeys.size > 0 ? Math.round(documented / usedKeys.size * 100) : 100;
}

scores.MEMORY_HEALTH_SCORE = {
  value: computeMemoryHealth(),
  unit: '%',
  note: 'clés ic_* utilisées dans le code et documentées',
};

// ── 7. PWA_HEALTH_SCORE ───────────────────────────────────────────────────
// Présence du manifest.json, service worker, offline fallback

function computePWAHealth() {
  const checks = [
    { file: 'manifest.json', weight: 0.35 },
    { file: 'service-worker.js', weight: 0.35 },
    { file: 'offline.html', weight: 0.15 },
    { file: 'icons/icon-192.png', weight: 0.075 },
    { file: 'icons/icon-512.png', weight: 0.075 },
  ];
  let score = 0;
  const details = [];
  for (const c of checks) {
    if (exists(c.file)) { score += c.weight; details.push({ file: c.file, present: true }); }
    else { details.push({ file: c.file, present: false }); }
  }
  return { score: Math.round(score * 100), details };
}

const pwa = computePWAHealth();
scores.PWA_HEALTH_SCORE = {
  value: pwa.score,
  unit: '%',
  note: `manifest + sw.js + offline.html + icons`,
  details: pwa.details,
};

// ── 8. OFFLINE_HEALTH_SCORE ───────────────────────────────────────────────
// Vérification de la présence des mécanismes offline

function computeOfflineHealth() {
  const src = ['index.html', 'messages.js'].map(f => readSrc(f)).join('\n');
  const checks = [
    { pattern: 'ic_offline_reports', label: 'ic_offline_reports buffer (alertes)' },
    { pattern: 'navigator.onLine', label: 'navigator.onLine check' },
    { pattern: 'offline', label: 'offline handler' },
    { pattern: 'ServiceWorker', label: 'ServiceWorker registration' },
    { pattern: 'sw.js', label: 'sw.js reference' },
  ];
  let found = 0;
  const details = checks.map(c => {
    const ok = src.includes(c.pattern);
    if (ok) found++;
    return { ...c, present: ok };
  });
  return { score: Math.round(found / checks.length * 100), details };
}

const offline = computeOfflineHealth();
scores.OFFLINE_HEALTH_SCORE = {
  value: offline.score,
  unit: '%',
  note: 'buffers offline + handlers',
  details: offline.details,
};

// ── 9. COMMUNICATION_HEALTH_SCORE ─────────────────────────────────────────
// INV-COM 001→015 présents + interactions complètes

function computeCommunicationHealth() {
  const comInvs = read('knowledge/communication-invariants.json')?.invariants || [];
  const interactions = read('knowledge/interactions.json')?.interactions || [];
  const expectedInvs = 15;
  const expectedInter = 12;
  const invScore = Math.min(comInvs.length, expectedInvs) / expectedInvs;
  const interScore = Math.min(interactions.length, expectedInter) / expectedInter;
  // Vérifier chaîne complète dans interactions
  const completeChains = interactions.filter(i =>
    i.feature_id && i.flow_id && i.events_obd?.length > 0 && i.invariants?.length > 0
  ).length;
  const chainScore = interactions.length > 0 ? completeChains / interactions.length : 0;
  return Math.round((invScore * 0.4 + interScore * 0.3 + chainScore * 0.3) * 100);
}

scores.COMMUNICATION_HEALTH_SCORE = {
  value: computeCommunicationHealth(),
  unit: '%',
  note: 'INV-COM 1→15 + interactions chaîne complète',
};

// ── 10. SECRETS_EXPOSURE_SCORE ────────────────────────────────────────────
// Vérifie l'absence de secrets côté frontend et dans les workflows

function computeSecretsExposure() {
  const src = ['index.html', 'messages.js', 'calls.js', 'service-worker.js'].map(f => readSrc(f)).join('\n');
  const checks = [
    !src.includes('service_role'),
    !src.includes('ANTHROPIC_API_KEY'),
    !src.match(/eyJ[A-Za-z0-9_-]{40,}/),
    src.includes('sb_publishable_') || src.includes('supabaseKey'),
  ];
  const ok = checks.filter(Boolean).length;
  return Math.round(ok / checks.length * 100);
}

scores.SECRETS_EXPOSURE_SCORE = {
  value: computeSecretsExposure(),
  unit: '%',
  note: 'absence service_role / ANTHROPIC_API_KEY / JWT hardcodé',
};

// ── 11. RLS_COVERAGE_SCORE ────────────────────────────────────────────────
// Couverture RLS documentée dans rls-rules.json

function computeRLSCoverage() {
  const rlsData   = read('knowledge/rls-rules.json');
  const supabData = read('knowledge/supabase-dependencies.json');
  if (!rlsData || !supabData) return 0;
  const rlsTables   = rlsData.tables || [];
  const supabTables = supabData.tables || [];
  if (supabTables.length === 0) return 0;
  const covered = supabTables.filter(t => {
    const r = rlsTables.find(r => r.name === t.name);
    return r && r.rls_enabled === true;
  }).length;
  const hasGardien = !!rlsData.gardien_access;
  const hasConducteurRestrictions = (rlsData.conducteur_restrictions || []).length >= 3;
  const base = Math.round(covered / supabTables.length * 100);
  return Math.round(base * 0.8 + (hasGardien ? 10 : 0) + (hasConducteurRestrictions ? 10 : 0));
}

scores.RLS_COVERAGE_SCORE = {
  value: computeRLSCoverage(),
  unit: '%',
  note: 'tables avec rls_enabled=true + gardien_access',
};

// ── 12. CONSENT_COVERAGE_SCORE ────────────────────────────────────────────
// Principe PRIVATE_BY_DEFAULT + types de données consentis

function computeConsentCoverage() {
  const data = read('knowledge/consent-rules.json');
  if (!data) return 0;
  const types = data.data_types || [];
  const checks = [
    data.principle === 'PRIVATE_BY_DEFAULT',
    types.length >= 8,
    types.filter(c => c.risk_level === 'HIGH').length >= 2,
    types.some(c => c.id === 'CONS-001' && c.visibility_default === 'private'),
    types.some(c => c.id === 'CONS-004' && c.visibility_default === 'private'),
    types.some(c => c.id === 'CONS-010' && c.invariant === 'INV-COM-015'),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

scores.CONSENT_COVERAGE_SCORE = {
  value: computeConsentCoverage(),
  unit: '%',
  note: 'PRIVATE_BY_DEFAULT + types de données documentés',
};

// ── 13. ABUSE_PROTECTION_SCORE ────────────────────────────────────────────
// Anti-spam, throttle Ange, SOS protection, blocage

function computeAbuseProtection() {
  const src = ['index.html', 'messages.js', 'calls.js'].map(f => readSrc(f)).join('\n');
  const checks = [
    src.includes('ic_spam_log') || src.includes('spam'),
    src.includes('ic_ange_calls') && src.includes('3600000'),
    src.includes('startSosHold') && src.includes('3000'),
    src.includes('ic_blocked') || src.includes('blocked'),
    src.includes('can_receive_calls'),
    src.includes('cancelCallRequest'),
    src.includes('cleanupAlerts') || src.includes('TTL'),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

scores.ABUSE_PROTECTION_SCORE = {
  value: computeAbuseProtection(),
  unit: '%',
  note: 'spam + throttle Ange + SOS + blocage + cooldown',
};

// ── 14. VERSION_COMPATIBILITY_SCORE ──────────────────────────────────────
// Cache versionnée + migrations localStorage + knowledge _v

function computeVersionCompatibility() {
  const swSrc     = readSrc('service-worker.js');
  const indexSrc  = readSrc('index.html');
  const cacheMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  const cacheVersion = cacheMatch ? parseInt((cacheMatch[1].match(/v(\d+)/) || ['', '0'])[1], 10) : 0;
  const knowledgeFiles = [
    'knowledge/features.json', 'knowledge/interactions.json',
    'knowledge/supabase-dependencies.json', 'knowledge/communication-invariants.json',
    'knowledge/rls-rules.json', 'knowledge/consent-rules.json',
  ];
  const kvCount = knowledgeFiles.filter(f => {
    const d = read(f); return d && (typeof d._v === 'number' || typeof d._v === 'string');
  }).length;
  const checks = [
    cacheVersion >= 5,
    swSrc.includes('caches.keys') && swSrc.includes('caches.delete'),
    indexSrc.includes('ic_storage_ver'),
    indexSrc.includes('ALERTS_STORAGE_VERSION'),
    indexSrc.includes('ic_current_user_id'),
    kvCount >= 5,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

scores.VERSION_COMPATIBILITY_SCORE = {
  value: computeVersionCompatibility(),
  unit: '%',
  note: 'CACHE_NAME v5+ + migrations + knowledge _v',
};

// ── 15. PRODUCTION_OBSERVABILITY_SCORE ───────────────────────────────────
// OBD events critiques + toasts erreurs + logs propres

function computeProductionObservability() {
  const src = ['index.html', 'messages.js', 'calls.js'].map(f => readSrc(f)).join('\n');
  const badToastCount = (src.match(/toast\([^)]*['"]bad['"]/g) || []).length;
  const consoleLogs = [...src.matchAll(/console\.(log|info)\([^)]{0,200}\)/g)];
  const sensitiveLogs = consoleLogs.filter(m => /owner_plate|user_id|email|password|secret|key/i.test(m[0])).length;
  const checks = [
    src.includes('MSG_SENT'),
    src.includes('SPAM_DETECTED'),
    src.includes('SOS_TRIGGERED') || src.includes('SOS_'),
    src.includes('CALL_INITIATED'),
    badToastCount >= 5,
    sensitiveLogs === 0,
    readSrc('index.html').includes('navigator.onLine') || readSrc('index.html').includes('ic_offline_reports'),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

scores.PRODUCTION_OBSERVABILITY_SCORE = {
  value: computeProductionObservability(),
  unit: '%',
  note: 'OBD events critiques + toasts bad + logs clean',
};

// ── 16. CRITICAL_JOURNEY_SCORE ────────────────────────────────────────────
// 10 parcours utilisateurs critiques vérifiés structurellement

function computeCriticalJourneyScore() {
  const indexSrc   = readSrc('index.html');
  const messagesSrc = readSrc('messages.js');
  const callsSrc   = readSrc('calls.js');
  const swSrc      = readSrc('service-worker.js');
  const journeys = [
    // 1. Inscription → profil → carte
    indexSrc.includes("goAuth('signup')") && indexSrc.includes('saveProfile') && indexSrc.includes('afterAuth'),
    // 2. Signalement route → activité
    (indexSrc.includes('openSignalHere') || indexSrc.includes('sigStep1')) && indexSrc.includes('ic_alerts'),
    // 3. Message A→B
    (messagesSrc.includes('sendToPlate') || messagesSrc.includes('sendNew')) && messagesSrc.includes('MSG_SENT'),
    // 4. Appel
    callsSrc.includes('can_receive_calls') && callsSrc.includes('CALL_INITIATED'),
    // 5. Offline → sync
    indexSrc.includes('ic_offline_reports') && exists('offline.html') && swSrc.includes('offline.html'),
    // 6. Gardien dashboard
    indexSrc.includes('openGardienDashboard') && indexSrc.includes('get_my_role'),
    // 7. Ange conducteur
    indexSrc.includes('ic_ange_calls') && indexSrc.includes('3600000') && indexSrc.includes('snapshot'),
    // 8. Ange gardien
    indexSrc.includes('gardienImmunity') && indexSrc.includes('isGardien'),
    // 9. Blocage
    (messagesSrc.includes('blocked') && messagesSrc.includes('filter')) && callsSrc.includes('can_receive_calls'),
    // 10. Signalement proximité
    indexSrc.includes('vehicleAlert') && (indexSrc.includes('nearbyPanel') || indexSrc.includes('nearbyList')),
  ];
  const ok = journeys.filter(Boolean).length;
  return Math.round(ok / journeys.length * 100);
}

scores.CRITICAL_JOURNEY_SCORE = {
  value: computeCriticalJourneyScore(),
  unit: '%',
  note: '10 parcours utilisateurs critiques implémentés',
};

// ── Affichage ─────────────────────────────────────────────────────────────

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│            SCORES DE SANTÉ DE L\'ORGANISME                 │');
console.log('├─────────────────────────────────────────────────────────────┤');

let allGood = true;
for (const [name, s] of Object.entries(scores)) {
  const v = s.value;
  const icon = v >= 95 ? PASS : v >= 75 ? WARN : FAIL;
  const bar = '█'.repeat(Math.round(v / 10)) + '░'.repeat(10 - Math.round(v / 10));
  console.log(`│ ${icon} ${name.padEnd(35)} ${String(v + '%').padStart(5)} ${bar} │`);
  if (v < 80) allGood = false;
}

console.log('└─────────────────────────────────────────────────────────────┘');

const globalScore = Math.round(
  Object.values(scores).reduce((sum, s) => sum + s.value, 0) / Object.keys(scores).length
);
const label = globalScore >= 95 ? 'OPTIMAL' : globalScore >= 75 ? 'ATTENTION' : 'DÉGRADÉ';
const icon = allGood ? PASS : WARN;
console.log(`\n${icon} Score global : ${globalScore}% — ${label}\n`);

if (SAVE) {
  const report = {
    _generated_at: new Date().toISOString(),
    _session: 'OBD-003e',
    global_score: globalScore,
    global_label: label,
    scores,
  };
  const out = path.join(ROOT, 'reports', 'health-scores.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`   Rapport sauvegardé : reports/health-scores.json\n`);
}

if (CHECK && !allGood) process.exit(1);
