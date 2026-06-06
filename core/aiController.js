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

    button.addEventListener('click', function () {
      const status = getObdStatus();
      const message = status.ready
        ? 'OBD/IA OK : tous les modules sont chargés.'
        : 'OBD/IA incomplet : session=' + status.session + ', gateway=' + status.gateway + ', controller=' + status.controller;
      alert(message);
    });

    document.body.appendChild(button);
  }

  w.AiController = {
    handleAiRequest,
    needsConfirmation,
    detectAction,
    getObdStatus
  };

  w.handleAiRequest = handleAiRequest;
  w.ImmatObdStatus = getObdStatus;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installMobileStatusButton);
    } else {
      installMobileStatusButton();
    }
  }

  if (typeof module !== 'undefined') module.exports = { AiController: w.AiController };
})(typeof window !== 'undefined' ? window : globalThis);
