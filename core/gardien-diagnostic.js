/* core/gardien-diagnostic.js — ImmatConnect Pro v2
 * Module de diagnostic IA pour le Gardien.
 * Surveille en continu les flux de l'application, détecte les anomalies
 * par rapport aux Lois Fonctionnelles, et demande à Ange de les analyser.
 * Actif uniquement si S.isGardien === true.
 *
 * Améliorations v2 :
 * - Watchdog d'achèvement : détecte ce qui N'est PAS arrivé (vs ce qui s'est passé)
 * - Diagnostic croisé Swarm : état de santé de tous les appareils connectés
 * - Contexte de test actif : focalise l'analyse sur le flux en cours de test
 * - Mémoire des pannes récurrentes : identifie les flux systématiquement défaillants
 */
'use strict';

window.GardienDiagnostic = (function () {
  const _INTERVAL_MS      = 30_000;
  const _STORAGE_KEY      = 'ic_gardien_diag';
  const _RECURRENCE_KEY   = 'ic_gardien_recurrence';
  const _MAX_STORED       = 20;
  const _MAX_AGE_MS       = 2 * 3600_000;
  const _RECURRENCE_TTL   = 24 * 3600_000; // mémoire pannes 24h

  let _timer      = null;
  let _running    = false;
  let _busEvents  = [];
  let _activeFlow = null; // contexte de test actif (sélecteur gardien)

  // ── Watchdog d'achèvement ──────────────────────────────────────────────────
  // Chaque entrée : { id, flux, expected_event, deadline, context }
  const _watchdogs = new Map();

  // Attendus par événement déclencheur (event → {expected, delay_ms, flux})
  const _WATCHDOG_RULES = {
    'MESSAGE_SENT':         { expected: 'MESSAGE_SENT_ACK',    delay: 5_000,  flux: 'FLOW-MESSAGE-SEND',   desc: 'message visible dans S._actMessages après envoi' },
    'PARKED_REPORT_SENT':   { expected: 'PARKED_VISIBLE',      delay: 6_000,  flux: 'FLOW-PARKED-REPORT',  desc: 'signalement stationné visible côté destinataire' },
    'ROAD_CREATED':         { expected: 'ROAD_ALERT_VISIBLE',  delay: 4_000,  flux: 'FLOW-ROUTE-REPORT',   desc: 'alerte route dans S.alerts' },
    'HELP_CREATED':         { expected: 'HELP_ALERT_VISIBLE',  delay: 5_000,  flux: 'FLOW-HELP-REQUEST',   desc: 'demande aide dans S.alerts' },
    'VEHICLE_MESSAGE_SENT': { expected: 'VEHICLE_MSG_VISIBLE', delay: 5_000,  flux: 'FLOW-VEHICLE-ALERT',  desc: 'alerte véhicule dans S._actMessages' },
    'GPS_LOCATED':          { expected: 'GPS_LOCATED',         delay: 125_000, flux: 'FLOW-GPS',           desc: 'GPS refresh < 120s' },
    'ANGE_MESSAGE_SENT':    { expected: 'ANGE_RESPONSE_RECEIVED', delay: 15_000, flux: 'FLOW-ANGE-QUERY',  desc: 'réponse Ange reçue dans les 15s' },
  };

  // Vérificateurs de complétion (l'événement "attendu" est vérifié par condition)
  const _COMPLETION_CHECKS = {
    'MESSAGE_SENT_ACK':      () => (window.S?._actMessages||[]).some(m => Date.now() - new Date(m.created_at||0).getTime() < 10_000),
    'PARKED_VISIBLE':        () => (window.S?._actMessages||[]).some(m => m.context_type === 'parked_report' && Date.now() - new Date(m.created_at||0).getTime() < 15_000),
    'ROAD_ALERT_VISIBLE':    () => (window.S?.alerts||[]).some(a => a.group === 'route' && Date.now() - (a._addedAt||0) < 10_000),
    'HELP_ALERT_VISIBLE':    () => (window.S?.alerts||[]).some(a => a.group === 'assist' && Date.now() - (a._addedAt||0) < 10_000),
    'VEHICLE_MSG_VISIBLE':   () => (window.S?._actMessages||[]).some(m => m.context_type === 'vehicle_report' && Date.now() - new Date(m.created_at||0).getTime() < 10_000),
    'GPS_LOCATED':           () => window.S?.myGpsAt && Date.now() - window.S.myGpsAt < 125_000,
    'ANGE_RESPONSE_RECEIVED':() => !!document.querySelector('#angeResponse')?.textContent?.trim(),
  };

  function _openWatchdog(triggeredBy) {
    const rule = _WATCHDOG_RULES[triggeredBy];
    if (!rule) return;
    const id = triggeredBy + '_' + Date.now();
    _watchdogs.set(id, { id, flux: rule.flux, expected: rule.expected, desc: rule.desc, deadline: Date.now() + rule.delay, trigger: triggeredBy });
    // Auto-vérification au deadline
    setTimeout(() => _checkWatchdog(id), rule.delay + 200);
  }

  function _checkWatchdog(id) {
    const wd = _watchdogs.get(id);
    if (!wd) return;
    _watchdogs.delete(id);
    if (Date.now() < wd.deadline) return; // annulé trop tôt
    const checker = _COMPLETION_CHECKS[wd.expected];
    if (checker && checker()) return; // succès — résultat attendu bien arrivé
    // Échec : résultat attendu non arrivé dans le délai
    const anomaly = { flux: wd.flux, type: 'COMPLETION_TIMEOUT', detail: `Après "${wd.trigger}" : ${wd.desc} — non observé dans le délai`, severite: 4, at: Date.now() };
    _recordRecurrence(wd.flux);
    _immediateAlert(anomaly);
  }

  // ── Écoute ImmatBus ────────────────────────────────────────────────────────
  function _subscribe() {
    if (!window.ImmatBus) return;
    window.ImmatBus.on('*', (ev, payload) => {
      _busEvents.push({ ev, payload: _compact(payload), at: Date.now() });
      if (_busEvents.length > 200) _busEvents = _busEvents.slice(-200);
      // Ouvrir un watchdog pour les événements déclencheurs
      if (_WATCHDOG_RULES[ev]) _openWatchdog(ev);
    });
  }

  function _compact(p) {
    try { const s = JSON.stringify(p || {}); return s.length > 300 ? s.slice(0, 300) + '…' : s; } catch (_) { return '{}'; }
  }

  // ── Mémoire des pannes récurrentes ────────────────────────────────────────
  function _recordRecurrence(flux) {
    try {
      const now = Date.now();
      let rec = {};
      try { rec = JSON.parse(localStorage.getItem(_RECURRENCE_KEY) || '{}'); } catch (_) {}
      if (!rec[flux]) rec[flux] = [];
      rec[flux] = rec[flux].filter(t => now - t < _RECURRENCE_TTL);
      rec[flux].push(now);
      localStorage.setItem(_RECURRENCE_KEY, JSON.stringify(rec));
    } catch (_) {}
  }

  function _getRecurrence(flux) {
    try {
      const now = Date.now();
      const rec = JSON.parse(localStorage.getItem(_RECURRENCE_KEY) || '{}');
      return (rec[flux] || []).filter(t => now - t < _RECURRENCE_TTL).length;
    } catch (_) { return 0; }
  }

  function _getRecurrenceAll() {
    try {
      const now = Date.now();
      const rec = JSON.parse(localStorage.getItem(_RECURRENCE_KEY) || '{}');
      const result = {};
      for (const [flux, times] of Object.entries(rec)) {
        const recent = times.filter(t => now - t < _RECURRENCE_TTL);
        if (recent.length > 0) result[flux] = recent.length;
      }
      return result;
    } catch (_) { return {}; }
  }

  // ── Diagnostic croisé Swarm ────────────────────────────────────────────────
  // Lit l'état de santé des autres appareils depuis le payload Presence SwarmEngine
  function _getCrossDeviceHealth() {
    try {
      const presence = window.SwarmEngine?._getPresenceState?.() ?? {};
      const devices = [];
      for (const [uid, state] of Object.entries(presence)) {
        if (state && typeof state === 'object' && state._diag) {
          devices.push({ uid: uid.slice(0, 8), gps_ok: !!state._diag.gps_ok, realtime_ok: !!state._diag.rt_ok, kernel_score: state._diag.kr ?? null, at: state._diag.at ?? 0 });
        }
      }
      return devices;
    } catch (_) { return []; }
  }

  // ── Collecte snapshot ──────────────────────────────────────────────────────
  function _collectSnapshot() {
    const S = window.S || {};
    const rec = _getRecurrenceAll();
    const recurrents = Object.entries(rec).filter(([, n]) => n >= 2).map(([flux, n]) => `${flux} (×${n} en 24h)`);

    return {
      ts: Date.now(),
      active_test_flow: _activeFlow,
      brain_urgency:             S._brainOrientation?.urgency ?? null,
      brain_signals:             S._brainOrientation?.signals ?? [],
      consciousness_focus:       S._consciousness?.focus ?? null,
      consciousness_convergence: S._consciousness?.convergence?.score ?? null,
      soul_harmony:              S._soul?.harmony?.score ?? null,
      soul_blind_spots:          S._soul?.blind_spots ?? [],
      soul_trajectory:           S._soul?.trajectory ?? null,
      kernel_reliability:        S._reliability?.score ?? null,
      kernel_degraded:           S._reliability?.degraded ?? false,
      kernel_critical:           S._reliability?.critical ?? false,
      kernel_cold_start:         S._reliability?.cold_start ?? true,
      gps_active:      S.watchId != null,
      gps_age_sec:     S.myGpsAt ? Math.round((Date.now() - S.myGpsAt) / 1000) : null,
      gps_accuracy_m:  S.myAccuracy ?? null,
      realtime_channels: _getRealtimeStatus(),
      actMessages_count:  (S._actMessages || []).length,
      actMessages_unread: (S._actMessages || []).filter(m => m._received && !m.read_at).length,
      alerts_active:  (S.alerts || []).filter(a => a.status !== 'gone' && a.status !== 'resolved').length,
      call_state:     _getCallState(),
      narrator_journal: _getJournalSummary(),
      recent_bus_events: _busEvents.slice(-30).map(e => ({ ev: e.ev, at: e.at })),
      cross_device_health: _getCrossDeviceHealth(),
      flux_recurrents: recurrents,
    };
  }

  function _getRealtimeStatus() {
    const status = {};
    try {
      const channels = window.sb?.realtime?.channels || [];
      if (Array.isArray(channels)) channels.forEach(ch => { status[ch.topic || String(ch)] = ch.state || 'unknown'; });
    } catch (_) {}
    return status;
  }

  function _getCallState() {
    try {
      const cs = window.CallManager?.getRuntimeState?.() ?? {};
      return { status: cs.callStatus ?? null, pending_out: !!cs.hasPendingOutgoing, realtime_ok: cs.realtimeStatus === 'SUBSCRIBED' };
    } catch (_) { return null; }
  }

  function _getJournalSummary() {
    try { return (window.Narrator?.getJournalText?.() ?? '').slice(0, 500); } catch (_) { return ''; }
  }

  // ── Détection anomalies locales ────────────────────────────────────────────
  function _detectAnomalies(snap) {
    const anomalies = [];

    if (!snap.gps_active) {
      anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_INACTIF', detail: 'watchPosition non démarré', severite: 4 });
    } else if (snap.gps_age_sec > 120) {
      anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_PERIME', detail: `Position âgée de ${snap.gps_age_sec}s (seuil 120s)`, severite: 3 });
    }

    if (snap.kernel_reliability !== null && snap.kernel_reliability < 50 && !snap.kernel_cold_start) {
      anomalies.push({ flux: 'FLOW-INTELLIGENCE', type: 'FIABILITE_CRITIQUE', detail: `Fiabilité ${snap.kernel_reliability}%`, severite: 4 });
    }

    for (const [name, state] of Object.entries(snap.realtime_channels || {})) {
      if (state !== 'joined' && state !== 'SUBSCRIBED') {
        anomalies.push({ flux: 'FLOW-MESSAGE-SEND', type: 'REALTIME_DECONNECTE', detail: `Canal "${name}" : ${state}`, severite: 4 });
      }
    }

    if (snap.call_state?.pending_out && !snap.call_state?.realtime_ok) {
      anomalies.push({ flux: 'FLOW-CALL', type: 'APPEL_SANS_REALTIME', detail: 'Appel sortant actif mais canal call_requests non connecté', severite: 5 });
    }

    if (snap.brain_urgency === null && !snap.kernel_cold_start) {
      anomalies.push({ flux: 'FLOW-INTELLIGENCE', type: 'BRAIN_ABSENT', detail: 'BrainEngine muet (S._brainOrientation null)', severite: 3 });
    }

    // Appareils croisés en mauvaise santé
    for (const dev of snap.cross_device_health || []) {
      if (!dev.gps_ok) anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_DISTANT_INACTIF', detail: `Appareil ${dev.uid} : GPS inactif`, severite: 3 });
      if (!dev.realtime_ok) anomalies.push({ flux: 'FLOW-MESSAGE-SEND', type: 'REALTIME_DISTANT', detail: `Appareil ${dev.uid} : Realtime déconnecté`, severite: 4 });
    }

    // Flux récurrents → signaler la récurrence
    if (snap.flux_recurrents?.length) {
      anomalies.push({ flux: 'MULTI-FLUX', type: 'PANNES_RECURRENTES', detail: `Flux instables détectés : ${snap.flux_recurrents.join(', ')}`, severite: 4 });
    }

    // Si contexte de test actif → vérification focalisée
    if (snap.active_test_flow) {
      const focusAnomalies = _checkFocusedFlow(snap.active_test_flow, snap);
      anomalies.push(...focusAnomalies);
    }

    return anomalies;
  }

  function _checkFocusedFlow(flow, snap) {
    const extra = [];
    if (flow === 'FLOW-MESSAGE-SEND') {
      if (snap.actMessages_count === 0) extra.push({ flux: flow, type: 'FOCUS_NO_MESSAGES', detail: 'Aucun message dans S._actMessages — ImmatMessages.refresh() appelé ?', severite: 3 });
    }
    if (flow === 'FLOW-PARKED-REPORT') {
      const hasParked = (window.S?._actMessages||[]).some(m => m.context_type === 'parked_report');
      if (!hasParked) extra.push({ flux: flow, type: 'FOCUS_PARKED_ABSENT', detail: 'Aucun parked_report dans S._actMessages — context_type correct ?', severite: 3 });
    }
    if (flow === 'FLOW-CALL') {
      if (!snap.call_state?.realtime_ok) extra.push({ flux: flow, type: 'FOCUS_CALL_REALTIME', detail: 'Canal call_requests non SUBSCRIBED — appels impossibles', severite: 5 });
    }
    if (flow === 'FLOW-GPS') {
      if (!snap.gps_active || snap.gps_age_sec > 30) extra.push({ flux: flow, type: 'FOCUS_GPS_STALE', detail: `GPS inactif ou périmé (${snap.gps_age_sec}s) — signalements sans position`, severite: 4 });
    }
    return extra;
  }

  // ── Alerte immédiate (watchdog timeout) ───────────────────────────────────
  function _immediateAlert(anomaly) {
    const result = {
      ts: Date.now(),
      synthese: `⚡ Alerte immédiate : ${anomaly.detail}`,
      diagnostics: [{ flux: anomaly.flux, anomalie: anomaly.detail, cause_racine: 'Résultat attendu non reçu dans le délai imparti', action: 'Vérifier le canal Realtime et l\'état DB', severite: anomaly.severite }],
      priorite_immediate: anomaly.flux + ' — ' + anomaly.detail,
      from: 'watchdog',
    };
    _store(result);
    _render(result);
  }

  // ── Mémoire temporelle — historique des cycles pour Ange ──────────────────
  // Convertit les N derniers cycles en paires user/assistant pour Ange.
  // Ange peut ainsi raisonner sur les tendances et l'évolution dans le temps.
  function _buildDiagHistory(maxCycles = 4) {
    try {
      const now = Date.now();
      const list = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]')
        .filter(e => now - e.ts < _MAX_AGE_MS && e.from !== 'local') // uniquement les cycles avec anomalies
        .slice(-maxCycles);
      if (!list.length) return [];

      const history = [];
      for (const cycle of list) {
        const age = Math.round((now - cycle.ts) / 1000);
        const userMsg = `[Cycle il y a ${age}s] ${cycle.diagnostics?.length ?? 0} anomalie(s) détectée(s).`;
        const assistantMsg = JSON.stringify({
          synthese: cycle.synthese || '',
          diagnostics: (cycle.diagnostics || []).map(d => ({
            flux: d.flux, anomalie: d.anomalie, severite: d.severite,
          })),
          priorite_immediate: cycle.priorite_immediate || null,
        });
        history.push({ role: 'user', content: userMsg });
        history.push({ role: 'assistant', content: assistantMsg });
      }
      return history;
    } catch (_) { return []; }
  }

  // ── Cycle diagnostic ───────────────────────────────────────────────────────
  async function _diagnose() {
    if (!window.S?.isGardien) return;
    if (!window.sb) return;

    const snap = _collectSnapshot();
    const anomalies = _detectAnomalies(snap);

    if (!anomalies.length) {
      const result = { ts: snap.ts, synthese: '✅ Tous les flux nominaux.', diagnostics: [], priorite_immediate: null, from: 'local' };
      _store(result);
      _render(result);
      return;
    }

    // Enregistrer la récurrence pour les anomalies détectées
    for (const a of anomalies) if (a.flux && a.flux !== 'MULTI-FLUX') _recordRecurrence(a.flux);

    // Construire la mémoire temporelle (4 cycles précédents)
    const diagHistory = _buildDiagHistory(4);

    try {
      const res = await window.sb.functions.invoke('immat-brain-dialog', {
        body: { message: '__gardien_diagnostic__', mode: 'gardien_diagnostic', feature: 'GARDIEN', snapshot: { ...snap, anomalies_detectees: anomalies }, history: diagHistory },
      });
      const d = res?.data;
      if (d?.ok && Array.isArray(d.diagnostics)) {
        const result = { ts: snap.ts, synthese: d.synthese || '', diagnostics: d.diagnostics, priorite_immediate: d.priorite_immediate || null, from: 'ia' };
        _store(result);
        _render(result);
      } else {
        const fallback = { ts: snap.ts, synthese: `${anomalies.length} anomalie(s) — analyse IA indisponible.`, diagnostics: anomalies.map(a => ({ flux: a.flux, anomalie: a.detail, cause_racine: '(IA indisponible)', action: 'Vérifier manuellement', severite: a.severite })), priorite_immediate: null, from: 'local' };
        _store(fallback);
        _render(fallback);
      }
    } catch (_) {}
  }

  // ── Persistance ────────────────────────────────────────────────────────────
  function _store(result) {
    try {
      const now = Date.now();
      let list = [];
      try { list = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]'); } catch (_) {}
      list = list.filter(e => now - e.ts < _MAX_AGE_MS);
      list.push(result);
      localStorage.setItem(_STORAGE_KEY, JSON.stringify(list.slice(-_MAX_STORED)));
    } catch (_) {}
  }

  function getHistory() {
    try {
      const now = Date.now();
      return JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]').filter(e => now - e.ts < _MAX_AGE_MS).reverse();
    } catch (_) { return []; }
  }

  function getRecurrenceReport() {
    const rec = _getRecurrenceAll();
    return Object.entries(rec).sort((a, b) => b[1] - a[1]).map(([flux, n]) => ({ flux, count: n }));
  }

  // ── Rendu dashboard ────────────────────────────────────────────────────────
  function _render(result) {
    const container = document.getElementById('gardienDiagLiveStream');
    if (!container) return;

    const age = Math.round((Date.now() - result.ts) / 1000);
    const maxSev = result.diagnostics?.length ? Math.max(...result.diagnostics.map(d => d.severite || 0)) : 0;
    const sevColor = maxSev >= 4 ? '#f87171' : maxSev >= 3 ? '#fb923c' : maxSev >= 2 ? '#facc15' : '#4ade80';
    const sevLabel = maxSev >= 4 ? '🔴 CRITIQUE' : maxSev >= 3 ? '🟠 HAUTE' : maxSev >= 2 ? '🟡 MOYENNE' : '🟢 NOMINAL';
    const fromIcon = result.from === 'ia' ? '🧠 IA' : result.from === 'watchdog' ? '⏱ Watchdog' : '⚡ Local';

    let html = `<div style="margin-bottom:8px;padding:10px 12px;background:#0a0f1a;border-radius:8px;border-left:3px solid ${sevColor}">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:10px;color:#94a3b8">${new Date(result.ts).toLocaleTimeString('fr-FR')} · ${age}s · ${fromIcon}</span>
        <span style="font-size:10px;font-weight:700;color:${sevColor}">${sevLabel}</span>
      </div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:6px">${_esc(result.synthese)}</div>`;

    if (result.priorite_immediate) {
      html += `<div style="font-size:11px;padding:5px 8px;background:#1e1b4b;border-radius:6px;color:#a5b4fc;margin-bottom:6px">⚡ ${_esc(result.priorite_immediate)}</div>`;
    }

    for (const d of (result.diagnostics || [])) {
      const sc = d.severite >= 4 ? '#f87171' : d.severite >= 3 ? '#fb923c' : d.severite >= 2 ? '#facc15' : '#4ade80';
      const tendanceIcon = d.tendance === 'aggravation' ? '📈' : d.tendance === 'amélioration' ? '📉' : d.tendance === 'nouveau' ? '🆕' : '';
      html += `<div style="padding:7px;background:#0f172a;border-radius:6px;border-left:2px solid ${sc};margin-bottom:5px">
        <div style="font-size:10px;color:${sc};font-weight:700">${_esc(d.flux)} · Sév.${d.severite}${tendanceIcon ? ' · ' + tendanceIcon + ' ' + _esc(d.tendance) : ''}</div>
        <div style="font-size:11px;color:#cbd5e1">🔍 ${_esc(d.anomalie)}</div>
        <div style="font-size:11px;color:#94a3b8">💡 ${_esc(d.cause_racine||'')}</div>
        <div style="font-size:11px;color:#7c3aed">→ ${_esc(d.action||'')}</div>
      </div>`;
    }
    html += `</div>`;

    container.insertAdjacentHTML('afterbegin', html);
    while (container.children.length > 10) container.removeChild(container.lastChild);
  }

  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Contexte de test actif ─────────────────────────────────────────────────
  function setActiveFlow(flow) {
    _activeFlow = flow || null;
    try { localStorage.setItem('ic_gardien_active_flow', flow || ''); } catch (_) {}
  }

  function getActiveFlow() { return _activeFlow; }

  // ── Démarrage ─────────────────────────────────────────────────────────────
  function start() {
    if (_running) return;
    if (!window.S?.isGardien) return;
    _running = true;
    // Restaurer contexte de test précédent
    try { _activeFlow = localStorage.getItem('ic_gardien_active_flow') || null; } catch (_) {}
    _subscribe();
    _diagnose();
    _timer = setInterval(_diagnose, _INTERVAL_MS);
  }

  function stop() { if (_timer) clearInterval(_timer); _running = false; }
  function forceRun() { _diagnose(); }

  return { start, stop, forceRun, getHistory, getRecurrenceReport, setActiveFlow, getActiveFlow };
})();
