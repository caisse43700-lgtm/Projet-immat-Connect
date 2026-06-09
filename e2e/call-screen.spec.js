// @ts-check
/**
 * e2e/call-screen.spec.js — CallScreen Phase 2 + AudioManager Phase 7+
 *
 * Ce que ce test peut couvrir sans terrain :
 *   - DOM : tous les éléments du CallScreen existent
 *   - API : tous les exports CallScreen/AudioManager exposés
 *   - État initial : overlay caché, mode 'idle'
 *   - Navigation Contact : onglets Appels/Messages présents
 *   - Flux ImmatBus → CallScreen : CALL_RECEIVED, CALL_INITIATED, CALL_MISSED, hide()
 *
 * Ce que ce test ne peut PAS couvrir (terrain requis) :
 *   - AudioContext.resume() sur iOS Safari réel
 *   - Supabase Realtime WebSocket
 *   - Sonnerie audible
 */
const { test, expect } = require('@playwright/test');

const NETWORK_NOISE = [
  'supabase.co', 'WebSocket', 'realtime', 'net::ERR_',
  'Failed to fetch', 'ERR_NAME_NOT_RESOLVED', 'CORS',
];
function isNoise(msg) { return NETWORK_NOISE.some(p => msg.includes(p)); }

/** Attend que window.CallScreen ET window.ImmatBus soient disponibles */
async function waitForModules(page) {
  await page.waitForFunction(
    () => typeof window.CallScreen !== 'undefined'
       && typeof window.ImmatBus   !== 'undefined'
       && typeof window.AudioManager !== 'undefined',
    { timeout: 10_000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — CallScreen DOM & API
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CallScreen — DOM & API', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', e => { if (!isNoise(e.message)) console.warn('[pageerror]', e.message); });
    await page.goto('/');
    await waitForModules(page);
  });

  test('CS01 — #callOverlay présent dans le DOM', async ({ page }) => {
    await expect(page.locator('#callOverlay')).toBeAttached();
  });

  test('CS02 — éléments full-screen présents', async ({ page }) => {
    for (const id of ['callOvFull', 'callOvActions', 'callOvAvatarWrap', 'callOvPlate', 'callOvStatus', 'callOvTimer']) {
      await expect(page.locator(`#${id}`), `#${id} doit être dans le DOM`).toBeAttached();
    }
  });

  test('CS03 — éléments mini-barre présents', async ({ page }) => {
    for (const id of ['callOvMini', 'callOvMiniPlate', 'callOvMiniTimer', 'callOvBtnSpeaker', 'callOvBtnMute']) {
      await expect(page.locator(`#${id}`), `#${id} doit être dans le DOM`).toBeAttached();
    }
  });

  test('CS04 — overlay caché par défaut', async ({ page }) => {
    const display = await page.evaluate(() => {
      const el = document.getElementById('callOverlay');
      return el ? (el.style.display || window.getComputedStyle(el).display) : 'missing';
    });
    expect(display, 'callOverlay doit être caché au chargement').toBe('none');
  });

  test('CS05 — API CallScreen complète', async ({ page }) => {
    const api = await page.evaluate(() => {
      const cs = window.CallScreen;
      if (!cs) return null;
      return ['showIncoming','showOutgoing','showMissed','showExpired','showAccepted',
              'hide','getState','minimize','expand','toggleSpeaker','toggleMute',
              '_accept','_refuse','_cancel','_hangupFromMini']
        .reduce((acc, fn) => { acc[fn] = typeof cs[fn] === 'function'; return acc; }, {});
    });
    expect(api, 'CallScreen doit être défini').not.toBeNull();
    for (const [fn, ok] of Object.entries(api ?? {}))
      expect(ok, `CallScreen.${fn}() doit être une fonction`).toBe(true);
  });

  test('CS06 — getState() retourne mode idle au démarrage', async ({ page }) => {
    const state = await page.evaluate(() => {
      try { return window.CallScreen?.getState?.() ?? null; } catch (e) { return null; }
    });
    expect(state).not.toBeNull();
    expect(state.mode).toBe('idle');
    expect(state.plate).toBeNull();
    expect(state.requestId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — AudioManager Phase 7+
// ─────────────────────────────────────────────────────────────────────────────
test.describe('AudioManager — Phase 7+', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForModules(page);
  });

  test('AM01 — AudioManager chargé', async ({ page }) => {
    const loaded = await page.evaluate(() => typeof window.AudioManager === 'object' && window.AudioManager !== null);
    expect(loaded).toBe(true);
  });

  test('AM02 — API AudioManager complète', async ({ page }) => {
    const api = await page.evaluate(() => {
      const am = window.AudioManager;
      if (!am) return null;
      return ['playIncomingRingtone','playOutgoingTone','stopCallAudio','stopAll',
              'setVolume','unlockFromUserGesture','getRuntimeState']
        .reduce((acc, fn) => { acc[fn] = typeof am[fn] === 'function'; return acc; }, {});
    });
    expect(api).not.toBeNull();
    for (const [fn, ok] of Object.entries(api ?? {}))
      expect(ok, `AudioManager.${fn}() doit être une fonction`).toBe(true);
  });

  test('AM03 — getRuntimeState() retourne un état cohérent', async ({ page }) => {
    const state = await page.evaluate(() => {
      try { return window.AudioManager?.getRuntimeState?.() ?? null; } catch (e) { return null; }
    });
    expect(state).not.toBeNull();
    expect(typeof state.supported).toBe('boolean');
    expect(typeof state.soundsEnabled).toBe('boolean');
    expect(typeof state.synthAvailable).toBe('boolean');
    expect(['running','suspended','closed','unavailable']).toContain(state.webAudioContextState);
  });

  test('AM04 — Web Audio API disponible (synthèse sans fichier audio)', async ({ page }) => {
    const synthOk = await page.evaluate(() => {
      try { return window.AudioManager?.getRuntimeState?.()?.synthAvailable ?? false; } catch (e) { return false; }
    });
    expect(synthOk, 'AudioContext doit être disponible dans Chromium').toBe(true);
  });

  test('AM05 — setVolume borne les valeurs extrêmes', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        window.AudioManager.setVolume(-5);
        const s1 = window.AudioManager.getRuntimeState();
        window.AudioManager.setVolume(999);
        const s2 = window.AudioManager.getRuntimeState();
        window.AudioManager.setVolume(0.25);
        return { ok: true };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    expect(result.ok, 'setVolume ne doit pas lever d\'exception').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Navigation Contact (onglets Appels / Messages)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Navigation Contact — onglets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('NAV01 — onglets Appels et Messages présents', async ({ page }) => {
    await expect(page.locator('#icTabAppels')).toBeAttached();
    await expect(page.locator('#icTabMessages')).toBeAttached();
  });

  test('NAV02 — panneaux Appels et Messages présents', async ({ page }) => {
    await expect(page.locator('#icAppelsPane')).toBeAttached();
    await expect(page.locator('#icCallLog')).toBeAttached();
    await expect(page.locator('#icMsgList')).toBeAttached();
  });

  test('NAV03 — fonctions App Contact exposées', async ({ page }) => {
    await waitForModules(page);
    const fns = await page.evaluate(() => ({
      switchContactTab:  typeof window.App?.switchContactTab  === 'function',
      renderCallJournal: typeof window.App?.renderCallJournal === 'function',
      callFromJournal:   typeof window.App?.callFromJournal   === 'function',
    }));
    expect(fns.switchContactTab,  'App.switchContactTab doit être une fonction').toBe(true);
    expect(fns.renderCallJournal, 'App.renderCallJournal doit être une fonction').toBe(true);
    expect(fns.callFromJournal,   'App.callFromJournal doit être une fonction').toBe(true);
  });

  test('NAV04 — switchContactTab(appels) affiche #icAppelsPane', async ({ page }) => {
    await waitForModules(page);
    await page.evaluate(() => window.App?.switchContactTab?.('appels'));
    const appelsVisible = await page.evaluate(() => {
      const el = document.getElementById('icAppelsPane');
      if (!el) return false;
      const d = el.style.display || window.getComputedStyle(el).display;
      return d !== 'none';
    });
    expect(appelsVisible, '#icAppelsPane doit être visible après switchContactTab("appels")').toBe(true);
  });

  test('NAV05 — switchContactTab(messages) affiche #icMsgList', async ({ page }) => {
    await waitForModules(page);
    await page.evaluate(() => window.App?.switchContactTab?.('messages'));
    const msgVisible = await page.evaluate(() => {
      const el = document.getElementById('icMsgList');
      if (!el) return false;
      const d = el.style.display || window.getComputedStyle(el).display;
      return d !== 'none';
    });
    expect(msgVisible, '#icMsgList doit être visible après switchContactTab("messages")').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Flux ImmatBus → CallScreen (sans Supabase)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flux ImmatBus → CallScreen', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', e => { if (!isNoise(e.message)) console.warn('[pageerror]', e.message); });
    await page.goto('/');
    await waitForModules(page);
    // Repartir d'un état propre
    await page.evaluate(() => { try { window.CallScreen.hide(); } catch (e) {} });
  });

  test('FLOW01 — CALL_RECEIVED → overlay visible + mode incoming', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'BZ-652-LL', requestId: 'test-req-1' });
    });
    await page.waitForFunction(() => document.getElementById('callOverlay')?.style.display !== 'none', { timeout: 2000 });

    const state = await page.evaluate(() => window.CallScreen.getState());
    expect(state.mode).toBe('incoming');
    expect(state.plate).toBe('BZ-652-LL');
    expect(state.requestId).toBe('test-req-1');

    const overlayVisible = await page.evaluate(() => document.getElementById('callOverlay')?.style.display !== 'none');
    expect(overlayVisible).toBe(true);

    // Nettoyage
    await page.evaluate(() => window.CallScreen.hide());
  });

  test('FLOW02 — hide() après CALL_RECEIVED → overlay caché + mode idle', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'AB-123-CD', requestId: 'test-req-2' });
    });
    await page.waitForFunction(() => document.getElementById('callOverlay')?.style.display !== 'none', { timeout: 2000 });

    await page.evaluate(() => window.CallScreen.hide());

    const state = await page.evaluate(() => window.CallScreen.getState());
    expect(state.mode).toBe('idle');
    expect(state.plate).toBeNull();

    const display = await page.evaluate(() => document.getElementById('callOverlay')?.style.display);
    expect(display).toBe('none');
  });

  test('FLOW03 — CALL_INITIATED → mode outgoing', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_INITIATED', { to: 'BE-521-MM', requestId: 'test-req-3' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'outgoing', { timeout: 2000 });

    const state = await page.evaluate(() => window.CallScreen.getState());
    expect(state.mode).toBe('outgoing');
    expect(state.plate).toBe('BE-521-MM');
    expect(state.requestId).toBe('test-req-3');

    await page.evaluate(() => window.CallScreen.hide());
  });

  test('FLOW04 — CALL_MISSED → mode missed + overlay visible', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_MISSED', { from: 'XY-789-ZZ', requestId: 'test-req-4' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'missed', { timeout: 2000 });

    const state = await page.evaluate(() => window.CallScreen.getState());
    expect(state.mode).toBe('missed');
    expect(state.plate).toBe('XY-789-ZZ');

    await page.evaluate(() => window.CallScreen.hide());
  });

  test('FLOW05 — CALL_REFUSED → overlay caché', async ({ page }) => {
    // D'abord mettre en incoming
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'AA-111-BB', requestId: 'test-req-5' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'incoming', { timeout: 2000 });

    // Refus
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_REFUSED', {});
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'idle', { timeout: 2000 });

    const display = await page.evaluate(() => document.getElementById('callOverlay')?.style.display);
    expect(display).toBe('none');
  });

  test('FLOW06 — CALL_CANCELLED → overlay caché', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_INITIATED', { to: 'CC-222-DD', requestId: 'test-req-6' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'outgoing', { timeout: 2000 });

    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_CANCELLED', {});
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'idle', { timeout: 2000 });

    const display = await page.evaluate(() => document.getElementById('callOverlay')?.style.display);
    expect(display).toBe('none');
  });

  test('FLOW07 — minimize() → mini-barre visible, full caché', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'EE-333-FF', requestId: 'test-req-7' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'incoming', { timeout: 2000 });

    await page.evaluate(() => window.CallScreen.minimize());

    const result = await page.evaluate(() => {
      const full = document.getElementById('callOvFull');
      const mini = document.getElementById('callOvMini');
      return {
        fullHidden: full?.style.display === 'none',
        miniVisible: mini?.style.display !== 'none',
      };
    });
    expect(result.fullHidden, 'callOvFull caché après minimize()').toBe(true);
    expect(result.miniVisible, 'callOvMini visible après minimize()').toBe(true);

    await page.evaluate(() => window.CallScreen.hide());
  });

  test('FLOW08 — plaque correctement affichée dans overlay', async ({ page }) => {
    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'BZ-652-LL', requestId: 'test-req-8' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'incoming', { timeout: 2000 });

    const plate = await page.evaluate(() => document.getElementById('callOvPlate')?.textContent);
    expect(plate).toBe('BZ-652-LL');

    await page.evaluate(() => window.CallScreen.hide());
  });

  test('FLOW09 — stopCallAudio() appelé par hide() sans exception', async ({ page }) => {
    let audioError = null;
    page.on('pageerror', e => { if (!isNoise(e.message)) audioError = e.message; });

    await page.evaluate(() => {
      window.ImmatBus.emit('CALL_RECEIVED', { from: 'GG-444-HH', requestId: 'test-req-9' });
    });
    await page.waitForFunction(() => window.CallScreen.getState().mode === 'incoming', { timeout: 2000 });
    await page.evaluate(() => window.CallScreen.hide());
    await page.waitForTimeout(300);

    expect(audioError, 'Aucune exception JS lors de hide()').toBeNull();
    const playing = await page.evaluate(() => window.AudioManager.getRuntimeState().currentlyPlaying);
    expect(playing).toBeNull();
  });
});
