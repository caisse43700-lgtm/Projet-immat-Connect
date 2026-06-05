#!/usr/bin/env node
// scripts/sync-knowledge.js — INV-015
// Génère knowledge-conducteur.ts et knowledge-gardien.ts depuis knowledge/*.json
// + immat-nervous-system.json (senses + governance) + architecture/IMMAT-FLOW-INDEX.json (flows)
//
// Usage:
//   node scripts/sync-knowledge.js                    → génère les deux TS
//   node scripts/sync-knowledge.js --check            → vérifie que les TS sont à jour
//   node scripts/sync-knowledge.js --apply-obd-links  → applique les liens OBD organiques aux JSON sources

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const KDIR  = path.join(ROOT, 'knowledge');
const SDIR  = path.join(ROOT, 'supabase', 'functions', '_shared');

const INDEX   = JSON.parse(fs.readFileSync(path.join(KDIR, 'knowledge-index.json'), 'utf8'));
const ADN     = JSON.parse(fs.readFileSync(path.join(ROOT, 'immat-nervous-system.json'), 'utf8'));
const FLOWS   = JSON.parse(fs.readFileSync(path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json'), 'utf8'));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadKnowledge(fileKeys) {
  const r = {};
  for (const key of fileKeys) {
    const info = INDEX.files[key];
    r[key] = readJson(path.join(ROOT, info.path));
  }
  return r;
}

function applyObdLinks() {
  const flowPath = path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json');
  const featuresPath = path.join(KDIR, 'features.json');
  const intentionsPath = path.join(KDIR, 'intentions.json');

  const flows = readJson(flowPath);
  const features = readJson(featuresPath);
  const intentions = readJson(intentionsPath);

  const featureLinks = {
    'F-GPS': ['FLOW-GPS-NAVIGATION'],
    'F-SIGNAL-ROUTE': ['FLOW-ROAD-REPORT'],
    'F-APPEL': ['FLOW-AUDIO-CALL'],
    'F-SOS': ['FLOW-SOS'],
    'F-ANGE': ['FLOW-ANGE-DIALOG'],
    'F-PROFIL': ['FLOW-PROFILE-MANAGEMENT']
  };

  const intentionLinks = {
    'INT-SIGNAL-ROAD': 'FLOW-ROAD-REPORT',
    'INT-NAVIGATE': 'FLOW-GPS-NAVIGATION',
    'INT-SOS': 'FLOW-SOS',
    'INT-ASK-ANGE': 'FLOW-ANGE-DIALOG',
    'INT-MANAGE-PROFILE': 'FLOW-PROFILE-MANAGEMENT',
    'INT-CONFIRM-DANGER': 'FLOW-ROAD-REPORT',
    'INT-RESOLVE-ALERT': 'FLOW-ROAD-REPORT',
    'INT-FEEL-SAFE': 'FLOW-SOS'
  };

  const newFlows = [
    ['FLOW-ROAD-REPORT', 'Informer la communaute d un evenement route visible.', ['Signalements', 'Carte', 'Messages'], ['FAB Signaler', 'carte', 'Activite'], ['actConfirmAlert', 'cleanupAlerts'], ['S.alerts', 'S.tapLat', 'S.tapLng', 'S.myLat', 'S.myLng'], ['reports', 'ic_alerts']],
    ['FLOW-SOS', 'Declencher un canal prioritaire protege.', ['Signalements', 'Carte'], ['panelDrive'], ['appui long', 'confirmation'], ['S.alerts', 'S.myLat', 'S.myLng'], ['reports']],
    ['FLOW-AUDIO-CALL', 'Etablir un contact audio consenti entre conducteurs.', ['Messages'], ['nearbyPanel', 'contextMenu'], ['CallManager', 'WebRTC'], ['call state'], ['call events']],
    ['FLOW-GPS-NAVIGATION', 'Rechercher et suivre un itineraire.', ['Carte'], ['panelDrive', 'recherche'], ['Nominatim', 'route'], ['S.myLat', 'S.myLng', 'route state'], ['history', 'favorites']],
    ['FLOW-PROFILE-MANAGEMENT', 'Mettre a jour les informations sociales du profil.', ['Profil'], ['panelSettings'], ['profile update', 'colorHex'], ['profile state'], ['profiles']],
    ['FLOW-ANGE-DIALOG', 'Obtenir une aide contextuelle sans action autonome.', ['Ange'], ['angeFab', 'dialogue'], ['immat-brain-dialog'], ['session'], ['knowledge-conducteur', 'knowledge-gardien']]
  ].map(([id, intention, organes, ui, code, state, data]) => ({
    id,
    intention,
    organes,
    repérage: { ui, code, state, data },
    impact: ['coherence organique', 'tracabilite', 'stabilite'],
    options: ['utiliser', 'verifier', 'clore si applicable'],
    qui_peut_agir: { conducteur: 'action native existante', gardien: 'audit et validation si evolution' },
    validation: 'Rattachement documentaire sans changement runtime.',
    mémoire: data
  }));

  flows.flows = flows.flows || [];
  for (const nf of newFlows) {
    if (!flows.flows.some(f => f.id === nf.id)) flows.flows.push(nf);
  }
  flows._v = Math.max(Number(flows._v || 1), 2);

  for (const f of features.features || []) {
    if (featureLinks[f.id]) f.flows = featureLinks[f.id];
  }
  features._v = Math.max(Number(features._v || 1), 2);

  for (const it of intentions.intentions || []) {
    if (intentionLinks[it.id] && (it.flow === null || it.flow === undefined || it.flow === '')) {
      it.flow = intentionLinks[it.id];
    }
  }
  intentions._v = Math.max(Number(intentions._v || 1), 5);

  writeJson(flowPath, flows);
  writeJson(featuresPath, features);
  writeJson(intentionsPath, intentions);

  console.log('[sync-knowledge] ✓ OBD links appliqués aux JSON sources');
  console.log('[sync-knowledge] → Relancer ensuite: node scripts/sync-knowledge.js --check');
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
  ];

  lines.push('## COMMENT PUIS-JE VOUS AIDER ?');
  lines.push('Commence toujours par identifier l\'intention du conducteur :');
  if (d.intentions.intentions_primaires) {
    for (const p of d.intentions.intentions_primaires) lines.push(`${p.icone} ${p.label} — ${p.description}`);
  }
  lines.push('');

  if (d.intentions.orientation_mentale) {
    lines.push('## ORIENTATION MENTALE');
    const om = d.intentions.orientation_mentale;
    lines.push(`Carte     = ${om.carte}`);
    lines.push(`Activité  = ${om.activite}`);
    lines.push(`Messages  = ${om.messages}`);
    lines.push('');
  }

  lines.push('## CE QUE TU PEUX FAIRE');
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

  lines.push('', '## RESSOURCES PAR INTENTION');
  lines.push('Quand tu identifies une intention, cite la ressource correspondante :');
  for (const intent of d.intentions.intentions) {
    const li = intent.liens;
    if (!li) continue;
    const parts = [];
    if (li.tutorial) {
      const t = d.tutorials.tutorials.find(x => x.id === li.tutorial);
      if (t) parts.push(`📚 ${li.tutorial} (${t.action})`);
    }
    if (li.interaction) {
      const ix = d.interactions.interactions.find(x => x.id === li.interaction);
      if (ix) parts.push(`↔️ ${li.interaction} (${ix.nom})`);
    }
    if (intent.flow) parts.push(`⚙️ ${intent.flow}`);
    if (parts.length) lines.push(`${intent.id} : ${parts.join(' | ')}`);
  }

  lines.push("\`.trim();", '');
  return lines.join('\n');
}

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

  lines.push('FICHIERS CLÉS :');
  for (const f of d.meta.fichiers_cles) lines.push(`${f.path} — ${f.role}`);

  lines.push('', "ORGANES — POINTS D'ENTRÉE CODE :");
  for (const o of d.organs.organs) lines.push(`${o.id} → ${o.code_entry}`);

  lines.push('', 'INHIBITIONS (verrous en mémoire) :');
  for (const inh of d.meta.inhibitions) lines.push(`${inh.id} — ${inh.desc}`);

  lines.push('', 'INVARIANTS CRITIQUES (ne jamais violer) :');
  for (const inv of d.decisions.invariants_critiques) lines.push(`${inv.id} — ${inv.règle}`);

  const snap = d.meta.snapshot_ange;
  lines.push('', 'PROFIL TECHNIQUE SNAPSHOT ANGE (état actuel) :');
  lines.push(snap.champs.join(' · '));
  lines.push(`IMPORTANT : ${snap.note}`);
  lines.push(`Throttle : ${snap.throttle}`);

  const senses = ADN.senses;
  lines.push('', `CINQ SENS ORGANIQUES — ADN _v:${ADN._v} (section "senses") :`);
  lines.push('Vocabulaire secondaire de la boucle intention→mémoire. Chaque sens traduit une capacité de l\'organisme.');
  lines.push('');
  for (const s of ['voir', 'entendre', 'gouter', 'toucher', 'sentir']) {
    if (!senses[s]) continue;
    const sv = senses[s];
    const note = sv.note ? ` [${sv.note}]` : '';
    lines.push(`  ${s.padEnd(9)} (Phase ${sv.phase_activation}) — ${sv.desc}${note}`);
  }
  lines.push('');
  lines.push('Lien avec la boucle organique :');
  for (const [sense, label] of Object.entries(senses._boucle_mapping || {})) lines.push(`${sense.padEnd(9)} → ${label}`);

  lines.push('', 'GRILLE SENSORIELLE PAR ORGANE :');
  for (const o of d.organs.organs) {
    const marker = o.id === 'Ange' ? '  ← seul organe à cinq sens complets' : '';
    lines.push(`  ${o.id.padEnd(14)}: ${o.senses.join(' · ')}${marker}`);
  }

  if (ADN.governance && ADN.governance.phases) {
    lines.push('', 'PHASES (core/governance.js) :');
    for (const [phaseNum, phaseVal] of Object.entries(ADN.governance.phases)) {
      const req = phaseVal.requires && phaseVal.requires.length ? `  [${phaseVal.requires.join(', ')} requis]` : '';
      const note = phaseVal.note ? `  (${phaseVal.note})` : '';
      lines.push(`  Phase ${phaseNum} ${phaseVal.label.padEnd(16)} : ${phaseVal.senses_actifs.join(' + ')}${req}${note}`);
    }
  }

  lines.push('', 'CYCLE DE VIE ADN :');
  lines.push('Modifier immat-nervous-system.json → node scripts/sync-ns.js → nervous-system.ts mis à jour');
  lines.push('Modifier knowledge/*.json → node scripts/sync-knowledge.js → knowledge-conducteur.ts + knowledge-gardien.ts');
  lines.push('Ne jamais éditer les TS directement (violation INV-015)');
  lines.push('Après modification ADN : incrémenter _v');

  const io = d.meta.immatorganism;
  lines.push('', 'IMMATORGANISM — OBSERVATEUR :');
  lines.push(`ImmatOrganism.diagnose() — ${io.diagnose}`);
  lines.push(`ImmatOrganism.observe(event, payload) — ${io.observe}`);
  lines.push(`ImmatOrganism.validateInvariant(invId, passes, ctx) — ${io.validateInvariant}`);
  lines.push(`Phase actuelle : ${io.phase_courante} (observateur) — Phase 3 (gardien) bloquera les violations en production`);
  lines.push(`Méthodes brain jamais câblées en prod : ${io.methodes_non_cablees.join(' · ')}`);

  lines.push('', `FLUX ORGANIQUES — IMMAT-FLOW-INDEX v${FLOWS._v} (architecture/IMMAT-FLOW-INDEX.json) :`);
  lines.push('Boucle : ' + FLOWS._boucle.join(' → '));
  lines.push('Quand une demande arrive, identifier le FLOW concerné, puis lire : repérage / impact / validation.');
  lines.push('');
  for (const flow of FLOWS.flows) {
    lines.push(`${flow.id}  ${flow.intention}`);
    lines.push(`  code: ${flow.repérage.code.join(' · ')} | state: ${flow.repérage.state.join(' · ')}`);
    lines.push(`  validation: ${flow.validation}`);
  }
  lines.push('');
  lines.push('RÈGLE : Si la demande touche un FLOW → identifier organes + impacts avant de proposer. Si aucun FLOW trouvé → demander au Gardien de créer ou rattacher un FLOW avant de patcher.');

  const pc = d.meta.pont_claude;
  lines.push('', 'PONT CLAUDE — FORMULER UNE DEMANDE DE MODIFICATION :');
  lines.push(`Structure attendue : "${pc.structure}"`);
  lines.push('Exemples :');
  for (const ex of pc.exemples) lines.push(`  "${ex}"`);
  lines.push(`Règles : ${pc.regles.join(' · ')}`);

  lines.push('', 'TENSIONS ARCHITECTURALES À CONNAÎTRE :');
  for (const t of d.meta.tensions) lines.push(t);

  lines.push('', 'PROTOCOLE MODIFICATION SÛRE (5 règles) :');
  for (const r of d.meta.protocole_modification) lines.push(r);

  if (d.intentions.theorie_du_tout) {
    lines.push('', 'THÉORIE DU TOUT — HIÉRARCHIE DE L\'ORGANISME :');
    lines.push(d.intentions.theorie_du_tout.join(' → '));
    if (d.intentions.pourquoi_le_conducteur_ouvre_immatconnect) {
      lines.push('');
      lines.push('POURQUOI LE CONDUCTEUR OUVRE IMMATCONNECT :');
      lines.push(d.intentions.pourquoi_le_conducteur_ouvre_immatconnect);
    }
  }

  lines.push('', 'ANALYSE D\'IMPACT PAR ORGANE (répondre sans ouvrir le code) :');
  lines.push('Organe'.padEnd(16) + 'UX'.padEnd(8) + 'ADN'.padEnd(8) + 'Sécurité'.padEnd(12) + 'Risque');
  for (const o of d.organs.organs) {
    if (!o.impact_analyse) continue;
    const ia = o.impact_analyse;
    lines.push(o.id.padEnd(16) + ia.ux.padEnd(8) + ia.adn.padEnd(8) + ia.securite.padEnd(12) + ia.risque_modification);
  }
  lines.push('');
  lines.push('Exemple d\'analyse (modifier le marqueur véhicule) :');
  lines.push('  Organe : Carte  |  UX : fort  |  ADN : nul  |  Sécurité : nul  |  Risque : faible');
  lines.push('  → Patch Claude autorisé. Tester sur mobile après modification.');

  lines.push('', 'DÉCISIONS IMPLÉMENTÉES (sessions récentes) :');
  for (const dec of d.decisions.decisions_implementees) lines.push(`${dec.id} (S${dec.session}) — ${dec.quoi}`);
  lines.push('', 'DÉCISIONS EN ATTENTE (Gardien requis) :');
  for (const dec of d.decisions.decisions_en_attente) {
    const bloque = dec.bloque ? ` → bloque ${dec.bloque}` : '';
    lines.push(`${dec.id} — ${dec.question}${bloque}`);
  }

  if (d.decisions.regles_organiques && d.decisions.regles_organiques.length) {
    lines.push('', 'RÈGLES ORGANIQUES (respecter lors de toute évolution) :');
    for (const r of d.decisions.regles_organiques) lines.push(`${r.id.padEnd(22)} — ${r.principe}`);
  }

  if (d.decisions.boucles_vitales && d.decisions.boucles_vitales.length) {
    lines.push('', 'BOUCLES VITALES (toute évolution doit renforcer au moins une boucle) :');
    for (const b of d.decisions.boucles_vitales) lines.push(`${b.id.padEnd(14)} — ${b.role} [${b.features.join(', ')}]`);
  }

  lines.push('', 'INTENTION → FLOW + TUTORIAL (diagnostic rapide) :');
  lines.push('Intention'.padEnd(24) + 'Flow'.padEnd(24) + 'Tutorial');
  for (const intent of d.intentions.intentions) {
    const flowStr = intent.flow || '—';
    const tutStr  = intent.liens?.tutorial || '—';
    lines.push(intent.id.padEnd(24) + flowStr.padEnd(24) + tutStr);
  }

  lines.push('', 'HISTORIQUE SESSIONS :');
  for (const s of d.commits.sessions) lines.push(`Session ${s.session} — ${s.titre}`);

  lines.push("\`.trim();", '');
  return lines.join('\n');
}

