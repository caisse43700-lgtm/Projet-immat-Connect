/* core/aiController.js — Entree IA centrale */
(function (w) {
  'use strict';

  const SENSITIVE_ACTIONS = [
    'modifier_fichier',
    'supprimer_donnee',
    'ecraser_information',
    'effacer_codes_defauts',
    'envoyer_donnees',
    'exporter_donnees'
  ];

  function textOf(message) {
    return String(message || '').trim().toLowerCase();
  }

  function obdGateway() {
    return w.ObdGateway || null;
  }

  function isConnectRequest(text) {
    return text.includes('connecte') || text.includes('connexion') || text.includes('obd');
  }

  function detectAction(text) {
    if (text.includes('diagnostic')) return 'diagnostic';
    if (text.includes('defaut') || text.includes('défaut') || text.includes('code')) return 'codes_defauts';
    if (text.includes('temps reel') || text.includes('temps réel') || text.includes('direct')) return 'donnees_temps_reel';
    if (text.includes('import')) return 'importer_infos_vehicule';
    if (text.includes('info') || text.includes('vehicule') || text.includes('véhicule')) return 'infos_vehicule';
    return null;
  }

  function needsConfirmation(action) {
    return SENSITIVE_ACTIONS.includes(action);
  }

  async function handleAiRequest(message, options) {
    const text = textOf(message);
    const gateway = obdGateway();

    if (!gateway) {
      return {
        ok: false,
        status: 'missing_obd_gateway',
        message: 'Module OBD indisponible.'
      };
    }

    if (isConnectRequest(text) && !detectAction(text)) {
      return gateway.connect(options || {});
    }

    const action = detectAction(text);

    if (!action) {
      return {
        ok: true,
        status: 'need_user_choice',
        message: 'Que voulez-vous faire ?',
        actions: gateway.getActions()
      };
    }

    if (needsConfirmation(action)) {
      return {
        ok: false,
        status: 'confirmation_required',
        action,
        message: 'Cette action est sensible. Voulez-vous confirmer ?'
      };
    }

    return gateway.runAction(action);
  }

  function getObdStatus() {
    const session = !!w.ObdSession;
    const gateway = !!w.ObdGateway;
    const controller = !!w.AiController;

    return {
      session,
      gateway,
      controller,
      ready: session && gateway && controller
    };
  }

  function includesAny(text, needles) {
    return needles.some(function (needle) { return text.includes(needle); });
  }

  async function readTextFresh(path) {
    const url = path + (path.includes('?') ? '&' : '?') + 'obd=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text };
  }

  async function getCacheDiagnostic() {
    const result = {
      status: 'UNKNOWN',
      sw: {
        supported: !!(w.navigator && 'serviceWorker' in w.navigator),
        controller: false,
        scope: null,
        active: null,
        waiting: false,
        installing: false
      },
      caches: [],
      checks: {
        swV7: false,
        relativePaths: false,
        uiAngeOverlay: false,
        uiAngePanel: false,
        uiHideDisplayNone: false,
        gpsMarkerZIndex: false
      },
      errors: []
    };

    try {
      if (w.navigator && 'serviceWorker' in w.navigator) {
        result.sw.controller = !!w.navigator.serviceWorker.controller;
        const reg = await w.navigator.serviceWorker.getRegistration();
        if (reg) {
          result.sw.scope = reg.scope || null;
          result.sw.active = reg.active && reg.active.scriptURL || null;
          result.sw.waiting = !!reg.waiting;
          result.sw.installing = !!reg.installing;
        }
      }
    } catch (e) {
      result.errors.push('sw:' + (e && e.message || e));
    }

    try {
      if (w.caches && typeof w.caches.keys === 'function') {
        result.caches = await w.caches.keys();
      }
    } catch (e) {
      result.errors.push('caches:' + (e && e.message || e));
    }

    try {
      const sw = await readTextFresh('./service-worker.js');
      result.checks.swV7 = sw.ok && sw.text.includes('immatconnect-pro-v7');
      result.checks.relativePaths = sw.ok && sw.text.includes('./index.html') && sw.text.includes('./ui.js');
    } catch (e) {
      result.errors.push('fetch-sw:' + (e && e.message || e));
    }

    try {
      const ui = await readTextFresh('./ui.js');
      result.checks.uiAngeOverlay = ui.ok && ui.text.includes('angeOverlay');
      result.checks.uiAngePanel = ui.ok && ui.text.includes('angePanel');
      result.checks.uiHideDisplayNone = ui.ok && includesAny(ui.text, [
        "style.display='none'",
        'style.display="none"',
        "style.display = 'none'",
        'style.display = "none"'
      ]);
    } catch (e) {
      result.errors.push('fetch-ui:' + (e && e.message || e));
    }

    try {
      const html = await readTextFresh('./index.html');
      result.checks.gpsMarkerZIndex = html.ok && includesAny(html.text, [
        'zIndexOffset:0',
        'zIndexOffset: 0'
      ]);
    } catch (e) {
      result.errors.push('fetch-html:' + (e && e.message || e));
    }

    const oldCaches = result.caches.filter(function (key) {
      return /immatconnect-pro-v[0-6]\b/i.test(key) || /immatconnect/i.test(key) && !/v7\b/i.test(key);
    });

    if (!result.sw.supported) result.status = 'NO_SW_SUPPORT';
    else if (!result.sw.controller) result.status = 'NO_SW';
    else if (!result.checks.swV7 || !result.checks.relativePaths) result.status = 'DEPLOY_OLD';
    else if (oldCaches.length) result.status = 'CACHE_OLD';
    else if (!result.checks.uiAngeOverlay || !result.checks.uiAngePanel || !result.checks.uiHideDisplayNone || !result.checks.gpsMarkerZIndex) result.status = 'FILES_OLD';
    else result.status = 'OK';

    result.oldCaches = oldCaches;
    return result;
  }

  function formatCacheDiagnostic(diag) {
    const checks = diag.checks || {};
    return [
      'OBD cache/SW : ' + diag.status,
      '',
      'SW controller: ' + !!diag.sw.controller,
      'SW scope: ' + (diag.sw.scope || '-'),
      'SW active: ' + (diag.sw.active || '-'),
      'SW waiting: ' + !!diag.sw.waiting,
      '',
      'Caches: ' + (diag.caches.length ? diag.caches.join(', ') : '-'),
      'Anciens caches: ' + (diag.oldCaches && diag.oldCaches.length ? diag.oldCaches.join(', ') : '-'),
      '',
      'service-worker v7: ' + !!checks.swV7,
      'chemins relatifs: ' + !!checks.relativePaths,
      'ui angeOverlay: ' + !!checks.uiAngeOverlay,
      'ui angePanel: ' + !!checks.uiAngePanel,
      'ui hide display none: ' + !!checks.uiHideDisplayNone,
      'GPS zIndexOffset 0: ' + !!checks.gpsMarkerZIndex,
      diag.errors && diag.errors.length ? '\nErreurs: ' + diag.errors.join(' | ') : ''
    ].filter(Boolean).join('\n');
  }

  function isObdDebugMode() {
    return !!(
      w.location &&
      typeof w.location.search === 'string' &&
      w.location.search.includes('debug=obd')
    );
  }

  function installMobileStatusButton() {
    if (!isObdDebugMode()) return;
    if (typeof document === 'undefined') return;
    if (document.getElementById('immat-obd-status-button')) return;

    const button = document.createElement('button');
    button.id = 'immat-obd-status-button';
    button.textContent = 'Test OBD/IA';
    button.style.position = 'fixed';
    button.style.right = '12px';
    button.style.bottom = '12px';
    button.style.zIndex = '9999';
    button.style.padding = '10px 12px';
    button.style.borderRadius = '12px';
    button.style.border = '1px solid #999';
    button.style.background = '#fff';
    button.style.fontSize = '14px';

    button.addEventListener('click', async function () {
      const status = getObdStatus();
      let cacheMessage = '';
      try {
        button.disabled = true;
        button.textContent = 'Test...';
        const diag = await getCacheDiagnostic();
        cacheMessage = '\n\n' + formatCacheDiagnostic(diag);
      } catch (e) {
        cacheMessage = '\n\nOBD cache/SW indisponible : ' + (e && e.message || e);
      } finally {
        button.disabled = false;
        button.textContent = 'Test OBD/IA';
      }

      const message = status.ready
        ? 'OBD/IA OK : tous les modules sont chargés.'
        : 'OBD/IA incomplet : session=' + status.session + ', gateway=' + status.gateway + ', controller=' + status.controller;
      alert(message + cacheMessage);
    });

    document.body.appendChild(button);
  }

  w.AiController = {
    handleAiRequest,
    needsConfirmation,
    detectAction,
    getObdStatus,
    getCacheDiagnostic
  };

  w.handleAiRequest = handleAiRequest;
  w.ImmatObdStatus = getObdStatus;
  w.ImmatCacheDiagnostic = getCacheDiagnostic;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installMobileStatusButton);
    } else {
      installMobileStatusButton();
    }
  }

  if (typeof module !== 'undefined') module.exports = { AiController: w.AiController };
})(typeof window !== 'undefined' ? window : globalThis);
