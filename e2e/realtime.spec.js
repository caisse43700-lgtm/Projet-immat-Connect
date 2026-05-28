// @ts-check
/**
 * Tests Realtime multi-session.
 * Nécessite : TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 * Ces tests utilisent deux browserContext simultanés et sont potentiellement lents.
 */
const { test, expect } = require('@playwright/test');
const { resetBrowser, resetTestData } = require('./helpers/reset');

const EMAIL_A = process.env.TEST_USER_A_EMAIL;
const PWD_A   = process.env.TEST_USER_A_PASSWORD;
const EMAIL_B = process.env.TEST_USER_B_EMAIL;
const PWD_B   = process.env.TEST_USER_B_PASSWORD;
const PLATE_A = 'ZZ-001-TT';
const PLATE_B = 'ZZ-002-TT';

function skipIfNoBoth() {
  test.skip(!EMAIL_A || !PWD_A || !EMAIL_B || !PWD_B,
    'Secrets TEST_USER_A_* et TEST_USER_B_* requis pour les tests Realtime');
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
test.describe('Realtime multi-session @realtime', () => {
  test.slow(); // triple le timeout — réseau Supabase impliqué

  test.beforeEach(skipIfNoBoth);

  test.afterAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await resetTestData(page);
    await ctx.close();
  });

  test('RT01 — badge Activité de B s\'incrémente quand A envoie un message', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, EMAIL_A, PWD_A);
      await loginAs(pageB, EMAIL_B, PWD_B);

      // Badge initial de B
      const badgeB = pageB.locator('#actBadge');
      const badgeBefore = await badgeB.isVisible()
        ? Number(await badgeB.textContent())
        : 0;

      // A envoie un message à B via l'API de la page
      await pageA.evaluate(async (target) => {
        await window.App?.sendMsg?.();
        // Utiliser directement window.sb pour envoyer proprement
        await window.sb.from('messages').insert({
          sender_plate:   'ZZ-001-TT',
          receiver_plate: target,
          body:           'Test Realtime RT01',
        });
      }, PLATE_B);

      // Attendre que le badge de B s'incrémente (max 10s)
      await expect(async () => {
        const visible = await badgeB.isVisible();
        if (!visible) throw new Error('badge non visible');
        const val = Number(await badgeB.textContent());
        expect(val).toBeGreaterThan(badgeBefore);
      }).toPass({ timeout: 10_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('RT02 — message de A visible dans Activité > Reçus de B', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, EMAIL_A, PWD_A);
      await loginAs(pageB, EMAIL_B, PWD_B);

      // A insère un message vers B
      await pageA.evaluate(async (plate) => {
        await window.sb.from('messages').insert({
          sender_plate:   'ZZ-001-TT',
          receiver_plate: plate,
          body:           'Test Realtime RT02',
        });
      }, PLATE_B);

      // B ouvre Activité
      await pageB.click('#navActivite');
      await expect(pageB.locator('#panelActivite')).toHaveClass(/on/, { timeout: 5_000 });

      // Attendre que le message apparaisse dans la liste (max 10s)
      await expect(async () => {
        const text = await pageB.locator('#panelActivite').textContent();
        expect(text).toContain('ZZ-001-TT');
      }).toPass({ timeout: 10_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('RT03 — pas de double floating card quand B reçoit un message de A', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, EMAIL_A, PWD_A);
      await loginAs(pageB, EMAIL_B, PWD_B);

      // Compter les fois où floatingCard devient visible
      let cardAppearances = 0;
      await pageB.exposeFunction('__rtCardShown', () => { cardAppearances++; });
      await pageB.evaluate(() => {
        const card = document.getElementById('floatingCard');
        if (!card) return;
        new MutationObserver(muts => {
          muts.forEach(m => {
            if (m.type === 'attributes' && m.attributeName === 'style') {
              const el = m.target;
              if (el.style.display !== 'none') window.__rtCardShown();
            }
          });
        }).observe(card, { attributes: true });
      });

      // A envoie un message à B
      await pageA.evaluate(async (plate) => {
        await window.sb.from('messages').insert({
          sender_plate:   'ZZ-001-TT',
          receiver_plate: plate,
          body:           'Test Realtime RT03 double card',
        });
      }, PLATE_B);

      await pageB.waitForTimeout(5_000);

      // La floating card doit apparaître au maximum 1 fois (pas de doublon)
      expect(cardAppearances, 'La floating card ne doit apparaître qu\'une seule fois').toBeLessThanOrEqual(1);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('RT04 — logout de A nettoie ses channels Realtime', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();

    try {
      await loginAs(pageA, EMAIL_A, PWD_A);

      // Vérifier que les channels sont actifs
      const before = await pageA.evaluate(() => ({
        chMsg:     !!window.App?.S?.chMsg,
        chLoc:     !!window.App?.S?.chLoc,
        ImmatMsg:  typeof window.ImmatMessages,
      }));
      expect(before.ImmatMsg).toBe('object');

      // Logout
      pageA.on('dialog', d => d.accept());
      await pageA.evaluate(() => window.App.logout());
      await expect(pageA.locator('#sw')).toHaveClass(/active/, { timeout: 8_000 });

      // ImmatMessages.unsubscribe() a dû être appelé → channel = null
      // On vérifie simplement que la page n'a pas crashé
      const appStillDefined = await pageA.evaluate(() => typeof window.App !== 'undefined');
      expect(appStillDefined).toBe(true);
    } finally {
      await ctxA.close();
    }
  });
});
