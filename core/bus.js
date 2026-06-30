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
  CALL_RECEIVED:           'CALL_RECEIVED',
  CALL_ACCEPTED:           'CALL_ACCEPTED',
  CALL_REFUSED:            'CALL_REFUSED',
  CALL_MISSED:             'CALL_MISSED',
  CALL_CANCELLED:          'CALL_CANCELLED',
  CALL_INITIATED:          'CALL_INITIATED',
  CALL_EXPIRED:            'CALL_EXPIRED',
  SETTINGS_UPDATED:        'SETTINGS_UPDATED',
  BADGE_RECOMPUTED:        'BADGE_RECOMPUTED',
  INVARIANT_VIOLATED:      'INVARIANT_VIOLATED',
  INVARIANT_WARNING:       'INVARIANT_WARNING',
  GUARDIAN_RECOMMENDATION_CREATED:   'GUARDIAN_RECOMMENDATION_CREATED',
  GUARDIAN_RECOMMENDATION_REVIEWED:  'GUARDIAN_RECOMMENDATION_REVIEWED',
  GUARDIAN_RECOMMENDATIONS_RENDERED: 'GUARDIAN_RECOMMENDATIONS_RENDERED',
  ANGE_OPENED:                       'ANGE_OPENED',
  ANGE_MESSAGE_SENT:                 'ANGE_MESSAGE_SENT',
  ANGE_RESPONSE_RECEIVED:            'ANGE_RESPONSE_RECEIVED',
  ANGE_ERROR:                        'ANGE_ERROR',
  OBD_STATUS_CHECKED:                'OBD_STATUS_CHECKED',
  OBD_FINDING_CREATED:               'OBD_FINDING_CREATED',
  MAP_OPENED:                        'MAP_OPENED',
  GPS_LOCATED:                       'GPS_LOCATED',
  VEHICLES_LOADED:                   'VEHICLES_LOADED',
  PARKED_REPORT_SENT:                'PARKED_REPORT_SENT',
  PARKED_RESPONSE_SENT:              'PARKED_RESPONSE_SENT',
  PARKED_REPORT_DISMISSED:           'PARKED_REPORT_DISMISSED',
  PARKED_REPORT_RATED:               'PARKED_REPORT_RATED',
  HELP_RESPONSE_SENT:                'HELP_RESPONSE_SENT',
  VEHICLE_REPORT_SENT:               'VEHICLE_REPORT_SENT',
  VEHICLE_RESPONSE_SENT:             'VEHICLE_RESPONSE_SENT',
  VEHICLE_REPORT_RATED:              'VEHICLE_REPORT_RATED',
  MESSAGE_SENT:                      'MESSAGE_SENT',
  MESSAGE_RECEIVED:                  'MESSAGE_RECEIVED',
  // Gouvernance (registre / Dashboard / flotte) — connaissance de premier rang (ImmatNexus)
  FEATURE_GOVERNANCE_CHANGED:        'FEATURE_GOVERNANCE_CHANGED',
  FEATURE_BLOCKED:                   'FEATURE_BLOCKED',
  FLEET_CONFIG_LOADED:               'FLEET_CONFIG_LOADED',
  FEATURE_AUDIT_FINDING:             'FEATURE_AUDIT_FINDING',
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

if (typeof window !== 'undefined') window.ImmatBus = ImmatBus;
if (typeof module !== 'undefined') module.exports = { ImmatBus, EVENTS };
