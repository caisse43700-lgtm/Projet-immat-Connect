# ImmatConnect Pro — Point d'entrée IA (ChatGPT / Codex / OpenAI)

## Informations de navigation

```
Repository     : caisse43700-lgtm/Projet-immat-Connect
URL GitHub     : https://github.com/caisse43700-lgtm/Projet-immat-Connect
Branche active : claude/immatconnect-pro-app-dEKGR
Source vérité  : SESSION-CONTINUATION.md (lire en premier)
```

## Protocole obligatoire

```
1. git checkout claude/immatconnect-pro-app-dEKGR
2. Lire SESSION-CONTINUATION.md intégralement
3. Avant de quitter : mettre à jour SESSION-CONTINUATION.md + commiter
```

---

## Résumé du travail en cours — branche `claude/immatconnect-pro-app-dEKGR`

### Fonctionnalités ajoutées

| Fonctionnalité | Fichiers | État |
|---|---|---|
| Navigation Contact (onglets Appels / Messages) | `index.html`, `calls.css` | ✅ Déployé |
| Overlay appel plein écran iOS-style + mini-barre | `core/call-screen.js`, `index.html`, `calls.css` | ✅ Déployé |
| Sonnerie synthétisée Web Audio API (sans fichier audio) | `core/audio-manager.js` | ✅ Déployé |
| Journal d'appels dans l'onglet Appels | `index.html` | ✅ Déployé |
| Service Worker v13 (cache v13 + ?v= bumps) | `service-worker.js`, `index.html` | ✅ Déployé |
| Tests Playwright 25 tests e2e | `e2e/call-screen.spec.js` | ✅ 25/25 pass |
| Autotests OBD audioAutotest + contactNavAutotest + callFlowBehaviorAutotest | `core/mobile-autotest.js` | ✅ Déployé |
| Tracker secondaire _recentOutgoingIds (race condition _pendingCallId) | `calls.js` | ✅ Déployé |
| AGENTS.md (ce fichier) | `AGENTS.md` | ✅ Déployé |

---

### Bugs trouvés et corrigés lors des tests terrain (BZ-652-LL ↔ BE-521-MM)

| # | Symptôme | Cause | Fichier corrigé | Commit |
|---|---|---|---|---|
| T1 | "Trop de demandes, réessaie dans quelques minutes" | Trigger DB anti-spam 3/10min + localStorage messages | `messages.js` + SQL migration | `d6ec808` |
| T2 | Caller voit l'overlay disparaître brutalement quand receiver accepte | Handler Realtime UPDATE ne lançait pas `CALL_ACCEPTED` sur ImmatBus | `calls.js` | `9a239ed` |
| T3 | Messages s'ouvrent automatiquement dès l'acceptation (deux côtés) | `actOpenConv()` appelé direct dans `acceptCall()` + `showAccepted()` | `calls.js`, `call-screen.js` | `b64f204` |
| T4 | Bip sortant silencieux sur iOS | Condition `!== 'suspended'` inversée dans `playOutgoingTone()` | `core/audio-manager.js` | `17385f2` |
| T5 | Sonnerie continue en boucle après annulation | Race condition : interval créé dans `.then()` après `stopCallAudio()` | `core/audio-manager.js` | `17385f2` |
| T6 | `_hangupFromMini()` ne déclenchait pas `_hangupIncall()` | Mode `'incall'` jamais assigné (dead code) | `core/call-screen.js` | `17385f2` |
| T7 | `audioBlocked: true` même quand Web Audio fonctionnait | Check `incomingRingtoneReady` (fichier audio) au lieu de `synthAvailable` | `core/mobile-autotest.js` | `0b91115` |

---

### Action DB requise (non encore exécutée)

Exécuter dans **Supabase → SQL Editor** pour désactiver le trigger anti-spam :

```sql
create or replace function public.call_request_on_insert()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;
```

---

### État actuel des tests

```
node tests.js     → 177/177 ✅
playwright test   → 25/25  ✅
```

---

### Race condition _pendingCallId (documentée + mitigée)

Le timer 31s dans `_showSentBanner()` vide `_pendingCallId`. Si l'UPDATE Realtime arrive après 31s, l'ancienne vérification `r.id !== _pendingCallId` retournait true (null !== id) → CALL_ACCEPTED jamais émis → overlay reste en 'outgoing'.

**Mitigation appliquée :** `_recentOutgoingIds` (Set, TTL 90s) — le handler vérifie les deux :
```js
if (!r || (r.id !== _pendingCallId && !_recentOutgoingIds.has(r.id))) return;
```

### Autotest OBD comportemental

```js
// Dans la console du navigateur :
ImmatMobileAutotest.run().callFlowBehaviorAutotest
// → { pass: true } si T2/T3 résolus
```

### Prochaine action

1. **Recharger la page** (cache v13 force le rechargement des nouveaux JS)
2. **Exécuter le SQL** dans Supabase → SQL Editor (migration_disable_call_limits.sql)
3. **Autotest OBD** : `ImmatMobileAutotest.run().callFlowBehaviorAutotest.pass` → true
4. **Re-tester le flux** : BZ-652-LL appelle BE-521-MM → acceptation → overlay "Contact accepté" avec boutons Message / Fermer reste visible
5. Vérifier sonnerie iOS : `AudioManager.getRuntimeState()` → `webAudioContextState: "running"`
6. Si tout passe → PR `claude/immatconnect-pro-app-dEKGR` → `main`
