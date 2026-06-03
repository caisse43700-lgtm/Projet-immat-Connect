#!/usr/bin/env node
// scripts/sync-knowledge.js — INV-015
// Génère knowledge-conducteur.ts et knowledge-gardien.ts depuis knowledge/*.json
// + immat-nervous-system.json (senses + governance) + architecture/IMMAT-FLOW-INDEX.json (flows)
//
// Usage:
//   node scripts/sync-knowledge.js          → génère les deux TS
//   node scripts/sync-knowledge.js --check  → vérifie que les TS sont à jour (exit 1 si non)

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const KDIR  = path.join(ROOT, 'knowledge');
const SDIR  = path.join(ROOT, 'supabase', 'functions', '_shared');

// Charger tous les JSON nécessaires
const INDEX   = JSON.parse(fs.readFileSync(path.join(KDIR, 'knowledge-index.json'), 'utf8'));
const ADN     = JSON.parse(fs.readFileSync(path.join(ROOT, 'immat-nervous-system.json'), 'utf8'));
const FLOWS   = JSON.parse(fs.readFileSync(path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json'), 'utf8'));

function loadKnowledge(fileKeys) {
  const r = {};
  for (const key of fileKeys) {
    const info = INDEX.files[key];
    r[key] = JSON.parse(fs.readFileSync(path.join(ROOT, info.path), 'utf8'));
  }
  return r;
}

// ─── CONDUCTEUR ─────────────────────────────────────────────────────────────

function generateConducteur(d) {
  const lines = [
    '// _shared/knowledge-conducteur.ts',
    '// GÉNÉRÉ AUTOMATIQUEMENT — node scripts/sync-knowledge.js',
    '// Ne pas modifier manuellement. Modifier knowledge/*.json puis relancer le script.',
    '// INV-015 — la vérité vit dans les JSON source',
    '',
    '// deno-lint-ignore-file',
    "export const KNOWLEDGE_CONDUCTEUR = `",
    'TU PARLES AU CONDUCTEUR. Réponds simplement, sans jargon technique. 80 mots max.',
    "Tu guides. Tu rassures. Tu proposes. Tu ne décides jamais.",
    '',
    '## CE QUE TU PEUX FAIRE',
  ];

  for (const f of d.features.features) {
    let line = `${f.id} — ${f.nom} : ${f.description}`;
    if (f.note) line += ` [⚠️ ${f.note}]`;
    lines.push(line);
  }

  lines.push('', '## COMMENT FAIRE');
  for (const t of d.tutorials.tutorials) {
    lines.push(`${t.id} — ${t.action}`);
    lines.push(`  → ${t.etapes.join(' → ')}`);
    if (t.conseil) lines.push(`  💡 ${t.conseil}`);
  }

  lines.push('', '## INTERACTIONS POSSIBLES');
  for (const i of d.interactions.interactions) {
    lines.push(`${i.id} — ${i.nom} (${i.nature}) : ${i.chemin_court}`);
    if (i.note) lines.push(`  → ${i.note}`);
  }

  lines.push('', '## INTENTIONS RECONNUES');
  for (const i of d.intentions.intentions) {
    lines.push(`${i.id} — ${i.besoin}`);
    lines.push(`  → ${i.chemin}`);
  }

  lines.push("\`.trim();", '');
  return lines.join('\n');
}

// ─── GARDIEN ─────────────────────────────────────────────────────────────────

function generateGardien(d) {
  const lines = [
    '// _shared/knowledge-gardien.ts',
    '// GÉNÉRÉ AUTOMATIQUEMENT — node scripts/sync-knowledge.js',
    '// Ne pas modifier manuellement. Modifier knowledge/*.json puis relancer le script.',
    '// INV-015 — la vérité vit dans les JSON source',
    '',
    '// deno-lint-ignore-file',
    "export const KNOWLEDGE_GARDIEN = `",
    'TU PARLES AU GARDIEN. Réponds avec précision technique. Références fichier:ligne bienvenues.',
    "Tu analyses, tu proposes, tu identifies les risques. Tu ne décides pas. Le Gardien décide.",
    '',
  ];

  // FICHIERS CLÉS
  lines.push('FICHIERS CLÉS :');
  for (const f of d.meta.fichiers_cles) {
    lines.push(`${f.path} — ${f.role}`);
  }

  // ORGANES
  lines.push('', "ORGANES — POINTS D'ENTRÉE CODE :");
  for (const o of d.organs.organs) {
    lines.push(`${o.id} → ${o.code_entry}`);
  }

  // INHIBITIONS
  lines.push('', 'INHIBITIONS (verrous en mémoire) :');
  for (const inh of d.meta.inhibitions) {
    lines.push(`${inh.id} — ${inh.desc}`);
  }

  // INVARIANTS CRITIQUES
  lines.push('', 'INVARIANTS CRITIQUES (ne jamais violer) :');
  for (const inv of d.decisions.invariants_critiques) {
    lines.push(`${inv.id} — ${inv.règle}`);
  }

  // SNAPSHOT ANGE
  const snap = d.meta.snapshot_ange;
  lines.push('', 'PROFIL TECHNIQUE SNAPSHOT ANGE (état actuel) :');
  lines.push(snap.champs.join(' · '));
  lines.push(`IMPORTANT : ${snap.note}`);
  lines.push(`Throttle : ${snap.throttle}`);

  // CINQ SENS (depuis ADN)
  const senses = ADN.senses;
  lines.push('', `CINQ SENS ORGANIQUES — ADN _v:${ADN._v} (section "senses") :`);
  lines.push("Vocabulaire secondaire de la boucle intention→mémoire. Chaque sens traduit une capacité de l'organisme.");
  lines.push('');
  const sensOrder = ['voir', 'entendre', 'gouter', 'toucher', 'sentir'];
  for (const s of sensOrder) {
    if (!senses[s]) continue;
    const sv = senses[s];
    const note = sv.note ? ` [${sv.note}]` : '';
    lines.push(`  ${s.padEnd(9)} (Phase ${sv.phase_activation}) — ${sv.desc}${note}`);
  }
  lines.push('');
  lines.push('Lien avec la boucle organique :');
  for (const [sense, label] of Object.entries(senses._boucle_mapping || {})) {
    lines.push(`${sense.padEnd(9)} → ${label}`);
  }

  // GRILLE SENSORIELLE PAR ORGANE
  lines.push('', 'GRILLE SENSORIELLE PAR ORGANE :');
  for (const o of d.organs.organs) {
    const marker = o.id === 'Ange' ? '  ← seul organe à cinq sens complets' : '';
    lines.push(`  ${o.id.padEnd(14)}: ${o.senses.join(' · ')}${marker}`);
  }

  // PHASES (depuis ADN governance)
  if (ADN.governance && ADN.governance.phases) {
    lines.push('', 'PHASES (core/governance.js) :');
    for (const [phaseNum, phaseVal] of Object.entries(ADN.governance.phases)) {
      const req = phaseVal.requires && phaseVal.requires.length
        ? `  [${phaseVal.requires.join(', ')} requis]`
        : '';
      const note = phaseVal.note ? `  (${phaseVal.note})` : '';
      lines.push(`  Phase ${phaseNum} ${phaseVal.label.padEnd(16)} : ${phaseVal.senses_actifs.join(' + ')}${req}${note}`);
    }
  }

  // CYCLE DE VIE ADN
  lines.push('', 'CYCLE DE VIE ADN :');
  lines.push('Modifier immat-nervous-system.json → node scripts/sync-ns.js → nervous-system.ts mis à jour');
  lines.push('Modifier knowledge/*.json → node scripts/sync-knowledge.js → knowledge-conducteur.ts + knowledge-gardien.ts');
  lines.push('Ne jamais éditer les TS directement (violation INV-015)');
  lines.push('Après modification ADN : incrémenter _v');

  // IMMATORGANISM
  const io = d.meta.immatorganism;
  lines.push('', 'IMMATORGANISM — OBSERVATEUR :');
  lines.push(`ImmatOrganism.diagnose() — ${io.diagnose}`);
  lines.push(`ImmatOrganism.observe(event, payload) — ${io.observe}`);
  lines.push(`ImmatOrganism.validateInvariant(invId, passes, ctx) — ${io.validateInvariant}`);
  lines.push(`Phase actuelle : ${io.phase_courante} (observateur) — Phase 3 (gardien) bloquera les violations en production`);
  lines.push(`Méthodes brain jamais câblées en prod : ${io.methodes_non_cablees.join(' · ')}`);

  // FLUX ORGANIQUES (depuis IMMAT-FLOW-INDEX)
  lines.push('', `FLUX ORGANIQUES — IMMAT-FLOW-INDEX v${FLOWS._v} (architecture/IMMAT-FLOW-INDEX.json) :`);
  lines.push('Boucle : ' + FLOWS._boucle.join(' → '));
  lines.push("Quand une demande arrive, identifier le FLOW concerné, puis lire : repérage / impact / validation.");
  lines.push('');
  for (const flow of FLOWS.flows) {
    lines.push(`${flow.id}  ${flow.intention}`);
    lines.push(`  code: ${flow.repérage.code.join(' · ')} | state: ${flow.repérage.state.join(' · ')}`);
    lines.push(`  validation: ${flow.validation}`);
  }
  lines.push('');
  lines.push("RÈGLE : Si la demande touche un FLOW → identifier organes + impacts avant de proposer. Si aucun FLOW trouvé → demander au Gardien de créer ou rattacher un FLOW avant de patcher.");

  // PONT CLAUDE
  const pc = d.meta.pont_claude;
  lines.push('', 'PONT CLAUDE — FORMULER UNE DEMANDE DE MODIFICATION :');
  lines.push(`Structure attendue : "${pc.structure}"`);
  lines.push('Exemples :');
  for (const ex of pc.exemples) lines.push(`  "${ex}"`);
  lines.push(`Règles : ${pc.regles.join(' · ')}`);

  // TENSIONS
  lines.push('', 'TENSIONS ARCHITECTURALES À CONNAÎTRE :');
  for (const t of d.meta.tensions) lines.push(t);

  // PROTOCOLE MODIFICATION
  lines.push('', 'PROTOCOLE MODIFICATION SÛRE (5 règles) :');
  for (const r of d.meta.protocole_modification) lines.push(r);

  // DÉCISIONS
  lines.push('', 'DÉCISIONS IMPLÉMENTÉES (sessions récentes) :');
  for (const dec of d.decisions.decisions_implementees) {
    lines.push(`${dec.id} (S${dec.session}) — ${dec.quoi}`);
  }
  lines.push('', 'DÉCISIONS EN ATTENTE (Gardien requis) :');
  for (const dec of d.decisions.decisions_en_attente) {
    const bloque = dec.bloque ? ` → bloque ${dec.bloque}` : '';
    lines.push(`${dec.id} — ${dec.question}${bloque}`);
  }

  // HISTORIQUE SESSIONS
  lines.push('', 'HISTORIQUE SESSIONS :');
  for (const s of d.commits.sessions) {
    lines.push(`Session ${s.session} — ${s.titre}`);
  }

  lines.push("\`.trim();", '');
  return lines.join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const check = process.argv.includes('--check');

const conducteurFiles = INDEX.projections.conducteur.files;
const gardienFiles    = INDEX.projections.gardien.files;
const allFiles        = [...new Set([...conducteurFiles, ...gardienFiles])];

const d = loadKnowledge(allFiles);

const conducteurTS = generateConducteur({
  features:     d.features,
  tutorials:    d.tutorials,
  interactions: d.interactions,
  screens:      d.screens,
  intentions:   d.intentions,
});

const gardienTS = generateGardien({
  organs:       d.organs,
  decisions:    d.decisions,
  commits:      d.commits,
  meta:         d.meta,
  features:     d.features,
  interactions: d.interactions,
  screens:      d.screens,
  intentions:   d.intentions,
});

const dstConducteur = path.join(SDIR, 'knowledge-conducteur.ts');
const dstGardien    = path.join(SDIR, 'knowledge-gardien.ts');

if (check) {
  let ok = true;
  if (!fs.existsSync(dstConducteur) || fs.readFileSync(dstConducteur, 'utf8') !== conducteurTS) {
    console.error('[sync-knowledge] ✗ knowledge-conducteur.ts désynchronisé');
    ok = false;
  }
  if (!fs.existsSync(dstGardien) || fs.readFileSync(dstGardien, 'utf8') !== gardienTS) {
    console.error('[sync-knowledge] ✗ knowledge-gardien.ts désynchronisé');
    ok = false;
  }
  if (ok) {
    console.log('[sync-knowledge] ✓ Les deux TS sont à jour');
    process.exit(0);
  } else {
    process.exit(1);
  }
} else {
  fs.writeFileSync(dstConducteur, conducteurTS, 'utf8');
  console.log(`[sync-knowledge] ✓ knowledge-conducteur.ts généré (${conducteurTS.split('\n').length} lignes)`);
  fs.writeFileSync(dstGardien, gardienTS, 'utf8');
  console.log(`[sync-knowledge] ✓ knowledge-gardien.ts généré (${gardienTS.split('\n').length} lignes)`);
}
