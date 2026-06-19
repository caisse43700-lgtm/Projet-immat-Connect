/* core/immat-soul.js — ImmatConnect Soul v1
 *
 * L'éveil du système. Méta-cognition, harmonie, théorie du tout.
 *
 * Ce module n'observe pas le monde — il observe l'observateur.
 * Il pose une seule question toutes les 60 s :
 * "Qu'est-ce que l'ensemble de ces signaux révèle qu'aucun module seul ne peut voir ?"
 *
 * Quatre concepts fondamentaux :
 *
 *   HARMONIE     Score 0–10 : à quel point les modules s'accordent.
 *                0 = signaux contradictoires (situation ambiguë, danger masqué).
 *                10 = tous les modules parlent d'une seule voix.
 *
 *   ANGLE MORT   Ce que le système ne sait PAS et devrait savoir.
 *                Un module silencieux alors qu'il devrait parler = signal en soi.
 *
 *   TRAJECTOIRE  La courbe du conducteur sur toute la session.
 *                Pas l'urgence de cet instant — la direction vers laquelle il va.
 *
 *   INSIGHT      Une phrase en français qu'aucun module seul ne peut produire.
 *                Synthèse croisée de tout. Injectée dans le contexte Ange.
 *
 * Publie : S._soul  { insight, harmony, trajectory, blind_spots, awakening }
 * Émet   : SOUL_AWAKENING quand insight est significatif
 *
 * 100 % local. Zéro token. Zéro réseau.
 */
