/* core/bus.js — ImmatBus : bus d'événements interne ImmatOrganism V1
 *
 * Canal de communication entre organes.
 * Phase 1 : observe et journalise. Ne bloque rien.
 */
'use strict';

const EVENTS = Object.freeze({
  ROAD_CREATED:            'ROAD_CREATED',
  ROAD_RESOLVED:           'ROAD_RESOLVED',
  HELP_CREATED:            'HELP_CREATED',
  HELP_RESOLVED:           'HELP_RESOLVED',
  VEHICLE_MESSAGE_SENT:    'VEHICLE_MESSAGE_SENT',
  VEHICLE_MESSAGE_RECEIVED:'VEHICLE_MESSAGE_RECEIVED',
  QUICK_REPLY_SENT:        'QUICK_REPLY_SENT',
  CONTACT_OPENED:          'CONTACT_OPENED',
  CALL_REQUESTED:          'CALL_REQUESTED',
  CALL_ACCEPTED:           'CALL_ACCEPTED',
  CALL_REFUSED:            'CALL_REFUSED',
  CALL_EXPIRED:            'CALL_EXPIRED',
  SETTINGS_UPDATED:        'SETTINGS_UPDATED',
  BADGE_RECOMPUTED:        'BADGE_RECOMPUTED',
  INVARIANT_VIOLATED:      'INVARIANT_VIOLATED',
  INVARIANT_WARNING:       'INVARIANT_WARNING',
});

const ImmatBus = (function () {
  const _listeners = {};
  const _journal = [];
  const MAX_JOURNAL = 200;

  function emit(eventName, payload) {
    const entry = {
      event: eventName,
      payload: payload || {},
      at: Date.now(),
    };
    _journal.push(entry);
    if (_journal.length > MAX_JOURNAL) _journal.shift();

    const fns = _listeners[eventName] || [];
    fns.forEach(fn => { try { fn(entry); } catch (e) { /* isolé */ } });

    const wildcards = _listeners['*'] || [];
    wildcards.forEach(fn => { try { fn(entry); } catch (e) {} });
  }

  function on(eventName, fn) {
    if (!_listeners[eventName]) _listeners[eventName] = [];
    _listeners[eventName].push(fn);
    return () => off(eventName, fn);
  }

  function off(eventName, fn) {
    if (!_listeners[eventName]) return;
    _listeners[eventName] = _listeners[eventName].filter(f => f !== fn);
  }

  function getJournal() {
    return [..._journal];
  }

  function clearJournal() {
    _journal.length = 0;
  }

  return { emit, on, off, getJournal, clearJournal, EVENTS };
})();

if (typeof module !== 'undefined') module.exports = { ImmatBus, EVENTS };