const check = process.argv.includes('--check');
const applyLinks = process.argv.includes('--apply-obd-links');

if (applyLinks) {
  applyObdLinks();
  process.exit(0);
}

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
  const orgRulesPath = path.join(ROOT, 'architecture', 'organism', 'ORGANISM-RULES.json');
  if (fs.existsSync(orgRulesPath)) {
    const orgRules = readJson(orgRulesPath);
    const orgIds = (orgRules.organic_rules || []).map(r => r.id).sort().join(',');
    const decIds = (d.decisions.regles_organiques || []).map(r => r.id).sort().join(',');
    if (orgIds !== decIds) {
      console.error('[sync-knowledge] ✗ Désynchronisation règles : ORGANISM-RULES.json (' + (orgRules.organic_rules||[]).length + ') ≠ decisions.json (' + (d.decisions.regles_organiques||[]).length + ')');
      const missing = (orgRules.organic_rules||[]).map(r=>r.id).filter(id=>!(d.decisions.regles_organiques||[]).find(r=>r.id===id));
      if (missing.length) console.error('  Manquantes dans decisions.json :', missing.join(', '));
      ok = false;
    }
  }
  if (ok) {
    console.log('[sync-knowledge] ✓ Les deux TS sont à jour');
    process.exit(0);
  }
  process.exit(1);
}

fs.writeFileSync(dstConducteur, conducteurTS, 'utf8');
console.log(`[sync-knowledge] ✓ knowledge-conducteur.ts généré (${conducteurTS.split('\n').length} lignes)`);
fs.writeFileSync(dstGardien, gardienTS, 'utf8');
console.log(`[sync-knowledge] ✓ knowledge-gardien.ts généré (${gardienTS.split('\n').length} lignes)`);
