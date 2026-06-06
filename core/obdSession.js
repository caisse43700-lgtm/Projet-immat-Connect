/* core/obdSession.js — Gestion de session OBD */
(function (w) {
  'use strict';

  const DEFAULT_MAX_IDLE_MS = 10 * 60 * 1000;

  const state = {
    connected: false,
    connectedAt: null,
    lastActivityAt: null,
    vehicleInfo: null,
    maxIdleMs: DEFAULT_MAX_IDLE_MS
  };

  function now() {
    return Date.now();
  }

  function touch() {
    state.lastActivityAt = now();
    return getState();
  }

  function start(vehicleInfo) {
    const t = now();
    state.connected = true;
    state.connectedAt = t;
    state.lastActivityAt = t;
    state.vehicleInfo = vehicleInfo || null;
    return getState();
  }

  function stop(reason) {
    state.connected = false;
    state.connectedAt = null;
    state.lastActivityAt = null;
    state.vehicleInfo = null;
    return {
      connected: false,
      reason: reason || 'disconnected'
    };
  }

  function isValid() {
    if (!state.connected || !state.lastActivityAt) return false;
    return now() - state.lastActivityAt < state.maxIdleMs;
  }

  function getState() {
    return {
      connected: state.connected,
      valid: isValid(),
      connectedAt: state.connectedAt,
      lastActivityAt: state.lastActivityAt,
      vehicleInfo: state.vehicleInfo,
      maxIdleMs: state.maxIdleMs
    };
  }

  function requireValid() {
    if (!isValid()) {
      stop('expired');
      return {
        ok: false,
        status: 'need_reconnect',
        message: 'Connexion OBD expiree. Voulez-vous vous reconnecter ?'
      };
    }

    touch();
    return {
      ok: true,
      status: 'connected',
      message: 'Deja connecte a l OBD.',
      session: getState()
    };
  }

  w.ObdSession = {
    start,
    stop,
    touch,
    isValid,
    getState,
    requireValid
  };

  if (typeof module !== 'undefined') module.exports = { ObdSession: w.ObdSession };
})(typeof window !== 'undefined' ? window : globalThis);
