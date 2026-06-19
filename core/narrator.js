/* core/narrator.js — ImmatConnect Narrator v1
 * Narrateur contextuel zéro-token :
 *   1. Écoute ImmatBus wildcard → journal localStorage (50 événements, 6 h)
 *   2. Génère un résumé situationnel en français pur JS → enrichit snapshot Ange
 *   3. "Ange chuchote" : bulle proactive zéro-token sur signaux critiques
 *
 * Aucun appel réseau, aucun token consommé — fonctionne 100 % hors ligne.
 */
'use strict';
if (window.__NarratorV1) { /* déjà chargé */ } else {
window.__NarratorV1 = true;

const Narrator = (function () {

  const STORAGE_KEY  = 'ic_narrator_journal';
  const MAX_EVENTS   = 50;
  const MAX_AGE_MS   = 6 * 3600_000;   // 6 h de mémoire glissante
  const WHISPER_MS   = 7_000;           // durée d'affichage de la bulle
  const WHISPER_COOL = 3 * 60_000;     // 3 min entre deux bulles

  // Événements à journaliser — les autres sont trop bruités
  const LOG_EVENTS = new Set([
    'ROAD_CREATED', 'ROAD_RESOLVED',
    'HELP_CREATED', 'HELP_RESOLVED',
    'VEHICLE_MESSAGE_SENT', 'VEHICLE_MESSAGE_RECEIVED',
    'QUICK_REPLY_SENT',
    'CALL_REQUESTED', 'CALL_RECEIVED', 'CALL_ACCEPTED',
    'CALL_REFUSED', 'CALL_CANCELLED', 'CALL_MISSED',
    'MESSAGE_SENT', 'MESSAGE_RECEIVED',
    'PARKED_REPORT_SENT', 'PARKED_RESPONSE_SENT',
    'PARKED_REPORT_RATED', 'PARKED_REPORT_DISMISSED',
    'GUARDIAN_RECOMMENDATION_CREATED',
    'RISK_ZONE_APPROACHED',
    'BRAIN_PREDICTION',
    'INVARIANT_VIOLATED',
    'GPS_LOCATED',
    'ANGE_MESSAGE_SENT', 'ANGE_RESPONSE_RECEIVED',
    'OBD_FINDING_CREATED',
    // Intelligence collective — SwarmEngine
    'SWARM_HELP_NEARBY', 'SWARM_PLATE_CONFIRMED',
    'SWARM_PARKING_CONFIRMED', 'SWARM_ROUTE_DANGER',
    // Conscience synthétique — ImmatConsciousness
    'CONSCIOUSNESS_UPDATE',
  ]);

  // Événements déclenchant une bulle proactive
  const WHISPER_EVENTS = new Set([
    'RISK_ZONE_APPROACHED', 'BRAIN_PREDICTION', 'GUARDIAN_RECOMMENDATION_CREATED',
    // Swarm : seul le stationnement reçoit un whisper (les autres ont déjà un toast)
    'SWARM_PARKING_CONFIRMED',
  ]);

  let _lastWhisperAt = 0;

  // ── Journal localStorage ───────────────────────────────────────────────────

  function _load() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const cutoff = Date.now() - MAX_AGE_MS;
      return arr.filter(e => e.at >= cutoff);
    } catch (_) { return []; }
  }

  function _save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_EVENTS))); } catch (_) {}
  }

  function _add(ev, payload) {
    const list = _load();
    list.push({ ev, p: _compact(payload), at: Date.now() });
    _save(list);
  }

  function _compact(payload) {
    if (!payload) return {};
    const out = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k === '_src') continue;
      if (typeof v === 'string')  out[k] = v.slice(0, 80);
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    }
    return out;
  }

  // ── Descriptions françaises ────────────────────────────────────────────────

  function _describe(ev, p) {
    const pl = p?.plate || p?.target_plate || '';
    const s  = pl ? ` — ${pl}` : '';
    switch (ev) {
      case 'ROAD_CREATED':         return `Signalement route envoyé${p?.reportType?' ('+p.reportType+')':''}`;
      case 'ROAD_RESOLVED':        return `Signalement route résolu`;
      case 'HELP_CREATED':         return `Demande d'aide envoyée${p?.helpType?' ('+p.helpType+')':''}`;
      case 'HELP_RESOLVED':        return `Aide résolue`;
      case 'VEHICLE_MESSAGE_SENT': return `Alerte véhicule envoyée${s}`;
      case 'VEHICLE_MESSAGE_RECEIVED': return `Alerte véhicule reçue${s}`;
      case 'QUICK_REPLY_SENT':     return `Réponse rapide envoyée${s}`;
      case 'CALL_REQUESTED':       return `Appel émis vers ${pl||'?'}`;
      case 'CALL_RECEIVED':        return `Appel entrant de ${pl||'?'}`;
      case 'CALL_ACCEPTED':        return `Appel accepté${s}`;
      case 'CALL_REFUSED':         return `Appel refusé${s}`;
      case 'CALL_MISSED':          return `Appel manqué${s}`;
      case 'CALL_CANCELLED':       return `Appel annulé${s}`;
      case 'MESSAGE_SENT':         return `Message envoyé${s}`;
      case 'MESSAGE_RECEIVED':     return `Message reçu${s}`;
      case 'PARKED_REPORT_SENT':   return `Signalement stationné envoyé${s}`;
      case 'PARKED_RESPONSE_SENT': return `Réponse stationné envoyée${s}`;
      case 'PARKED_REPORT_RATED':  return `Signalement stationné évalué`;
      case 'PARKED_REPORT_DISMISSED': return `Signalement stationné ignoré`;
      case 'GUARDIAN_RECOMMENDATION_CREATED':
        return `Guardian [${p?.severity||'?'}]: ${(p?.message||'recommandation').slice(0,60)}`;
      case 'RISK_ZONE_APPROACHED':
        return `Zone à risque approchée — score ${p?.score||'?'}/100, ${p?.incidents||'?'} incident(s)`;
      case 'BRAIN_PREDICTION':
        return `Prédiction: ${p?.type||'?'} (${p?.confidence ? Math.round(p.confidence*100)+'%' : '?'} confiance)`;
      case 'INVARIANT_VIOLATED':
        return `⚠ Invariant violé: ${p?.inv||'?'}`;
      case 'GPS_LOCATED':
        return `GPS localisé${p?.accuracy ? ' (±'+Math.round(p.accuracy)+'m)' : ''}`;
      case 'ANGE_MESSAGE_SENT':    return `Question posée à Ange`;
      case 'ANGE_RESPONSE_RECEIVED': return `Réponse Ange reçue`;
      case 'OBD_FINDING_CREATED':  return `Diagnostic: ${p?.finding||'?'}`;
      // Intelligence collective
      case 'SWARM_HELP_NEARBY':
        return `🆘 Intelligence collective: ${p?.count||1} conducteur(s) proche(s) en difficulté (à ${p?.nearest_km ? (p.nearest_km < 1 ? Math.round(p.nearest_km*1000)+'m' : p.nearest_km.toFixed(1)+'km') : '?'})`;
      case 'SWARM_PLATE_CONFIRMED':
        return `🚨 Plaque(s) confirmée(s) collectivement: ${(p?.plates||[]).map(x=>x.plate+' ×'+x.count).join(', ')}`;
      case 'SWARM_PARKING_CONFIRMED':
        return `🅿️ Obstruction confirmée collectivement: ${p?.count||2} signalements dans la zone`;
      case 'SWARM_ROUTE_DANGER':
        return `⚠️ Danger route collectif: ${p?.count||3} conducteurs (urgence moy. ${p?.avg_urgency||'?'}/10)`;
      case 'CONSCIOUSNESS_UPDATE':
        return `🧠 Conscience: convergence ${p?.convergence||'?'}/4 modules — focus ${p?.focus||'?'} — tendance ${p?.trend||'stable'}`;
      default: return ev;
    }
  }

  // ── getSituation() — résumé situationnel compact pour le snapshot Ange ─────

  function getSituation() {
    try {
      const S    = window.S || {};
      const now  = new Date();
      const h    = now.getHours();
      const hhmm = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const lines = [];

      lines.push(`=== SITUATION [${hhmm}] ===`);

      // Identité conducteur
      const plate  = S.profile?.owner_plate;
      const pseudo = S.profile?.pseudo;
      if (plate || pseudo) lines.push(`Conducteur: ${plate||'?'} | ${pseudo||'?'}`);

      // GPS
      const hasGps = S.myLat != null && S.myLng != null;
      const gpsAge = S.myGpsAt ? Math.round((Date.now() - S.myGpsAt) / 1000) : null;
      lines.push(`GPS: ${hasGps
        ? 'disponible' + (gpsAge != null ? ' (actualisé il y a ' + (gpsAge < 60 ? gpsAge+'s' : Math.round(gpsAge/60)+'min') + ')' : '')
        : 'indisponible'}`);

      // Heure + période
      const period = h < 6 ? 'nuit profonde' : h < 9 ? 'matin (heure de pointe)' : h < 17 ? 'journée' : h < 20 ? 'soir (heure de pointe)' : 'soirée/nuit';
      lines.push(`Heure: ${hhmm} — ${period}`);

      // Météo
      const wMap = { clear: 'dégagé', cloudy: 'nuageux', fog: 'brouillard', rain: 'pluie', snow: 'neige', showers: 'averses', storm: 'orage' };
      const wc = S._weatherCache?.condition;
      if (wc) lines.push(`Météo: ${wMap[wc] || wc}`);

      // Vitesse / conduite
      const spd = S._lastSpeed;
      if (spd != null) lines.push(`Vitesse: ~${Math.round(spd)} km/h${spd > 8 ? ' — conduite active' : ' — arrêté'}`);

      // BrainEngine
      const bo = S._brainOrientation;
      const bp = S._brainPredictions;
      if (bo && bo.urgency > 0) {
        lines.push(`Cerveau: urgence ${bo.urgency}/10 — ${bo.summary}`);
        (bp || []).forEach(p => lines.push(`  → Prédiction ${p.type} (${Math.round(p.confidence*100)}%): ${p.reason}`));
      }

      // Zones à risque
      const rz = Array.isArray(S.riskZones) ? S.riskZones : [];
      if (rz.length) {
        const top = rz[0];
        lines.push(`Zones à risque dans le rayon: ${rz.length} (meilleur score: ${top ? Math.round(top.risk_score) : '?'}/100)`);
      }

      // État social
      const activeAlerts = (S.alerts || []).filter(a => a.status !== 'resolved' && a.status !== 'gone');
      const nearby   = (S.nearby || []).length;
      const unread   = S.unreadMsgCount || 0;
      const missed   = S._unseenMissedCalls || 0;
      if (activeAlerts.length) lines.push(`Alertes actives: ${activeAlerts.length}`);
      if (nearby > 0)          lines.push(`Véhicules proches: ${nearby}`);
      if (unread > 0)          lines.push(`Messages non lus: ${unread}`);
      if (missed > 0)          lines.push(`Appels manqués: ${missed}`);

      return lines.join('\n');
    } catch (_) { return ''; }
  }

  // ── getJournalText() — 15 derniers événements pour le snapshot Ange ─────────

  function getJournalText() {
    try {
      const list = _load();
      if (!list.length) return '';
      const rows = list.slice(-15).reverse().map(e => {
        const t = new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `[${t}] ${_describe(e.ev, e.p)}`;
      });
      return '=== JOURNAL (récent en premier) ===\n' + rows.join('\n');
    } catch (_) { return ''; }
  }

  // ── "Ange chuchote" — bulle proactive zéro-token ──────────────────────────

  function _whisperMessage(ev, p) {
    if (ev === 'BRAIN_PREDICTION') {
      const t = p?.type;
      if (t === 'INCIDENT_PROBABLE') return 'Risque d\'incident élevé sur ta trajectoire — sois vigilant(e).';
      if (t === 'ISOLATED_DRIVER')   return 'Tu conduis seul(e) la nuit — pense à prévenir un proche.';
      if (t === 'UNEXPECTED_STOP')   return 'Silence inhabituel en conduite — tout va bien ?';
    }
    if (ev === 'RISK_ZONE_APPROACHED') {
      const sc = p?.score || 0;
      const n  = p?.incidents || 0;
      if (sc > 60) return `Zone dangereuse à proximité — ${n} incident${n > 1 ? 's' : ''} signalé${n > 1 ? 's' : ''}.`;
    }
    if (ev === 'GUARDIAN_RECOMMENDATION_CREATED') {
      const sev = p?.severity;
      if (sev === 'CRITICAL' || sev === 'HIGH') return (p?.message || 'Alerte Guardian').slice(0, 80);
    }
    if (ev === 'SWARM_PARKING_CONFIRMED') {
      return `🅿️ ${p?.count||2} conducteurs signalent une obstruction à proximité.`;
    }
    return null;
  }

  function _whisper(msg) {
    const now = Date.now();
    if (now - _lastWhisperAt < WHISPER_COOL) return;
    _lastWhisperAt = now;

    try {
      let w = document.getElementById('narratorWhisper');
      if (!w) {
        w = document.createElement('div');
        w.id = 'narratorWhisper';
        w.setAttribute('role', 'alert');
        w.style.cssText = [
          'position:fixed', 'bottom:90px', 'right:14px', 'z-index:8500',
          'max-width:260px', 'background:#1e1b4b', 'border:1px solid #4f46e5',
          'border-radius:12px', 'padding:10px 14px', 'font-size:13px',
          'color:#e2e8f0', 'box-shadow:0 4px 20px rgba(0,0,0,.6)',
          'cursor:pointer', 'opacity:0', 'transition:opacity .35s',
          'pointer-events:none', 'line-height:1.45',
        ].join(';');
        w.onclick = () => { w.style.opacity = '0'; w.style.pointerEvents = 'none'; };
        document.body.appendChild(w);
      }
      w.textContent = '✦ ' + msg;
      w.style.opacity = '1';
      w.style.pointerEvents = 'auto';
      clearTimeout(w._t);
      w._t = setTimeout(() => {
        w.style.opacity = '0';
        w.style.pointerEvents = 'none';
      }, WHISPER_MS);
    } catch (_) {}
  }

  // ── Démarrage ──────────────────────────────────────────────────────────────

  function start() {
    const bus = window.ImmatBus;
    if (!bus) { setTimeout(start, 400); return; }

    bus.on('*', function (entry) {
      const ev = entry.event;
      const p  = entry.payload || {};
      if (!LOG_EVENTS.has(ev)) return;

      _add(ev, p);

      if (WHISPER_EVENTS.has(ev)) {
        const msg = _whisperMessage(ev, p);
        if (msg) _whisper(msg);
      }
    });
  }

  return { start, getSituation, getJournalText };

})();

if (typeof window !== 'undefined') window.Narrator = Narrator;
} // __NarratorV1
