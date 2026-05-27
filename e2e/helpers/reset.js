// @ts-check
'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vemgdkkbldgyvaisudkd.supabase.co';
const TEST_PLATES  = 'ZZ-001-TT,ZZ-002-TT';

/**
 * Vide localStorage, sessionStorage et désinscrit les service workers.
 * À appeler après page.goto('/').
 */
async function resetBrowser(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister()))
        .catch(() => {});
    }
  });
}

/**
 * Supprime les données de test via l'API Supabase service-role.
 * Silencieux si SUPABASE_SERVICE_KEY n'est pas défini.
 */
async function resetTestData(page) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return;

  const h = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'return=minimal',
  };

  const base = SUPABASE_URL + '/rest/v1';
  const plates = TEST_PLATES;

  await Promise.allSettled([
    page.request.delete(`${base}/messages?sender_plate=in.(${plates})`,   { headers: h }),
    page.request.delete(`${base}/messages?receiver_plate=in.(${plates})`, { headers: h }),
    page.request.delete(`${base}/reports?plate=in.(${plates})`,           { headers: h }),
    page.request.delete(`${base}/user_locations?owner_plate=in.(${plates})`, { headers: h }),
  ]);
}

/**
 * Récupère la session active depuis localStorage (stockée par Supabase JS).
 * Retourne null si non connecté.
 */
async function getSession(page) {
  return page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (!k.includes('supabase')) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k) || '{}');
        if (v?.access_token) return v;
      } catch {}
    }
    return null;
  });
}

module.exports = { resetBrowser, resetTestData, getSession, SUPABASE_URL };
