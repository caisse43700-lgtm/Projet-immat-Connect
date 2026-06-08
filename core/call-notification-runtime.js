/* core/call-notification-runtime.js — CallNotificationRuntime squelette Phase 7
 *
 * Coordonne les signaux visuels, audio et notifications sans posséder l'état business.
 * S'abonne à ImmatBus. Délègue l'audio à AudioManager. Lit l'état depuis CallManager.
 * Ne déclenche jamais de permission notification depuis init().
 *
 * API publique :
 *   CallNotificationRuntime.onIncomingPending(callState)
 *   CallNotificationRuntime.onOutgoingPending(callState)
 *   CallNotificationRuntime.onCallAccepted(callState)
 *   CallNotificationRuntime.onCallRefused(callState)
 *   CallNotificationRuntime.onCallCancelled(callState)
 *   CallNotificationRuntime.onCallExpired(callState)
 *   CallNotificationRuntime.onCallMissed(callState)
 *   CallNotificationRuntime.onMessageReceived(messageState)
 *   CallNotificationRuntime.getRuntimeState()
 */
(function (w) {
  'use strict';

  var _lastNotificationType = null;
  var _lastNotificationAt = null;
  var _lastNotificationError = null;
  var _visualFallbackUsed = false;
  var _vibrationAttempted = false;
  var _vibrationSupported = !!(w.navigator && typeof w.navigator.vibrate === 'function');

  function _audio() { return w.AudioManager; }

  // ── Notification navigateur ──────────────────────────────────────

  function _browserNotify(title, body, tag) {
    try {
      if ('Notification' in w && Notification.permission === 'granted') {
        new Notification(title, { body: body || '', tag: tag || 'immat' });
        _lastNotificationType = tag;
        _lastNotificationAt = Date.now();
      }
    } catch (e) {
      _lastNotificationError = String(e && (e.message || e));
    }
  }

  function _vibrate(pattern) {
    if (!_vibrationSupported) return;
    _vibrationAttempted = true;
    try { w.navigator.vibrate(pattern); } catch (e) {}
  }

  // ── Handlers ────────────────────────────────────────────────────

  function onIncomingPending(callState) {
    var plate = (callState && callState.from) || 'Conducteur';
    try { _audio()?.playIncomingRingtone?.({ context: 'incoming', plate: plate }); } catch (e) {}
    _visualFallbackUsed = true;
    _vibrate([400, 200, 400, 200, 400]);
    _browserNotify('Appel entrant', plate + ' souhaite vous contacter', 'immat-incoming');
  }

  function onOutgoingPending(callState) {
    var plate = (callState && callState.to) || 'Conducteur';
    try { _audio()?.playOutgoingTone?.({ context: 'outgoing', plate: plate }); } catch (e) {}
  }

  function onCallAccepted(callState) {
    try { _audio()?.stopCallAudio?.('accepted'); } catch (e) {}
  }

  function onCallRefused(callState) {
    try { _audio()?.stopCallAudio?.('refused'); } catch (e) {}
  }

  function onCallCancelled(callState) {
    try { _audio()?.stopCallAudio?.('cancelled'); } catch (e) {}
  }

  function onCallExpired(callState) {
    try { _audio()?.stopCallAudio?.('expired'); } catch (e) {}
  }

  function onCallMissed(callState) {
    try { _audio()?.stopCallAudio?.('missed'); } catch (e) {}
    var plate = (callState && callState.from) || 'Conducteur';
    _browserNotify('Appel manqué', plate + ' a essayé de vous contacter', 'immat-missed');
    _vibrate([200, 100, 200]);
  }

  function onMessageReceived(messageState) {
    // Beep uniquement pour les messages reçus — pas les envois, pas les rechargements
    var from = messageState && messageState.plate;
    if (!from) return;
    try { _audio()?.playMessageBeep?.({ context: 'message', from: from }); } catch (e) {}
  }

  // ── Diagnostics ──────────────────────────────────────────────────

  function getRuntimeState() {
    return {
      lastNotificationType: _lastNotificationType,
      lastNotificationAt: _lastNotificationAt,
      lastNotificationError: _lastNotificationError,
      browserNotificationPermission: ('Notification' in w) ? Notification.permission : 'unsupported',
      visualFallbackUsed: _visualFallbackUsed,
      vibrationAttempted: _vibrationAttempted,
      vibrationSupported: _vibrationSupported
    };
  }

  // ── Abonnement ImmatBus ──────────────────────────────────────────

  function _subscribe() {
    var bus = w.ImmatBus;
    if (!bus || typeof bus.on !== 'function') return;
    bus.on('CALL_RECEIVED',  function (e) { onIncomingPending(e.payload); });
    bus.on('CALL_INITIATED', function (e) { onOutgoingPending(e.payload); });
    bus.on('CALL_ACCEPTED',  function (e) { onCallAccepted(e.payload); });
    bus.on('CALL_REFUSED',   function (e) { onCallRefused(e.payload); });
    bus.on('CALL_CANCELLED', function (e) { onCallCancelled(e.payload); });
    bus.on('CALL_MISSED',    function (e) { onCallMissed(e.payload); });
    bus.on('MSG_RECEIVED',   function (e) { onMessageReceived(e.payload); });
  }

  w.CallNotificationRuntime = {
    onIncomingPending:  onIncomingPending,
    onOutgoingPending:  onOutgoingPending,
    onCallAccepted:     onCallAccepted,
    onCallRefused:      onCallRefused,
    onCallCancelled:    onCallCancelled,
    onCallExpired:      onCallExpired,
    onCallMissed:       onCallMissed,
    onMessageReceived:  onMessageReceived,
    getRuntimeState:    getRuntimeState
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _subscribe);
  } else {
    _subscribe();
  }
})(window);
