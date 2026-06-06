'use strict';

const { ImmatBus } = require('../bus');
const { createDiagnosticAdapter } = require('./diagnostic-adapter');
const { DiagnosticInbox } = require('./diagnostic-inbox');

function connectDiagnosticToBus(options = {}) {
  const bus = options.bus || ImmatBus;
  const inbox = options.inbox || DiagnosticInbox;
  const adapter = options.adapter || createDiagnosticAdapter({ inbox });

  if (!bus || typeof bus.on !== 'function') {
    throw new Error('ImmatBus indisponible : impossible de connecter le diagnostic');
  }

  const unsubscribe = bus.on('*', entry => {
    if (!entry || !entry.event) return;
    adapter.adapt(entry.event, Object.assign({}, entry.payload || {}, { _eventAt: entry.at }));
  });

  return {
    connected: true,
    unsubscribe,
    inbox,
    adapter,
  };
}

module.exports = { connectDiagnosticToBus };
