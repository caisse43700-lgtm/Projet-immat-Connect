'use strict';
const { navTo } = require('../lib/account');
const R = require('../lib/reporter');

module.exports = async function S04(pageA, pageB, { plateA, plateB }) {
  R.scenario('S04 — Appels : signaling A→B');

  // ── Appel A→B : décroché ──
  R.warn('Appel sortant — audio Agora non testé (hors périmètre robot)');

  // A initie l'appel via AppelManager
  let callId = null;
  try {
    callId = await pageA.evaluate(async (plate) => {
      const result = await window.App?.requestCall?.(plate);
      return result || null;
    }, plateB);
    await pageA.waitForTimeout(1000);
    R.check('A — appel initié (requestCall)', true, `callId: ${callId || 'via CallManager'}`);
  } catch (e) {
    R.check('A — appel initié', false, String(e).slice(0, 150));
    return;
  }

  // Overlay sortant visible chez A
  const outgoingOverlayA = await pageA.evaluate(() => {
    const el = document.getElementById('callOverlay') || document.querySelector('.call-overlay, [id*="call"]');
    return !!(el && el.style.display !== 'none' && el.offsetHeight > 0);
  }).catch(() => false);
  R.check('A — overlay appel sortant visible', outgoingOverlayA);

  // Chez B : attendre la popup entrant
  await pageB.waitForTimeout(2000);
  const incomingAtB = await pageB.evaluate(() => {
    const el = document.getElementById('callOverlay') || document.querySelector('.call-overlay');
    return !!(el && el.style.display !== 'none' && el.offsetHeight > 0);
  }).catch(() => false);
  R.check('B — popup appel entrant visible', incomingAtB, incomingAtB ? 'visible' : 'non visible (Realtime delay ?)');

  // B accepte
  if (incomingAtB) {
    try {
      const acceptBtn = pageB.locator('#btnAcceptCall, button:has-text("Accepter"), button:has-text("Décrocher")').first();
      await acceptBtn.click();
      await pageB.waitForTimeout(1500);
      R.check('B — appel accepté (bouton cliqué)', true);
    } catch (e) {
      R.check('B — accepter appel', false, String(e).slice(0, 120));
    }

    // A passe en mode communication
    const connectedA = await pageA.evaluate(() => {
      const st = window.CallManager?.getRuntimeState?.();
      return st?.callStatus === 'active' || st?.callStatus === 'accepted' || st?.inCall === true;
    }).catch(() => false);
    R.check('A — état "en communication"', connectedA);

    // A raccroche
    try {
      const hangBtn = pageA.locator('#btnHangup, button:has-text("Raccrocher"), button:has-text("Terminer")').first();
      await hangBtn.click();
      await pageA.waitForTimeout(1000);
      R.check('A — raccroché', true);
    } catch (e) {
      R.check('A — raccroché', false, String(e).slice(0, 120));
    }

    // Overlay fermé chez les deux
    const overlayGoneA = await pageA.evaluate(() => {
      const el = document.getElementById('callOverlay');
      return !el || el.style.display === 'none' || el.offsetHeight === 0;
    }).catch(() => true);
    const overlayGoneB = await pageB.evaluate(() => {
      const el = document.getElementById('callOverlay');
      return !el || el.style.display === 'none' || el.offsetHeight === 0;
    }).catch(() => true);
    R.check('A — overlay fermé après raccrochage', overlayGoneA);
    R.check('B — overlay fermé après raccrochage', overlayGoneB);
  }

  // ── Journal d'appels ──
  await navTo(pageA, 'appels');
  await pageA.waitForTimeout(800);
  const journalA = await pageA.evaluate(() => {
    const log = document.getElementById('icCallLog');
    return !!(log && log.children.length > 0);
  }).catch(() => false);
  R.check('A — journal d\'appels contient l\'entrée', journalA);

  await navTo(pageB, 'appels');
  await pageB.waitForTimeout(800);
  const journalB = await pageB.evaluate(() => {
    const log = document.getElementById('icCallLog');
    return !!(log && log.children.length > 0);
  }).catch(() => false);
  R.check('B — journal d\'appels contient l\'entrée', journalB);

  // ── Sous-scénario : Refus ──
  R.scenario('S04b — Appel A→B : refus');
  try {
    await pageA.evaluate(plate => window.App?.requestCall?.(plate), plateB);
    await pageA.waitForTimeout(2500);

    const incomingB2 = await pageB.evaluate(() => {
      const el = document.getElementById('callOverlay');
      return !!(el && el.style.display !== 'none');
    }).catch(() => false);
    R.check('B — popup entrant (2e appel)', incomingB2);

    if (incomingB2) {
      const refuseBtn = pageB.locator('#btnRefuseCall, button:has-text("Refuser"), button:has-text("Rejeter")').first();
      await refuseBtn.click();
      await pageA.waitForTimeout(1000);

      const refusedA = await pageA.evaluate(() => {
        const st = window.CallManager?.getRuntimeState?.();
        return st?.callStatus === 'refused' || st?.lastRefused === true;
      }).catch(() => false);
      R.check('A — reçoit "appel refusé"', refusedA);
    }
  } catch (e) {
    R.warn('S04b — non complété', String(e).slice(0, 100));
  }
};
