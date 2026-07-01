/* tests/facts-proto.test.js — PROTOTYPE : prouver que le moteur générique
 * dérive tout (vocal, confirmation, autorisation, dashboard, explication) depuis
 * la seule DÉCLARATION des faits. Un seul moteur, N faits, zéro code par-feature.
 *
 * Lancer : node tests/facts-proto.test.js
 */
'use strict';
const path = require('path');
const { FactCatalog } = require(path.resolve(__dirname, '..', 'core', 'immat-facts.js'));

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log('  ❌ ' + name); } }

// Environnement simulé (les règles sont consultées comme des faits)
const envConducteur = { isFeatureEnabled: () => true, isGardien: false };
const envGardien    = { isFeatureEnabled: () => true, isGardien: true };
const envAppelsOff  = { isFeatureEnabled: (k) => k !== 'appels', isGardien: false };

console.log('\n=== PROTOTYPE « tout est un fait autorisé » — dérivations générées ===\n');

// Le moteur générique s'applique aux 3 faits SANS code spécifique
const facts = FactCatalog.list();
ok('3 faits déclarés', facts.length === 3);

// Tableau de démonstration : tout est CALCULÉ, rien n'est codé par-feature
facts.forEach(f => {
  const row = {
    fait: f.id,
    confirmer: FactCatalog.needsConfirm(f),
    mot: FactCatalog.confirmWord(f),
    dit: FactCatalog.voiceHints(f).join('/') || '—',
    autorité: f.authority,
    panneau: FactCatalog.dashboardRow(f).panel,
  };
  console.log('  •', row.fait.padEnd(16),
    '| confirmer=' + String(row.confirmer).padEnd(5),
    '| mot="' + row.mot + '"'.padEnd(10),
    '| dit=' + row.dit.padEnd(28),
    '| ' + row.autorité.padEnd(8),
    '| ' + row.panneau);
});
console.log('');

// 1) Confirmation DÉRIVÉE (aucune décision écrite par fait)
ok('SIGNAL → confirmation requise', FactCatalog.needsConfirm(FactCatalog.get('SIGNAL_VEHICULE')) === true);
ok('APPEL → confirmation requise', FactCatalog.needsConfirm(FactCatalog.get('APPEL')) === true);
ok('FEATURE_TOGGLE → confirmation requise', FactCatalog.needsConfirm(FactCatalog.get('FEATURE_TOGGLE')) === true);

// 2) Mot-action DÉRIVÉ du résidu
ok('SIGNAL → mot « envoie »', FactCatalog.confirmWord(FactCatalog.get('SIGNAL_VEHICULE')) === 'envoie');
ok('APPEL → mot « appelle »', FactCatalog.confirmWord(FactCatalog.get('APPEL')) === 'appelle');
ok('FEATURE_TOGGLE → mot « confirme »', FactCatalog.confirmWord(FactCatalog.get('FEATURE_TOGGLE')) === 'confirme');

// 3) Auto-narration GÉNÉRÉE (les mots à dire)
ok('SIGNAL → dit pneu/porte/feux', FactCatalog.voiceHints(FactCatalog.get('SIGNAL_VEHICULE')).join(',') === 'pneu,porte,feux');

// 4) Autorisation GÉNÉRÉE (règle = fait : feature flag + rôle)
ok('APPEL autorisé si feature ON', FactCatalog.authorized(FactCatalog.get('APPEL'), envConducteur).ok === true);
ok('APPEL refusé si feature OFF', FactCatalog.authorized(FactCatalog.get('APPEL'), envAppelsOff).ok === false);
ok('FEATURE_TOGGLE refusé si non-gardien', FactCatalog.authorized(FactCatalog.get('FEATURE_TOGGLE'), envConducteur).ok === false);
ok('FEATURE_TOGGLE autorisé si gardien', FactCatalog.authorized(FactCatalog.get('FEATURE_TOGGLE'), envGardien).ok === true);

// 5) Projection Dashboard GÉNÉRÉE
const rows = facts.map(f => FactCatalog.dashboardRow(f));
ok('Dashboard = projection des faits (3 lignes)', rows.length === 3 && rows.every(r => r.label && r.panel));

// 6) Proposition vocale GÉNÉRÉE (parole → fait + résidu pré-rempli)
const p1 = FactCatalog.propose('signale un pneu au véhicule devant');
ok('« signale un pneu » → SIGNAL_VEHICULE, choix=pneu', p1 && p1.fact.id === 'SIGNAL_VEHICULE' && p1.choix === 'pneu');
const p2 = FactCatalog.propose('appelle le plus proche');
ok('« appelle » → APPEL (consent)', p2 && p2.fact.id === 'APPEL' && p2.residual === 'consent');
const p3 = FactCatalog.propose('désactive les appels');
ok('« désactive » → FEATURE_TOGGLE', p3 && p3.fact.id === 'FEATURE_TOGGLE');
ok('parole inconnue → aucune proposition', FactCatalog.propose('quelle heure est-il') === null);

// 7) Explication GÉNÉRÉE (Nexus)
ok('SIGNAL → explication non vide', FactCatalog.explain(FactCatalog.get('SIGNAL_VEHICULE')).length > 10);

console.log('\n────────────────────────────');
if (fail === 0) console.log('✅ PROTOTYPE VALIDÉ — ' + pass + ' ok, 0 ko');
else console.log('❌ ÉCHECS — ' + pass + ' ok, ' + fail + ' ko');
console.log('');
process.exit(fail === 0 ? 0 : 1);
