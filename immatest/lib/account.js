'use strict';
const cfg = require('../config');

async function login(page, email, pwd) {
  await page.goto(cfg.BASE_URL, { waitUntil: 'domcontentloaded' });
  // Attendre que l'écran d'accueil soit prêt
  await page.waitForSelector('#authEmail, #welcomeScreen', { timeout: 20_000 });

  // Si déjà connecté, retourner directement
  const isLoggedIn = await page.evaluate(() => !!(window.S && window.S.uid));
  if (isLoggedIn) return true;

  // Remplir email
  const emailField = page.locator('#authEmail').first();
  await emailField.fill(email);

  // Remplir mot de passe
  const pwdField = page.locator('#authPassword').first();
  await pwdField.fill(pwd);

  // Soumettre
  const loginBtn = page.locator('#authSubmitBtn, button:has-text("Connexion"), button:has-text("Se connecter")').first();
  await loginBtn.click();

  // Attendre connexion effective
  await page.waitForFunction(() => !!(window.S && window.S.uid), { timeout: 15_000 });
  return true;
}

async function getPlate(page) {
  return page.evaluate(() => window.S?.profile?.owner_plate || window.S?.myPlate || null);
}

async function getUID(page) {
  return page.evaluate(() => window.S?.uid || null);
}

async function navTo(page, tab) {
  // tab : 'signaler' | 'messages' | 'appels' | 'activite'
  const map = {
    signaler:  '#navSignaler, .nav-btn:has-text("Signaler")',
    messages:  '#navMessages, .nav-btn:has-text("Messages")',
    ange:      '#navAnge, .nav-btn-ange',
    appels:    '#navAppels, .nav-btn:has-text("Appels")',
    activite:  '#navActivite, .nav-btn:has-text("Activité")',
  };
  const sel = map[tab];
  if (!sel) throw new Error('Onglet inconnu : ' + tab);
  await page.locator(sel).first().click();
  await page.waitForTimeout(600);
}

async function runGVC(page) {
  return page.evaluate(async () => {
    if (!window.GlobalVerificationCenter) return { error: 'GlobalVerificationCenter absent' };
    try { return await window.GlobalVerificationCenter.run(); }
    catch (e) { return { error: String(e) }; }
  });
}

async function runMobileAutotest(page) {
  return page.evaluate(() => {
    if (!window.MobileAutotest) return { error: 'MobileAutotest absent' };
    try { return window.MobileAutotest.run(); }
    catch (e) { return { error: String(e) }; }
  });
}

module.exports = { login, getPlate, getUID, navTo, runGVC, runMobileAutotest };
