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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasAny(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

const flows = readJson(path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json'));
const features = readJson(path.join(ROOT, 'knowledge', 'features.json'));
const intentions = readJson(path.join(ROOT, 'knowledge', 'intentions.json'));

const warnings = [];
const flowIds = new Set(asArray(flows.flows).map(f => f.id));
const organStats = new Map();

function warn(code, message, penalty, organs = []) {
  warnings.push({ code, message, penalty, organs });
  for (const organ of organs) {
    if (!organStats.has(organ)) organStats.set(organ, { penalty: 0, warnings: 0 });
    const stat = organStats.get(organ);
    stat.penalty += penalty;
    stat.warnings += 1;
  }
}

function flowOrgans(flowId) {
  const flow = asArray(flows.flows).find(f => f.id === flowId);
  return flow ? asArray(flow.organes) : [];
}

for (const f of asArray(features.features)) {
  if (f.statut === 'actif' && (!Array.isArray(f.flows) || f.flows.length === 0)) {
    warn('W-001', `Feature active sans flow: ${f.id}`, 2, f.organe ? [f.organe] : []);
  }
  for (const flowId of asArray(f.flows)) {
    if (!flowIds.has(flowId)) {
      warn('W-006', `Feature ${f.id} reference un flow inexistant: ${flowId}`, 3, f.organe ? [f.organe] : []);
    }
  }
}

for (const it of asArray(intentions.intentions)) {
  if (it.acces === 'conducteur' && !it.flow) {
    warn('W-002', `Intention conducteur sans flow: ${it.id}`, 2, it.organe ? [it.organe] : []);
  }
  if (it.flow && !flowIds.has(it.flow)) {
    warn('W-007', `Intention ${it.id} reference un flow inexistant: ${it.flow}`, 3, it.organe ? [it.organe] : []);
  }
}

for (const fl of asArray(flows.flows)) {
  const organs = asArray(fl.organes);
  if (organs.length === 0) {
    warn('W-003', `Flow sans organe: ${fl.id}`, 3);
  }
  if (!fl.validation) {
    warn('W-004', `Flow sans validation: ${fl.id}`, 2, organs);
  }
  if (!hasAny(fl['mémoire'])) {
    warn('W-005', `Flow sans memoire: ${fl.id}`, 2, organs);
  }
  if (!hasAny(fl.invariants)) {
    warn('W-008', `Flow sans invariants explicites: ${fl.id}`, 1, organs);
  }
  if (!hasAny(fl.preuve) && !hasAny(fl.proof)) {
    warn('W-009', `Flow sans preuve explicite: ${fl.id}`, 1, organs);
  }
}

const totalPenalty = warnings.reduce((sum, w) => sum + w.penalty, 0);
const score = Math.max(0, 100 - totalPenalty);

console.log(`[organic-audit] ORGANIC SCORE: ${score}/100`);

if (organStats.size) {
  console.log('[organic-audit] SCORE PAR ORGANE:');
  for (const [organ, stat] of [...organStats.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const organScore = Math.max(0, 100 - stat.penalty);
    console.log(`[organic-audit] - ${organ}: ${organScore}/100 (${stat.warnings} warning${stat.warnings > 1 ? 's' : ''})`);
  }
}

if (warnings.length === 0) {
  console.log('[organic-audit] Aucun warning organique');
  process.exit(0);
}

for (const w of warnings) {
  console.warn(`[organic-audit] ${w.code} - ${w.message} (-${w.penalty})`);
}

process.exit(0);