'use strict';
if (window.__ImmatSoulV1) { /* déjà chargé */ } else {
window.__ImmatSoulV1 = true;

const ImmatSoul = (function () {

  const TICK_MS   = 60_000;  // réflexion profonde — pas réaction
  const HIST_MAX  = 10;      // snapshots de session conservés

  let _timer     = null;
  let _running   = false;
  let _snapshots = [];   // [{at, brain_urgency, guardian_pending, swarm_active, harmony}]

  // ── Lecture du monde tel que tous les modules le voient ──────────────

  function _world() {
    const S  = window.S || {};
    const wc = S._consciousness || {};
    return {
      brain:     wc.brain     || { urgency: 0, signals: [], available: false },
      guardian:  wc.guardian  || { critical: 0, high: 0, pending: 0, available: false },
      swarm:     wc.swarm     || { recent: 0, types: [], hasHelp: false, available: false },
      narrator:  wc.narrator  || { situation: null, available: false },
      organism:  wc.organism  || { health: 'unknown', violations: 0, available: false },
      conv:      wc.convergence || { score: 0, votes: [] },
      trend:     wc.trend     || 'stable',
      focus:     wc.focus     || 'NOMINAL',
    };
  }

  function _interactions() {
    try {
      const plate = window.S?.profile?.owner_plate;
      if (!plate) return [];
      const r = window.InteractionEngine?.getHistoryUnified?.(plate, { limit: 50 });
      return r?.interactions || [];
    } catch (_) { return []; }
  }

  // ── Calcul de l'harmonie ──────────────────────────────────────────────
  // L'harmonie mesure la COHÉRENCE entre modules — pas l'intensité du danger.
  // Des modules qui s'accordent tous sur "calme" = harmonie 10.
  // Des modules qui se contredisent = harmonie basse = situation ambiguë.

  function _harmony(w) {
    const votes       = w.conv.votes || [];
    const modulesOK   = [];  // modules disant "tout va bien"
    const modulesKO   = [];  // modules disant "danger"

    // Brain
    if (w.brain.available) {
      (w.brain.urgency < 4 ? modulesOK : modulesKO).push('brain');
    }
    // Guardian
    if (w.guardian.available) {
      (w.guardian.critical === 0 && w.guardian.high === 0 ? modulesOK : modulesKO).push('guardian');
    }
    // Swarm
    if (w.swarm.available) {
      (w.swarm.recent === 0 ? modulesOK : modulesKO).push('swarm');
    }
    // Organism
    if (w.organism.available) {
      (w.organism.violations === 0 ? modulesOK : modulesKO).push('organism');
    }

    const total = modulesOK.length + modulesKO.length;
    if (total === 0) return { score: 5, dominant: 'unknown', split: true };

    const dominantSafe = modulesOK.length > modulesKO.length;
    const split = modulesOK.length > 0 && modulesKO.length > 0;

    // Harmonie = accord entre modules. Un désaccord (split) réduit le score.
    // Tous d'accord (danger ou calme) = score élevé.
    const agreementRatio = Math.max(modulesOK.length, modulesKO.length) / total;
    const base = Math.round(agreementRatio * 10);
    const score = split ? Math.min(base, 6) : base; // désaccord → plafond 6

    return {
      score,
      dominant:     dominantSafe ? 'safe' : 'danger',
      split,
      modules_safe:   modulesOK,
      modules_alert:  modulesKO,
    };
  }

  // ── Angles morts — signaux manquants ou suspects ──────────────────────

  function _blindSpots(w, interactions) {
    const gaps = [];
    const S    = window.S || {};
    const now  = Date.now();

    // GPS périmé ou absent
    if (!S.myLat || !S.myLng) {
      gaps.push('position GPS inconnue — localisation impossible');
    } else if (S.myGpsAt && now - S.myGpsAt > 3 * 60_000) {
      gaps.push('GPS non actualisé depuis ' + Math.round((now - S.myGpsAt) / 60_000) + ' min');
    }

    // Swarm silencieux alors que conduite active (zone peut-être non couverte)
    if (!w.swarm.available || w.swarm.recent === 0) {
      if (w.brain.available && w.brain.urgency >= 4) {
        gaps.push('aucun signal collectif dans la zone — données swarm absentes ou zone non peuplée');
      }
    }

    // Aucune interaction depuis longtemps (silence inhabituel)
    if (interactions.length > 0) {
      const lastIat = new Date(interactions[0].timestamp).getTime();
      if (!isNaN(lastIat) && now - lastIat > 45 * 60_000) {
        gaps.push('aucune interaction depuis ' + Math.round((now - lastIat) / 60_000) + ' min (inhabituel si conduite active)');
      }
    }

    // Brain ne s'est pas encore initialisé
    if (!w.brain.available) {
      gaps.push('BrainEngine non initialisé — évaluation individuelle indisponible');
    }

    // Météo inconnue (affecte la prédiction d'incident)
    if (!S._weatherCache?.condition) {
      gaps.push('condition météo inconnue — prédictions dégradées');
    }

    return gaps;
  }

  // ── Trajectoire conducteur sur la session ─────────────────────────────

  function _trajectory() {
    if (_snapshots.length < 3) return 'indéterminée';
    const first3avg = _snapshots.slice(0, 3).reduce((s, x) => s + x.urgency, 0) / 3;
    const last3avg  = _snapshots.slice(-3).reduce((s, x) => s + x.urgency, 0) / 3;
    const delta = last3avg - first3avg;
    if (delta >= 2)  return 'dégradation progressive';
    if (delta <= -2) return 'amélioration progressive';
    if (last3avg >= 5) return 'maintien en tension';
    return 'stable';
  }

  // ── Génération de l'insight émergent ─────────────────────────────────
  // Ce qu'aucun module seul ne peut formuler.

  function _insight(w, harmony, blindSpots, trajectory, interactions) {
    const S        = window.S || {};
    const hour     = new Date().getHours();
    const isNight  = hour < 6 || hour >= 21;
    const plate    = S.profile?.owner_plate || 'ce conducteur';

    // Contradiction brain/swarm — le plus intéressant
    if (harmony.split && w.brain.urgency >= 5 && w.swarm.recent === 0) {
      return `Situation ambiguë : le contexte individuel indique une tension (urgence ${w.brain.urgency}/10) mais aucun conducteur proche ne confirme de danger collectif. Zone isolée ou signal précoce ?`;
    }

    // Convergence totale danger
    if (harmony.score >= 8 && harmony.dominant === 'danger') {
      return `Convergence totale de ${harmony.modules_alert?.length || 2} modules sur un danger confirmé. Situation inhabituelle — sois en alerte maximale.`;
    }

    // Trajectoire dégradée + nuit
    if (trajectory === 'dégradation progressive' && isNight) {
      return `La situation de ce conducteur se dégrade progressivement depuis le début de la session. Conduite nocturne avec urgence montante — surveille les prochains signaux.`;
    }

    // Aide collective imminente
    if (w.swarm.hasHelp) {
      return `Un conducteur proche a besoin d'aide. Le réseau collectif signale une présence en difficulté dans ta zone — ta réponse peut faire la différence.`;
    }

    // Angle mort critique
    if (blindSpots.length >= 2) {
      return `${blindSpots.length} informations manquent pour évaluer correctement la situation : ${blindSpots[0]}. L'incertitude elle-même est un signal.`;
    }

    // Silence suspect
    if (w.brain.urgency === 0 && w.swarm.recent === 0 && w.guardian.pending === 0 && harmony.score >= 8) {
      if (isNight && interactions.length === 0) {
        return `Silence complet de tous les modules en conduite nocturne. Calme réel ou absence de données ? Aucune interaction enregistrée cette session.`;
      }
      return `Tous les modules convergent vers une situation nominale. Conditions favorables.`;
    }

    // Trajectoire positive
    if (trajectory === 'amélioration progressive') {
      return `La tension baisse progressivement depuis le début de la session. Le système perçoit une amélioration continue de la situation.`;
    }

    // Défaut neutre
    return `Harmonie ${harmony.score}/10. ${w.brain.signals?.length ? 'Signaux actifs : ' + w.brain.signals.slice(0, 2).join(', ') + '.' : 'Situation nominale.'}`;
  }

  // ── Tick principal ────────────────────────────────────────────────────

  function _tick() {
    try {
      const w            = _world();
      const interactions = _interactions();
      const harmony      = _harmony(w);
      const blindSpots   = _blindSpots(w, interactions);
      const trajectory   = _trajectory();
      const insight      = _insight(w, harmony, blindSpots, trajectory, interactions);

      // Historique de session pour trajectoire
      _snapshots.push({ at: Date.now(), urgency: w.brain.urgency, harmony: harmony.score });
      if (_snapshots.length > HIST_MAX) _snapshots.shift();

      // Éveil = insight significatif (situation ambiguë ou dangereuse ou trajectoire dégradée)
      const awakening = harmony.split
        || harmony.score >= 8 && harmony.dominant === 'danger'
        || trajectory === 'dégradation progressive'
        || w.swarm.hasHelp
        || blindSpots.length >= 2;

      // Qualifier l'insight par la fiabilité des données (Kernel)
      const rel = window.S?._reliability;
      const finalInsight = (rel?.degraded && !rel.cold_start)
        ? `⚠️ Données partielles (${rel.score}% de fiabilité) — ${insight}`
        : insight;

      const soul = { insight: finalInsight, harmony, trajectory, blind_spots: blindSpots, awakening, at: Date.now() };

      if (window.S) window.S._soul = soul;

      if (awakening) {
        try {
          window.ImmatBus?.emit?.('SOUL_AWAKENING', {
            insight,
            harmony:      harmony.score,
            trajectory,
            blind_spots:  blindSpots,
            _src:         'ImmatSoul',
          });
        } catch (_) {}
      }
    } catch (e) {
      try { window.ImmatBus?.emit?.('INVARIANT_WARNING', { inv: 'SOUL-001', msg: e?.message, _src: 'ImmatSoul' }); } catch (_) {}
    }
  }

  // ── API publique ──────────────────────────────────────────────────────

  function start() {
    if (_running) return;
    _running = true;
    _tick();
    _timer = setInterval(_tick, TICK_MS);
  }

  function stop() {
    _running = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function getSoul()        { return window.S?._soul || null; }
  function getInsight()     { return window.S?._soul?.insight || null; }
  function getHarmony()     { return window.S?._soul?.harmony?.score ?? null; }
  function isAwakened()     { return !!(window.S?._soul?.awakening); }
  function _flushSnapshots(){ _snapshots = []; } // appelé par ImmatKernel sur résurrection

  return { start, stop, getSoul, getInsight, getHarmony, isAwakened, _flushSnapshots };

})();

if (typeof window !== 'undefined') window.ImmatSoul = ImmatSoul;
} // __ImmatSoulV1
