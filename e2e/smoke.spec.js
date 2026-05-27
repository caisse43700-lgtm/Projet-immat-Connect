// @ts-check
const { test, expect } = require('@playwright/test');

// Erreurs réseau attendues en CI (Supabase non disponible hors prod)
const NETWORK_PATTERNS = [
  'Failed to fetch',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED',
  'supabase.co',
  'WebSocket',
  'realtime',
  'NetworkError',
  'net::ERR_',
  'CORS',
];

function isNetworkNoise(msg) {
  return NETWORK_PATTERNS.some(p => msg.includes(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Chargement initial
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Smoke — chargement initial', () => {
  /** @type {{ type: string, msg: string }[]} */
  let criticalErrors;

  test.beforeEach(async ({ page }) => {
    criticalErrors = [];
    page.on('pageerror', err => {
      if (!isNetworkNoise(err.message))
        criticalErrors.push({ type: 'pageerror', msg: err.message });
    });
    page.on('console', msg => {
      if (msg.type() === 'error' && !isNetworkNoise(msg.text()))
        criticalErrors.push({ type: 'console.error', msg: msg.text() });
    });
  });

  test('T01 — titre de la page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('ImmatConnect Pro');
  });

  test("T02 — écran d'accueil visible au chargement", async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sw')).toHaveClass(/active/);
    await expect(page.locator('#welcomeLoginBtn')).toBeVisible();
    await expect(page.locator('#welcomeSignupBtn')).toBeVisible();
  });

  test('T03 — fonctions utils disponibles dans window', async ({ page }) => {
    await page.goto('/');
    const utils = await page.evaluate(() => ({
      nPlate:   typeof window.nPlate,
      fPlate:   typeof window.fPlate,
      vPlate:   typeof window.vPlate,
      esc:      typeof window.esc,
      km:       typeof window.km,
      inferType:typeof window.inferType,
      colorHex: typeof window.colorHex,
    }));
    for (const [fn, type] of Object.entries(utils))
      expect(type, `window.${fn} doit être une fonction`).toBe('function');
  });

  test('T04 — objet App disponible dans window', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const appType = await page.evaluate(() => typeof window.App);
    expect(appType).toBe('object');
  });

  test('T05 — aucune erreur JS critique au chargement', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(
      criticalErrors,
      `Erreurs JS critiques : ${JSON.stringify(criticalErrors, null, 2)}`
    ).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Navigation formulaires auth
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Smoke — formulaires authentification', () => {
  test('T06 — navigation vers formulaire de connexion', async ({ page }) => {
    await page.goto('/');
    await page.click('#welcomeLoginBtn');
    await expect(page.locator('#sa')).toHaveClass(/active/);
    await expect(page.locator('#iEmail')).toBeVisible();
    await expect(page.locator('#iPwd')).toBeVisible();
    await expect(page.locator('#authBtn')).toBeVisible();
  });

  test("T07 — onglet inscription affiche les champs véhicule", async ({ page }) => {
    await page.goto('/');
    await page.click('#welcomeSignupBtn');
    await expect(page.locator('#sa')).toHaveClass(/active/);
    await page.click('#tabSignup');
    await expect(page.locator('#iEmail')).toBeVisible();
    await expect(page.locator('#iPlate')).toBeVisible();
    await expect(page.locator('#iPhone')).toBeVisible();
  });

  test('T08 — retour vers accueil depuis formulaire', async ({ page }) => {
    await page.goto('/');
    await page.click('#welcomeLoginBtn');
    await expect(page.locator('#sa')).toHaveClass(/active/);
    await page.getByText('← Retour').click();
    await expect(page.locator('#sw')).toHaveClass(/active/);
  });

  test('T09 — validation plaque en temps réel via window.fPlate', async ({ page }) => {
    await page.goto('/');
    const r1 = await page.evaluate(() => window.fPlate('AB123CD'));
    const r2 = await page.evaluate(() => window.vPlate('AB-123-CD'));
    const r3 = await page.evaluate(() => window.vPlate('ABC12CD'));
    expect(r1).toBe('AB-123-CD');
    expect(r2).toBe(true);
    expect(r3).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Structure HTML critique
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Smoke — structure DOM', () => {
  test('T10 — tous les écrans auth présents dans le DOM', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sw')).toBeAttached();       // welcome
    await expect(page.locator('#sa')).toBeAttached();       // auth form
    await expect(page.locator('#sp')).toBeAttached();       // profil
    await expect(page.locator('#appScreen')).toBeAttached(); // app principale
  });

  test('T11 — manifest PWA accessible (HTTP 200)', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
  });

  test('T12 — éléments UI principaux présents dans appScreen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#map')).toBeAttached();
    await expect(page.locator('#sheet')).toBeAttached();
    await expect(page.locator('nav.bottom-nav')).toBeAttached();
    await expect(page.locator('#panelActivite')).toBeAttached();
    await expect(page.locator('#panelMessages')).toBeAttached();
  });
});
