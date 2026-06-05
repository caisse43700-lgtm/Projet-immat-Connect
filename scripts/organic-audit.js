#!/usr/bin/env node
// scripts/organic-audit.js
// Auto-audit organique non bloquant.
// Objectif : rendre visibles les oublis sans modifier le runtime.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const flows = readJson(path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json'));
const features = readJson(path.join(ROOT, 'knowledge', 'features.json'));
const intentions = readJson(path.join(ROOT, 'knowledge', 'intentions.json'));

const warnings = [];
const flowIds = new Set((flows.flows || []).map(f => f.id));

function warn(code, message, penalty) {
  warnings.push({ code, message, penalty });
}

for (const f of features.features || []) {
  if (f.statut === 'actif' && (!Array.isArray(f.flows) || f.flows.length === 0)) {
    warn('W-001', `Feature active sans flow: ${f.id}`, 2);
  }
  for (const flowId of f.flows || []) {
    if (!flowIds.has(flowId)) warn('W-006', `Feature ${f.id} reference un flow inexistant: ${flowId}`, 3);
  }
}

for (const it of intentions.intentions || []) {
  if (it.acces === 'conducteur' && !it.flow) {
    warn('W-002', `Intention conducteur sans flow: ${it.id}`, 2);
  }
  if (it.flow && !flowIds.has(it.flow)) {
    warn('W-007', `Intention ${it.id} reference un flow inexistant: ${it.flow}`, 3);
  }
}

for (const fl of flows.flows || []) {
  if (!Array.isArray(fl.organes) || fl.organes.length === 0) {
    warn('W-003', `Flow sans organe: ${fl.id}`, 3);
  }
  if (!fl.validation) {
    warn('W-004', `Flow sans validation: ${fl.id}`, 2);
  }
  if (!Array.isArray(fl['mémoire']) || fl['mémoire'].length === 0) {
    warn('W-005', `Flow sans memoire: ${fl.id}`, 2);
  }
}

const score = Math.max(0, 100 - warnings.reduce((sum, w) => sum + w.penalty, 0));

console.log(`[organic-audit] ORGANIC SCORE: ${score}/100`);

if (warnings.length === 0) {
  console.log('[organic-audit] Aucun warning organique');
  process.exit(0);
}

for (const w of warnings) {
  console.warn(`[organic-audit] ${w.code} - ${w.message} (-${w.penalty})`);
}

process.exit(0);
