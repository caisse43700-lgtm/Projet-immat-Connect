/* core/obdGateway.js — Porte d entree OBD */
(function (w) {
  'use strict';

  const ACTIONS = [
    'Lire les informations du vehicule',
    'Lancer un diagnostic',
    'Voir les codes defauts',
    'Suivre les donnees en temps reel',
    'Importer les infos dans le dossier vehicule'
  ];

  function sessionApi() {
    return w.ObdSession || null;
  }

  function buildConnectedResponse(session) {
    return {
      ok: true,
      status: 'connected',
      message: 'Vous etes connecte a l OBD. Que voulez-vous faire ?',
      actions: ACTIONS.slice(),
      session: session || null
    };
  }

  async function connect(options) {
    const ObdSession = sessionApi();
    if (!ObdSession) {
      return {
        ok: false,
        status: 'missing_session_module',
        message: 'Module de session OBD indisponible.'
      };
    }

    const current = ObdSession.getState();
    if (current.valid) {
      ObdSession.touch();
      return buildConnectedResponse(ObdSession.getState());
    }

    const vehicleInfo = options && options.vehicleInfo ? options.vehicleInfo : null;
    const session = ObdSession.start(vehicleInfo);
    return buildConnectedResponse(session);
  }

  function requireConnection() {
    const ObdSession = sessionApi();
    if (!ObdSession) {
      return {
        ok: false,
        status: 'missing_session_module',
        message: 'Module de session OBD indisponible.'
      };
    }
    return ObdSession.requireValid();
  }

  async function runAction(action) {
    const check = requireConnection();
    if (!check.ok) return check;

    return {
      ok: true,
      status: 'action_ready',
      action: action || 'unknown',
      message: 'Action OBD prete : ' + (action || 'demande non precisee'),
      session: check.session
    };
  }

  function getActions() {
    return ACTIONS.slice();
  }

  w.ObdGateway = {
    connect,
    requireConnection,
    runAction,
    getActions
  };

  if (typeof module !== 'undefined') module.exports = { ObdGateway: w.ObdGateway };
})(typeof window !== 'undefined' ? window : globalThis);
