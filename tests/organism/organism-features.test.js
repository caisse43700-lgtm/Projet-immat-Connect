'use strict';
/**
 * organism-features.test.js — SESSION OBD-002c
 *
 * Tests structurels de l'intégrité des déclarations knowledge pour chaque feature.
 * Vérifie que chaque feature respecte la chaîne :
 *   déclaration complète → organe valide → intentions valides → flows valides
 *
 * Ce test est la réponse aux 11 LOW "NO_ORPHAN_TEST" de OBD-002b.
 * Ce ne sont PAS des tests E2E — ils vérifient la cohérence des référentiels.
 *
 * Features couvertes :
 *   F-CARTE, F-GPS, F-SIGNAL-VEHICULE, F-SIGNAL-ROUTE, F-ASSIST,
 *   F-MESSAGES, F-ACTIVITE, F-APPEL, F-SOS, F-ANGE, F-PROFIL
 *   + DAM Phase 1 : F-CONVERSATION-ENGINE, F-TRUST, F-CALL-PERMISSIONS,
 *     F-PRESENCE, F-FAVORITES, F-ARCHIVE, F-SEARCH, F-SPAM-PROTECTION
 *
 * Exécution : node tests/organism/organism-features.test.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let passed = 0, failed = 0, warned = 0;

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function assert(condition, label, detail) {
  if (condition) {
    passed++;
    console.log(`    ${PASS} ${label}`);
  } else {
    failed++;
    console.error(`    ${FAIL} ${label}`);
    if (detail) console.error(`       → ${detail}`);
  }
}

function warn(label) {
  warned++;
  console.log(`    ${WARN} ${label}`);
}

// ── Charger les référentiels ───────────────────────────────────────────────

const featuresData  = load('knowledge/features.json');
const organsData    = load('knowledge/organs.json');
const intentsData   = load('knowledge/intentions.json');
const flowData      = load('architecture/IMMAT-FLOW-INDEX.json');
const invData       = load('knowledge/organism-invariants.json');

const features   = featuresData.features;
const organMap   = new Map(organsData.organs.map(o => [o.id, o]));
const intentSet  = new Set((intentsData.intentions || []).map(i => i.id));
const flowSet    = new Set((flowData.flows || []).map(f => f.id));
const invOrgIds  = new Set((invData.invariants || []).map(i => i.id));

// ── Suite 1 : Intégrité globale des référentiels ───────────────────────────

console.log('\n[OBD-002c] Tests structurels des features d\'ImmatConnect\n');

console.log('Suite 1 : Intégrité des référentiels knowledge');
assert(features.length >= 20,
  `Au moins 20 features déclarées (trouvé : ${features.length})`);
assert(organsData.organs.length >= 6,
  `Au moins 6 organes déclarés (trouvé : ${organsData.organs.length})`);
assert((intentsData.intentions || []).length >= 34,
  `Au moins 34 intentions déclarées (trouvé : ${(intentsData.intentions||[]).length})`);
assert((flowData.flows || []).length >= 28,
  `Au moins 28 flows déclarés (trouvé : ${(flowData.flows||[]).length})`);
assert(invOrgIds.size >= 8,
  `8 invariants INV-ORG-* déclarés (trouvé : ${invOrgIds.size})`);

// ── Suite 2 : Tests par feature ────────────────────────────────────────────

const FEATURE_IDS = [
  'F-CARTE', 'F-GPS', 'F-SIGNAL-VEHICULE', 'F-SIGNAL-ROUTE',
  'F-ASSIST', 'F-MESSAGES', 'F-ACTIVITE', 'F-APPEL',
  'F-SOS', 'F-ANGE', 'F-PROFIL',
  // DAM-COMMUNICATION Phase 1
  'F-CONVERSATION-ENGINE', 'F-TRUST', 'F-CALL-PERMISSIONS',
  'F-PRESENCE', 'F-FAVORITES', 'F-ARCHIVE', 'F-SEARCH', 'F-SPAM-PROTECTION',
  // OBD-003c
  'F-PROXIMITY-SIGNAL',
];

// Comportements attendus : Phase actuelle, dépréciation volontaire
const FEATURE_META = {
  'F-APPEL': {
    phase: 'Phase A actif (call_requests) — Phase B futur (WebRTC)',
    deferred: ['WebRTC P2P transport'],
  },
  'F-ANGE': {
    throttle: '10 appels/heure par session',
  },
  'F-GPS': {
    note: 'navPremium = données simulées P1-002',
  },
  'F-SOS': {
    note: 'Canal SOS distinct = futur P3-023',
  },
  // DAM-COMMUNICATION Phase 1
  'F-CONVERSATION-ENGINE': {
    note: 'ONE_RELATION_ONE_TIMELINE — messages + appels dans un seul fil',
  },
  'F-TRUST': {
    note: 'Niveaux NONE/CONTEXT/TRUSTED/FAVORITE — stockés localStorage ic_trust',
  },
  'F-CALL-PERMISSIONS': {
    note: 'Niveaux 1-4 — persistés ic_call_perm, DND ic_dnd/ic_dnd_from/ic_dnd_to',
  },
  'F-PRESENCE': {
    note: '5 statuts — persistés ic_presence',
  },
  'F-FAVORITES': {
    note: 'Conversations épinglées — persistées ic_favorites',
  },
  'F-ARCHIVE': {
    note: 'Archivage souple (pas de suppression physique INV-COM-009) — ic_archived',
  },
  'F-SEARCH': {
    note: 'Recherche locale sur plaque/message — ic_search_query éphémère',
  },
  'F-SPAM-PROTECTION': {
    note: 'Seuil anti-spam : 20 msg/60s — log ic_spam_log',
  },
  'F-PROXIMITY-SIGNAL': {
    note: 'Signal discret via Ange ou frontCarBanner — utilise vehicleAlertQuick() (FLOW-PROXIMITY-SIGNAL)',
  },
};

for (const fid of FEATURE_IDS) {
  const feature = features.find(f => f.id === fid);
  console.log(`\nSuite 2.${FEATURE_IDS.indexOf(fid)+1} : ${fid}`);

  // ── Déclaration présente ─────────────────────────────────────────────────
  assert(!!feature, `${fid} déclaré dans knowledge/features.json`);
  if (!feature) continue;

  // ── Champs obligatoires ──────────────────────────────────────────────────
  assert(typeof feature.nom === 'string' && feature.nom.length > 0,
    `${fid} : nom présent ("${feature.nom}")`);
  assert(typeof feature.description === 'string' && feature.description.length > 0,
    `${fid} : description présente`);
  assert(Array.isArray(feature.actions) && feature.actions.length > 0,
    `${fid} : actions[] non vide (${feature.actions?.length} action(s))`);
  assert(feature.statut === 'actif',
    `${fid} : statut = 'actif' (actuel : '${feature.statut}')`);

  // ── Maillon Organe ───────────────────────────────────────────────────────
  assert(typeof feature.organe === 'string' && feature.organe.length > 0,
    `${fid} : organe déclaré ("${feature.organe}")`);
  assert(organMap.has(feature.organe),
    `${fid} : organe '${feature.organe}' existe dans organs.json`);

  // ── Maillon Intentions ───────────────────────────────────────────────────
  const featureIntentions = feature.intentions || [];
  const organIntentions   = organMap.get(feature.organe)?.intentions || [];
  const effectiveIntentions = featureIntentions.length > 0 ? featureIntentions : organIntentions;

  assert(effectiveIntentions.length > 0,
    `${fid} : intentions déclarées (${effectiveIntentions.length} — via ${featureIntentions.length > 0 ? 'feature' : 'organe'})`);

  for (const intentId of featureIntentions) {
    assert(intentSet.has(intentId),
      `${fid} : intention '${intentId}' existe dans intentions.json`);
  }

  // ── Maillon Flow ─────────────────────────────────────────────────────────
  const featureFlows = feature.flows || [];
  assert(featureFlows.length > 0,
    `${fid} : flows[] non vide (${featureFlows.length} flow(s))`);

  for (const flowId of featureFlows) {
    assert(flowSet.has(flowId),
      `${fid} : flow '${flowId}' existe dans IMMAT-FLOW-INDEX.json`);
  }

  // ── Maillon Invariant (via organe) ───────────────────────────────────────
  const organ = organMap.get(feature.organe);
  const organConstraints = organ?.constraints || [];
  if (organConstraints.length > 0) {
    assert(true, `${fid} : organe '${feature.organe}' protégé par ${organConstraints.length} invariant(s) (${organConstraints.join(', ')})`);
  } else {
    warn(`${fid} : organe '${feature.organe}' sans contrainte INV-* — à compléter`);
  }

  // ── Notes et dépréciations volontaires ───────────────────────────────────
  const meta = FEATURE_META[fid];
  if (meta?.deferred) {
    warn(`${fid} : éléments délibérément reportés — ${meta.deferred.join(', ')}`);
  }
  if (meta?.note) {
    warn(`${fid} : note — ${meta.note}`);
  }
}

// ── Suite 3 : Invariants organisme ────────────────────────────────────────

console.log('\nSuite 3 : Invariants INV-ORG-001 à INV-ORG-008');
for (let n = 1; n <= 8; n++) {
  const id = `INV-ORG-00${n}`;
  assert(invOrgIds.has(id), `${id} déclaré dans knowledge/organism-invariants.json`);
}

// ── Suite 4 : Cohérence croisée ───────────────────────────────────────────

console.log('\nSuite 4 : Cohérence croisée referentiels');

// Tous les organes référencés par les features existent
const referencedOrgans = new Set(features.map(f => f.organe).filter(Boolean));
for (const orgId of referencedOrgans) {
  assert(organMap.has(orgId),
    `Organe '${orgId}' référencé par features et présent dans organs.json`);
}

// Tous les flows référencés par les features existent
const referencedFlows = features.flatMap(f => f.flows || []);
const missingFlows = referencedFlows.filter(fid => !flowSet.has(fid));
assert(missingFlows.length === 0,
  `Tous les flows référencés par features existent dans FLOW-INDEX`,
  missingFlows.length > 0 ? `Flows manquants : ${missingFlows.join(', ')}` : '');

// Toutes les intentions référencées existent
const referencedIntents = features.flatMap(f => f.intentions || []);
const missingIntents = referencedIntents.filter(i => !intentSet.has(i));
assert(missingIntents.length === 0,
  `Toutes les intentions référencées existent dans intentions.json`,
  missingIntents.length > 0 ? `Intentions manquantes : ${missingIntents.join(', ')}` : '');

// ── Suite 5 : Invariants communication INV-COM-001 à INV-COM-010 ──────────

console.log('\nSuite 5 : Invariants INV-COM-001 à INV-COM-010 (DAM Phase 1)');

let comInvData;
try {
  comInvData = load('knowledge/communication-invariants.json');
} catch (e) {
  comInvData = null;
  failed++;
  console.error(`    ${FAIL} knowledge/communication-invariants.json introuvable`);
}

if (comInvData) {
  const comInvIds = new Set((comInvData.invariants || []).map(i => i.id));
  assert(comInvIds.size >= 10,
    `Au moins 10 invariants INV-COM-* déclarés (trouvé : ${comInvIds.size})`);
  for (let n = 1; n <= 10; n++) {
    const id = n < 10 ? `INV-COM-00${n}` : `INV-COM-0${n}`;
    assert(comInvIds.has(id), `${id} déclaré dans knowledge/communication-invariants.json`);
  }
  // Vérifier les invariants critiques
  const criticalInvs = {
    'INV-COM-004': 'blocage interdit toute communication',
    'INV-COM-009': 'pas de suppression physique',
    'INV-COM-010': 'aucune donnée privée au Gardien',
  };
  for (const [id, desc] of Object.entries(criticalInvs)) {
    const inv = (comInvData.invariants || []).find(i => i.id === id);
    assert(!!inv, `${id} présent (${desc})`);
    if (inv) {
      assert(typeof inv.rule === 'string' && inv.rule.length > 0,
        `${id} : champ 'rule' non vide`);
    }
  }
}

// ── Suite 6 : Invariants communication INV-COM-011 à INV-COM-015 ──────────

console.log('\nSuite 6 : Invariants INV-COM-011 à INV-COM-015 (OBD-003c)');

if (comInvData) {
  const comInvIds = new Set((comInvData.invariants || []).map(i => i.id));
  assert(comInvIds.size >= 15,
    `Au moins 15 invariants INV-COM-* déclarés (trouvé : ${comInvIds.size})`);
  for (let n = 11; n <= 15; n++) {
    const id = `INV-COM-0${n}`;
    assert(comInvIds.has(id), `${id} déclaré dans knowledge/communication-invariants.json`);
  }
  // Vérifier les nouveaux invariants critiques OBD-003c
  const criticalInvsObd = {
    'INV-COM-011': 'toute interaction observable par OBD',
    'INV-COM-014': 'contradictions résolues en faveur de la sécurité',
    'INV-COM-015': "l'Ange n'accède jamais au contenu des messages",
  };
  for (const [id, desc] of Object.entries(criticalInvsObd)) {
    const inv = (comInvData.invariants || []).find(i => i.id === id);
    assert(!!inv, `${id} présent (${desc})`);
    if (inv) {
      assert(typeof inv.rule === 'string' && inv.rule.length > 0,
        `${id} : champ 'rule' non vide`);
    }
  }
} else {
  warn('Suite 6 ignorée — communication-invariants.json non chargé');
}

// ── Suite 7 : Fichiers knowledge OBD-003c ─────────────────────────────────

console.log('\nSuite 7 : Fichiers knowledge OBD-003c');

const newKnowledgeFiles = [
  'knowledge/interactions.json',
  'knowledge/ange-commands.json',
  'knowledge/supabase-dependencies.json',
  'knowledge/contradiction-rules.json',
  'knowledge/future-components.json',
];

for (const kf of newKnowledgeFiles) {
  let data;
  try {
    data = load(kf);
    assert(!!data, `${kf} : fichier lisible et JSON valide`);
  } catch (e) {
    failed++;
    console.error(`    ${FAIL} ${kf} : INTROUVABLE ou JSON invalide`);
    continue;
  }
  // Vérifications spécifiques
  if (kf === 'knowledge/interactions.json') {
    const items = data.interactions || [];
    assert(items.length >= 8, `interactions.json : au moins 8 interactions documentées (trouvé : ${items.length})`);
    const requiredFields = ['id', 'titre', 'acteur', 'organe', 'flow_id', 'events_obd', 'invariants'];
    const first = items[0];
    if (first) {
      for (const f of requiredFields) {
        assert(first[f] !== undefined, `interactions.json[0] : champ '${f}' présent`);
      }
    }
  }
  if (kf === 'knowledge/ange-commands.json') {
    const cmds = data.commands || [];
    assert(cmds.length >= 12, `ange-commands.json : au moins 12 commandes Ange (trouvé : ${cmds.length})`);
  }
  if (kf === 'knowledge/contradiction-rules.json') {
    const rules = data.rules || [];
    assert(rules.length >= 5, `contradiction-rules.json : au moins 5 règles de conflit (trouvé : ${rules.length})`);
    const first = rules[0];
    if (first) {
      assert(typeof first.resolution_winner === 'string', `contradiction-rules.json[0] : champ 'resolution_winner' présent`);
    }
  }
  if (kf === 'knowledge/future-components.json') {
    const comps = data.components || [];
    assert(comps.length >= 5, `future-components.json : au moins 5 composants réservés (trouvé : ${comps.length})`);
  }
  if (kf === 'knowledge/supabase-dependencies.json') {
    assert(Array.isArray(data.tables), `supabase-dependencies.json : champ 'tables' présent`);
    assert(Array.isArray(data.edge_functions), `supabase-dependencies.json : champ 'edge_functions' présent`);
  }
}

// ── Résumé ────────────────────────────────────────────────────────────────

const total = passed + failed;
const successRate = total > 0 ? Math.round(passed / total * 100) : 0;

console.log('\n── Résumé ──────────────────────────────────────────────────');
console.log(`   Features vérifiées : ${FEATURE_IDS.length}`);
console.log(`   Assertions         : ${total} (${passed} OK · ${failed} KO · ${warned} avertissements)`);
console.log(`   Taux de succès     : ${successRate}%`);

if (warned > 0) {
  console.log(`\n   Note : ${warned} avertissement(s) = éléments délibérément Phase 2 ou simulés.`);
  console.log(`   Ce n'est pas un échec — c'est de la transparence architecturale.`);
}

const icon = failed === 0 ? `${PASS} SUCCÈS` : `${FAIL} ÉCHEC`;
console.log(`\n── Résultat : ${icon} ──────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
