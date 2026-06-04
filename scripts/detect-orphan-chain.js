#!/usr/bin/env node
/**
 * detect-orphan-chain.js — SESSION OBD-002b
 *
 * Règle ORPHAN_CHAIN : toute feature déclarée dans knowledge/features.json
 * doit posséder une chaîne complète :
 *   Feature → Organe → Intention → Flow → Invariant → Observation OBD → Test
 *
 * Sévérités :
 *   HIGH   = maillon structurel manquant (organe, flow, intention)
 *   MEDIUM = maillon de cohérence manquant (invariant, observation OBD)
 *   LOW    = maillon de qualité manquant (test, documentation)
 *
 * Usage :
 *   node scripts/detect-orphan-chain.js           # rapport JSON stdout
 *   node scripts/detect-orphan-chain.js --check   # exit 1 si HIGH
 *   node scripts/detect-orphan-chain.js --save    # écrit reports/orphan-chain-report.json
 *   node scripts/detect-orphan-chain.js --score   # affiche le score de cohérence
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const SAVE  = process.argv.includes('--save');
const SCORE = process.argv.includes('--score');

// ── 1. Charger les référentiels ────────────────────────────────────────────

function loadRefs() {
  const read  = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

  const features   = read('knowledge/features.json').features;
  const organs     = read('knowledge/organs.json').organs;
  const intentions = read('knowledge/intentions.json').intentions || [];
  const flows      = read('architecture/IMMAT-FLOW-INDEX.json').flows || [];

  // Invariants depuis core/invariants.js (parse les IDs par regex)
  let invariantIds = new Set();
  try {
    const src = fs.readFileSync(path.join(ROOT, 'core/invariants.js'), 'utf8');
    for (const m of src.matchAll(/'(INV-[A-Z0-9-]+)'/g)) invariantIds.add(m[1]);
  } catch (_) {}

  // Invariants organism (knowledge/organism-invariants.json si présent)
  try {
    const oi = read('knowledge/organism-invariants.json');
    for (const inv of (oi.invariants || [])) invariantIds.add(inv.id);
  } catch (_) {}

  const organMap     = new Map(organs.map(o => [o.id, o]));
  const intentionSet = new Set(intentions.map(i => i.id));
  const flowSet      = new Set(flows.map(f => f.id));

  return { features, organMap, intentionSet, flowSet, invariantIds };
}

// ── 2. Lire les sources pour détecter les observations OBD ────────────────

function loadObservations() {
  const sourceFiles = [
    'index.html', 'messages.js', 'calls.js', 'ui.js', 'badge.js',
    'core/brain.js', 'core/bus.js', 'core/governance.js',
    'core/immatOrganism.js', 'core/invariants.js',
  ];
  const observed = new Set();
  // Capture both .observe('EVENT') and .observe?.('EVENT') (optional chaining)
  const RE = /\.observe(?:\?\.)?(?:\s*)\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g;
  for (const f of sourceFiles) {
    try {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const m of src.matchAll(RE)) observed.add(m[1]);
    } catch (_) {}
  }
  return observed;
}

// ── 3. Lire les fichiers de tests ──────────────────────────────────────────

function loadTestCoverage() {
  const testDir = path.join(ROOT, 'tests');
  const covered = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js') && !entry.name.endsWith('.ts')) continue;
      try {
        const src = fs.readFileSync(full, 'utf8');
        for (const m of src.matchAll(/\b(F-[A-Z][A-Z0-9-]*|FLOW-[A-Z][A-Z0-9-]*|INV-[A-Z0-9-]+)\b/g)) {
          covered.add(m[1]);
        }
      } catch (_) {}
    }
  }
  walk(testDir);
  return covered;
}

// ── 4. Mapper feature → événements OBD attendus ───────────────────────────

// Correspondance feature → préfixes d'événements OBD attendus
const FEATURE_OBD_HINTS = {
  'F-CARTE':               ['MAP_', 'LOCATE'],
  'F-GPS':                 ['NAV_', 'GPS_', 'ROUTE'],
  'F-SIGNAL-VEHICULE':     ['ALERT_', 'VEHICLE_', 'REPORT_'],
  'F-SIGNAL-ROUTE':        ['ALERT_', 'REPORT_', 'ROAD_'],
  'F-ASSIST':              ['ASSIST_', 'HELP_', 'ALERT_'],
  'F-MESSAGES':            ['MSG_', 'MESSAGE_'],
  'F-ACTIVITE':            ['BADGE_', 'MSG_', 'ALERT_'],
  'F-APPEL':               ['CALL_'],
  'F-SOS':                 ['SOS_'],
  'F-ANGE':                ['ANGE_', 'BRAIN_', 'DIALOG_'],
  'F-PROFIL':              ['PROFILE_', 'PROFIL_'],
  // DAM-COMMUNICATION Phase 1
  'F-CONVERSATION-ENGINE': ['MSG_SENT', 'MSG_RECEIVED', 'CONV_'],
  'F-TRUST':               ['CONTACT_TRUSTED', 'CONTACT_REVOKED', 'CONTEXT_'],
  'F-CALL-PERMISSIONS':    ['CALL_PREFERENCES', 'CALL_'],
  'F-PRESENCE':            ['PRESENCE_'],
  'F-FAVORITES':           ['CONV_FAVORITED', 'CONV_FAVORITE'],
  'F-ARCHIVE':             ['CONV_ARCHIVED', 'CONV_ARCHIVE'],
  'F-SEARCH':              ['CONV_SEARCHED', 'CONV_SEARCH'],
  'F-SPAM-PROTECTION':     ['SPAM_'],
  // F-PROXIMITY-SIGNAL — utilise vehicleAlertQuick() → mêmes events que F-SIGNAL-VEHICULE
  'F-PROXIMITY-SIGNAL':    ['VEHICLE_MESSAGE_', 'ALERT_'],
};

// ── 5. Vérifier la chaîne pour chaque feature ────────────────────────────

function checkFeatureChain(feature, refs, observations, testCoverage) {
  const { organMap, intentionSet, flowSet, invariantIds } = refs;
  const findings = [];

  function add(rule, severity, reason, hint) {
    findings.push({
      type: 'ORPHAN_CHAIN_DETECTED',
      rule,
      severity,
      feature_id:      feature.id,
      feature_nom:     feature.nom,
      reason,
      suggested_action: hint,
      rule_id:         rule,
    });
  }

  // ── Maillon 1 : Organe ────────────────────────────────────────────────────
  if (!feature.organe) {
    add('NO_ORPHAN_ORGAN', 'high',
      `F-${feature.id} : champ 'organe' absent`,
      `Ajouter le champ 'organe' dans knowledge/features.json`);
  } else if (!organMap.has(feature.organe)) {
    add('NO_ORPHAN_ORGAN', 'high',
      `Organe '${feature.organe}' référencé par ${feature.id} introuvable dans organs.json`,
      `Créer l'organe '${feature.organe}' dans knowledge/organs.json`);
  } else {
    const organ = organMap.get(feature.organe);

    // ── Maillon 2 : Intention ───────────────────────────────────────────────
    const featureIntentions = feature.intentions || [];
    if (featureIntentions.length === 0) {
      // Vérifier si l'organe a des intentions (fallback)
      const organIntentions = organ.intentions || [];
      if (organIntentions.length === 0) {
        add('NO_ORPHAN_INTENTION', 'high',
          `${feature.id} n'a aucune intention déclarée (ni dans feature ni dans organe '${feature.organe}')`,
          `Ajouter 'intentions' dans knowledge/features.json pour ${feature.id}`);
      }
    } else {
      for (const intentId of featureIntentions) {
        if (!intentionSet.has(intentId)) {
          add('NO_ORPHAN_INTENTION', 'high',
            `Intention '${intentId}' déclarée dans ${feature.id} introuvable dans intentions.json`,
            `Créer l'intention '${intentId}' dans knowledge/intentions.json`);
        }
      }
    }

    // ── Maillon 3 : Invariant (depuis l'organe) ─────────────────────────────
    const organConstraints = organ.constraints || [];
    if (organConstraints.length === 0) {
      add('NO_ORPHAN_INVARIANT', 'medium',
        `Organe '${feature.organe}' (${feature.id}) n'a aucun invariant déclaré`,
        `Ajouter au moins un INV-* dans constraints[] de l'organe dans organs.json`);
    } else {
      for (const invId of organConstraints) {
        if (!invariantIds.has(invId)) {
          add('NO_ORPHAN_INVARIANT', 'medium',
            `Invariant '${invId}' (organe ${feature.organe}) non trouvé dans core/invariants.js`,
            `Déclarer '${invId}' dans core/invariants.js ou knowledge/organism-invariants.json`);
        }
      }
    }
  }

  // ── Maillon 4 : Flow ─────────────────────────────────────────────────────
  const featureFlows = feature.flows || [];
  if (featureFlows.length === 0) {
    add('NO_ORPHAN_FLOW', 'high',
      `${feature.id} n'a aucun flow déclaré`,
      `Déclarer au moins un FLOW-* dans 'flows[]' de ${feature.id} dans features.json et dans IMMAT-FLOW-INDEX.json`);
  } else {
    for (const flowId of featureFlows) {
      if (!flowSet.has(flowId)) {
        add('NO_ORPHAN_FLOW', 'high',
          `Flow '${flowId}' déclaré dans ${feature.id} introuvable dans IMMAT-FLOW-INDEX.json`,
          `Créer le flow '${flowId}' dans architecture/IMMAT-FLOW-INDEX.json`);
      }
    }
  }

  // ── Maillon 5 : Observation OBD ──────────────────────────────────────────
  const hints = FEATURE_OBD_HINTS[feature.id] || [];
  const hasObs = hints.length > 0 && hints.some(prefix =>
    [...observations].some(evt => evt.startsWith(prefix))
  );
  if (!hasObs) {
    const expected = hints.length > 0 ? hints.map(h => h + '*').join(' ou ') : '(préfixe inconnu)';
    add('NO_ORPHAN_OBSERVATION', 'medium',
      `${feature.id} : aucune observation OBD (ImmatOrganism.observe) de type ${expected} trouvée dans le code`,
      `Ajouter window.ImmatOrganism?.observe?.('${feature.id.replace('F-','')}_EVENT', {...}) dans le code de la feature`);
  }

  // ── Maillon 6 : Test ─────────────────────────────────────────────────────
  const hasFeatTest = testCoverage.has(feature.id);
  const hasFlowTest = (feature.flows || []).some(f => testCoverage.has(f));
  if (!hasFeatTest && !hasFlowTest) {
    add('NO_ORPHAN_TEST', 'low',
      `${feature.id} : aucun test ne référence cet ID dans tests/`,
      `Créer tests/organism/${feature.id.toLowerCase()}.test.js et y référencer '${feature.id}'`);
  }

  return findings;
}

// ── 6. Score de cohérence ─────────────────────────────────────────────────

function computeScore(features, allFindings) {
  const total     = features.length;
  const maxPoints = total * 6; // 6 maillons par feature
  const penalties = {
    high:   3,
    medium: 2,
    low:    1,
  };
  let deducted = 0;
  for (const f of allFindings) deducted += (penalties[f.severity] || 1);
  const score = Math.max(0, Math.round((1 - deducted / maxPoints) * 100));
  let label;
  if (score >= 95) label = 'OPTIMAL';
  else if (score >= 75) label = 'ATTENTION';
  else if (score >= 50) label = 'DÉGRADÉ';
  else label = 'CRITIQUE';
  return { score, label, max_points: maxPoints, deducted };
}

// ── 7. Main ───────────────────────────────────────────────────────────────

function main() {
  const refs         = loadRefs();
  const observations = loadObservations();
  const testCoverage = loadTestCoverage();

  const allFindings = [];
  for (const feature of refs.features) {
    const findings = checkFeatureChain(feature, refs, observations, testCoverage);
    allFindings.push(...findings);
  }

  const coherence = computeScore(refs.features, allFindings);
  const stats = {
    high:   allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low:    allFindings.filter(f => f.severity === 'low').length,
    total:  allFindings.length,
  };

  // Résumé par feature
  const perFeature = {};
  for (const feature of refs.features) {
    perFeature[feature.id] = {
      nom:    feature.nom,
      organe: feature.organe,
      chain_complete: !allFindings.some(f => f.feature_id === feature.id && f.severity !== 'low'),
      findings_count: allFindings.filter(f => f.feature_id === feature.id).length,
    };
  }

  const report = {
    _generated_at:    new Date().toISOString(),
    _rule:            'ORPHAN_CHAIN',
    _session:         'OBD-002b',
    _version:         1,
    features_checked: refs.features.length,
    coherence_score:  coherence,
    stats,
    per_feature:      perFeature,
    findings:         allFindings,
  };

  const json = JSON.stringify(report, null, 2);

  if (SAVE) {
    const outPath = path.join(ROOT, 'reports', 'orphan-chain-report.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
    console.error(`[detect-orphan-chain] Rapport : ${outPath}`);
    console.error(`[detect-orphan-chain] Score cohérence : ${coherence.score}% (${coherence.label})`);
    console.error(`[detect-orphan-chain] HIGH=${stats.high} MEDIUM=${stats.medium} LOW=${stats.low}`);
  } else {
    process.stdout.write(json + '\n');
  }

  if (SCORE) {
    console.log(`\nSCORE COHÉRENCE ORGANISME : ${coherence.score}% — ${coherence.label}`);
    console.log(`Features vérifiées : ${refs.features.length}`);
    console.log(`Findings : HIGH=${stats.high}  MEDIUM=${stats.medium}  LOW=${stats.low}`);
    console.log('');
    for (const [id, info] of Object.entries(perFeature)) {
      const ok = info.chain_complete ? '✔' : '✖';
      console.log(`  ${ok}  ${id} (${info.organe}) — ${info.findings_count} finding(s)`);
    }
    console.log('');
  }

  if (CHECK && stats.high > 0) {
    console.error(`[detect-orphan-chain] ÉCHEC : ${stats.high} finding(s) HIGH`);
    process.exit(1);
  }
}

main();
