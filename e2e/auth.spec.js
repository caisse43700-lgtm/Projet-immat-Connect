// @ts-check
const { test, expect } = require('@playwright/test');
const { resetBrowser, resetTestData } = require('./helpers/reset');

const EMAIL_A = process.env.TEST_USER_A_EMAIL;
const PWD_A   = process.env.TEST_USER_A_PASSWORD;
const PLATE_A = 'ZZ-001-TT';

/** Connecte le compte A et attend que appScreen soit actif. */
async function loginA(page) {
  await page.goto('/');
  await resetBrowser(page);
  await page.goto('/');
  await page.click('#welcomeLoginBtn');
  await page.fill('#iEmail', EMAIL_A);
  await page.fill('#iPwd',   PWD_A);
  await page.click('#authBtn');
  await expect(page.locator('#appScreen')).toHaveClass(/active/, { timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Auth — connexion et session', () => {
  test.beforeEach(() => {
    test.skip(!EMAIL_A || !PWD_A, 'Secrets TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD non définis');
  });

  test.afterAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await resetTestData(page);
    await ctx.close();
  });

  test('A01 — connexion réelle avec compte A', async ({ page }) => {
    await loginA(page);
  });

  test('A02 — plaque du profil affichée dans la topbar', async ({ page }) => {
    await loginA(page);
    await expect(page.locator('#tbPlate')).toHaveText(PLATE_A, { timeout: 8_000 });
  });

  test('A03 — session persistée après reload (pas de re-login)', async ({ page }) => {
    await loginA(page);
    await page.reload();
    // Après reload : appScreen reste actif, l'écran de bienvenue n'est pas visible
    await expect(page.locator('#appScreen')).toHaveClass(/active/, { timeout: 10_000 });
    await expect(page.locator('#sw')).not.toHaveClass(/active/);
  });

  test('A04 — navigation vers onglet Activité', async ({ page }) => {
    await loginA(page);
    await page.click('#navActivite');
    await expect(page.locator('#panelActivite')).toHaveClass(/on/, { timeout: 5_000 });
  });

  test('A05 — logout : retour à l\'écran d\'accueil', async ({ page }) => {
    await loginA(page);
    // logout() appelle confirm() — on l'accepte automatiquement
    page.on('dialog', d => d.accept());
    await page.evaluate(() => window.App.logout());
    await expect(page.locator('#sw')).toHaveClass(/active/, { timeout: 8_000 });
  });

  test('A06 — pas de données résiduelles après logout + reconnexion compte A', async ({ page }) => {
    await loginA(page);
    page.on('dialog', d => d.accept());
    await page.evaluate(() => window.App.logout());
    await expect(page.locator('#sw')).toHaveClass(/active/, { timeout: 8_000 });

    // Reconnexion
    await loginA(page);
    // Activité doit afficher les messages de A — pas de fantômes d'une autre session
    await page.click('#navActivite');
    const plate = await page.locator('#tbPlate').textContent({ timeout: 5_000 });
    expect(plate?.trim()).toBe(PLATE_A);
  });
});
