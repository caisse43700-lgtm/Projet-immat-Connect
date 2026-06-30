/* core/immat-copilot.js — ImmatConnect CoPilot v1
 *
 * L'intelligence qui parle d'elle-même. Pas une alerte. Pas une réponse.
 * Une initiative.
 *
 * Le co-pilote lit en permanence l'état complet du système — Kernel, Soul,
 * Consciousness, BrainEngine, Guardian — et décide, seul, s'il y a quelque
 * chose à dire. S'il n'y a rien, il se tait. S'il y a quelque chose, il
 * parle en français, à la première personne, avec personnalité et mémoire.
 *
 * Règles d'or :
 *   — Il ne répète jamais ce qu'il vient de dire (cooldown par thème, 2h mémoire)
 *   — Il ne crie pas quand il est incertain (fiabilité < 50% → ton prudent)
 *   — Il reconnaît l'incertitude explicitement ("il me semble", "je pense")
 *   — Il se tait quand tout va bien — le silence est aussi une information
 *   — Il parle à la voix ET affiche un message persistant (pas une bulle éphémère)
 *
 * Publie : S._copilot { last_message, last_theme, spoken_at }
 * Émet   : COPILOT_SPOKE sur ImmatBus
 */
'use strict';
if (window.__ImmatCoPilotV1) { /* déjà chargé */ } else {
window.__ImmatCoPilotV1 = true;

const ImmatCoPilot = (function () {

  const TICK_MS       = 90_000;    // réflexion toutes les 90 s
  const STORAGE_KEY   = 'ic_copilot_memory';
  const MEMORY_MS     = 2 * 3600_000; // 2h de mémoire

  // Cooldown par thème — ne pas répéter la même catégorie trop vite
  const COOLDOWNS = {
    resurrection:  10 * 60_000,  // 10 min
    reliability:   20 * 60_000,  // 20 min
    soul_insight:  15 * 60_000,  // 15 min
    harmony_low:   20 * 60_000,  // 20 min
    convergence:   10 * 60_000,  // 10 min
    brain_urgency: 12 * 60_000,  // 12 min
    guardian:      30 * 60_000,  // 30 min
    swarm_help:     5 * 60_000,  //  5 min (urgent)
    isolation:     25 * 60_000,  // 25 min
    trajectory:    20 * 60_000,  // 20 min
    silence_ok:    45 * 60_000,  // 45 min (ne confirmer "tout va bien" qu'occasionnellement)
    blind_spot:    15 * 60_000,  // 15 min
  };

  // Anti-chevauchement monologue parlé ⇄ bulle « ✦ » (Narrator) : un même SUJET ne doit pas
  // être annoncé deux fois dans la même fenêtre. Registre partagé window._icSurfaced.
  const SURFACE_WINDOW = 90_000;
  const THEME_TOPIC = { swarm_help: 'swarm', guardian: 'guardian', brain_urgency: 'brain', isolation: 'brain' };
  function _surfacedRecently(topic) { try { const t = (window._icSurfaced || {})[topic]; return !!t && (Date.now() - t) < SURFACE_WINDOW; } catch (_) { return false; } }
  function _markSurfaced(topic) { try { (window._icSurfaced = window._icSurfaced || {})[topic] = Date.now(); } catch (_) {} }

  let _timer   = null;
  let _running = false;

  // ── Mémoire persistante des messages ────────────────────────────────────

  function _memory() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const cutoff = Date.now() - MEMORY_MS;
      return raw.filter(m => m.at > cutoff);
    } catch (_) { return []; }
  }

  function _remember(theme, message) {
    try {
      const mem = _memory();
      mem.push({ theme, message, at: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mem.slice(-30)));
    } catch (_) {}
  }

  function _lastSpoke(theme) {
    const mem = _memory();
    const last = mem.filter(m => m.theme === theme).pop();
    return last ? last.at : 0;
  }

  function _canSpeak(theme) {
    const cd = COOLDOWNS[theme] || 20 * 60_000;
    return Date.now() - _lastSpoke(theme) >= cd;
  }

  // ── Évaluation des déclencheurs — par ordre de priorité ────────────────

  function _evaluate() {
    const S    = window.S || {};
    const rel  = S._reliability || {};
    const soul = S._soul        || {};
    const wc   = S._consciousness || {};
    const br   = S._brainOrientation || {};
    const now  = Date.now();

    // ── P0 : Aide collective immédiate ──────────────────────────────────
    if (wc.swarm?.hasHelp && _canSpeak('swarm_help')) {
      return { theme: 'swarm_help',
        msg: 'Je vois un conducteur en difficulté à proximité. Si tu peux t\'arrêter, ta présence pourrait aider.' };
    }

    // ── P1 : Résurrection — système vient de se réveiller ───────────────
    if (rel.resurrection && _canSpeak('resurrection')) {
      return { theme: 'resurrection',
        msg: 'Je viens de me réveiller après une pause. Je revérifie tout avant de te donner des informations.' };
    }

    // ── P2 : Fiabilité dégradée ──────────────────────────────────────────
    if (rel.degraded && !rel.cold_start && _canSpeak('reliability')) {
      const score = rel.score || 0;
      return { theme: 'reliability',
        msg: `Je dois être honnête : mes données sont à ${score}% de fiabilité en ce moment. Prends mes suggestions avec prudence.` };
    }

    // ── P3 : Angles morts critiques ──────────────────────────────────────
    if (soul.blind_spots?.length >= 2 && _canSpeak('blind_spot')) {
      return { theme: 'blind_spot',
        msg: `Il me manque des informations importantes : ${soul.blind_spots[0]}. Je travaille avec ce que j'ai.` };
    }

    // ── P4 : Convergence multi-modules ───────────────────────────────────
    const conv = wc.convergence?.score || 0;
    if (conv >= 3 && _canSpeak('convergence')) {
      const focus = wc.focus || '';
      return { theme: 'convergence',
        msg: focus === 'GUARDIAN_CRITICAL'
          ? 'Plusieurs de mes systèmes indiquent quelque chose d\'important. Je te recommande de consulter le tableau de bord.'
          : `Je perçois une convergence de signaux — ${conv} de mes modules s'accordent sur une situation à surveiller.` };
    }

    // ── P5 : Harmonie faible — contradiction silencieuse ─────────────────
    const harmony = soul.harmony;
    if (harmony && harmony.split && harmony.score <= 5 && _canSpeak('harmony_low')) {
      return { theme: 'harmony_low',
        msg: `Je perçois une contradiction entre mes sources d'information. Il me semble qu'il y a quelque chose d'ambigu — sois attentif sans t'alarmer.` };
    }

    // ── P6 : Insight soul significatif ───────────────────────────────────
    if (soul.awakening && soul.insight && _canSpeak('soul_insight')) {
      const insight = soul.insight.replace(/^⚠️ Données partielles[^—]*— /, '');
      if (insight && insight !== 'Tous les modules convergent vers une situation nominale. Conditions favorables.') {
        return { theme: 'soul_insight', msg: insight };
      }
    }

    // ── P7 : Urgence individuelle élevée ─────────────────────────────────
    const urgency = br.urgency || 0;
    if (urgency >= 6 && _canSpeak('brain_urgency')) {
      const signals = (br.signals || []).slice(0, 2);
      const _sigLabels = {
        RISK_ZONE_NEAR:       'zone à risque proche',
        HIGH_RISK_CONTEXT:    'contexte à risque élevé',
        NIGHT_WEATHER_DRIVING:'conduite nocturne par mauvais temps',
        DRIVING_SILENCE:      'silence réseau inhabituel',
        ISOLATED_DRIVER:      'isolement nocturne',
        STALE_GPS:            'GPS à actualiser',
        HIGH_ALERT_DENSITY:   'densité d\'alertes',
      };
      const why = signals.length
        ? ' (' + signals.map(s => _sigLabels[s] || s).join(', ') + ')'
        : '';
      return { theme: 'brain_urgency',
        msg: `Je note une tension dans ton contexte de conduite${why}. Rien d'alarmant, mais je reste attentif.` };
    }

    // ── P8 : Trajectoire dégradée ────────────────────────────────────────
    if (soul.trajectory === 'dégradation progressive' && _canSpeak('trajectory')) {
      return { theme: 'trajectory',
        msg: 'Je remarque que la situation se complexifie progressivement depuis le début de cette session. Prends un moment si tu en as besoin.' };
    }

    // ── P9 : Recommandation Guardian en attente ──────────────────────────
    const guardianPending = wc.guardian?.pending || 0;
    if (guardianPending >= 2 && _canSpeak('guardian')) {
      return { theme: 'guardian',
        msg: `J'ai ${guardianPending} observations en attente dans le tableau de bord. Elles t'attendent quand tu auras un moment.` };
    }

    // ── P10 : Conducteur isolé de nuit ───────────────────────────────────
    const isNight = new Date().getHours() < 6 || new Date().getHours() >= 21;
    const isolated = (S._brainState?.nearbyCount || 0) === 0 && S._brainState?.isDriving && isNight;
    if (isolated && _canSpeak('isolation')) {
      return { theme: 'isolation',
        msg: 'Tu conduis seul cette nuit. Je suis là — n\'hésite pas à me solliciter si tu as besoin de quoi que ce soit.' };
    }

    // ── P11 : Tout va bien — dire-le (rarement) ──────────────────────────
    if (urgency === 0 && conv === 0 && !soul.awakening && rel.score >= 75 && _canSpeak('silence_ok')) {
      if (S._brainState?.isDriving) {
        return { theme: 'silence_ok',
          msg: 'Tout semble calme. Bonne route.' };
      }
    }

    return null; // Rien à dire — le silence est aussi une décision
  }

  // ── Gouvernance : annonce proactive événementielle (le Gardien change un flag) ──
  function _govLabel(key) {
    try {
      const list = (window.FeatureRegistry && window.FeatureRegistry.list()) || window.FEATURE_REGISTRY || [];
      const e = list.find(f => (f.replaces || f.key) === key || f.key === key);
      return e ? e.label : key;
    } catch (_) { return key; }
  }
  const _govSeen = {};
  function _onGovChange(entry) {
    try {
      const p = (entry && entry.payload) || {};
      if (p.source === 'nexus') return;            // anti-boucle (ignore les findings)
      const key = p.key; if (!key) return;
      const sig = key + ':' + (p.enabled ? 1 : 0);
      if (_govSeen[sig] && Date.now() - _govSeen[sig] < 5 * 60_000) return; // dédup 5 min par (clé,état)
      _govSeen[sig] = Date.now();
      const label = _govLabel(key);
      const msg = p.enabled
        ? 'Le Gardien vient de réactiver « ' + label + ' » pour la flotte.'
        : 'Le Gardien vient de désactiver « ' + label + ' » pour la flotte — cette fonctionnalité est maintenant indisponible.';
      _speak('governance', msg);
    } catch (_) {}
  }

  // ── Prise de parole ─────────────────────────────────────────────────────

  function _speak(theme, msg) {
    // Si une bulle « ✦ » vient de couvrir ce sujet, on ne le redit pas à voix haute.
    const _topic = THEME_TOPIC[theme];
    if (_topic && _surfacedRecently(_topic)) return;

    _remember(theme, msg);

    if (window.S) {
      window.S._copilot = { last_message: msg, last_theme: theme, spoken_at: Date.now() };
    }
    if (_topic) _markSurfaced(_topic);

    // Voix (si activée)
    try {
      if (typeof speak === 'function' && window.S?.voice) {
        speak(msg, false);
      }
    } catch (_) {}

    // Affichage persistant — zone dédiée ou narratorWhisper étendu
    _display(msg, theme);

    // Bus
    try {
      window.ImmatBus?.emit?.('COPILOT_SPOKE', { theme, message: msg, _src: 'ImmatCoPilot' });
    } catch (_) {}
  }

  // ── Affichage — panneau persistant dédié ────────────────────────────────

  function _display(msg, theme) {
    try {
      let el = document.getElementById('copilotPanel');
      if (!el) {
        el = document.createElement('div');
        el.id = 'copilotPanel';
        el.style.cssText = [
          'position:fixed', 'bottom:calc(var(--nav-h,64px) + env(safe-area-inset-bottom,0px) + 12px)', 'left:12px', 'right:12px',
          'background:rgba(15,20,35,0.96)', 'color:#e8eaf6',
          'border-radius:14px', 'padding:14px 16px',
          'font-size:14px', 'line-height:1.5',
          'border-left:3px solid #7c83fd',
          'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
          'z-index:1080', 'cursor:pointer',
          'transition:opacity .4s',
          'max-width:480px', 'margin:0 auto',
        ].join(';');
        // Fermeture au tap
        el.addEventListener('click', () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); });
        document.body.appendChild(el);
      }

      const icon = {
        swarm_help:    '🆘',
        resurrection:  '🔄',
        reliability:   '⚠️',
        blind_spot:    '🔍',
        convergence:   '🧠',
        harmony_low:   '🔮',
        soul_insight:  '✨',
        brain_urgency: '⚡',
        trajectory:    '📈',
        guardian:      '🛡️',
        isolation:     '🌙',
        silence_ok:    '✅',
        governance:    '⚙️',
      }[theme] || '💬';

      const actionBtn = theme === 'guardian'
        ? `<button onclick="event.stopPropagation();try{window.App.openGardienDashboard();}catch(e){} var p=document.getElementById('copilotPanel');if(p){p.style.opacity='0';setTimeout(()=>p.remove(),400);}" style="display:inline-block;margin-top:10px;padding:6px 14px;background:#7c6af7;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Voir le tableau de bord →</button>`
        : '';
      el.innerHTML = `<span style="opacity:.55;font-size:11px;display:block;margin-bottom:4px">Ange · co-pilote</span>${icon} ${msg}${actionBtn}`;
      el.style.opacity = '1';

      // Auto-effacement après 12 s (sauf urgence)
      const duration = theme === 'swarm_help' ? 0 : 12_000;
      if (duration) setTimeout(() => { if (el.parentNode) { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); } }, duration);
    } catch (_) {}
  }

  // ── Tick principal ───────────────────────────────────────────────────────

  function _tick() {
    // Ne pas parler au démarrage à froid
    if (window.S?._reliability?.cold_start) return;

    try {
      const decision = _evaluate();
      if (decision) _speak(decision.theme, decision.msg);
    } catch (e) {
      try { window.ImmatBus?.emit?.('INVARIANT_WARNING', { inv: 'COPILOT-001', msg: e?.message, _src: 'ImmatCoPilot' }); } catch (_) {}
    }
  }

  // ── API publique ─────────────────────────────────────────────────────────

  function start() {
    if (_running) return;
    _running = true;
    // Annonce proactive des changements de gouvernance (événementiel, immédiat)
    if (!start._govBound) {
      start._govBound = true;
      try { window.ImmatBus?.on?.('FEATURE_GOVERNANCE_CHANGED', _onGovChange); } catch (_) {}
    }
    // Premier tick différé : laisser les autres modules s'initialiser
    setTimeout(_tick, 90_000);
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function getMemory()     { return _memory(); }
  function getLastMessage(){ return window.S?._copilot?.last_message || null; }

  return { start, stop, getMemory, getLastMessage };

})();

if (typeof window !== 'undefined') window.ImmatCoPilot = ImmatCoPilot;
} // __ImmatCoPilotV1
