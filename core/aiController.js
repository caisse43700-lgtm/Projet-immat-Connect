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

  w.AiController = {
    handleAiRequest,
    needsConfirmation,
    detectAction
  };

  w.handleAiRequest = handleAiRequest;

  if (typeof module !== 'undefined') module.exports = { AiController: w.AiController };
})(typeof window !== 'undefined' ? window : globalThis);
