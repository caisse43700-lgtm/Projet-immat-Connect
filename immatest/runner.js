#!/usr/bin/env node
'use strict';

/**
 * Immatest — Robot de test bout-en-bout ImmatConnect Pro
 * Usage : node immatest/runner.js [--headless] [--scenario S01]
 */

const { launch, newPage, close } = require('./lib/browser');
const { analyzeFailure } = require('./lib/ai-analyzer');
const R = require('./lib/reporter');

const S01 = require('./scenarios/S01-auth');
const S02 = require('./scenarios/S02-messages');
const S03 = require('./scenarios/S03-signalement');
const S04 = require('./scenarios/S04-appels');

const HEADLESS = process.argv.includes('--headless');
const ONLY     = (() => { const i = process.argv.indexOf('--scenario'); return i >= 0 ? process.argv[i+1] : null; })();

async function run() {
  console.log('🧪 Immatest démarrage…');
  console.log(`   Mode : ${HEADLESS ? 'headless' : 'visible'}`);
  if (ONLY) console.log(`   Scénario seul : ${ONLY}`);

  const browser = await launch();
  // Override headless si demandé
  if (HEADLESS) {
    const b2 = await require('playwright').chromium.launch({ headless: true });
    await browser.close();
    Object.assign(browser, b2);
  }

  const pageA = await newPage(browser);
  const pageB = await newPage(browser);

  let ctx = {};

  try {
    // ── S01 — Auth (toujours en premier) ──
    if (!ONLY || ONLY === 'S01') {
      ctx = await S01(pageA, pageB);
    }

    if (!ctx.plateA || !ctx.plateB) {
      console.error('\n❌ Authentification échouée — arrêt des tests.');
      R.writeHtml();
      process.exit(1);
    }

    // ── S02 — Messages ──
    if (!ONLY || ONLY === 'S02') {
      await S02(pageA, pageB, ctx);
    }

    // ── S03 — Signalement ──
    if (!ONLY || ONLY === 'S03') {
      await S03(pageA, pageB, ctx);
    }

    // ── S04 — Appels ──
    if (!ONLY || ONLY === 'S04') {
      await S04(pageA, pageB, ctx);
    }

  } catch (e) {
    console.error('\n💥 Erreur fatale runner :', e.message);
  }

  // ── Analyse IA des échecs ──
  for (const sc of R.results) {
    const fails = sc.checks.filter(c => c.pass === false);
    if (fails.length === 0) continue;

    console.log(`\n🤖 Analyse IA pour "${sc.name}" (${fails.length} échec(s))…`);
    try {
      const fix = await analyzeFailure(sc.name, fails, {});
      if (fix) {
        R.addAiFix(sc.name, fails.map(f => f.label).join(', '), fix);
        console.log(`   Fix IA : ${fix.slice(0, 200)}`);
      }
    } catch (e) {
      console.warn('   IA non disponible :', e.message);
    }
  }

  await close();
  const { fail } = R.summary();
  const report = R.writeHtml();

  console.log(`\n${fail === 0 ? '🎉 Tous les tests passent !' : `⚠️  ${fail} échec(s) — voir le rapport`}`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
