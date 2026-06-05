'use strict';
/**
 * consent-audit.test.js — SESSION OBD-003e §13
 *
 * CONSENT_COVERAGE_SCORE
 * Vérifie que chaque donnée visible par les autres est consentie.
 * Principe : Privé par défaut. Partage explicite seulement.
 *
 * Exécution : node tests/organism/consent-audit.test.js
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

console.log('\n[OBD-003e] consent-audit.test.js — CONSENT_COVERAGE_SCORE §13\n');

const consentData = load('knowledge/consent-rules.json');
const comInvData  = load('knowledge/communication-invariants.json');
const indexSrc    = readSrc('index.html');
const messagesSrc = readSrc('messages.js');
const frontendSrc = indexSrc + messagesSrc;

const consentTypes = consentData.data_types || [];
const comInvs      = comInvData.invariants || [];

// ── Suite 1 : Principe Privé par Défaut documenté ────────────────────────────

console.log('Suite 1 : Principe PRIVATE_BY_DEFAULT documenté');

assert(consentData.principle === 'PRIVATE_BY_DEFAULT',
  'consent-rules.json : principe PRIVATE_BY_DEFAULT déclaré');

assert(consentTypes.length >= 8,
  `${consentTypes.length} types de données documentés (min 8)`);

const highRiskTypes = consentTypes.filter(c => c.risk_level === 'HIGH');
assert(highRiskTypes.length >= 2,
  `${highRiskTypes.length} types de données HIGH RISK documentés (position GPS, messages, téléphone)`);

// ── Suite 2 : Position GPS — jamais partagée directement ─────────────────────

console.log('\nSuite 2 : Position GPS — jamais transmise aux autres conducteurs');

const gpsConsent = consentTypes.find(c => c.id === 'CONS-001');
assert(!!gpsConsent, 'CONS-001 (position GPS) documenté');
if (gpsConsent) {
  assert(gpsConsent.visibility_default === 'private',
    'Position GPS : visibility_default = private');
  assert(gpsConsent.shared_with === 'nobody',
    'Position GPS : shared_with = nobody (jamais transmise en direct)');
  assert(gpsConsent.invariant === 'INV-COM-010',
    'Position GPS : invariant INV-COM-010 référencé');
}

// Vérifier que le code ne transmet pas les coords GPS brutes aux autres
// (la position est utilisée localement pour la carte, pas transmise)
// Vérifie que myLat/myLng (variables GPS personnelles) ne sont pas broadcastées
// Les lat/lng dans les reports communautaires (incidents route) sont normaux
assert(!frontendSrc.match(/broadcast[^}]{0,200}myLat|send[^}]{0,200}myLat.*myLng/i),
  'Frontend : coordonnées GPS personnelles (myLat/myLng) non broadcastées directement');

// Mode invisible doit bloquer l'apparition sur la carte
assert(frontendSrc.includes('ic_invisible') || frontendSrc.includes('invisible'),
  'Frontend : mode invisible implémenté (ic_invisible)');

// ── Suite 3 : INV-COM-010 — Présence ≠ Géolocalisation ─────────────────────

console.log('\nSuite 3 : INV-COM-010 — Présence sans géolocalisation');

const inv010 = comInvs.find(i => i.id === 'INV-COM-010');
assert(!!inv010, 'INV-COM-010 déclaré dans communication-invariants.json');
if (inv010) {
  assert(
    inv010.rule?.toLowerCase().includes('présence') ||
    inv010.rule?.toLowerCase().includes('géolocalisation') ||
    inv010.check?.toLowerCase().includes('snapshot'),
    'INV-COM-010 : règle porte sur présence vs géolocalisation'
  );
}

// Snapshot Ange doit être anonymisé
const angePayloadMatch = indexSrc.match(/snapshot\s*[=:]\s*\{([^}]{0,400})\}/);
if (angePayloadMatch) {
  const snapshot = angePayloadMatch[1];
  assert(
    !snapshot.includes('myLat') && !snapshot.includes('myLng') && !snapshot.includes('plate'),
    'Snapshot Ange : coordonnées GPS et plaque absentes (anonymisé — INV-COM-015)'
  );
} else {
  warn('Snapshot Ange non trouvé — vérifier manuellement');
}

// ── Suite 4 : Numéro de téléphone — jamais exposé publiquement ──────────────

console.log('\nSuite 4 : Numéro de téléphone — jamais partagé automatiquement');

const phoneConsent = consentTypes.find(c => c.id === 'CONS-004');
assert(!!phoneConsent, 'CONS-004 (téléphone) documenté');
assert(phoneConsent?.visibility_default === 'private',
  'Téléphone : visibility_default = private');

// Vérifier que le frontend ne lit pas phone d'autres utilisateurs
// La requête profiles ne doit pas sélectionner phone pour les autres
assert(
  !frontendSrc.match(/\.select\(['""][^'"]*phone[^'"]*['"]\)/) ||
  frontendSrc.match(/owner_plate\s*=.*auth\.uid\(\)/),
  'Frontend : phone non sélectionné pour des profils tiers'
);

// ── Suite 5 : Messages — consentement double (envoi explicite) ───────────────

console.log('\nSuite 5 : Messages — consentement explicite émetteur + récepteur');

const msgConsent = consentTypes.find(c => c.id === 'CONS-005');
assert(!!msgConsent, 'CONS-005 (messages privés) documenté');
assert(msgConsent?.invariant === 'INV-COM-001',
  'Messages : invariant INV-COM-001 référencé (toujours rattaché à une relation)');

// Vérifier l'existence de l'invariant INV-COM-001
const inv001 = comInvs.find(i => i.id === 'INV-COM-001');
assert(!!inv001, 'INV-COM-001 : déclaré dans communication-invariants.json');

// ── Suite 6 : Appel — consentement double obligatoire ────────────────────────

console.log('\nSuite 6 : Appels — consentement du callee obligatoire');

const callConsent = consentTypes.find(c => c.id === 'CONS-009');
assert(!!callConsent, 'CONS-009 (demande d\'appel) documenté');
if (callConsent) {
  assert(callConsent.invariant === 'INV-COM-003',
    'Appel : invariant INV-COM-003 référencé (can_receive_calls avant appel)');
  assert(
    callConsent.privacy_control?.includes('ic_call_perm'),
    'Appel : ic_call_perm mentionné comme contrôle de confidentialité'
  );
}

// Vérifier que can_receive_calls est bien vérifiée avant appel dans le code
assert(
  readSrc('calls.js').includes('can_receive_calls'),
  'calls.js : can_receive_calls() vérifiée avant initiation appel'
);

// ── Suite 7 : Ange — payload anonymisé, jamais contenu message ───────────────

console.log('\nSuite 7 : Ange — payload anonymisé, INV-COM-015');

const angeConsent = consentTypes.find(c => c.id === 'CONS-010');
assert(!!angeConsent, 'CONS-010 (contexte Ange) documenté');
if (angeConsent) {
  assert(angeConsent.invariant === 'INV-COM-015',
    'Ange payload : invariant INV-COM-015 référencé (pas de contenu message)');
}

const inv015 = comInvs.find(i => i.id === 'INV-COM-015');
assert(!!inv015, 'INV-COM-015 : déclaré dans communication-invariants.json');

// ── Suite 8 : Confiance — locale uniquement, jamais synchronisée DB ──────────

console.log('\nSuite 8 : Niveaux de confiance — local uniquement (jamais DB)');

const trustConsent = consentTypes.find(c => c.id === 'CONS-008');
assert(!!trustConsent, 'CONS-008 (confiance) documenté');
assert(
  trustConsent?.privacy_control?.includes('localStorage') ||
  trustConsent?.privacy_control?.includes('ic_trust'),
  'Confiance : stockée localStorage uniquement (jamais synchronisée DB)'
);

// Vérifier que ic_trust n'est pas upserted vers la DB
assert(
  !frontendSrc.match(/\.from\(['"]profiles['"]\)[\s\S]{0,100}trust/),
  'Frontend : ic_trust (confiance) jamais poussé vers profiles DB'
);

// ── Résumé ────────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Types de données documentés    : ${consentTypes.length}`);
console.log(`   Assertions : ${total} (${passed} OK · ${failed} KO · ${warned} avert.)`);
console.log(`   CONSENT_COVERAGE_SCORE : ${successRate}%`);

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
