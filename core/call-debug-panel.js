/* call-debug-panel.js — Panneau de diagnostic temps réel pour les appels
 * Bouton 🔬 flottant → panel sliding bas → logs horodatés CALL_*, console, état
 */
(function () {
  'use strict';

  var _logs = [];
  var _maxLogs = 150;
  var _visible = false;
  var _panel = null;
  var _list = null;
  var _badgeEl = null;
  var _unread = 0;

  function _ts() {
    var d = new Date();
    return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function _add(cat, msg, level) {
    var entry = { ts: _ts(), cat: cat, msg: String(msg), level: level || 'info' };
    _logs.push(entry);
    if (_logs.length > _maxLogs) _logs.shift();
    if (!_visible) {
      _unread++;
      if (_badgeEl) { _badgeEl.textContent = _unread > 9 ? '9+' : _unread; _badgeEl.style.display = ''; }
    }
    if (_visible && _list) _renderList();
  }

  // Intercepte console.log / console.warn pour les tags appels/agora
  var _origLog = console.log.bind(console);
  var _origWarn = console.warn.bind(console);

  console.log = function () {
    _origLog.apply(console, arguments);
    var msg = Array.prototype.join.call(arguments, ' ');
    if (/\[(CallManager|CallScreen|AgoraCall|Agora)/.test(msg)) _add('LOG', msg, 'info');
  };

  console.warn = function () {
    _origWarn.apply(console, arguments);
    var msg = Array.prototype.join.call(arguments, ' ');
    if (/\[(CallManager|CallScreen|AgoraCall|Agora)/.test(msg)) _add('WARN', msg, 'warn');
  };

  function _watchBus() {
    var bus = window.ImmatBus;
    if (!bus || typeof bus.on !== 'function') { setTimeout(_watchBus, 600); return; }
    var evts = ['CALL_INITIATED', 'CALL_RECEIVED', 'CALL_ACCEPTED', 'CALL_REFUSED',
                'CALL_CANCELLED', 'CALL_MISSED', 'CALL_ENDED'];
    evts.forEach(function (ev) {
      bus.on(ev, function (payload) {
        var rid = payload && payload.requestId ? '…' + String(payload.requestId).slice(-8) : '';
        var src = payload && payload._src ? '[' + payload._src.split('/').pop() + ']'
                : payload && payload.reason ? '[' + payload.reason + ']' : '';
        var plate = payload && (payload.plate || payload['with']) ? ' plate=' + (payload.plate || payload['with']) : '';
        _add('BUS', ev + rid + plate + src, 'event');
      });
    });
  }

  function _renderList() {
    if (!_list) return;
    var rows = '';
    for (var i = _logs.length - 1; i >= 0; i--) {
      var e = _logs[i];
      var color = e.level === 'event' ? '#4fc3f7'
                : e.level === 'warn'  ? '#ffb74d'
                : e.level === 'state' ? '#a5d6a7'
                : '#e0e0e0';
      var bg = (i % 2 === 0) ? 'rgba(255,255,255,0.04)' : 'transparent';
      rows += '<div style="padding:3px 6px;font-size:11px;color:' + color + ';background:' + bg + ';word-break:break-all;border-bottom:1px solid rgba(255,255,255,0.03);">'
            + '<span style="opacity:0.55;margin-right:4px;">' + e.ts + '</span>'
            + '<b style="margin-right:4px;">' + e.cat + '</b>'
            + e.msg.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            + '</div>';
    }
    _list.innerHTML = rows || '<div style="padding:12px;opacity:0.45;font-size:12px;text-align:center;">Aucun log — effectue un appel pour voir les événements</div>';
  }

  function _addState() {
    try {
      var s = window.CallManager && window.CallManager.getRuntimeState ? window.CallManager.getRuntimeState() : {};
      var cs = window.CallScreen && window.CallScreen.getState ? window.CallScreen.getState() : {};
      var summary = [
        'mode=' + (cs.mode || 'none'),
        'plate=' + (cs.plate || '-'),
        'rid=…' + String(s.pendingCallId || cs.requestId || '').slice(-8),
        'missedTimers=' + (s.pendingMissedTimers || 0),
        'rtStatus=' + (s.realtimeStatus || '?'),
        'sigCh=' + (!!s.signalChannelActive || !!window.CallManager?._signalChannel || '?'),
        'incomingVisible=' + s.incomingPopupVisible,
        'outgoingVisible=' + s.sentBannerVisible,
      ].join(' | ');
      _add('STATE', summary, 'state');
    } catch (e) {
      _add('STATE', 'erreur: ' + e.message, 'warn');
    }
  }

  function _copyLogs() {
    try {
      var text = _logs.map(function (e) { return e.ts + ' [' + e.cat + '] ' + e.msg; }).join('\n');
      var state = '';
      try {
        state = '\n\n=== CallManager.getRuntimeState() ===\n'
              + JSON.stringify(window.CallManager && window.CallManager.getRuntimeState ? window.CallManager.getRuntimeState() : {}, null, 2);
      } catch (e2) {}
      navigator.clipboard.writeText('=== CALL DEBUG LOG ===\n' + text + state)
        .then(function () { _add('DBG', 'Logs copiés dans le presse-papier', 'state'); _renderList(); })
        .catch(function () { _add('DBG', 'Copie impossible (pas de permission clipboard)', 'warn'); _renderList(); });
    } catch (e) {
      _add('DBG', 'Copie erreur: ' + e.message, 'warn');
    }
  }

  function _buildPanel() {
    // Bouton flottant
    var btn = document.createElement('div');
    btn.style.cssText = 'position:fixed;bottom:76px;right:10px;z-index:999999;width:40px;height:40px;background:rgba(20,20,40,0.88);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;cursor:pointer;border:1.5px solid rgba(79,195,247,0.5);box-shadow:0 2px 8px rgba(0,0,0,0.4);user-select:none;-webkit-user-select:none;';
    btn.innerHTML = '🔬';
    btn.title = 'Call Debug Panel';

    _badgeEl = document.createElement('span');
    _badgeEl.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ef5350;color:#fff;font-size:9px;font-weight:bold;min-width:16px;height:16px;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 3px;line-height:16px;text-align:center;';
    btn.style.position = 'fixed';
    btn.appendChild(_badgeEl);

    btn.addEventListener('click', function () {
      _visible = !_visible;
      _panel.style.display = _visible ? 'flex' : 'none';
      if (_visible) {
        _unread = 0;
        _badgeEl.style.display = 'none';
        _renderList();
      }
    });
    document.body.appendChild(btn);

    // Panneau
    _panel = document.createElement('div');
    _panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:62vh;z-index:999998;background:#0d0d1a;border-top:2px solid #4fc3f7;display:none;flex-direction:column;font-family:monospace;box-shadow:0 -4px 24px rgba(0,0,0,0.6);';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;padding:7px 10px;background:#111230;border-bottom:1px solid rgba(79,195,247,0.2);flex-shrink:0;gap:6px;';

    var title = document.createElement('span');
    title.textContent = '🔬 Call Debug';
    title.style.cssText = 'color:#4fc3f7;font-size:12px;font-weight:bold;flex:1;';
    hdr.appendChild(title);

    function _mkBtn(label, action) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'background:rgba(255,255,255,0.1);color:#ddd;border:1px solid rgba(255,255,255,0.15);padding:3px 9px;border-radius:4px;font-size:10px;cursor:pointer;font-family:monospace;white-space:nowrap;';
      b.addEventListener('click', action);
      return b;
    }

    hdr.appendChild(_mkBtn('État', function () { _addState(); _renderList(); }));
    hdr.appendChild(_mkBtn('Copy', _copyLogs));
    hdr.appendChild(_mkBtn('Effacer', function () { _logs = []; _renderList(); }));
    hdr.appendChild(_mkBtn('✕', function () {
      _visible = false;
      _panel.style.display = 'none';
    }));

    _panel.appendChild(hdr);

    // Liste des logs
    _list = document.createElement('div');
    _list.style.cssText = 'flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    _panel.appendChild(_list);

    document.body.appendChild(_panel);
  }

  function _init() {
    if (document.body) {
      _buildPanel();
      _watchBus();
      _add('DBG', 'CallDebugPanel v1 prêt — calls.js v15', 'state');
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        _buildPanel();
        _watchBus();
        _add('DBG', 'CallDebugPanel v1 prêt — calls.js v15', 'state');
      });
    }
  }

  _init();

  window.CallDebugPanel = {
    add: _add,
    getLogs: function () { return _logs.slice(); },
  };
})();
