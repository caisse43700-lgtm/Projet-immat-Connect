# ImmatConnect Pro — Point d'entrée IA

Ce fichier existe sur `main` pour éviter qu'une nouvelle session IA arrive sans contexte.

## Branche de reprise active

```text
Repository     : caisse43700-lgtm/Projet-immat-Connect
Branche active : claude/immatconnect-pro-app-dEKGR
Fichier clé    : AGENTS.md sur cette branche
État détaillé  : SESSION-CONTINUATION.md sur cette branche
```

## Instruction obligatoire

Avant toute analyse ou modification :

```bash
git checkout claude/immatconnect-pro-app-dEKGR
```

Puis lire sur cette branche :

1. `AGENTS.md` — résumé autonome de reprise.
2. `SESSION-CONTINUATION.md` — journal détaillé et historique complet.

## Résumé minimal

Projet : ImmatConnect Pro, PWA/mobile de demandes de contact entre conducteurs via plaques.

Dernier contexte connu : tests terrain iOS Safari réels avec plaques `BZ-652-LL` et `BE-521-MM`.

Dernière action ouverte :

1. Exécuter dans Supabase SQL Editor la migration anti-spam `call_request_on_insert()` qui fait simplement `return new`.
2. Re-tester le flux complet d'appel/contact.
3. Vérifier la sonnerie iOS via Web Audio API.

Ne pas repartir de `main` pour travailler sur le sujet en cours : la continuité vivante est sur `claude/immatconnect-pro-app-dEKGR`.
