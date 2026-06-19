/* core/swarm-engine.js — ImmatConnect SwarmEngine v1
 * Intelligence collective en temps réel via Supabase Realtime Presence.
 * Chaque conducteur diffuse son état cognitif (position arrondie, anonymisée).
 * La convergence de signaux indépendants déclenche des alertes collectives.
 *
 *  AIDE      ≥ 1 conducteur proche en difficulté   → alerte immédiate
 *  VÉHICULE  ≥ 3 conducteurs signalent même plaque  → confirmation collective
 *  STATION   ≥ 2 signalements dans rayon 500 m      → obstruction confirmée
 *  ROUTE     ≥ 3 urgences simultanées dans 2 km     → danger collectif réel
 */
'use strict';
if (window.__SwarmEngineV1) { /* déjà chargé */ } else {
window.__SwarmEngineV1 = true;

const SwarmEngine = (function () {

  const CHANNEL    = 'ic_brain_swarm';
  const TICK_MS    = 30_000;
  const FRESH_MS   = 5 * 60_000;   // ignorer présences > 5 min

  // Rayons de convergence par catégorie
  const RADIUS = { help: 3, vehicle: 5, parking: 0.5, route: 2 };

  // Seuils de convergence (nb de conducteurs indépendants)
  const MIN = { help: 1, vehicle: 3, parking: 2, route: 3 };

  // Cooldowns anti-spam par catégorie
  const CD = { help: 2 * 60_000, vehicle: 10 * 60_000, parking: 5 * 60_000, route: 5 * 60_000 };

  let _ch        = null;
  let _timer     = null;
  let _running   = false;
  let _cool      = {};   // { type: lastFiredAt }

  // ── Présence locale à diffuser ────────────────────────────────────────────

  function _presence() {
    const S    = window.S || {};
    const lat  = S.myLat, lng = S.myLng;
    if (lat == null || lng == null) return null;

    const alerts = (S.alerts || []).filter(a => a.status !== 'resolved' && a.status !== 'gone');
    const msgs   = S._actMessages || [];

    return {
      lat: Math.round(lat * 1000) / 1000,   // ≈ 111 m — pas de coordonnée exacte
      lng: Math.round(lng * 1000) / 1000,
      urgency:    S._brainOrientation?.urgency || 0,
      needs_help: alerts.some(a => a.group === 'assist' && (a._mine || a._own)),
      r: {                                   // active_reports (clé courte = économie bandwidth)
        route:   alerts.filter(a => a.group === 'route'                           && (a._mine || a._own)).length,
        vehicle: alerts.filter(a => (a.group === 'vehicle' || a.type === 'vehicule') && (a._mine || a._own)).length,
        parking: msgs.filter(m => m.context_type === 'parked_report' && m._sent).length,
        help:    alerts.filter(a => a.group === 'assist'                          && (a._mine || a._own)).length,
      },
      flagged: [...new Set(                  // plaques signalées (max 5)
        alerts.filter(a => (a._mine || a._own) && a.target_plate).map(a => a.target_plate)
      )].slice(0, 5),
      at: Date.now(),
      // Payload diagnostic croisé (lu par GardienDiagnostic des autres appareils)
      _diag: {
        gps_ok: !!(window.S?.myGpsAt && Date.now() - window.S.myGpsAt < 120_000),
        rt_ok:  !!(window.CallManager?.getRuntimeState?.()?.realtimeStatus === 'SUBSCRIBED'),
        kr:     window.S?._reliability?.score ?? null,
        at:     Date.now(),
      },
    };
  }

  function _getPresenceState() {
    try { return _ch?.presenceState?.() ?? {}; } catch (_) { return {}; }
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  function _km(lat1, lng1, lat2, lng2) {
    if (lat2 == null || lng2 == null) return Infinity;
    const R  = 6371;
    const dL = (lat2 - lat1) * Math.PI / 180;
    const dG = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(dL / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function _canFire(type) {
    const now = Date.now();
    if (now - (_cool[type] || 0) < CD[type]) return false;
    _cool[type] = now;
    return true;
  }

  function _emit(ev, payload) {
    try { window.ImmatBus?.emit?.(ev, { ...payload, _src: 'SwarmEngine' }); } catch (_) {}
  }

  function _toast(msg, type) {
    try { if (typeof toast === 'function') toast(msg, type); } catch (_) {}
  }

  function _speak(msg) {
    try { if (typeof speak === 'function' && window.S?.voice) speak(msg, false); } catch (_) {}
  }

  // ── Analyse de convergence ────────────────────────────────────────────────

  function _analyze(others, myLat, myLng) {
    const now   = Date.now();
    const fresh = others.filter(p => p.at && now - p.at < FRESH_MS && p.lat != null && p.lng != null);

    // ── 1. AIDE — le plus urgent ─────────────────────────────────────────
    const helpClose = fresh.filter(p => p.needs_help && _km(myLat, myLng, p.lat, p.lng) < RADIUS.help);
    if (helpClose.length >= MIN.help && _canFire('help')) {
      const dist    = Math.min(...helpClose.map(p => _km(myLat, myLng, p.lat, p.lng)));
      const distStr = dist < 1 ? Math.round(dist * 1000) + ' m' : dist.toFixed(1) + ' km';
      const msg     = `🆘 Conducteur en difficulté à ${distStr} — peux-tu intervenir ?`;
      _toast(msg, 'bad');
      _speak(msg);
      _emit('SWARM_HELP_NEARBY', { count: helpClose.length, nearest_km: dist });
    }

    // ── 2. VÉHICULE — convergence sur une plaque ─────────────────────────
    const vClose = fresh.filter(p => _km(myLat, myLng, p.lat, p.lng) < RADIUS.vehicle);
    const pMap   = {};
    vClose.flatMap(p => p.flagged || []).forEach(pl => { pMap[pl] = (pMap[pl] || 0) + 1; });
    const confirmedPlates = Object.entries(pMap)
      .filter(([, n]) => n >= MIN.vehicle)
      .map(([plate, count]) => ({ plate, count }));
    if (confirmedPlates.length && _canFire('vehicle')) {
      confirmedPlates.forEach(({ plate, count }) =>
        _toast(`🚨 ${count} conducteurs signalent la plaque ${plate}`, 'warn')
      );
      _emit('SWARM_PLATE_CONFIRMED', { plates: confirmedPlates });
    }

    // ── 3. STATIONNEMENT — obstruction géographique confirmée ────────────
    const parkClose = fresh.filter(p => (p.r?.parking || 0) > 0 && _km(myLat, myLng, p.lat, p.lng) < RADIUS.parking);
    if (parkClose.length >= MIN.parking && _canFire('parking')) {
      _emit('SWARM_PARKING_CONFIRMED', { count: parkClose.length });
    }

    // ── 4. ROUTE — danger collectif en temps réel ────────────────────────
    const rClose = fresh.filter(p =>
      ((p.r?.route || 0) > 0 || p.urgency >= 6) && _km(myLat, myLng, p.lat, p.lng) < RADIUS.route
    );
    if (rClose.length >= MIN.route && _canFire('route')) {
      const avg = Math.round(rClose.reduce((s, p) => s + (p.urgency || 0), 0) / rClose.length);
      const msg = `⚠️ ${rClose.length} conducteurs détectent un danger route dans votre zone`;
      _toast(msg, 'bad');
      _emit('SWARM_ROUTE_DANGER', { count: rClose.length, avg_urgency: avg });
    }
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────

  function _broadcast() {
    if (!_ch) return;
    const p = _presence();
    if (!p) return;
    try { _ch.track(p); } catch (_) {}
  }

  // ── API publique ──────────────────────────────────────────────────────────

  function start(sb) {
    if (_running || !sb) return;
    _running = true;

    const S   = window.S || {};
    const uid = S.uid || (typeof crypto !== 'undefined' && crypto.randomUUID?.()) || String(Date.now());

    try {
      _ch = sb.channel(CHANNEL, { config: { presence: { key: uid } } });

      _ch
        .on('presence', { event: 'sync' }, () => {
          try {
            const S = window.S || {};
            if (S.myLat == null || S.myLng == null) return;
            const others = Object.entries(_ch.presenceState())
              .filter(([key]) => key !== uid)
              .flatMap(([, arr]) => arr);
            _analyze(others, S.myLat, S.myLng);
          } catch (_) {}
        })
        .subscribe(status => {
          if (status !== 'SUBSCRIBED') return;
          _broadcast();
          _timer = setInterval(_broadcast, TICK_MS);
        });
    } catch (_) {}
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
    if (_ch)    { try { _ch.unsubscribe(); } catch (_) {} _ch = null; }
  }

  return { start, stop, _getPresenceState };

})();

if (typeof window !== 'undefined') window.SwarmEngine = SwarmEngine;
} // __SwarmEngineV1
