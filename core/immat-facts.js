/* core/immat-facts.js — PROTOTYPE (théorie « tout est un fait autorisé »)
 *
 * But : PROUVER que, depuis UNE déclaration par fait, on GÉNÈRE (sans code par-feature) :
 *   - les mots vocaux (ce qu'Ange écoute / propose)
 *   - le besoin de confirmation (dérivé de shared/reversible)
 *   - le mot-action de confirmation (dérivé du résidu)
 *   - l'autorisation (règle = feature flag + rôle) — la règle est elle-même un fait
 *   - la ligne de Dashboard (projection)
 *   - l'explication
 * L'EFFET (la mutation) reste porté par les fonctions PROPRIÉTAIRES existantes (App/CallManager).
 *
 * Statut : isolé, non branché à l'UI live (réversible). Testé par tests/facts-proto.test.js.
 * Résidu humain : 'choix' (parmi options) | 'consent' (un mot) | 'contenu' (dictée libre).
 */
'use strict';
(function (root) {

  // ── LE CATALOGUE : 3 faits déclarés (rien d'autre que de la donnée) ──────────
  var FACTS = {
    SIGNAL_VEHICULE: {
      id: 'SIGNAL_VEHICULE',
      label: 'Signaler un véhicule',
      authority: 'driver',                 // qui peut ajouter ce fait
      feature: 'signalement_vehicule',     // règle (kill-switch) — elle-même un fait
      shared: true,                        // affecte autrui → consentement requis
      reversible: false,
      residual: 'choix',                   // ce que l'humain doit fournir
      // SOURCE UNIQUE des problèmes véhicule — consommée par le rail vocal, les boutons,
      // le parseur de dictée libre et le menu. `offer:false` = reconnu à la voix mais non proposé en bouton.
      // key=clé menu · label=libellé complet (envoyé) · short=libellé bouton menu · say=mot dit par Ange · words=mots écoutés
      problems: [
        { key: 'pneu',   label: 'Pneu dégonflé',            short: 'Pneu dégonflé',       say: 'pneu',   words: ['pneu', 'roue', 'dégonfl', 'degonfl'] },
        { key: 'porte',  label: 'Porte ou coffre ouvert',   short: 'Porte/coffre ouvert', say: 'porte',  words: ['porte', 'coffre', 'hayon'] },
        { key: 'feux',   label: 'Feux / phares',            short: 'Feux/phares',         say: 'feux',   words: ['feu', 'phare', 'clignot', 'lumi', 'veilleu'] },
        { key: 'trappe', label: 'Trappe carburant ouverte', short: 'Trappe carburant',    say: 'trappe', words: ['trappe', 'carburant', 'essence', 'réservoir', 'reservoir', 'gasoil', 'gazole'] },
        { key: 'fumee',  label: 'Fumée / départ de feu',    short: 'Fumée/feu',           say: 'fumée',  words: ['fum', 'incendie', 'brûl', 'brul', 'flamme'] },
        { key: 'objet',  label: 'Objet sur le toit',        short: 'Objet sur le toit',   say: 'objet',  words: ['objet', 'toit', 'galerie', 'charge'] },
        { key: 'fuite',  label: 'Fuite sous le véhicule',   short: 'Fuite',               say: 'fuite',  words: ['fuite', 'huile', 'liquide'], offer: false }
      ],
      voice: [/\bsignal|pr[ée]viens|alerte\b/, /\bpneu|porte|feux|trappe|fum|objet\b/],
      explain: "Prévenir un conducteur d'un problème sur son véhicule.",
      project: { panel: 'Activité' },
      effect: function (p) { try { return root.App && root.App.vehicleAlert && root.App.vehicleAlert(p.label || p.choix); } catch (e) { return false; } }
    },
    APPEL: {
      id: 'APPEL',
      label: 'Appeler un véhicule',
      authority: 'driver',
      feature: 'appels',
      shared: true,
      reversible: false,
      residual: 'consent',
      options: [],
      voice: [/\b(appelle|appeler|rappelle|rappeler|t[ée]l[ée]phone|t[ée]l[ée]phoner)\b/],
      confirmWord: 'appelle',
      explain: "Établir un appel audio avec un conducteur.",
      project: { panel: 'Appels' },
      effect: function (p) { try { return root.CallManager && root.CallManager.contactByCall && root.CallManager.contactByCall(p.plate, ''); } catch (e) { return false; } }
    },
    FEATURE_TOGGLE: {
      id: 'FEATURE_TOGGLE',
      label: 'Activer / désactiver une fonction',
      authority: 'gardien',                // rôle serveur requis
      feature: null,
      shared: true,
      reversible: true,
      residual: 'consent',
      options: [],
      voice: [/\bactiv|d[ée]sactiv|coupe|r[ée]tabli\b/],
      confirmWord: 'confirme',
      explain: "Modifier la disponibilité d'une fonction pour la flotte.",
      project: { panel: 'Dashboard' },
      effect: function (p) { try { return root.App && root.App.setFeatureFlag && root.App.setFeatureFlag(p.key, p.value); } catch (e) { return false; } }
    }
  };

  // ── LE MOTEUR GÉNÉRIQUE : écrit UNE fois, marche pour TOUS les faits ─────────
  var FactCatalog = {
    FACTS: FACTS,
    list: function () { return Object.keys(FACTS).map(function (k) { return FACTS[k]; }); },
    get: function (id) { return FACTS[id] || null; },

    // GÉNÉRÉ — confirmation requise ? (dérivée, aucune décision par-feature)
    needsConfirm: function (f) { return !!(f && (f.shared || f.reversible === false)); },

    // GÉNÉRÉ — mot-action de confirmation (dérivé du résidu)
    confirmWord: function (f) {
      if (!f) return 'oui';
      if (f.confirmWord) return f.confirmWord;
      return ({ consent: 'confirme', choix: 'envoie', contenu: 'envoie' })[f.residual] || 'oui';
    },

    // GÉNÉRÉ — ce qu'Ange DIT/écoute pour le résidu (auto-narration)
    // Un fait porte soit `problems` (options riches), soit `options` (mots simples) : même dérivation.
    voiceHints: function (f) {
      if (f && f.problems) return this.offered(f).map(function (p) { return p.say; }).slice(0, 3);
      return (f && f.options ? f.options.slice(0, 3) : []);
    },

    // GÉNÉRÉ — options réellement proposées (bouton/rail) ; `offer:false` = reconnu mais non offert
    offered: function (f) { return ((f && f.problems) || []).filter(function (p) { return p.offer !== false; }); },

    // GÉNÉRÉ — retrouve l'option correspondant à la parole (vocabulaire fermé, premier match)
    matchOption: function (f, text) {
      var t = String(text || '').toLowerCase();
      var list = (f && f.problems) || [];
      for (var i = 0; i < list.length; i++) {
        if ((list[i].words || []).some(function (w) { return t.indexOf(w) >= 0; })) return list[i];
      }
      return null;
    },

    // GÉNÉRÉ — explication (Nexus)
    explain: function (f) { return (f && f.explain) || ''; },

    // GÉNÉRÉ — autorisation : la RÈGLE (feature flag + rôle) est un fait consulté
    authorized: function (f, env) {
      env = env || {};
      var fe = env.isFeatureEnabled || function () { return true; };
      if (f.feature && !fe(f.feature)) return { ok: false, reason: 'feature_off' };
      if (f.authority === 'gardien' && !env.isGardien) return { ok: false, reason: 'role' };
      return { ok: true };
    },

    // GÉNÉRÉ — projection Dashboard (une ligne par fait)
    dashboardRow: function (f) {
      return { id: f.id, label: f.label, authority: f.authority, reversible: !!f.reversible, panel: (f.project && f.project.panel) || '—' };
    },

    // GÉNÉRÉ — proposer un fait depuis la parole (vocabulaire fermé)
    propose: function (text) {
      var t = String(text || '').toLowerCase();
      var facts = this.list();
      for (var i = 0; i < facts.length; i++) {
        var f = facts[i];
        var hit = (f.voice || []).some(function (re) { return re.test(t); });
        if (hit) {
          var mp = this.matchOption(f, t);
          var choix = mp ? mp.say : ((f.options || []).find(function (o) { return t.indexOf(o) >= 0; }) || null);
          return { fact: f, residual: f.residual, choix: choix, needsConfirm: this.needsConfirm(f), confirmWord: this.confirmWord(f) };
        }
      }
      return null;
    },

    // L'EFFET reste la fonction propriétaire (l'app garde la mutation)
    run: function (f, payload) { try { return f.effect ? f.effect(payload || {}) : false; } catch (e) { return false; } }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { FactCatalog: FactCatalog, FACTS: FACTS };
  if (typeof window !== 'undefined') window.FactCatalog = FactCatalog;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
