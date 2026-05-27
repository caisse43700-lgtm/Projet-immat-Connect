// @ts-check
const { test, expect } = require('@playwright/test');
const { resetBrowser } = require('./helpers/reset');

const EMAIL_A = process.env.TEST_USER_A_EMAIL;
const PWD_A   = process.env.TEST_USER_A_PASSWORD;
const EMAIL_B = process.env.TEST_USER_B_EMAIL;
const PWD_B   = process.env.TEST_USER_B_PASSWORD;
const PLATE_A = 'ZZ-001-TT';
const PLATE_B = 'ZZ-002-TT';

function skipIfNoAuth({ skip }) {
  skip(!EMAIL_A || !PWD_A, 'Secrets TEST_USER_A_* non définis');
}
function skipIfNoBoth({ skip }) {
  skip(!EMAIL_A || !PWD_A || !EMAIL_B || !PWD_B, 'Secrets TEST_USER_A_* et TEST_USER_B_* requis');
}

async function loginAs(page, email, pwd) {
  await page.goto('/');
  await resetBrowser(page);
  await page.goto('/');
  await page.click('#welcomeLoginBtn');
  await page.fill('#iEmail', email);
  await page.fill('#iPwd',   pwd);
  await page.click('#authBtn');
  await expect(page.locator('#appScreen')).toHaveClass(/active/, { timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Sécurité RLS — isolation des données', () => {
  test('S01 — compte A ne peut pas modifier le profil de compte B', async ({ page }) => {
    test.info().annotations.push({ type: 'skip-if', description: skipIfNoBoth.toString() });
    skipIfNoBoth({ skip: test.skip.bind(test) });

    await loginAs(page, EMAIL_A, PWD_A);

    // Tente de modifier le pseudo du profil associé à PLATE_B
    const result = await page.evaluate(async (plate) => {
      const { data, error, count } = await window.sb
        .from('profiles')
        .update({ pseudo: 'HACKED_BY_A' })
        .eq('owner_plate', plate)
        .select();
      return { rows: data?.length ?? 0, error: error?.message ?? null };
    }, PLATE_B);

    // RLS doit bloquer : 0 lignes modifiées ou erreur explicite
    expect(result.rows, 'RLS doit empêcher la modification du profil B par A').toBe(0);
  });

  test('S02 — compte A ne voit que ses propres messages (pas ceux de B→B)', async ({ page }) => {
    test.info().annotations.push({ type: 'skip-if', description: skipIfNoAuth.toString() });
    skipIfNoAuth({ skip: test.skip.bind(test) });

    await loginAs(page, EMAIL_A, PWD_A);

    // Requête : messages où ni sender ni receiver n'est PLATE_A
    const rows = await page.evaluate(async (plateA) => {
      const { data } = await window.sb
        .from('messages')
        .select('id, sender_plate, receiver_plate')
        .neq('sender_plate',   plateA)
        .neq('receiver_plate', plateA)
        .limit(10);
      return data ?? [];
    }, PLATE_A);

    // Avec RLS : doit retourner 0 résultats (les messages n'impliquant pas A sont filtrés)
    expect(rows.length, 'RLS doit masquer les messages entre autres utilisateurs').toBe(0);
  });

  test('S03 — isolation localStorage entre compte A et compte B', async ({ browser }) => {
    skipIfNoBoth({ skip: test.skip.bind(test) });

    // Deux contextes navigateur totalement séparés
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, EMAIL_A, PWD_A);
      await loginAs(pageB, EMAIL_B, PWD_B);

      // La plaque affichée dans chaque contexte doit être la sienne
      const plateInA = await pageA.locator('#tbPlate').textContent({ timeout: 5_000 });
      const plateInB = await pageB.locator('#tbPlate').textContent({ timeout: 5_000 });

      expect(plateInA?.trim()).toBe(PLATE_A);
      expect(plateInB?.trim()).toBe(PLATE_B);
      // Les plaques ne se croisent pas
      expect(plateInA?.trim()).not.toBe(plateInB?.trim());
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('S04 — pas de fuite de données A dans le localStorage après logout', async ({ page }) => {
    skipIfNoBoth({ skip: test.skip.bind(test) });

    // Connexion compte A
    await loginAs(page, EMAIL_A, PWD_A);
    const plateA = await page.locator('#tbPlate').textContent({ timeout: 5_000 });
    expect(plateA?.trim()).toBe(PLATE_A);

    // Logout
    page.on('dialog', d => d.accept());
    await page.evaluate(() => window.App.logout());
    await expect(page.locator('#sw')).toHaveClass(/active/, { timeout: 8_000 });

    // Connexion compte B dans la même page
    await loginAs(page, EMAIL_B, PWD_B);
    const plateB = await page.locator('#tbPlate').textContent({ timeout: 5_000 });
    expect(plateB?.trim()).toBe(PLATE_B);

    // localStorage de B ne doit pas contenir des données de A
    const leak = await page.evaluate((pA) => {
      const raw = JSON.stringify(localStorage);
      return raw.includes(pA);
    }, PLATE_A);
    expect(leak, `La plaque de A (${PLATE_A}) ne doit pas traîner dans le localStorage de B`).toBe(false);
  });
});
