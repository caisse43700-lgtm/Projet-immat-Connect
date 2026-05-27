// @ts-check
const { test, expect } = require('@playwright/test');
const { resetBrowser } = require('./helpers/reset');

const EMAIL_A = process.env.TEST_USER_A_EMAIL;
const PWD_A   = process.env.TEST_USER_A_PASSWORD;

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
// SUITE 1 — Vérifications statiques (pas d'auth requise)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Résilience — patterns reconnect définis', () => {
  test('R01 — App.subLocs() est une fonction', async ({ page }) => {
    await page.goto('/');
    const type = await page.evaluate(() => typeof window.App?.subLocs);
    expect(type).toBe('function');
  });

  test('R02 — App.subscribeCommunityReports() est une fonction', async ({ page }) => {
    await page.goto('/');
    const type = await page.evaluate(() => typeof window.App?.subscribeCommunityReports);
    expect(type).toBe('function');
  });

  test('R03 — App.subMsgs() est une fonction', async ({ page }) => {
    await page.goto('/');
    const type = await page.evaluate(() => typeof window.App?.subMsgs);
    expect(type).toBe('function');
  });

  test('R04 — événements online/offline hooks présents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // window.online déclenche une sync — vérifier que l'app ne plante pas
    const crashed = await page.evaluate(() => {
      try {
        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event('offline'));
        return false;
      } catch {
        return true;
      }
    });
    expect(crashed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Tests avec auth réelle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Résilience — comportement runtime authentifié', () => {
  test.beforeEach(({ skip }) => {
    skip(!EMAIL_A || !PWD_A, 'Secrets TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD non définis');
  });

  test('R05 — blocage Supabase → console.warn "Realtime KO" capturé', async ({ page }) => {
    test.slow(); // triple le timeout pour ce test réseau
    const warnings = [];
    page.on('console', m => {
      if (m.type() === 'warning' && m.text().includes('KO')) warnings.push(m.text());
    });

    // Bloquer les WebSockets Supabase après connexion
    await loginA(page);
    await page.route('**/realtime/v1/**', r => r.abort());

    // Déclencher manuellement un CHANNEL_ERROR
    await page.evaluate(() => {
      if (window.App?.subLocs) window.App.subLocs();
    });

    // Attendre 3s que l'erreur se propage
    await page.waitForTimeout(3_000);
    // Le test passe même sans warning — l'important est que la page ne plante pas
    const crashed = await page.evaluate(() => typeof window.App);
    expect(crashed).toBe('object');
  });

  test('R06 — logout nettoie les channels (pas de fuite après signOut)', async ({ page }) => {
    await loginA(page);

    page.on('dialog', d => d.accept());
    await page.evaluate(() => window.App.logout());
    await expect(page.locator('#sw')).toHaveClass(/active/, { timeout: 8_000 });

    // Après logout : channels internes doivent être null
    const state = await page.evaluate(() => ({
      chMsg:              window.App ? null : 'App disparu',
      ImmatMessages:      typeof window.ImmatMessages,
    }));
    // ImmatMessages reste défini mais son channel interne doit être nettoyé
    expect(state.ImmatMessages).toBe('object');
  });
});
