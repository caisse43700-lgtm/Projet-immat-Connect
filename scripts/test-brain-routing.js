#!/usr/bin/env node
// scripts/test-brain-routing.js — Validation comportementale statique du pipeline NS
// TRF-003 · INV-015
//
// Usage:
//   node scripts/test-brain-routing.js
//   node scripts/test-brain-routing.js --verbose
//   node scripts/test-brain-routing.js --check  → exit 1 si anomalies critiques

const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const NS_SRC = path.join(ROOT, 'immat-nervous-system.json');
const VERBOSE = process.argv.includes('--verbose');
const CHECK   = process.argv.includes('--check');

const ns = JSON.parse(fs.readFileSync(NS_SRC, 'utf8'));

// ── 1. Validation schéma NS (miroir de validateNSSchema dans brain-dialog) ──

function validateNSSchema(ns) {
  const required = ['organs', 'routing', 'inhibitions', 'invariants', 'ange_identity'];
  const errors = [];
  for (const field of required) {
    if (!ns[field] || typeof ns[field] !== 'object') {
      errors.push(`NS.${field} manquant ou invalide`);
    }
  }
  if (ns.organs && Object.keys(ns.organs).length === 0) {
    errors.push('NS.organs vide');
  }
  if (ns.ange_identity) {
    for (const f of ['posture', 'evaluation', 'limite']) {
      if (typeof ns.ange_identity[f] !== 'string' || !ns.ange_identity[f].trim()) {
        errors.push(`NS.ange_identity.${f} manquant ou vide`);
      }
    }
  }
  return errors;
}

// ── 2. Routing — résolution d'une question vers un organe ────────────────────

