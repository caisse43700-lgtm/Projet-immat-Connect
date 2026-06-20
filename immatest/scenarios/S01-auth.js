'use strict';
const { login, getPlate, getUID, runGVC } = require('../lib/account');
const R = require('../lib/reporter');
const cfg = require('../config');

module.exports = async function S01(pageA, pageB) {
  R.scenario('S01 — Authentification des deux comptes');

  // ── Compte A ──
  let loginA = false;
  try {
    await login(pageA, cfg.EMAIL_A, cfg.PWD_A);
    loginA = true;
  } catch (e) {
    R.check('Compte A connecté', false, String(e).slice(0, 120));
  }
  R.check('Compte A connecté', loginA, cfg.EMAIL_A);

  const plateA = loginA ? await getPlate(pageA) : null;
  const uidA   = loginA ? await getUID(pageA)   : null;
  R.check('Compte A — plaque chargée', !!plateA, plateA || 'null');
  R.check('Compte A — UID connu',      !!uidA,   uidA   || 'null');

  // ── Compte B ──
  let loginB = false;
  try {
    await login(pageB, cfg.EMAIL_B, cfg.PWD_B);
    loginB = true;
  } catch (e) {
    R.check('Compte B connecté', false, String(e).slice(0, 120));
  }
  R.check('Compte B connecté', loginB, cfg.EMAIL_B);

  const plateB = loginB ? await getPlate(pageB) : null;
  const uidB   = loginB ? await getUID(pageB)   : null;
  R.check('Compte B — plaque chargée', !!plateB, plateB || 'null');
  R.check('Compte B — UID connu',      !!uidB,   uidB   || 'null');

  // ── Les deux comptes sont distincts ──
  if (uidA && uidB) {
    R.check('Comptes distincts (UID différents)', uidA !== uidB, `A=${uidA.slice(0,8)}… B=${uidB.slice(0,8)}…`);
  }

  // ── GVC rapide ──
  if (loginA) {
    const gvc = await runGVC(pageA);
    const appOk = gvc?.sections?.find?.(s => s.label === 'app')?.status === 'ok';
    R.check('Compte A — GVC section App OK', appOk, appOk ? 'ok' : JSON.stringify(gvc?.sections?.find(s => s.label === 'app')?.issues || []));
  }

  // Exposer les plaques pour les scénarios suivants
  return { plateA, plateB, uidA, uidB };
};
