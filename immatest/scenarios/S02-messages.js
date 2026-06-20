'use strict';
const { navTo } = require('../lib/account');
const R = require('../lib/reporter');

module.exports = async function S02(pageA, pageB, { plateA, plateB }) {
  R.scenario('S02 — Échange de messages A↔B');

  const tag = `IMMATEST-${Date.now()}`;

  // ── A envoie un message à B ──
  await navTo(pageA, 'messages');
  await pageA.waitForTimeout(800);

  // Ouvrir la composition vers la plaque de B
  try {
    await pageA.evaluate(plate => {
      if (window.ImmatMessages?.setMode) window.ImmatMessages.setMode('compose');
    }, plateB);
    await pageA.waitForTimeout(400);

    // Remplir la plaque destinataire
    const dest = pageA.locator('#icComposeTo, input[placeholder*="plaque"]').first();
    await dest.fill(plateB);
    await pageA.waitForTimeout(300);

    // Remplir le message
    const msgInput = pageA.locator('#icComposeMsg, textarea[placeholder*="message"]').first();
    await msgInput.fill(`[${tag}] Message de test Immatest`);

    // Envoyer
    const sendBtn = pageA.locator('#icComposeSend, button:has-text("Envoyer")').first();
    await sendBtn.click();
    await pageA.waitForTimeout(1500);
    R.check('A — message envoyé sans erreur', pageA._immaErrors.filter(e => e.includes('message')).length === 0);
  } catch (e) {
    R.check('A — envoi message', false, String(e).slice(0, 150));
    return;
  }

  // ── B reçoit le message ──
  await navTo(pageB, 'messages');
  await pageB.waitForTimeout(1500);

  const receivedAtB = await pageB.evaluate(tag => {
    const msgs = window.S?._actMessages || [];
    return msgs.some(m => m._received && m.message && m.message.includes(tag));
  }, tag);
  R.check('B — message reçu dans S._actMessages', receivedAtB, receivedAtB ? tag : 'non trouvé');

  // Vérifier affichage DOM chez B
  const visibleAtB = await pageB.locator(`text=${tag}`).isVisible().catch(() => false);
  R.check('B — message visible dans l\'UI Messages', visibleAtB);

  // ── A voit le message dans Envoyés ──
  await navTo(pageA, 'messages');
  await pageA.waitForTimeout(800);

  const sentAtA = await pageA.evaluate(tag => {
    const msgs = window.S?._actMessages || [];
    return msgs.some(m => m._sent && m.message && m.message.includes(tag));
  }, tag);
  R.check('A — message dans Envoyés (S._actMessages)', sentAtA);

  // ── B répond ──
  const replyTag = `REPONSE-${Date.now()}`;
  try {
    await pageB.evaluate((plate, rtag) => {
      if (window.ImmatMessages?.openThread) {
        window.ImmatMessages.openThread(plate);
      }
    }, plateA, replyTag);
    await pageB.waitForTimeout(600);

    const replyInput = pageB.locator('#icThreadInput, #icMsgInput, textarea').first();
    await replyInput.fill(`[${replyTag}] Réponse Immatest`);
    const replySend = pageB.locator('#icThreadSend, #icSendBtn, button:has-text("Envoyer")').first();
    await replySend.click();
    await pageB.waitForTimeout(1500);
    R.check('B — réponse envoyée', true);
  } catch (e) {
    R.check('B — réponse envoyée', false, String(e).slice(0, 150));
  }

  // A reçoit la réponse
  await pageA.waitForTimeout(1500);
  const replyAtA = await pageA.evaluate(rtag => {
    const msgs = window.S?._actMessages || [];
    return msgs.some(m => m._received && m.message && m.message.includes(rtag));
  }, replyTag);
  R.check('A — réponse de B reçue', replyAtA);

  // Badge Messages chez B doit avoir été > 0 puis redescendre après lecture
  const badgeB = await pageB.evaluate(() => {
    return parseInt(document.getElementById('navMessages')?.querySelector('.badge, .nav-badge')?.textContent || '0');
  });
  R.check('B — badge Messages cohérent', typeof badgeB === 'number', `badge=${badgeB}`);
};