// Chaque clé du routing est un groupe de mots-clés séparés par |
// La valeur est l'organe cible.
// Utilise les frontières de mots (\b) pour les mots alphabétiques (évite "ange" dans "changer").
// Pour les tokens spéciaux (✦, camelCase, watchPosition) : match substring exact.
function resolveRouting(question, routing) {
  const matches = [];
  const q = question.toLowerCase();
  for (const [keywords, organ] of Object.entries(routing)) {
    const kws = keywords.split('|').map(k => k.toLowerCase().trim());
    const matched = kws.filter(kw => {
      if (/^[a-zÀ-ɏ-]+$/i.test(kw)) {
        // Mot alphabétique → frontière de mot + pluriel français optionnel (marqueur → marqueurs)
        // Explication : la table NS est en singulier ; Claude gère les pluriels sémantiquement,
        // mais le test doit aussi les couvrir pour ne pas générer de faux négatifs.
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}[sx]?\\b`).test(q);
      }
      // Token spécial ou camelCase → substring
      return q.includes(kw);
    });
    if (matched.length > 0) {
      matches.push({ organ, keywords: matched });
    }
  }
  return matches;
}

// ── 3. Cas de test curatés — questions réelles du Gardien ───────────────────
//
// Format : { q: "question", expect: "Organe" | null }
// expect = null → pas de routing attendu (lacune connue)

const TEST_CASES = [
  // Auth
  { q: "Pourquoi l'utilisateur reste bloqué après connexion ?", expect: "Auth" },
  { q: "Un conducteur reçoit une erreur lors de l'afterAuth", expect: "Auth" },
  { q: "La session expire sans que l'utilisateur soit déconnecté", expect: "Auth" },
  { q: "L'email de signup n'arrive pas", expect: "Auth" },

  // Profil
  { q: "Comment modifier le pseudo d'un conducteur ?", expect: "Profil" },
  { q: "Un utilisateur veut changer la couleur de sa plaque", expect: "Profil" },
  { q: "La plaque n'est pas sauvegardée après modification", expect: "Profil" },

  // Carte
  { q: "Les marqueurs ne s'affichent pas sur la carte", expect: "Carte" },
  { q: "La position GPS ne se met plus à jour", expect: "Carte" },
  { q: "Les voitures proches disparaissent de la carte", expect: "Carte" },
  { q: "Le marqueur du conducteur dévie de sa vraie position", expect: "Carte" },

  // Messages
  { q: "Un utilisateur ne reçoit pas les messages envoyés", expect: "Messages" },
  { q: "ImmatMessages ne charge pas les conversations", expect: "Messages" },
  { q: "L'envoi de message échoue silencieusement", expect: "Messages" },

  // Signalements
  { q: "Les alertes routières ne s'affichent pas aux conducteurs proches", expect: "Signalements" },
  { q: "Le signalement SOS ne déclenche pas de notification", expect: "Signalements" },
  { q: "Un signalement ne disparaît pas après résolution", expect: "Signalements" },
  { q: "Comment une urgence est-elle transmise aux helpers ?", expect: "Signalements" },

  // Ange
  { q: "L'Ange ne répond pas à mes questions de configuration", expect: "Ange" },
  { q: "Le bouton angeFab n'apparaît pas pour le gardien", expect: "Ange" },
  { q: "Comment soumettre une proposition à l'Ange ?", expect: "Ange" },
  { q: "Le fab du Gardien est inaccessible sur mobile", expect: "Ange" },

  // Conflits potentiels (2 organes possibles)
  { q: "Pourquoi le bouton de signalement ne s'affiche pas ?", expect: null },
  { q: "Le bouton de l'Ange interfère avec un marqueur SVG", expect: null },

  // Lacunes routing — questions sans mot-clé connu
  { q: "L'application plante au démarrage sur iOS", expect: null },
  { q: "Le mode invisible ne fonctionne pas", expect: null },
  { q: "Les notifications push n'arrivent pas", expect: null },
  { q: "L'appel audio échoue immédiatement", expect: null },
  { q: "Comment réinitialiser le cache d'un conducteur ?", expect: null },
];

// ── 4. Exécution ─────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(' VALIDATION COMPORTEMENTALE NS — ImmatConnect brain-dialog');
console.log(`${'═'.repeat(60)}\n`);

// 4a. Schema
const schemaErrors = validateNSSchema(ns);
console.log(`1. SCHÉMA NS (_v:${ns._v})`);
if (schemaErrors.length === 0) {
  console.log('   ✓ Tous les champs obligatoires présents');
} else {
  schemaErrors.forEach(e => console.log(`   ✗ ${e}`));
}
console.log();

// 4b. Routing
console.log('2. ROUTING — couverture par organe');
const coverageByOrgan = {};
for (const organ of Object.keys(ns.organs)) coverageByOrgan[organ] = 0;
for (const [, organ] of Object.entries(ns.routing)) {
  if (!(organ in coverageByOrgan)) {
    console.log(`   ⚠ routing pointe vers organe inconnu : "${organ}"`);
  }
}
const routingEntries = Object.entries(ns.routing);
const totalKeywords = routingEntries.reduce((acc, [k]) => acc + k.split('|').length, 0);
console.log(`   ${routingEntries.length} groupes, ${totalKeywords} mots-clés, ${Object.keys(ns.organs).length} organes`);
console.log();

// 4c. Test questions
console.log('3. TEST QUESTIONS GARDIEN');
const results = { ok: 0, conflict: 0, unrouted: 0, unexpected: 0 };
const unrouted = [];
const conflicts = [];
const unexpected = [];

for (const tc of TEST_CASES) {
  const matches = resolveRouting(tc.q, ns.routing);
  const organs  = [...new Set(matches.map(m => m.organ))];

  if (tc.expect === null) {
    // Question sans organe attendu — on note les conflits et les vrais no-match
    if (organs.length > 1) {
      conflicts.push({ q: tc.q, organs, matches });
      results.conflict++;
    } else if (organs.length === 0) {
      unrouted.push({ q: tc.q });
      results.unrouted++;
    } else {
      // Routé vers un seul organe — comportement pas attendu mais OK
      if (VERBOSE) console.log(`   ℹ  routé vers ${organs[0]} (non attendu mais unique) : "${tc.q.slice(0,60)}"`);
    }
  } else {
    // Question avec organe attendu
    if (organs.length === 0) {
      unexpected.push({ q: tc.q, expect: tc.expect, got: 'AUCUN' });
      results.unexpected++;
    } else if (!organs.includes(tc.expect)) {
      unexpected.push({ q: tc.q, expect: tc.expect, got: organs.join(', ') });
      results.unexpected++;
    } else if (organs.length > 1) {
      // Routé vers le bon mais aussi d'autres
      conflicts.push({ q: tc.q, organs, matches });
      results.conflict++;
      results.ok++;
    } else {
      results.ok++;
      if (VERBOSE) {
        const kws = matches.map(m => m.keywords.join('+')).join(', ');
        console.log(`   ✓ [${organs[0]}] "${tc.q.slice(0,55)}" (via: ${kws})`);
      }
    }
  }
}

// Résumé questions
console.log(`   ✓ ${results.ok} correctement routées`);
if (results.conflict > 0) console.log(`   ⚠ ${results.conflict} conflits (2+ organes matchés)`);
if (results.unrouted > 0) console.log(`   ○ ${results.unrouted} non routées (lacune routing, attendu)`);
if (results.unexpected > 0) console.log(`   ✗ ${results.unexpected} routées vers mauvais organe`);
console.log();

// 4d. Détails conflits
if (conflicts.length > 0) {
  console.log('4. CONFLITS DE ROUTING (2+ organes)');
  for (const c of conflicts) {
    console.log(`   ⚠ [${c.organs.join(' + ')}] "${c.q.slice(0, 60)}"`);
    if (VERBOSE) c.matches.forEach(m => console.log(`      → ${m.organ}: ${m.keywords.join(', ')}`));
  }
  console.log();
}

// 4e. Questions non routées (lacune)
if (unrouted.length > 0) {
  console.log('5. LACUNES ROUTING — questions sans mot-clé connu');
  for (const u of unrouted) {
    console.log(`   ○ "${u.q}"`);
  }
  console.log(`   → Note : Claude route sémantiquement même sans mot-clé exact.`);
  console.log(`   → DET-001 : envisager "appel|audio|webrtc|invisible|notification|cache" dans NS.routing.`);
  console.log();
}

// 4f. Erreurs de routing
if (unexpected.length > 0) {
  console.log('6. ERREURS — questions routées vers le mauvais organe');
  for (const u of unexpected) {
    console.log(`   ✗ Attendu [${u.expect}] → obtenu [${u.got}]`);
    console.log(`      "${u.q}"`);
  }
  console.log();
}

// 4g. Couverture organes (agrégée par organe, pas par groupe routing)
console.log('7. COUVERTURE ORGANES PAR LE ROUTING');
const organCoverage = {};
for (const organ of Object.keys(ns.organs)) organCoverage[organ] = { kws: 0, tests: 0 };
for (const [kwGroup, organ] of routingEntries) {
  const kws = kwGroup.split('|').map(k => k.trim());
  if (organ in organCoverage) organCoverage[organ].kws += kws.length;
}
for (const organ of Object.keys(organCoverage)) {
  const matchCount = TEST_CASES.filter(tc => {
    const matches = resolveRouting(tc.q, ns.routing);
    return matches.some(m => m.organ === organ);
  }).length;
  organCoverage[organ].tests = matchCount;
}
for (const [organ, cov] of Object.entries(organCoverage)) {
  const bar = '█'.repeat(Math.min(cov.tests, 10)).padEnd(10);
  console.log(`   ${organ.padEnd(14)} [${String(cov.kws).padStart(2)} mots-clés]  ${bar}  ${cov.tests} questions`);
}

console.log();
console.log('   FINDING: table NS en singulier — pluriels couverts par Claude (sémantique),');
console.log('            pas par regex. Acceptable pour un LLM ; limitation pour tout autre routeur.');
console.log();

// ── 5. Score final ────────────────────────────────────────────────────────────
console.log('═'.repeat(60));
const critiques = schemaErrors.length + results.unexpected;
const total = TEST_CASES.filter(tc => tc.expect !== null).length;
const score = Math.round((results.ok / total) * 100);
console.log(`\n SCORE ROUTING : ${score}% (${results.ok}/${total} questions avec organe attendu)`);
console.log(` SCHÉMA NS     : ${schemaErrors.length === 0 ? '✓ valide' : `✗ ${schemaErrors.length} erreur(s)`}`);
console.log(` CONFLITS      : ${conflicts.length} (avertissements — l'Ange trie par profondeur)`);
console.log(` LACUNES       : ${unrouted.length} questions sans routing (expansion possible)`);
console.log(` CRITIQUE      : ${critiques} (${critiques === 0 ? 'aucune anomalie bloquante' : 'ANOMALIES À CORRIGER'})`);
console.log();

if (CHECK && critiques > 0) {
  console.error(`[test-brain-routing] ✗ ${critiques} anomalie(s) critique(s) — exit 1`);
  process.exit(1);
} else if (CHECK) {
  console.log(`[test-brain-routing] ✓ Validation comportementale passée`);
  process.exit(0);
}
