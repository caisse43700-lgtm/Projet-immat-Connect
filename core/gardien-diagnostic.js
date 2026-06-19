/* core/gardien-diagnostic.js — ImmatConnect Pro
 * Module de diagnostic IA pour le Gardien.
 * Surveille en continu les flux de l'application, détecte les anomalies
 * par rapport aux Lois Fonctionnelles, et demande à Ange de les analyser.
 * Actif uniquement si S.isGardien === true.
 */
'use strict';

window.GardienDiagnostic = (function () {
  const _INTERVAL_MS   = 30_000; // analyse toutes les 30s
  const _STORAGE_KEY   = 'ic_gardien_diag';
  const _MAX_STORED    = 20;     // historique max dans localStorage
  const _MAX_AGE_MS    = 2 * 3600_000; // 2h

  let _timer     = null;
  let _running   = false;
  let _busEvents = []; // journal des événements Bus reçus depuis le dernier cycle

  // ── Écoute de tous les événements ImmatBus ─────────────────────────────────
  function _subscribe() {
    if (!window.ImmatBus) return;
    window.ImmatBus.on('*', (ev, payload) => {
      _busEvents.push({ ev, payload: _compact(payload), at: Date.now() });
      if (_busEvents.length > 200) _busEvents = _busEvents.slice(-200);
    });
  }

  function _compact(p) {
    try {
      const s = JSON.stringify(p || {});
      return s.length > 300 ? s.slice(0, 300) + '…' : s;
    } catch (_) { return '{}'; }
  }

  // ── Collecte de l'état observable en temps réel ────────────────────────────
  function _collectSnapshot() {
    const S = window.S || {};
    const snap = {
      ts: Date.now(),
      // Intelligence modules
      brain_urgency:            S._brainOrientation?.urgency ?? null,
      brain_signals:            S._brainOrientation?.signals ?? [],
      consciousness_focus:      S._consciousness?.focus ?? null,
      consciousness_convergence: S._consciousness?.convergence?.score ?? null,
      soul_harmony:             S._soul?.harmony?.score ?? null,
      soul_blind_spots:         S._soul?.blind_spots ?? [],
      soul_trajectory:          S._soul?.trajectory ?? null,
      kernel_reliability:       S._reliability?.score ?? null,
      kernel_degraded:          S._reliability?.degraded ?? false,
      kernel_critical:          S._reliability?.critical ?? false,
      kernel_cold_start:        S._reliability?.cold_start ?? true,
      // GPS
      gps_active:     S.watchId != null,
      gps_lat:        S.myLat ?? null,
      gps_lng:        S.myLng ?? null,
      gps_age_sec:    S.myGpsAt ? Math.round((Date.now() - S.myGpsAt) / 1000) : null,
      gps_accuracy_m: S.myAccuracy ?? null,
      // Realtime canaux
      realtime_channels: _getRealtimeStatus(),
      // Messages
      actMessages_count: (S._actMessages || []).length,
      actMessages_unread: (S._actMessages || []).filter(m => m._received && !m.read_at && !S._readMsgIds?.has?.(String(m.id))).length,
      // Alertes communautaires
      alerts_count:      (S.alerts || []).length,
      alerts_active:     (S.alerts || []).filter(a => a.status !== 'gone' && a.status !== 'resolved').length,
      // Appels
      call_state:        _getCallState(),
      // Narrator
      narrator_journal:  _getJournalSummary(),
      // Événements Bus récents (30 derniers)
      recent_bus_events: _busEvents.slice(-30).map(e => ({ ev: e.ev, at: e.at })),
    };
    return snap;
  }

  function _getRealtimeStatus() {
    const status = {};
    try {
      const channels = window.sb?.realtime?.channels || [];
      if (Array.isArray(channels)) {
        channels.forEach(ch => {
          const name = ch.topic || ch.params?.channel || String(ch);
          status[name] = ch.state || 'unknown';
        });
      }
    } catch (_) {}
    return status;
  }

  function _getCallState() {
    try {
      const cs = window.CallManager?.getRuntimeState?.() ?? {};
      return {
        status:       cs.callStatus ?? null,
        pending_out:  !!cs.hasPendingOutgoing,
        realtime_ok:  cs.realtimeStatus === 'SUBSCRIBED',
      };
    } catch (_) { return null; }
  }

  function _getJournalSummary() {
    try {
      const txt = window.Narrator?.getJournalText?.() ?? '';
      return txt.slice(0, 500);
    } catch (_) { return ''; }
  }

  // ── Détection d'anomalies locales (avant appel IA) ─────────────────────────
  function _detectAnomalies(snap) {
    const anomalies = [];

    // GPS
    if (!snap.gps_active) {
      anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_INACTIF', detail: 'watchPosition non démarré — S.watchId null', severite: 4 });
    } else if (snap.gps_age_sec !== null && snap.gps_age_sec > 120) {
      anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_PERIME', detail: `Dernière position il y a ${snap.gps_age_sec}s (seuil : 120s)`, severite: 3 });
    }

    // Kernel
    if (snap.kernel_reliability !== null && snap.kernel_reliability < 50 && !snap.kernel_cold_start) {
      anomalies.push({ flux: 'FLOW-INTELLIGENCE', type: 'FIABILITE_CRITIQUE', detail: `Score fiabilité ${snap.kernel_reliability}% (seuil critique : 50%)`, severite: 4 });
    }

    // Canaux Realtime
    const channels = snap.realtime_channels || {};
    for (const [name, state] of Object.entries(channels)) {
      if (state !== 'joined' && state !== 'SUBSCRIBED') {
        anomalies.push({ flux: 'FLOW-MESSAGE-SEND', type: 'REALTIME_DECONNECTE', detail: `Canal "${name}" : état "${state}" (attendu: SUBSCRIBED)`, severite: 4 });
      }
    }

    // Messages non lus sans badge
    if (snap.actMessages_unread > 0 && !document.querySelector?.('#icNavMsgBadge')?.textContent?.trim()) {
      anomalies.push({ flux: 'FLOW-BADGES', type: 'BADGE_ABSENT', detail: `${snap.actMessages_unread} messages non lus mais badge nav vide`, severite: 2 });
    }

    // Appel en attente sans Realtime
    if (snap.call_state?.pending_out && !snap.call_state?.realtime_ok) {
      anomalies.push({ flux: 'FLOW-CALL', type: 'APPEL_SANS_REALTIME', detail: 'Appel sortant en cours mais canal Realtime call_requests non connecté', severite: 5 });
    }

    // Intelligence modules absents
    if (snap.brain_urgency === null && !snap.kernel_cold_start) {
      anomalies.push({ flux: 'FLOW-INTELLIGENCE', type: 'BRAIN_ABSENT', detail: 'BrainEngine n\'a pas encore orienté (S._brainOrientation null)', severite: 3 });
    }
    if (snap.soul_harmony === null && !snap.kernel_cold_start) {
      anomalies.push({ flux: 'FLOW-INTELLIGENCE', type: 'SOUL_ABSENT', detail: 'ImmatSoul n\'a pas encore tourné (S._soul null)', severite: 2 });
    }

    // Événements Bus attendus mais absents (fenêtre 60s)
    const recentEvts = new Set(snap.recent_bus_events.filter(e => Date.now() - e.at < 60_000).map(e => e.ev));
    // Si des alertes actives existent mais aucun événement ROAD_CREATED/PARKED_REPORT_SENT/HELP_CREATED dans la fenêtre — cohérent (alertes anciennes)
    // Si 0 alertes et aucun GPS_LOCATED depuis 60s — suspect
    if (!recentEvts.has('GPS_LOCATED') && snap.gps_active && snap.gps_age_sec > 60) {
      anomalies.push({ flux: 'FLOW-GPS', type: 'GPS_EVENT_ABSENT', detail: 'GPS actif mais aucun GPS_LOCATED émis depuis 60s sur ImmatBus', severite: 2 });
    }

    return anomalies;
  }

  // ── Cycle de diagnostic ────────────────────────────────────────────────────
  async function _diagnose() {
    if (!window.S?.isGardien) return;
    if (!window.sb) return;

    const snap = _collectSnapshot();
    const anomalies = _detectAnomalies(snap);

    // Si aucune anomalie détectée localement → rapport minimal sans appel IA
    if (!anomalies.length) {
      _store({ ts: snap.ts, synthese: 'Aucune anomalie détectée — tous les flux nominaux.', diagnostics: [], priorite_immediate: null, from: 'local' });
      _render({ ts: snap.ts, synthese: '✅ Tous les flux nominaux.', diagnostics: [] });
      return;
    }

    // Appel Ange pour analyse IA des anomalies détectées
    try {
      const res = await window.sb.functions.invoke('immat-brain-dialog', {
        body: {
          message: '__gardien_diagnostic__',
          mode: 'gardien_diagnostic',
          feature: 'GARDIEN',
          snapshot: { ...snap, anomalies_detectees: anomalies },
          history: [],
        },
      });
      const d = res?.data;
      if (d?.ok && Array.isArray(d.diagnostics)) {
        const result = { ts: snap.ts, synthese: d.synthese || '', diagnostics: d.diagnostics, priorite_immediate: d.priorite_immediate || null, from: 'ia' };
        _store(result);
        _render(result);
      } else {
        // Fallback : afficher les anomalies locales sans analyse IA
        const fallback = {
          ts: snap.ts,
          synthese: `${anomalies.length} anomalie(s) détectée(s) — analyse IA indisponible.`,
          diagnostics: anomalies.map(a => ({ flux: a.flux, anomalie: a.detail, cause_racine: '(analyse IA non disponible)', action: 'Vérifier manuellement', severite: a.severite })),
          priorite_immediate: null,
          from: 'local',
        };
        _store(fallback);
        _render(fallback);
      }
    } catch (_) {
      // Silencieux — ne pas perturber le gardien si l'IA est indisponible
    }
  }

  // ── Persistance locale ────────────────────────────────────────────────────
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
      const list = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]');
      return list.filter(e => now - e.ts < _MAX_AGE_MS).reverse(); // plus récent en premier
    } catch (_) { return []; }
  }

  // ── Rendu dans le dashboard gardien ───────────────────────────────────────
  function _render(result) {
    const container = document.getElementById('gardienDiagLiveStream');
    if (!container) return;

    const age = Math.round((Date.now() - result.ts) / 1000);
    const hasAnomalies = result.diagnostics?.length > 0;
    const maxSev = hasAnomalies ? Math.max(...result.diagnostics.map(d => d.severite || 0)) : 0;

    const sevColor = maxSev >= 4 ? '#f87171' : maxSev >= 3 ? '#fb923c' : maxSev >= 2 ? '#facc15' : '#4ade80';
    const sevLabel = maxSev >= 4 ? '🔴 CRITIQUE' : maxSev >= 3 ? '🟠 HAUTE' : maxSev >= 2 ? '🟡 MOYENNE' : '🟢 NOMINAL';

    let html = `<div style="margin-bottom:12px;padding:10px 12px;background:#0a0f1a;border-radius:8px;border-left:3px solid ${sevColor}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;color:#94a3b8">Cycle ${new Date(result.ts).toLocaleTimeString('fr-FR')} · il y a ${age}s · ${result.from === 'ia' ? '🧠 IA' : '⚡ Local'}</span>
        <span style="font-size:11px;font-weight:700;color:${sevColor}">${sevLabel}</span>
      </div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px">${_esc(result.synthese)}</div>`;

    if (result.priorite_immediate) {
      html += `<div style="font-size:11px;padding:6px 8px;background:#1e1b4b;border-radius:6px;color:#a5b4fc;margin-bottom:8px">⚡ Priorité : ${_esc(result.priorite_immediate)}</div>`;
    }

    if (hasAnomalies) {
      html += `<div style="display:flex;flex-direction:column;gap:6px">`;
      for (const d of result.diagnostics) {
        const sc = d.severite >= 4 ? '#f87171' : d.severite >= 3 ? '#fb923c' : d.severite >= 2 ? '#facc15' : '#4ade80';
        html += `<div style="padding:8px;background:#0f172a;border-radius:6px;border-left:2px solid ${sc}">
          <div style="font-size:11px;color:${sc};font-weight:700;margin-bottom:3px">${_esc(d.flux)} · Sév. ${d.severite}/5</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:3px">🔍 ${_esc(d.anomalie)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">💡 ${_esc(d.cause_racine || '')}</div>
          <div style="font-size:11px;color:#7c3aed">→ ${_esc(d.action || '')}</div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;

    // Prepend (plus récent en haut)
    container.insertAdjacentHTML('afterbegin', html);

    // Garder max 10 entrées visibles
    while (container.children.length > 10) container.removeChild(container.lastChild);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── API publique ──────────────────────────────────────────────────────────
  function start() {
    if (_running) return;
    if (!window.S?.isGardien) return;
    _running = true;
    _subscribe();
    _diagnose(); // premier cycle immédiat
    _timer = setInterval(_diagnose, _INTERVAL_MS);
  }

  function stop() {
    if (_timer) clearInterval(_timer);
    _running = false;
  }

  function forceRun() {
    _diagnose();
  }

  return { start, stop, forceRun, getHistory };
})();
