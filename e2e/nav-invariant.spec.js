// @ts-check
// NAVIGATION V2 — test de l'INVARIANT « un seul panneau visible » (doctrine :
// tout état perçu a un propriétaire unique, un invariant nommé, une preuve observable).
// Reproduit les scénarios terrain qui ont bugué : « depuis Activité (même dans une
// catégorie), la voix ouvre Signaler » — et toutes les transitions croisées clic/voix.
const { test, expect } = require('@playwright/test');

const PANELS = ['panelAltet', 'panelDrive', 'panelMessages', 'panelSettings', 'panelActivite'];

async function visiblePanels(page) {
  return page.evaluate((ids) => ids.filter((id) => {
    const e = document.getElementById(id);
    if (!e) return false;
    const c = getComputedStyle(e);
    return c.display !== 'none' && c.visibility !== 'hidden' && e.getBoundingClientRect().height > 40;
  }), PANELS);
}

test.describe('Navigation V2 — invariant un seul panneau visible', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.App && window.AngeDialog && window.App.navigate, null, { timeout: 15000 });
    // Simule l'état connecté (les panneaux vivent sous appScreen)
    await page.evaluate(() => {
      const a = document.getElementById('appScreen');
      if (a) { a.classList.add('active'); a.style.display = ''; }
    });
  });

  test('voix : « ouvre signaler » depuis Activité remplace le panneau', async ({ page }) => {
    await page.evaluate(() => window.App.navigate('activite', { source: 'test' }));
    await page.waitForTimeout(500);
    expect(await visiblePanels(page)).toEqual(['panelActivite']);

    await page.evaluate(() => window.AngeDialog._tryOpen('ouvre signaler'));
    await page.waitForTimeout(1000);
    expect(await visiblePanels(page)).toEqual(['panelAltet']);
    expect(await page.evaluate(() => document.getElementById('sigStep1')?.classList.contains('active'))).toBe(true);
  });

  test('voix : « ouvre signaler » depuis une CATÉGORIE d\'Activité (scénario terrain)', async ({ page }) => {
    await page.evaluate(() => { window.App.navigate('activite', { source: 'test' }); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { try { window.App.openActivityCat('aide'); } catch (e) {} });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.AngeDialog._tryOpen('ouvre signaler'));
    await page.waitForTimeout(1000);
    expect(await visiblePanels(page)).toEqual(['panelAltet']);
  });

  test('transitions croisées : chaque destination remplace la précédente', async ({ page }) => {
    const seq = [
      ['ouvre les messages', 'panelMessages'],
      ['ouvre les appels', 'panelMessages'],
      ['ouvre le gps', 'panelDrive'],
      ['ouvre l\'activité', 'panelActivite'],
      ['ouvre signaler', 'panelAltet'],
    ];
    for (const [utter, pid] of seq) {
      await page.evaluate((u) => window.AngeDialog._tryOpen(u), utter);
      await page.waitForTimeout(900);
      const vis = await visiblePanels(page);
      expect(vis, `après « ${utter} »`).toEqual([pid]);
    }
  });

  test('clic (navigate source:click) respecte aussi l\'invariant', async ({ page }) => {
    for (const [dest, pid] of [['messages', 'panelMessages'], ['signaler', 'panelAltet'], ['activite', 'panelActivite']]) {
      await page.evaluate((d) => window.App.navigate(d, { source: 'click' }), dest);
      await page.waitForTimeout(500);
      expect(await visiblePanels(page), `navigate(${dest})`).toEqual([pid]);
    }
  });
});
