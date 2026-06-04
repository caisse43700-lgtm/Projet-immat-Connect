# Amélioration Navigation Fonctionnalités

# IMMATCONNECT — DÉCISIONS FINALES CONSOLIDÉES

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## OBJECTIF

Ce document contient les réponses déjà trouvées.

Il ne doit pas relancer les débats.

---

## SOURCE DE VÉRITÉ

Source unique :

```
ADN
↓
Constitution
↓
NS
↓
Référentiel
```

**Décision :** Ne jamais créer ADN_v2 · NS_v2 · Référentiel_v2 · Gouvernance_v2 · Ange_v2

Motif : Toute duplication crée une divergence future.

---

## ANGE

**Décision :**

- Ange ne possède rien.
- Ange relie tout.
- Ange ne stocke pas.
- Ange ne devient jamais une source de vérité.
- Ange ne possède pas sa propre logique métier.
- Ange ne possède pas son propre référentiel.

Motif : Éviter deux vérités.

---

## CONSCIENCE

**Décision :** La conscience existe déjà. Elle correspond à :

```
État → Contexte → Intention → Impact → Mémoire
```

**Décision :** Ne pas créer d'IA autonome. Ange comprend. Il n'agit jamais seul.

---

## CINQ SENS

**Décision :** Les cinq sens existent déjà.

| Sens | Rôle |
|---|---|
| Voir | Observation |
| Entendre | Événements |
| Goûter | Validation |
| Toucher | Impact |
| Sentir | Contexte |

**Décision :** Formaliser. Ne pas reconstruire.

---

## CONDUCTEUR

**Décision :** Le conducteur part toujours d'une intention. Jamais d'une fonctionnalité.

**Intentions validées :**

1. Prévenir quelqu'un
2. Être prévenu
3. Signaler un danger
4. Confirmer un danger
5. Dire que c'est terminé
6. Demander de l'aide
7. Aider quelqu'un
8. Être guidé
9. Comprendre l'environnement
10. Retrouver une information
11. Gérer son compte
12. Se sentir en sécurité

---

## ORIENTATION MENTALE

**Décision :**

| Onglet | Rôle |
|---|---|
| Carte | Maintenant |
| Activité | Passé |
| Messages | Communication |

Ne jamais mélanger ces rôles.

---

## RÉFÉRENTIEL

**Décision :** Le référentiel officiel est `knowledge/` :

- `intentions.json`
- `features.json`
- `interactions.json`
- `screens.json`
- `organs.json`
- `decisions.json`
- `commits.json`
- `tutorials.json`
- `knowledge-index.json`

Aucun référentiel parallèle.

---

## ANGE CONDUCTEUR

**Décision :** Point d'entrée : *Comment puis-je vous aider ?*

Réponses prioritaires :

1. Prévenir un conducteur
2. Signaler un danger
3. Demander de l'aide
4. Proposer mon aide
5. Me guider
6. Voir les conducteurs proches
7. Voir mes conversations
8. Voir les alertes
9. Paramètres
10. Découvrir ImmatConnect

---

## ANGE GARDIEN

**Décision :** Analyse en 8 étapes :

```
Intention → Organe → Impact → Analyse → Options → Validation → Patch → Commit
```

---

## RÈGLES ORGANIQUES

Décisions validées :

| Règle | Principe |
|---|---|
| INTENT_FIRST | Toujours partir de l'intention conducteur |
| NO_EMPTY_SCREEN | Aucun écran vide sans état clair |
| CALM_STATE | État calme par défaut — alarme uniquement si nécessaire |
| LOOP_CLOSURE | Toute boucle doit pouvoir se fermer |
| TRANSPARENCY | Le conducteur comprend ce qui se passe |
| REVERSIBILITY | Toute action peut être annulée ou corrigée |
| ANGE_ASSISTS | Ange assiste, il ne décide pas |
| NO_ORPHAN_FEATURE | Pas de feature sans intention rattachée |
| NO_ORPHAN_INTENTION | Pas d'intention sans chemin dans l'app |
| SOCIAL_VISIBILITY | Ce qui est visible aux autres doit être consenti |

---

## BOUCLES VITALES

**Décision :** Toute évolution doit renforcer une boucle existante.

| Boucle | Rôle |
|---|---|
| ORIENTATION | Le conducteur sait où il est et ce qui l'entoure |
| CONTRIBUTION | Le conducteur aide les autres |
| AIDE | Le conducteur reçoit de l'aide |
| COMMUNAUTÉ | Les conducteurs forment un réseau |
| CONFIANCE | Les échanges bâtissent la confiance |
| APPRENTISSAGE | Le conducteur découvre l'app naturellement |
| RÉTENTION | Le conducteur revient parce que l'app lui a été utile |

Découverte : Un organisme vit grâce à ses boucles. Pas grâce à ses organes.

---

## SESSION 21

**Décision :** Suppression code mort.

Retiré : `App._actMsgCard` · `App._actAlertCard` · `topMsgBadge`

Conservé : `actBadge` · `_actModCard`

---

## SESSION 23

**Décision :** Ajout FAB 📍 Signaler ici. Ajout `tapLat` / `tapLng`. Aucune modification DB.

---

## SESSION 23B

**Décision :** Architecture FAB validée.

Ajout : `clearSignalHereContext()` · Timer unique · Nettoyage centralisé · Gestion abandon · Gestion fermeture

---

## SESSION 28 — DA-004

**Décision :** Option C retenue. Blocage = Carte filtrée + Messages filtrés. Pas de migration DB.

---

## SESSION 29 — DEC-007

**Décision :** Ne pas unifier les statuts. `seen ≠ present` · `gone ≠ resolved`. Conserver le modèle actuel.

---

## DETTE PRINCIPALE IDENTIFIÉE

**Décision :** Le principal risque futur n'est plus technique.

Le principal risque futur est la **dette de compréhension**.

Définition : Ajouter plus vite que le conducteur ne comprend.

---

## DÉCOUVERTE FINALE

Ce qui circule dans l'organisme : **l'attention**.

Pas les données. Pas les messages. Pas les événements.

Conséquence : Toute fonctionnalité doit être naturellement découvrable.

---

## CONCLUSION

- Ange ne possède rien. Ange relie tout.
- L'organisme reste l'unique source de vérité.
- Le conducteur part d'une intention. Jamais d'une fonctionnalité.
- Les règles organiques assurent la cohérence.
- Les boucles vitales assurent la vie.
- Le principal risque futur est la dette de compréhension.
- La prochaine évolution doit être plus évidente. Pas plus complexe.
