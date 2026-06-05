#!/usr/bin/env node
// scripts/enrich-obd-flows.js
// Raffinement non destructif : ajoute invariants + preuves aux flows OBD connus.
// Ne modifie pas le runtime. Ne remplace pas les flows existants.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FLOW_PATH = path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const flowIndex = readJson(FLOW_PATH);

const enrichments = {
  'FLOW-ROAD-REPORT': {
    invariants: ['INV-002', 'INV-014', 'INV-015'],
    preuve: ['creer signalement', 'afficher sur carte', 'rendre visible dans activite', 'confirmer ou clore', 'respecter TTL ou resolution']
  },
  'FLOW-SOS': {
    invariants: ['INV-003', 'INV-010', 'INV-015'],
    preuve: ['geste protege', 'confirmation explicite', 'emission prioritaire', 'visibilite', 'cloture ou suivi']
  },
  'FLOW-AUDIO-CALL': {
    invariants: ['INV-010', 'INV-CALL-002', 'INV-015'],
    preuve: ['demande appel', 'sonnerie', 'acceptation ou refus', 'session observable', 'fin ou echec observable']
  },
  'FLOW-GPS-NAVIGATION': {
    invariants: ['INV-014', 'INV-015'],
    preuve: ['rechercher destination', 'afficher itineraire', 'suivre trajet', 'arreter navigation', 'etat carte stable']
  },
  'FLOW-PROFILE-MANAGEMENT': {
    invariants: ['INV-006', 'INV-011', 'INV-015'],
    preuve: ['modifier profil', 'sauvegarder', 'afficher etat coherent', 'preserver plaque immuable']
  },
  'FLOW-ANGE-DIALOG': {
    invariants: ['INV-010', 'INV-014', 'INV-015'],
    preuve: ['poser question', 'reponse contextualisee', 'aucune action autonome', 'chemin natif disponible']
  }
};

let changed = false;

for (const flow of flowIndex.flows || []) {
  const patch = enrichments[flow.id];
  if (!patch) continue;

  if (!Array.isArray(flow.invariants) || flow.invariants.length === 0) {
    flow.invariants = patch.invariants;
    changed = true;
  }

  if (!Array.isArray(flow.preuve) || flow.preuve.length === 0) {
    flow.preuve = patch.preuve;
    changed = true;
  }
}

if (changed) {
  flowIndex._v = Math.max(Number(flowIndex._v || 1), 2);
  writeJson(FLOW_PATH, flowIndex);
  console.log('[enrich-obd-flows] ✓ invariants + preuves ajoutés aux flows OBD');
} else {
  console.log('[enrich-obd-flows] ✓ aucun enrichissement nécessaire');
}
