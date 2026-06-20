'use strict';
const { navTo } = require('../lib/account');
const R = require('../lib/reporter');

module.exports = async function S03(pageA, pageB, { plateA, plateB }) {
  R.scenario('S03 — Signalement véhicule stationné A→B');

  // A ouvre le panneau Signaler
  await navTo(pageA, 'signaler');
  await pageA.waitForTimeout(600);

  // Étape 1 : clic sur "Véhicule stationné"
  try {
    const btnVeh = pageA.locator('button:has-text("Véhicule stationné"), .sig-cat:has-text("stationné")').first();
    await btnVeh.click();
    await pageA.waitForTimeout(500);
    R.check('A — Étape 1 : "Véhicule stationné" cliqué', true);
  } catch (e) {
    R.check('A — Étape 1 : "Véhicule stationné" cliqué', false, String(e).slice(0, 120));
    return;
  }

  // Étape 2 : saisir la plaque de B
  try {
    const plateInput = pageA.locator('#sigVehPlate, input[placeholder*="plaque"]').first();
    await plateInput.fill(plateB);
    await pageA.waitForTimeout(300);
    R.check('A — Plaque B saisie', true, plateB);
  } catch (e) {
    R.check('A — Plaque B saisie', false, String(e).slice(0, 120));
    return;
  }

  // Sélectionner "Feux allumés"
  try {
    const feux = pageA.locator('button:has-text("Feux allumés"), .sig-type:has-text("Feux")').first();
    await feux.click();
    await pageA.waitForTimeout(300);
    R.check('A — Type "Feux allumés" sélectionné', true);
  } catch (e) {
    // Essayer un autre type
    R.warn('A — Feux allumés non trouvé, tentative type générique');
  }

  // Envoyer le signalement
  try {
    const sendBtn = pageA.locator('button:has-text("Envoyer"), button:has-text("Signaler"), #sigSubmitBtn').first();
    await sendBtn.click();
    await pageA.waitForTimeout(2000);
    R.check('A — Signalement envoyé (bouton cliqué)', true);
  } catch (e) {
    R.check('A — Signalement envoyé', false, String(e).slice(0, 120));
    return;
  }

  // ── B reçoit le signalement ──
  await pageB.waitForTimeout(2000);

  // Vérifier floating card chez B
  const floatingVisible = await pageB.evaluate(plateA => {
    const el = document.getElementById('floatingCard') || document.querySelector('.floating-card');
    return !!(el && el.style.display !== 'none' && el.textContent.includes(plateA.split('-')[0]));
  }, plateA).catch(() => false);
  R.check('B — floating card visible', floatingVisible, floatingVisible ? 'visible' : 'non visible');

  // Vérifier dans les alertes de B
  const alertAtB = await pageB.evaluate(plateA => {
    const alerts = window.S?.alerts || [];
    return alerts.some(a =>
      (a.group === 'vehicle' || a.type === 'vehicule') &&
      (a.from_plate === plateA || a.reporter_plate === plateA || a.sender_plate === plateA)
    );
  }, plateA).catch(() => false);
  R.check('B — signalement dans S.alerts', alertAtB);

  // Vérifier onglet Activité chez B
  await navTo(pageB, 'activite');
  await pageB.waitForTimeout(1000);

  const activityAtB = await pageB.evaluate(() => {
    const feed = document.getElementById('activityFeed') || document.querySelector('.act-feed, .act-list');
    return !!(feed && feed.children.length > 0);
  }).catch(() => false);
  R.check('B — signalement dans Activité', activityAtB);

  // A vérifie ses Envoyés dans Activité
  await navTo(pageA, 'activite');
  await pageA.waitForTimeout(1000);

  const sentAtA = await pageA.evaluate(() => {
    const feed = document.getElementById('activityFeed') || document.querySelector('.act-feed, .act-list');
    return !!(feed && feed.children.length > 0);
  }).catch(() => false);
  R.check('A — signalement dans Activité (Envoyés)', sentAtA);
};
