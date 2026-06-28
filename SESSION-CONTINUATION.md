# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour tout assistant IA.
Lire ce fichier en entier avant toute action.

---

## SESSION 2026-06-28 — Nav : un seul vert + toggle 1 tap ouvre / 1 tap referme

### Bug deux boutons verts
ui.js `setPanel(name)` (gestionnaire concurrent, appelé par App.panel patché l.269) ne gérait que
`['navMap','navSignaler','navActivite']` et mappait `messages:'navActivite'` → navMessages/navAppels
gardaient un état `.on` (vert) collé → deux verts. Fix : `setPanel` nettoie TOUS les boutons
(`navMap,navSignaler,navMessages,navActivite,navAppels`) et map corrigé (`messages:'navMessages'`).
`closeSheet()` (index.html) retire `.on` de tous les `.nav-btn` + `appels-mode` → le vert disparaît
à la fermeture. navAppels réaffirme `navAppels.on` après `panel('messages')` (sinon setPanel met
navMessages en vert car Appels réutilise le panel messages).

### Toggle 1 tap ouvre / 1 tap referme
PIÈGE : ui.js double les clics nav — `bindVisibleButtons` (capture+stopPropagation sur
navSignaler/navActivite/navMap) + `installNavButtonHotfix` (listener document pour navMessages/
navAppels/navAnge) + `onclick` inline. Un toggle naïf dans navX → ouvre+ferme sur un seul tap.
Solution : point d'entrée UNIQUE `App._navToggle(key)` avec ANTI-REBOND (280ms) : ignore les appels
dupliqués d'un même tap, ne décide qu'une fois (btn.on && sheet non mini → closeSheet, sinon
navX open). Tous les chemins routés vers _navToggle : onclick inline (`App._navToggle('signaler')`
etc.), ui.js bindVisibleButtons (navSignaler/navActivite → _navToggle), hotfix (navMessages/
navAppels → _navToggle). Les open impls (App.navSignaler/navMessages/navAppels/navActivite) restent
inchangées et sont appelées par _navToggle.

### Versions
ui.js v10→v11, SW v299→v300. Commit cda2927, poussé sur main. À vérifier terrain (zone délicate).

### Correctif toggle (suite) — re-clic ne fermait que Signaler
Bug : la détection « vue ouverte » dans `_navToggle` se basait sur `btn.classList.contains('on')`
(état vert), désynchronisé par setPanel/MutationObserver/etc. → seul Signaler fermait. Fix :
détection d'après le PANNEAU réellement affiché (`#panelAltet`→signaler, `#panelActivite`→activite,
`#panelMessages`+`appels-mode`→appels/messages) avec sheet non mini. Anti-rebond 280→320ms.
Ange : ajout `App._angeToggle()` (1 tap ouvre / 1 tap referme via AngeDialog.open/close), routé
depuis l'onclick inline navAnge et le hotfix ui.js. ui.js v11→v12, SW v301→v302. Commit 8cd3052.
+ Compactage paysage du contenu profond Réglages (.settings-section/row, calls.css/messages.css)
  app.css v56. Commit 5515533.

### Correctif toggle (3e itération) — seul Signaler fermait
Cause racine : anti-rebond par TIMER (320ms). Sur le tap de fermeture, 2 handlers tirent ; le 1er
ferme (closeSheet + S.map.invalidateSize() potentiellement lent) ; si >320ms, le 2e (hotfix
document ui.js) n'est plus débouncé, voit la sheet déjà fermée → ROUVRE. Signaler échappait car
bindVisibleButtons fait stopPropagation (le hotfix ne tire pas pour lui). Fix robuste : tous les
handlers (onclick inline, capture bindVisibleButtons, hotfix document) reçoivent LE MÊME objet
event → marquage `ev.__navHandled` → une seule décision par tap quel que soit le timing. `event`
passé partout (inline `App._navToggle('x',event)`, ui.js fns reçoivent et propagent `e`).
ui.js v12→v13, SW v302→v303. Commit b2d39c7.

### Correctif toggle (4e — la bonne) — détection par variable d'état contrôlée
Le marquage d'event (b2d39c7) n'a pas suffi : le re-clic ne fermait toujours que Signaler. Cause
réelle = la DÉTECTION de la vue ouverte (basée sur l'état .on des panneaux) était désynchronisée
→ `cur != key` pour Messages/Appels/Activité → _navToggle ré-ouvrait au lieu de fermer (rien ne
bouge à l'écran). Fix : variable d'état `App._navView` que NOUS contrôlons, posée au début de
chaque navX (navSignaler='signaler', navMessages='messages', navAppels='appels', navActivite=
'activite'), effacée par closeSheet. `_navToggle`: `cur = sheet non mini ? App._navView : null`.
Indépendant des .on. Commit 9908aa7. SW v303→v304 (marqueur).

### Réglages paysage coupé à gauche
Le plein écran Réglages mettait `left:0` → le contenu passait SOUS le rail de nav gauche (texte
tronqué : 'Vos demandes'→'s demandes', 'Communication'→'ON'). Fix : `#sheet:has(#panelSettings.on)`
`left: calc(58px + env(safe-area-inset-left,0px))` en paysage (commence après le rail). app.css
v56→v57, SW v304→v305. Commit fc28306.

### Réglages paysage : plein écran jusqu'en bas + en-tête coupé
La carte réapparaissait sous Réglages car `.sheet.full { height: min(78dvh,...) }` (spécificité
0,2,0) plafonnait la hauteur. Fix : `#sheet:has(#panelSettings.on)` (spécificité id) →
`top:0; bottom:0; height:auto; max-height:none` → plein écran. + padding-top porté à
`max(safe-top+12, 18px)` (en-tête « Options » non coupé) + `.handle` masqué en plein écran Réglages
(la barre parasite du haut = le grabber). app.css v57→v58, SW v305→v306. Commit e5b52c8.

### Ange ne se fermait pas au re-clic + Activité sautait
- Ange : le fond `#angeOverlay` (onclick `AngeDialog.close()`) fermait, puis le hotfix document
  `installNavButtonHotfix` (clic non marqué via ev.__navHandled) rappelait `_angeToggle` qui voyait
  Ange fermé → le ROUVRAIT. Fix : `#angeOverlay onclick="App._angeToggle(event)"` → marque l'event
  → le hotfix bail. (navAnge est sous l'overlay quand Ange ouvert, d'où la course.)
- Activité « saute » : `navActivite` appelait `scrollIntoView({block:'start'})` (rAF + 250ms) pour
  contrer la restauration de scroll iOS, mais ça scrolle le conteneur de façon visible. Retirés ;
  les `scrollTop=0` (rAF/80/250/320ms) conservés.
SW v306→v307 (marqueur ; fixes dans index.html servi réseau-frais). Commit 68c671f.

### "C'est gros" persistait — CAUSE RACINE CSS (spécificité/ordre source)
Toutes les règles de compactage paysage (`.act-cat-hd*`, `.act-search-bar`, `.act-cat-card` +
enfants, `.act-cat-tab`, `.sig-*`, `.settings-*`) étaient ÉCRASÉES : les définitions de base de ces
classes sont situées PLUS BAS dans app.css (lignes ~1196/1234/1255) ou dans calls.css/messages.css
(chargés après app.css) → à spécificité égale (0,1,0), la dernière déclaration gagne. Donc le
media-query landscape (placé avant ces défs) ne s'appliquait pas. LEÇON : les overrides responsive
de classes redéfinies ailleurs doivent avoir une spécificité supérieure. Fix : préfixe `#sheet `
(1,1,0) sur toutes ces règles → elles passent devant quel que soit l'ordre. Cartes catégories +
emoji encore réduits (icon 18px, padding 7px). app.css v58→v59, SW v307→v308. Commit 8009029.

### Panneau Messages : filtres radio + compactage
- Filtres pills (Tous/Non lus/Favoris) : `clearFilters` n'existait PAS (HTML appelait
  `ImmatMessages.clearFilters?.()`) donc « Tous » ne faisait rien et gardait `.on` du HTML ;
  toggleUnreadOnly/toggleFavOnly ajoutaient `.active` indépendamment → les 3 pouvaient être
  actifs. Fix : `_syncMsgPills()` (radio, un seul .on/.active selon State), `clearFilters()`
  (ajouté + exporté), exclusivité mutuelle dans les toggles (l'un désactive l'autre),
  normalisation `if(unreadOnly&&favOnly)favOnly=false` dans render. messages.js v38→v39.
- Compactage paysage Messages : `#sheet .ic-search-bar/.ic-msg-tabs-row/.ic-msg-pill` (les
  classes Messages n'étaient pas couvertes par le compactage act-*). app.css v59→v60.
SW v308→v309. Commit 0351a8a.

### Réouverture toujours sur la page 1
Demande : à la réouverture d'une fonctionnalité, repartir de la première page (pas la sous-vue où
on a fermé). État : Signaler déjà OK (closeSheet→navSignaler→sigBack→_sigReset→étape 1), Activité
déjà OK (navActivite→actMain + panel() retire les body classes act-*). Manquant = Messages :
`navMessages` ne fermait pas le thread ouvert → on retombait sur la conversation. Fix : ajout
`window.ImmatMessages?.closeThread?.()` au début de navMessages → rouvre sur la liste. SW v309→v310.
Commit fe11cb3 (fix dans index.html servi réseau-frais).

### Ange fermeture robuste (suite — persistait en v310)
`#angeFab` (bouton flottant ✦) était `AngeDialog.open()` + hotfix `openAngePanel` → toujours ouvrir,
jamais fermer si c'est ce bouton qui est tapé. Fix : `#angeFab onclick="App._angeToggle(event)"` +
`installCriticalButtonHotfix` #angeFab → `_angeToggle` + `_angeToggle` détecte l'ouverture via
`document.body.classList.contains('ange-open')` (fiable) au lieu de getComputedStyle. ui.js v13→v14,
SW v310→v311. Commit 2232642.

### Messages "au milieu" — CAUSE RACINE (rien à voir avec le thread)
`.ic-mail-list` (#icMsgList) est `display:grid`. Quand le conteneur (flex:1, grandi) est plus haut
que le contenu (peu de conversations), `align-content` vaut `stretch` par défaut → les lignes
auto de la grille s'étirent et leur contenu se centre verticalement → "AUJOURD'HUI" et la carte
flottent au milieu de leur ligne. Fix : `align-content:start` sur `.ic-mail-list` → lignes packées
en haut. messages.css v6→v7, SW v311→v312. Commit 5514a7c.

### Ange fermeture infaillible (le cercle ne fermait toujours pas en v312)
Un handler non couvert par le marquage d'event rouvrait Ange juste après la fermeture. Au lieu de
le traquer : (1) fermeture FORCÉE dans `_angeToggle` (close + `#angePanel`/`#angeOverlay`
display:none + retrait `body.ange-open`) ; (2) verrou `App.__angeJustClosed` → `AngeDialog.open()`
ignore toute réouverture <450ms après une fermeture. Robuste quel que soit le handler fautif.
SW v312→v313 (fix dans index.html réseau-frais). Commit 781b386.

### Ange — solution finale : HANDLER UNIQUE (v313 verrou cassait l'ouverture)
Le verrou v313 (`__angeJustClosed` 450ms) empêchait l'ouverture. Cause de fond des deux bugs
(ne ferme pas / ne s'ouvre plus) = double/triple déclenchement par tap : onclick inline +
`installNavButtonHotfix` (navAnge bbox) + `installCriticalButtonHotfix` (#angeFab) → courses
ouvrir/fermer. SOLUTION : un seul handler par bouton = l'onclick inline `App._angeToggle`.
- `_angeToggle` = toggle pur : `body.ange-open` ? close : open (fallback display). Pas de verrou.
- `AngeDialog.open` : verrou retiré.
- ui.js : `navAnge` retiré de installNavButtonHotfix ; `#angeFab` retiré de installCriticalButtonHotfix
  (sélecteur réduit à `.sig-cat-btn`). `openAngePanel` devient inutilisé (laissé en place, inoffensif).
ui.js v14→v15, SW v313→v314. Commit bd31810.

### Ange "ne ferme qu'avec la croix" — VRAIE cause enfin
Le panneau `#angePanel` (z-index 3002) recouvre le HAUT du cercle du bouton nav Ange quand il est
ouvert → taper la partie visible du cercle atterrit sur le panneau, pas sur le bouton → l'onclick
inline ne se déclenche jamais (seule la croix, dans le panneau, ferme). Fix définitif : retrait de
TOUS les onclick inline Ange (navAnge, #angeFab, #angeOverlay) + UN SEUL listener document
(`window.__angeClickBound`) qui détecte le tap sur navAnge par sa bounding-box (fonctionne même
recouvert), + #angeFab via closest, + #angeOverlay (fond) par target.id → un seul `_angeToggle`
par tap, zéro course. SW v315→v316 (intermédiaire v315 = détection isOpen renforcée). Commit 57a24ad.

### Ange — LE coupable final (trouvé par diagnostic toast)
Toast diag (v317) au tap : affichait "FERME (était ouvert)" → mon handler fermait BIEN, mais Ange
restait ouvert → un autre handler ROUVRAIT. Coupable = un 4e système de nav de secours (IIFE en
bas d'index.html, ligne ~5179, listener `click` en CAPTURE) avec hits `['navAnge',_openAngeInline]`
où `_openAngeInline` ouvre TOUJOURS Ange. Fix : retrait de l'entrée navAnge de ce handler → seul
`App._angeToggle` (via le listener bbox v316) gère Ange. Diag toast retiré. SW v317(diag)→v318.
Commit fd9272f. LEÇON : l'app a ~4 systèmes de gestion des clics nav (onclick inline, ui.js
bindVisibleButtons, ui.js installNavButtonHotfix, IIFE de secours index.html) — toute modif d'un
bouton nav doit les vérifier TOUS.

### Ange — consolidation FINALE (v318 = ne s'ouvrait plus → v319)
Après retrait de navAnge du handler de secours (v318), mon handler v316 et le reste se marchaient
encore dessus → Ange ne s'ouvrait plus. Décision : UN SEUL gestionnaire pour Ange = le listener
de secours IIFE (bas index.html, `addEventListener('click',...,true)` capture, fiable même si le
panneau recouvre le bouton). Il appelle `App._angeToggle` pour : navAnge (via bbox dans son loop
hits), #angeFab (closest), #angeOverlay (target.id, ferme). Mon handler v316
(`window.__angeClickBound`) SUPPRIMÉ. Tous les onclick inline Ange déjà retirés. ui.js hotfixes ne
touchent plus Ange. → un seul chemin, toggle net. SW v318→v319. Commit 529cea3.

### Ange — CAUSE RACINE RÉELLE (enfin, prouvée par diagnostic)
Diag toast v321 au tap : `ao=false tg=function pd=none od=none` → Ange fermé, `App._angeToggle`
existe, mais l'appel n'ouvre rien. CAUSE : `AngeDialog` est déclaré `const AngeDialog={...}` (ligne
4622) → un const/let top-level de `<script>` n'est PAS une propriété de `window`. Or `_angeToggle`
appelle `window.AngeDialog?.open?.()` / `?.close?.()` → `window.AngeDialog` === undefined → no-op.
La croix fonctionnait car son onclick est `AngeDialog.close()` (nom nu, résolu dans le scope du
script). Tant qu'existait le fallback `_openAngeInline` (open DOM manuel), Ange s'ouvrait quand même
mais ne se fermait jamais ; après son retrait (v319), plus rien n'ouvrait. FIX : `window.AngeDialog
= AngeDialog;` juste après la définition (ligne 4805). SW v319→v322 (v320/v321 = diagnostics).
Commit 11fd87a. LEÇON : tout code cross-script qui fait `window.X` exige que X soit explicitement
exposé sur window (les const/let ne le sont pas).

---

## SESSION 2026-06-28 — Paysage : en-tête Réglages coupé + FAB par-dessus fenêtre Nearby

### En-tête Réglages coupé en haut (« barre parasite »)
Le panneau Réglages passe `top:0` (plein écran) en paysage via `#sheet:has(#panelSettings.on)`
(app.css ~1086). Mais la règle plein écran avec `padding-top: max(safe-top+8,16px)` (l.382-386)
n'existe qu'en `@media (orientation:portrait)`. En paysage, le `.sheet` avait `padding:6px...` →
en-tête coincé sous la barre d'état (apparaît comme une barre parasite). Fix : ajout
`padding-top: max(calc(var(--safe-top) + 8px), 14px)` sur `#sheet:has(#panelSettings.on)` dans le
bloc paysage + boutons `.settings-btn` resserrés (padding 12→9, grid gap 8→6). Commit 10853a6.

### Boutons flottants par-dessus la fenêtre « Conducteurs proches »
`#nearbyPanel` est une `.overlay` (affichée via `.show`), PAS un panneau de `#sheet`. La règle de
masquage des FAB ne couvrait que `.sheet.full` et `#sheet:not(.mini) .panel.on` → les FAB
flottaient par-dessus la liste Nearby. Fix : ajout de `#appScreen:has(.overlay.show) .fab-stack`
(et `.speed`) à la règle de masquage (app.css ~800). S'applique en portrait + paysage. Commit e0bacb4.

### Versions
app.css v53→v55, SW v297→v299. Poussés sur main.

---

## SESSION 2026-06-28 — Responsive paysage des panneaux (contenu trop gros)

### Problème
En paysage, le contenu des panneaux (Activité, Messages, Signaler, Ange, Réglages, Dashboard)
gardait les tailles portrait → surdimensionné sur la faible hauteur (~430px CSS), peu d'éléments
visibles, illisible. Captures IMG_6485-6488.

### Itération d'approche
1. D'abord compactage par élément (en-têtes, recherche, cartes, onglets) — partiel.
2. Puis zoom uniforme `#sheet .panel { zoom:0.84 }` + `#angePanel` + `#gardienDashboardBody`
   pour couvrir TOUT d'un coup (étape 2 Signaler, listes catégories, fil Messages, réglages).
   Avantage : cohérent partout. Inconvénients (signalés à l'utilisateur) : rapetisse le texte
   (moins lisible en conduite), n'exploite pas la largeur paysage, effets de bord iOS (tap<44px,
   flou, sticky/hit-test).
3. CHOIX FINAL (utilisateur a validé la « vraie mise en page ») : abandon du zoom →
   responsive paysage propre : **polices conservées lisibles** (titre 18→16), **marges/paddings
   réduits** (le vrai gaspillage), **largeur exploitée** (Signaler `.sig-cat-grid` 1→2 colonnes,
   catégories Activité 4 col déjà, réglages 2 col déjà), **cibles tactiles ≥40px**,
   `.sheet top 30→20dvh` + padding réduit, `#gardienDashboardBody` padding réduit. Ange : paddings
   réduits, police gardée. Écrans d'appel = cartes à largeur fixe centrées → déjà OK, intouchés.

### Couverture
Tous les `.panel` de `#sheet` (Messages, Appels=journal in panelMessages, Paramètres, Activité
+#actCatPanel, Signaler toutes .sig-step, GPS), #angePanel, #gardienDashboardBody.

### Versions
app.css v52→v53, SW v296→v297. Commit 0fb812b, poussé sur main. À affiner sur captures terrain.

---

## SESSION 2026-06-28 — Sonnerie démarrage (grâce) + FAB paysage alignés au compteur

### Sonnerie fantôme au démarrage — qui revenait
Le garde `created_at < 12s` (commit 8cc3afa) ne suffisait pas : `created_at` peut être absent du
payload Realtime `p.new` ou mal parsé (timezone) → `_stale` faux → la tonalité repassait.
Fix robuste (calls.js) : fenêtre de grâce `_suppressIncomingAudioUntil = Date.now() + 4000`,
posée dans `init()` et dans le handler `visibilitychange` (retour au premier plan). Dans le
handler INSERT : `var _grace = Date.now() < _suppressIncomingAudioUntil;` →
`_showIncomingPopup(r, (_stale || _grace) ? {skipAudio:true} : undefined)`. La popup s'affiche,
sans son, sur les 4 premières secondes après ouverture/foreground. Un vrai appel pendant
l'usage normal sonne toujours. calls.js v21→v22.

### FAB paysage — disposition finale validée
Après itérations (colonne collée droite → grille 2×2 → rangée horizontale → colonne espacée),
choix final utilisateur : **rangée HORIZONTALE en bas à droite**, collée au bord (`right:12px`
sans safe-inset), **alignée avec le compteur de vitesse** (bas-gauche). Pour aligner les centres :
compteur `.speed` remonté `bottom: 10→16px` (hauteur 56 → centre 44), `.fab-stack`
`flex-direction:row; bottom:18px` (hauteur 52 → centre 44). app.css v50→v52, SW v294→v296.
Commit 75a5be0.

---

## SESSION 2026-06-28 — UI : responsive paysage + bug FAB qui disparaissent

### Bug FAB/compteur qui disparaissent (portrait ET paysage) — le plus gênant
Symptôme : après ouverture puis fermeture d'un panneau, les boutons flottants (`.fab-stack`)
et le compteur de vitesse (`.speed`) restaient masqués sur la carte.
Cause : masquage CSS via `#appScreen:has(#sheet .panel.on) .fab-stack { display:none }`.
`closeSheet()` (index.html ~1545) remet la sheet en `.mini` et retire `.full`, **mais ne retire
pas `.on`** du panneau interne (seul `panel()` le togglait). Le `:has(#sheet .panel.on)`
continuait donc de matcher après fermeture → boutons cachés.
Fix (app.css ~797-800) : `:has(#sheet:not(.mini) .panel.on)` → on ne masque que quand la sheet
est réellement ouverte. `.sheet.full` couvrait déjà l'ouverture ; le `.panel.on` résiduel en mini
ne masque plus rien.

### Responsive paysage
La nav devient un rail vertical à gauche (58px + safe-left) via `@media (orientation:landscape)
and (max-height:560px)`. Compléments ajoutés :
- `.fab-stack` : pile verticale (4×52 ~238px) remontait au milieu, et `env(safe-area-inset-right)`
  la repoussait du bord (~60px à cause de l'encoche côté droit en paysage). Itérations successives
  (pile collée droite → grille 2×2 → **rangée horizontale**). Choix final = rangée HORIZONTALE
  bas-droite (`flex-direction:row`, `right:12px` sans safe-inset, `bottom: safe-bottom+22px` pour
  passer au-dessus de l'attribution Leaflet). Exploite la largeur du paysage, reste en zone basse.
  Les FAB se masquent quand un panneau s'ouvre → pas de conflit avec le bas.
- `.toast/.notif` et `.floating-card` : restaient en `left:12/16px` → passaient par-dessus le rail.
  Décalées à droite du rail (`left: calc(58px + safe-left + 10px)`, `right: 10px + safe-right`),
  floating card ré-ancrée en bas (la nav n'est plus en bas en paysage).

### Versions
app.css v48→v50, SW v292→v294. Commits 860e44b (puce plaque), 8352b64 (paysage + bug FAB).
Poussés sur main.

---

## SESSION 2026-06-28 — UI : bannières notif/toast chevauchaient la puce plaque

### Problème
Les bannières du haut (« zone à risque » = `toast(...,'bad')`, signalements, messages verts `notif`)
se superposaient à la `.top-bar` (`.profile-chip` affichant l'immatriculation `#tbPlate`, qui ouvre
le menu/paramètres via `openDrawer`).

### Cause
`.top-bar` : `top: calc(var(--safe-top) + 10px)`, hauteur de la puce ~41px → occupe jusqu'à ~+51px.
`.toast, .notif` : `top: calc(var(--safe-top) + 26px)` → recouvrait la puce.

### Fix (app.css)
- `.toast, .notif` : `+26px` → `+62px` (sous la puce).
- `.notif.show ~ .toast.show` (toast empilé sous la notif verte) : `+106px` → `+142px`.
- app.css v48→v49, SW v292→v293. Commit 860e44b, poussé sur main (`66343df..860e44b`).

### Note
Le correctif « bip message au login » (garde created_at<12s) a été **abandonné** : l'utilisateur
veut garder le bip des messages (il s'agit du comportement normal, pas d'un bug). Seul le bip
d'appel fantôme restait à corriger (déjà fait). Aucun changement messages.js au final.

---

## SESSION 2026-06-28 — Aide : réponse au demandeur impossible (plaque placeholder)

Bug : répondre à une demande d'aide via un message pré-rédigé → "Impossible d'identifier le
demandeur", message non envoyé. Cause : `assist(type)` (index.html ~1545) créait l'alerte + le
report avec `plate:'ASSISTANCE'` (placeholder), jamais la vraie plaque. Côté aidant,
`actHelpReply` cherchait `from_plate||sender_plate||reporter_plate` (tous vides) → échec. Fix :
`assist()` stocke la plaque réelle du demandeur (`S.profile.owner_plate || fPlate(ownPlate())`)
dans `plate` ET `sender_plate` (alerte locale + saveReportRemote). `actHelpReply` lit désormais
aussi `a.plate` (et garde le garde `==='ASSISTANCE'`). → `sendToPlate(requesterPlate, msg)`
livre le message dans la boîte de réception du demandeur. Les usages `[ASSISTANCE]` restants ne
concernent que le `reason` (strip d'affichage), pas la plaque. SW v324→v325. Commit 7882fc7.

---

## SESSION 2026-06-28 — Audio appels : bip fantôme au login + sonnerie entrante distinctive

### Problème signalé
« Le téléphone bip ou fait comme un appel téléphonique dès que je me connecte, ça ne le fait pas
tout le temps. » L'utilisateur veut garder la sonnerie pour les vrais appels (entrants ET quand
il appelle), supprimer uniquement le déclenchement parasite au démarrage.

### Diagnostic
Chemin de la sonnerie entrante :
`_showIncomingPopup(req)` → `_emitCallEvent('CALL_RECEIVED', {skipAudio})` → ImmatBus →
`call-notification-runtime.js:onIncomingPending` ET `call-screen.js:showIncoming` →
`AudioManager.playIncomingRingtone` (440+480 Hz, loopé).

- Les chemins de récupération au login passent déjà `skipAudio:true` :
  `_recoverIncomingPendingCalls` (calls.js:129) et `_recoverPendingRequest` →
  `_showSentBanner(...,true)` (calls.js:103). Silencieux. ✓
- **Seul le handler Realtime `INSERT`** (calls.js:425) appelait `_showIncomingPopup(r)` SANS
  `skipAudio` et SANS garde d'ancienneté. Avec 2 iPhones de test laissant des `call_requests`
  en statut `pending` en base, un INSERT (ou rejeu Realtime au moment de l'abonnement) tombait
  pile au login → sonnerie pour une demande non fraîche. D'où l'intermittence (dépend du
  résidu en base + timing d'abonnement).
- Le son sortant (quand l'utilisateur appelle) passe par `CALL_INITIATED` → `playOutgoingTone`
  (440 Hz), chemin distinct, non touché.

### Fix appliqué
`calls.js` handler INSERT — ne sonner que pour un appel réellement frais :
```js
var _stale = r.created_at && (Date.now() - new Date(r.created_at).getTime() > 12000);
_showIncomingPopup(r, _stale ? { skipAudio: true } : undefined);
```
La popup s'affiche toujours visuellement ; seul le son est supprimé pour une demande ancienne.
N'étouffe jamais un vrai appel entrant (created_at ≈ now). Préféré à une fenêtre de silence au
login (qui aurait pu masquer un vrai appel arrivant juste après la connexion).

### Sonnerie entrante distinctive
`core/audio-manager.js` — `_ringSample` réécrit : table de notes `_RING_NOTES` (B5 988 / E6 1319 /
G6 1568 Hz), motif ascendant joué 2× par cycle de 5 s, enveloppe anti-clic. Remplace la
bitonalité 440+480 Hz. Boucle (`loop=true`) inchangée → sonne jusqu'à accepter / refuser /
annulation appelant / expiration (~30 s, via `expires_at` serveur + `_onMissed` → stopCallAudio).
Plusieurs propositions générées et envoyées à l'utilisateur (carillon, ding-dong, marimba, options
« conduite » médium-aigu) ; choix final = la toute première (motif ascendant si-mi-sol).

### Versions
calls.js v20→v21, audio-manager.js v8→v9, SW v290→v292 (index.html + service-worker.js bumpés).

### État
Poussé sur main (`944b8bc..4aeff4e`), déploiement GitHub Pages déclenché. Commits 8cc3afa + 4aeff4e.

### Règle de session active
« Ne pas pousser sur main sans "Fusionner" explicite » — l'utilisateur tape "Fusionner" pour
autoriser chaque déploiement.

---

## SESSION 2026-06-24 — Refonte workflow signalements véhicule (machine 3 états)

### Contexte
Remplacement de l'ancien flux linéaire (REÇUS → bouton Info utile → ARCHIVÉS) par une machine à 3 états localStorage-only, sans modification Supabase.

### Architecture implémentée

**Stockage localStorage :**
- `ic_vm_pending` (Set<msgId>) — conducteur a dit "je vérifierai" mais n'a pas encore donné de verdict
- `ic_vm_verdicts` ({msgId: {v, ts}}) — verdict donné : 'confirmed' / 'gone' / 'false'
- `ic_vm_replied` (compat arrière) — anciens archivés, lus comme TRAITÉS sans verdict
- `ic_read_msg_ids` / `S._readMsgIds` — messages lus (état EN COURS si non traité)

**Règles de classement :**
- `isTraite(m)` : `verdicts[id]` OU `repliedIds.has(id)`
- `enCours` : non traité ET (lu OU pending)
- `nouveaux` : non traité ET non lu ET non pending

**Fonctions ajoutées :**
- `App.actVmPending(msgId, plate)` : → ic_vm_pending + marque lu + envoie "Je vérifierai dès que je serai arrêté 👀" + refresh
- `App.actVmVerdict(msgId, plate, type)` : → ic_vm_verdicts + trustDelta(+8 si confirmed) + toast + refresh

**CSS ajouté dans app.css v35 :**
- `.act-vmg-tbadge*` — badges temps 🟢🟡🔴
- `.act-vmg-pending-btn` — bouton "Je vérifierai dès que je serai arrêté"
- `.act-vmg-verdict-wrap`, `.act-vmg-vbtn*` — boutons verdict 3 couleurs
- `.act-vmg-pending-reminder*` — bandeau "Vérification en attente" avec texte conducteur
- `.act-vmg-traite`, `.act-vmg-verdict-lbl`, `.act-vmg-verdict-date` — carte TRAITÉS

### Décisions métier verrouillées
- trustDelta **uniquement** sur verdict 'confirmed' (+8). Autres verdicts : delta = 0.
- "Faux signalement" : enregistré mais ne baisse PAS automatiquement la confiance (modération manuelle V1 — décision ChatGPT 99%).
- Bouton "Info utile" / `actVmRate` **supprimé** du flow REÇUS (ancienne confusion réaction/verdict).
- `actVmRate` conservé dans le code mais n'est plus appelé dans le flow véhicule.

### Vocabulaire final (validé ChatGPT)
- Bouton : "✓ Je vérifierai dès que je serai arrêté" (conducteur en mouvement, précis)
- Réponse auto envoyée : "Je vérifierai dès que je serai arrêté 👀"
- Bandeau sub : "Vous avez indiqué que vous vérifieriez lorsque vous pourriez vous arrêter en sécurité."
- CTA bandeau : "→ Donner mon constat"

### État des commits (branche claude/immatconnect-pro-app-dEKGR)
- `8bb2e94` — feat: refonte gestion signalements véhicule — 3 états + verdicts + badge temps
- `0325f17` — fix: bandeau rappel "Vérification en attente" + try/catch défensif actVmPending
- `8808642` — fix: supprime bouton "Info utile" de EN COURS — trustDelta porté uniquement par verdict Confirmé
- `17c4b4f` — ux: bandeau pending — texte conducteur + lien "Donner mon constat"
- + vocabulaire "Je vérifierai dès que je serai arrêté" (commit courant)

### Prêt pour merge main
ChatGPT verdict 99% — architecture cohérente. Merge sur validation utilisateur.

### Régression : ENVOYÉS inchangé
Le tab Envoyés + section "Réponses reçues" n'ont pas été modifiés. Aucune régression possible.

---

## SESSION 2026-06-22 — BUG FIX boutons nav non réactifs (après revert zones)

### Symptôme
Après les commits zones (c242d54) + revert (00eb789), les boutons Messages, Appels, Ange, et les boutons ✕ (ph-close/sheet-close) ne répondaient plus au tap sur iPhone. Signaler et Activite fonctionnaient.

### Diagnostic
- `bindVisibleButtons()` dans ui.js ajoute des listeners capture-phase à `#navSignaler` et `#navActivite`, mais PAS à `#navMessages`, `#navAppels`, `#navAnge`, `.ph-close`, `.sheet-close`.
- Si les `onclick` attributes HTML ne se déclenchent pas (état SW altéré, overlay interceptant, ou autre), ces boutons deviennent silencieux.
- Signaler/Activite "fonctionnaient" grâce à leurs listeners capture déjà présents — pas via l'onclick.

### Correctif appliqué
Ajout de `installNavButtonHotfix()` dans ui.js (appelé depuis `install()`):
- Listener `document.addEventListener('click', fn, true)` (capture-phase, document level)
- Pour `.ph-close`/`.sheet-close` : `e.target.closest()` → `App.closeSheet()`
- Pour `#navMessages`/`#navAppels`/`#navAnge` : détection par **bounding-box** (fonctionne même si un overlay couvre le bouton, car le document-level listener voit TOUS les clics)
- Flag `window.__ImmatNavBtnHotfixV1` pour idempotence (install() appelé à 300/900/1800/3500ms)

### SW v199
- v197 (post-revert) → v199 (v198 évité pour ne pas créer de confusion avec le commit zones)
- `ui.js?v=9` → `?v=10` pour forcer le rechargement réseau du fichier corrigé

### État après fix
- Messages, Appels, Ange : nav + ouverture panel fonctionnels via hotfix
- ✕ (tous les ph-close/sheet-close dans les panels) : fermeture via hotfix
- Signaler, Activite : inchangés (capturés par bindVisibleButtons, toujours OK)
- À tester terrain sur iPhone avant de fusionner avec main

---

## SESSION 2026-06-14 — Fix panneau Activité : force .full + disable transition (PR #307)

### Historique des tentatives

| Tentative | Fix | Résultat |
|---|---|---|
| PR #305 | Reset `actMain.style.display=''` dans navActivite | "Non toujours rien" |
| PR #306 | `void s.offsetHeight` dans openSheet() | "Ça ne fonctionne toujours pas" |
| PR #307 commit 1 | `min-height: 50vh` sur `.act-main` (CSS) | "Non marche pas" |
| PR #307 commit 2 | Force `.full` + disable transition (JS) | **à tester** |

### Cause racine définitive

`translateY(100%)` dans `.sheet.mini` est calculé par iOS Safari WKWebView AVANT que le layout flex `.act-main` soit résolu. La valeur de départ de la transition CSS est donc `37px` (height du handle+padding seulement), pas `50vh`. La transition anime de `37px → 0` → le sheet "monte légèrement" de 37px.

Ni `void offsetHeight`, ni `min-height` CSS ne changent ce comportement car WKWebView calcule `translateY(100%)` dans la même microtask que le changement de classe.

### Fix définitif

`.sheet.full` utilise `top: calc(var(--safe-top) + 8px)` ET `bottom: calc(var(--nav-h) + ...)` → hauteur EXPLICITE via CSS anchors, pas dépendante du contenu flex. `translateY(100%)` = hauteur viewport ≈ 660px → animation correcte.

```js
// Dans navActivite(), après this.panel('activite') :
try{
  const _s=document.getElementById('sheet');
  if(_s){
    _s.style.transition='none';    // désactive CSS transition pendant l'opération
    _s.style.transform='';          // clear tout inline transform (drag résidu)
    _s.classList.remove('mini','full');
    _s.classList.add('full');       // hauteur explicite → translateY(100%) = ~660px
    void _s.offsetHeight;           // flush
    S.sheetSnap='full';
    requestAnimationFrame(()=>{if(_s)_s.style.transition='';});  // réactive transition
  }
}catch(_){}
```

---


## SESSION 2026-06-14 — GO LIVE fixes #301→#305 (EN COURS)

### PRs de cette session (toutes mergées sauf #305 en attente)

| PR | Fix | Détail |
|---|---|---|
| #301 | SW banner loop | CURRENT 'v22'→'v25' dans index.html (2 occurrences) |
| #302 | locate() debug logging | getUser() null/error + upsert KO code/msg/hint + upsert OK uid prefix |
| #303 | SIGNED_OUT reset complet | GPS clearWatch, 4 Realtime channels, S.uid/profile/nearby/alerts/etc., UI chips/badges |
| #304 | bottom-nav grid 3→4 colonnes | navActivite débordait sur rangée invisible (repeat(3,1fr) → repeat(4,1fr)) |
| #305 | Panneau Activité (PR à créer) | Voir détail ci-dessous |

### Bug PR #305 — Panneau Activité ne s'ouvre pas

**Symptôme :** clic sur navActivite → sheet monte légèrement (~10-15px) → aucun contenu visible.

**Cause racine identifiée :**
`App.openActivityCat(cat)` (quand l'utilisateur clique sur Route/Véhicule/Aide) fait :
```js
if(main)main.style.display='none';if(panel)panel.style.display='flex';
```
Si l'utilisateur ouvre une catégorie puis navigue vers Messages/Signaler **sans fermer la catégorie** (`closeActivityCat()` n'est pas appelé), `actMain.style.display='none'` persiste.

Au retour sur navActivite :
- `panel('activite')` ajoute `.on` → panelActivite visible
- Mais `actMain.style.display='none'` → aucun contenu
- `actCatPanel.style.display='flex'` avec `height:100%` mais parent sans hauteur explicite → hauteur 0
- Résultat : sheet contient `panelActivite` avec hauteur ~0 → monte juste le handle (5px) + padding

**Fix appliqué dans `navActivite()` :**
```js
S._actCat=null;
try{const _m=document.getElementById('actMain'),_cp=document.getElementById('actCatPanel');
    if(_m)_m.style.display='';if(_cp)_cp.style.display='none';}catch(_){}
this.panel('activite');
App.openSheet?.();  // fiabilise l'ouverture
```

**Fichier modifié :** `index.html` — fonction `App.navActivite` (ligne ~1186)

**État :** Code modifié, non encore committé ni poussé.

---

## SESSION 2026-06-14 — TECHNICAL_AUDIT_AND_ROADMAP (TERMINÉE)

### Ce qui a été produit

**docs/TECHNICAL_AUDIT_AND_ROADMAP.md — audit code réel (8 sections)**

Méthode : lecture directe de index.html, calls.js, messages.js, service-worker.js, core/*.js, supabase/functions/*, supabase/migrations/*

Résultats clés :
- Le code V1 est à 85-95% complet selon le module
- La couche de sécurité est à 100% écrite mais 0% active (11 migrations non appliquées)
- En production actuelle : email + téléphone accessibles par tout utilisateur authentifié via /profiles
- 17 écarts vision/réalité identifiés (6 critiques bloquant GO MAIN)
- Roadmap Sprint 8→13 avec durées estimées
- Sprint 8 détaillé : 4h code (Claude) + 30min déploiement (fondateur) + 2-4h terrain

Conclusion : "Le code est prêt. L'infrastructure ne l'est pas."
→ L'application est en mode "démo sans sécurité" — déploiement migrations = priorité absolue.

---

## SESSION 2026-06-14 — BETA_READINESS_AUDIT (TERMINÉE)

### Ce qui a été produit

**docs/BETA_READINESS_AUDIT.md — créé (10 sections)**

- Section 1 : 20 fonctionnalités codées jamais testées en conditions réelles (F01→F20)
- Section 2 : Éléments documentés jamais exécutés (0/11 migrations, 4 EF non déployées, 6 secrets non confirmés, Realtime non validé)
- Section 3 : Migrations classées par risque décroissant — 20260615 RISQUE MAXIMUM avec procédure rollback 30s
- Section 4 : Edge Functions classées par risque — delete-account RISQUE MAXIMUM + procédure test step-by-step
- Section 5 : 18 scénarios utilisateurs réels jamais simulés — SC18 = lifecycle complet (test de référence)
- Section 6 : Analyse dépendances externes (Supabase, Agora, Anthropic, SW, Push iOS, Push Android) avec contraintes spécifiques iOS 16.4+
- Section 7 : 10 catastrophes avec procédures de reprise et durée estimée — C6 (suppression compte) = seule irréversible
- Section 8 : Synthèse reprises (tableau durée + action immédiate + irréversibilité)
- Section 9 : Métriques 30 premiers jours (quotidien + hebdo + SQL + alertes)
- Section 10 : Checklist opérationnelle J1→J7 avec cases à cocher

**Commit :** à venir

---

## SESSION 2026-06-14 — PRODUCT_ARCHITECTURE_V2 (TERMINÉE)

### Ce qui a été produit

**docs/PRODUCT_ARCHITECTURE_V2.md — créé (17 sections)**

- Section 0 : Principes directeurs V2 (owner_plate, RGPD by design, sécurité gratuite)
- Section 1 : Module Véhicule — vehicles table + public_vehicles view + RISK-VEH-01→05
- Section 2 : Module Stationnement — parking_sessions + parking_spots + EF expiry + RISK-PKG-01→05
- Section 3 : Module Maintenance — reminders + history + EF cron + RISK-MNT-01→05
- Section 4 : Module Assistance Routière — assistance_requests + flux matching + décision RGPD anonymisation (3 options) + RISK-ASS-01→06
- Section 5 : Module Communauté — badges + ambassadeurs + anti-abus + RISK-COM-01→05
- Section 6 : Module Monétisation — matrice gratuit/premium + user_subscriptions + is_premium RPC + RISK-MON-01→06
- Section 7 : Module Professionnels — professional_profiles + SIRET + RISK-PRO-01→06
- Section 8 : Module IA/ANGE — invariants ANGE-01→07 + conversation_history opt-in + évolution contextuelle sans mémoire Sprint 10-11 + RISK-IA-01→05
- Section 9 : Architecture cible 6/12/24 mois — sprints détaillés + ce qui ne doit PAS être planifié avant 24 mois
- Section 10 : Matrice compatibilité V2 (8 modules × 10 entités existantes)
- Section 11 : 12 angles morts futurs (AM-01→12)
- Section 12 : 12 dettes techniques futures (DEBT-FUT-01→12)
- Section 13 : 13 tables réservées avec sprint cible et décision pré-requis
- Section 14 : 10 Edge Functions réservées avec sprint cible
- Section 15 : 12 invariants V2 (INV-V2-01→12)
- Section 16 : Arbre de décision go/no-go par module
- Section 17 : Tableau de décision go/no-go à remplir par le fondateur

**Commit :** à venir

### Décision architecturale critique documentée (Section 4.6)

La décision RGPD anonymisation des assistance_requests (delete-account) a trois options identifiées :
- Option A : DELETE direct (clean RGPD, perte historique helper)
- Option B : Anonymisation (résidu de donnée, historique helper conservé)
- Option C : Table d'audit séparée (équilibre, complexité)
→ DÉCISION FONDATEUR OBLIGATOIRE avant Sprint 11

### Prochaine action recommandée

Exécution terrain V1 (ordre DEPLOYMENT_LOG.md) → GO MAIN → Sprint 8 (delete_audit_log + bêta fermée)

---

## SESSION 2026-06-14 — DOCUMENTS OPÉRATIONNELS TERRAIN (TERMINÉE)

### Ce qui a été produit

**docs/INCIDENT_LOG.md — créé**
- Format standard P1/P2/P3 avec seuils de priorité
- Tableau de référence des 25 RISK du MASTER_COMPATIBILITY_MAP (Section 20)
- Règles d'escalade par priorité (P1 : stopper GO + playbook immédiat)
- Référence aux 5 playbooks (Sections 35/35b/35c/35d/35e)
- Historique des incidents (vierge — INC-001 template prêt)

**DEPLOYMENT_LOG.md** ✅ (créé session précédente, non encore commité)
**TEST_RESULTS.md** ✅ (créé session précédente, non encore commité)

**Commit :** à venir — 3 fichiers ensemble

### Prochaine action recommandée

Exécution terrain (fondateur) — dans l'ordre :
1. Supabase SQL Editor → 11 migrations (ordre chronologique, 20260615 en dernier)
2. Supabase Secrets → 6 secrets (AGORA_APP_CERTIFICATE, VAPID×3, ANTHROPIC_API_KEY)
3. Edge Functions → 4 déploiements (delete-account, export-user-data, submit-rating, send-push-notification)
4. Realtime → activer messages + user_locations
5. Test terrain 42 contrôles (TEST_RESULTS.md)
6. GO/NO-GO MAIN (0 ❌ sur contrôles critiques)

---

## SESSION 2026-06-14 — GEL DOCUMENTAIRE FINAL MASTER_COMPATIBILITY_MAP v1.3 (TERMINÉE)

### Ce qui a été produit

**docs/MASTER_COMPATIBILITY_MAP.md → v1.2 → v1.3 (2203 lignes) — GEL DOCUMENTAIRE FINAL**

**Section 39 ajoutée — 10 vérifications finales de complétude :**

- **39.1 Hiérarchie sources de vérité** : MASTER_COMPATIBILITY_MAP prévaut sur tout autre document. Ordre : MASTER_COMPATIBILITY_MAP → PROJECT_STATE → SESSION-CONTINUATION → PLAN_30J → GAP_ANALYSIS → AUDIT_V2
- **39.2 Nomenclature officielle** : table de correspondance Nom officiel ↔ Noms interdits (doublon) pour 15 domaines — véhicles, stationnement, trust, ratings, modération, RGPD, ANGE...
- **39.3 STORAGE_REGISTRY** : registre buckets Supabase Storage — report-photos (planifié), vehicle-documents, avatars, admin-evidence (futurs). Durée conservation + delete-account + export-user-data + accès définis pour chaque bucket.
- **39.4 Règle RGPD future** : procédure obligatoire pour toute nouvelle table (contient PII ? → delete-account + export + FEATURE_REGISTRY + DATA_OWNERSHIP + durée conservation + purge). Non-respect = dette RGPD bloquante pour GO MAIN.
- **39.5 SYSTEM_HEALTH_REGISTRY** : 9 composants monitorés (Supabase DB, Realtime, EF, Agora, Anthropic, Push, Storage, SW, index DB). Règle : signal inexistant = "Donnée indisponible", jamais d'estimation.
- **39.6 Décision trust → owner_plate** : trust attaché à la plaque (pas au user_id). Comportement documenté pour : changement de plaque, vente véhicule, suppression compte, multi-véhicules.
- **39.7 Impact parking** : matrice d'impact des futures tables parking sur 13 systèmes existants. RLS définie pour parking_sessions, parking_spots, parking_reservations.
- **39.8 INV-027 documents véhicule** : 5 interdictions absolues (transmis à ANGE, prompt IA, RPC non restreinte, entraînement IA, export autre que URL signée 1h). Règle d'accès via RPC SECURITY DEFINER.
- **39.9 EVENT_REGISTRY** : registre des 12 événements ImmatBus + 4 canaux Realtime avec émetteur, abonnés, payload, déclencheur. Règle : aucun nouveau canal sans être listé ici.
- **39.10 Test onboarding** : checklist 12 éléments — un nouveau développeur peut comprendre l'architecture en 50 minutes. Réponse : OUI — documentation considérée comme complète.

**Note de gel final** : couverture 97-99%, risque principal désormais = DOCUMENTATION ≠ RÉALITÉ.

### État des fichiers

```
docs/MASTER_COMPATIBILITY_MAP.md  → v1.3 — GEL DOCUMENTAIRE FINAL (2203 lignes)
PROJECT_STATE.md                  → MIS À JOUR
SESSION-CONTINUATION.md           → MIS À JOUR (cette entrée)
```

Aucun code modifié. Phase documentation = **DÉFINITIVEMENT TERMINÉE**.

---

## SESSION 2026-06-13 — GEL DOCUMENTAIRE MASTER_COMPATIBILITY_MAP v1.2 (TERMINÉE)

### Ce qui a été produit

**docs/MASTER_COMPATIBILITY_MAP.md → mis à jour v1.1 → v1.2 (GEL)**

Extensions v1.2 :

**Risques RISK-018 à RISK-025 :**
- RISK-018 : Feature non reliée au ROLLBACK_REGISTRY → rollback impossible
- RISK-019 : Nouvelle table oubliée dans delete-account → RGPD art.17 KO
- RISK-020 : Nouvelle table oubliée dans export-user-data → RGPD art.20 KO
- RISK-021 : Feature sans tests terrain → régression invisible
- RISK-022 : Feature contournant un Hard Invariant → sécurité ou RGPD violée
- RISK-023 : Feature critique dépendante d'ANGE → panne IA = panne produit
- RISK-024 : Future migration USING(true) → réexposition PII
- RISK-025 : Feature lisant profiles au lieu de public_profiles → fuite PII potentielle

**Hypothèses HYP-013 à HYP-014 :**
- HYP-013 : Toutes les EF déployées sont encore appelées par le code actif (détecter orphelines)
- HYP-014 : Toutes les tables ont une RLS cohérente et un owner fonctionnel

**Invariants INV-023 à INV-026 :**
- INV-023 : FUTURE FEATURE GATE — feature non documentée = feature non existante
- INV-024 : Toute nouvelle table auditée (RLS + RGPD + Realtime + Rollback) avant utilisation
- INV-025 : Aucune EF boîte noire — objectif + entrées + sorties + erreurs + dépendances documentés
- INV-026 : Aucun secret sans propriétaire + procédure de rotation documentée

**Nouveaux playbooks :**
- Section 35b AGORA_DOWN : comportements attendus + contrôles + surveillance
- Section 35c ANTHROPIC_DOWN : comportements attendus + contrôles + surveillance

**Nouveaux tests terrain :**
- C18 : Supabase indisponible → interface stable
- C19 : Agora indisponible → appels KO uniquement, reste fonctionnel
- C20 : Anthropic indisponible → ANGE KO uniquement, reste fonctionnel
- C21 : Rollback migration en environnement de test → retour état stable

**Section 37 étendue : 10 → 15 questions GO MAIN**
Questions ajoutées : IMPACT_REGISTRY rempli (11), DATA_OWNERSHIP mis à jour (12),
FEATURE_DEPENDENCY_GRAPH mis à jour (13), documentation onboarding mise à jour (14),
RLS sans USING(true) sur tables sensibles (15)

**FUTURE_TABLES_RESERVED enrichie :**
Ajout : maintenance_events, vehicle_history, parking_reservations

**Note de gel documentaire :**
Message final ajouté : STOP DOCUMENTATION — passer à l'exécution terrain.

### Décision finale : NO-GO MAIN — GEL DOCUMENTAIRE ACTIF

---

## SESSION 2026-06-13 — CONSOLIDATION GOUVERNANCE DOCUMENTAIRE (TERMINÉE)

### Ce qui a été produit

**docs/MASTER_COMPATIBILITY_MAP.md v1.1** — 38 sections, document de référence pré-production officielle

Extensions ajoutées par rapport à la v1.0 (produite en session précédente) :

**Risques RISK-013 à RISK-017 :**
- RISK-013 : Désynchronisation profiles ↔ public_profiles (trigger KO)
  → Contrôle : `SELECT COUNT(*) FROM profiles p LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate WHERE pp.owner_plate IS NULL` → attendu **0**
- RISK-014 : Régression SW (anciens caches) → `caches.keys()` → attendu immatconnect-pro-v25 uniquement
- RISK-015 : Incohérence Trust Engine (3 sources non synchronisées)
- RISK-016 : Suppression RGPD incomplète si nouvelle table ajoutée sans mise à jour de delete-account
- RISK-017 : Utilisateur bloqué toujours joignable côté serveur (user_blocks = barrière client uniquement)

**Hypothèses HYP-011 à HYP-012 :**
- HYP-011 : get_public_profiles_by_ids() fonctionne après 20260615 (SECURITY DEFINER bypass column grants)
- HYP-012 : Index 20260614_missing_indexes réellement utilisés (EXPLAIN ANALYZE à valider)

**Invariants INV-021 à INV-022 :**
- INV-021 : une donnée métier = une seule source de vérité
- INV-022 : ANGE jamais requis pour une feature critique

**Registres de gouvernance (nouveaux) :**
- FEATURE_REGISTRY (Section 27) — 18 features, à maintenir à chaque nouvelle feature
- DATA_OWNERSHIP_REGISTRY (Section 28) — 13 données métier avec source + copies + interdictions
- IMPACT_REGISTRY (Section 29) — template à remplir avant tout commit de feature
- FUTURE_FEATURE_GATE (Section 30) — checklist 15 points GO DEV obligatoire

**Dettes DEBT-009 à DEBT-010, Tests C15 à C17**

**Sections additionnelles :**
- Section 32 : FUTURE_TABLES_RESERVED (13 tables : parking_sessions, vehicle_profiles, ange_decisions, rate_limit_counters, delete_audit_log...)
- Section 33 : PARTIAL_MIGRATION_FAILURE PLAYBOOK (6 étapes strictes)
- Section 34 : SUPABASE_DOWN_PLAYBOOK
- Section 35 : AI_HALLUCINATION_PLAYBOOK (règle fondamentale + actions interdites à ANGE)
- Section 36 : VÉHICULES ET STATIONNEMENT — template cartographique obligatoire avant tout dev
- Section 37 : 10 QUESTIONS GO MAIN — si une NON → NO-GO MAIN

### État après cette session

```
docs/MASTER_COMPATIBILITY_MAP.md  → CRÉÉ (v1.1, 38 sections)
PROJECT_STATE.md                  → MIS À JOUR (documents de référence + historique)
SESSION-CONTINUATION.md           → MIS À JOUR (cette entrée)
```

Aucune modification de code. Aucun commit de code. Phase documentation = terminée.

### Décision finale : NO-GO MAIN (code prêt, terrain non exécuté)

---

## SESSION 2026-06-13 — PHASE DOCUMENTATION STRATÉGIQUE (TERMINÉE)

### Ce qui a été produit (documents uniquement, aucun code modifié)

- Architecture Review pré-Sprint 8 (8 sections : RLS, indexes, Realtime, localStorage, SW, Edge Functions, Deployment, Risk)
- GO/NO-GO checklist sécurisation RLS (rollback corrigé — jamais USING(true))
- Validation terrain régressions RLS (4 régressions identifiées et corrigées en session précédente)
- Documents stratégiques (6) : Worst Case Scenarios, ANGE Spec, Business Review, CNIL, Cost Review, Roadmap
- **Plan d'exécution 30 jours v1.2 — VALIDÉ ET FIGÉ** → `docs/PLAN_EXECUTION_30J_V1.2.md`

### Décisions figées dans ce plan (ne plus rouvrir)

- Noms Edge Functions corrects : delete-account, export-user-data, submit-rating, send-push-notification (+ 4 existantes)
- Secrets : ANTHROPIC_API_KEY (pas OPENAI_API_KEY), VAPID_SUBJECT ajouté
- Modèle IA : Claude via immat-brain-dialog (pas gpt-4o-mini)
- ANGE = Assistant Numérique de Guidage et d'Écoute (définition unique)
- Rate limit client = UX uniquement ; rate limit serveur = sécurité réelle (table rate_limit_counters dédiée)
- Pas d'impact trust_level automatique sur volume de reports — needs_review flag + notification modération
- is_deleted ≠ suspension (colonne account_status = migration future)
- Export RGPD = messages envoyés + reçus avec minimisation
- Realtime = activer uniquement tables réellement abonnées
- 14 contrôles terrain (dont 11 critiques) — 0 KO critique = condition GO bêta

### État des fichiers après cette session

```
docs/PLAN_EXECUTION_30J_V1.2.md  → CRÉÉ (document figé)
PROJECT_STATE.md                  → MIS À JOUR (section 3, 4, 9, historique)
SESSION-CONTINUATION.md           → MIS À JOUR (cette entrée)
```

Aucune modification de code. Aucun commit de code. Phase documentation = terminée.

### Prochaine étape : exécution terrain (ordre strict)

1. Déployer 11 migrations Supabase (20260615 en dernier)
2. Configurer Secrets Supabase (AGORA_APP_CERTIFICATE, VAPID_PRIVATE_KEY, ANTHROPIC_API_KEY)
3. Déployer 4 Edge Functions nouvelles/modifiées
4. Activer Realtime sur tables confirmées uniquement
5. Tester VAPID sur mobile réel
6. Exécuter 14 contrôles terrain — 0 KO critique requis
7. GO bêta fermée 10–20 utilisateurs

---

## ÉTAT PRODUCTION — 2026-06-10

```text
Dépôt                 : caisse43700-lgtm/Projet-immat-Connect
Branche production     : main — servie par GitHub Pages
URL terrain            : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Tests terrain          : deux iPhone/Safari, BZ-652-LL ↔ BE-521-MM
```

---

## JOURNAL DES ACTIONS — SESSION 2026-06-10

### PR #285 — feat: appels vocaux Agora RTC (mergée main)

**Pourquoi :** WebRTC natif échoue sur iOS Safari — pas de popup micro, coupure après 5-10s.
Agora RTC = fiable iOS/Android/Desktop. 10 000 min/mois gratuites (~166h).

**Fichiers créés :**

| Fichier | Rôle |
|---|---|
| `core/agora-call-engine.js` | Moteur Agora — rejoint canal sur CALL_ACCEPTED, mute/raccrocher |
| `supabase/functions/get-agora-token/index.ts` | Edge Function — génère token RTC signé |

**Fichiers modifiés :**

| Fichier | Changement |
|---|---|
| `core/call-screen.js` | Mode accepted : boutons Muet + Raccrocher, requestId conservé, auto-hide désactivé |
| `index.html` | Charge AgoraRTC_N-4.20.0.js (CDN) + agora-call-engine.js |
| `service-worker.js` | v12 — SDK Agora en cache CDN, download.agora.io dans CDN_HOSTS |

---

### PR #286 — feat: diagnostics Agora (mergée main)

Audit post-intégration — 3 fichiers de diagnostic mis à jour :

| Fichier | Ajout |
|---|---|
| `core/calls-runtime-diagnostics.js` | `agoraRuntime()` → hasAgoraRTC, isJoined, isMuted, currentChannel |
| `core/mobile-autotest.js` | `agoraAutotest()` + flags AgoraCallEngine/AgoraRTC dans modules() |
| `core/guardian-summary-engine.js` | 8ème voyant "agora" (computeAgora) — critique si SDK absent |

---

### Déploiement Supabase (fait manuellement par l'utilisateur)

| Élément | Statut |
|---|---|
| Edge Function `get-agora-token` | ✅ Déployée via Supabase Editor (version standalone sans _shared/cors.ts) |
| Secret `AGORA_APP_CERTIFICATE` | ✅ Configuré — Primary Certificate copié depuis console.agora.io |

---

## ÉTAT AGORA

```text
App ID (public)     : 4771f029e9c6446e872a598870bb74f3
App Certificate     : dans secrets Supabase → AGORA_APP_CERTIFICATE (jamais dans le code)
Projet Agora        : Default Project — console.agora.io
Compte Agora        : connecté via GitHub OAuth
Quota gratuit       : 10 000 min/mois RTC — 0% utilisé au 2026-06-10
Edge Function URL   : https://vemgdkkbldgyvaisudkd.supabase.co/functions/v1/get-agora-token
```

---

## COMMENT FONCTIONNENT LES APPELS VOCAUX

```text
A appelle B
  → calls.js émet CALL_INITIATED → CallScreen.showOutgoing()

B accepte
  → calls.js émet CALL_ACCEPTED { requestId, plate, _src } sur les deux téléphones

AgoraCallEngine (abonné ImmatBus, s'exécute sur les deux téléphones) :
  → reçoit CALL_ACCEPTED
  → POST get-agora-token { channelName: requestId, uid: random(1-999999) }
  → Edge Function vérifie JWT Bearer, génère token signé (AGORA_APP_CERTIFICATE)
  → client.join(APP_ID, channelName, token, uid)
  → createMicrophoneAudioTrack() → publish()
  → subscribe remote user → audioTrack.play()

CallScreen :
  → affiche "📞 Appel en cours"
  → boutons : Muet | Raccrocher | 💬 Message | Fermer
  → Raccrocher → AgoraCallEngine.leaveCall() + hide()
  → Muet → AgoraCallEngine.toggleMute()

Fin d'appel (refus/annulation/manqué) :
  → ImmatBus émet CALL_REFUSED / CALL_CANCELLED / CALL_MISSED
  → AgoraCallEngine.leaveCall() automatique
```

---

### PR #288 — feat: Global Verification Center + correctif réception (en attente merge)

**Branche :** `global-verification-center`

**Pourquoi :** Deux changements critiques groupés :

1. **CORRECTIF RÉCEPTION (hotfix)** — Plus de réception signalée après PR #285.
   Cause : `AgoraRTC_N-4.20.0.js` (~600 KB CDN) chargé en synchrone AVANT
   `call-notification-runtime.js` — bloquait le chargement de ce script sur iOS mobile lent.
   Fix : `call-notification-runtime.js` déplacé avant le CDN Agora + `async` ajouté au CDN.

2. **Global Verification Center** — Audit 8 sections en lecture seule depuis Dashboard Gardien.
   Bouton "Global" (vert) dans le header → `window.GlobalVerificationCenter.run()`.

| Fichier | Changement |
|---|---|
| `index.html` | `call-notification-runtime.js` avant Agora CDN, CDN Agora `async` |
| `core/global-verification-center.js` | Nouveau — 8 sections read-only (app/dashboard/messages/calls/audio/webrtc/cache/supabase) |
| `core/guardian-dashboard-summary.js` | v1.6 — bouton Global + panel _globalCheckInlinePanel |
| `service-worker.js` | v13 — global-verification-center.js en cache statique |

---

### Mergé sur main 2026-06-10 (PR #289 + merge direct)

Tout ce qui précède est en production. En plus, 5 correctifs appels mergés :

| Correctif | Fichier | Détail |
|---|---|---|
| Coupure appel après ~20s | `calls.js` | Timer `_onMissed` (basé sur expires_at) stocké dans `_missedTimers`, annulé dans `acceptCall()`/`refuseCall()` — plus de CALL_MISSED sur appel accepté |
| Raccrochage non synchronisé | `core/agora-call-engine.js` | Handler `user-left` Agora → émet `CALL_ENDED` sur ImmatBus → `CallScreen.hide()` des deux côtés |
| Micro iOS bloqué | `calls.js` + `core/call-screen.js` | `getUserMedia({audio:true})` déclenché dans le geste utilisateur (tap Accepter / tap Contact), avant la chaîne async |
| Boutons trop gros | `index.html` + `core/call-screen.js` | CSS `.cs-btn` + grille 2×2 `.cs-actions-grid` en mode accepté |
| Diagnostic moteur vocal | `core/agora-call-engine.js` | `getRuntimeState()` → joined/channel/published/remoteUsersCount/lastError |

---

## SONNERIE TÉLÉPHONE RÉELLE — audio-manager v3 (2026-06-10, après retour terrain)

**Retour terrain :** bip entendu côté appelant mais AUCUNE sonnerie côté destinataire.

**Cause :** le fallback Web Audio nécessite un AudioContext débloqué par un geste
utilisateur récent. L'appel entrant arrive via Realtime (sans geste) → contexte
suspendu → silence. De plus le son ne ressemblait pas à un téléphone.

**Fix (audio-manager.js v3) :**
1. Génération au démarrage d'une vraie sonnerie téléphone : WAV en mémoire
   (Blob URL), bitonalité 440+480 Hz, cadence 1.5s ON / 3.5s OFF, loopée.
   Assignée à `callAudioIncoming.src`. + tonalité retour (440 Hz) pour
   `callAudioOutgoing` + double bip pour `messageAudioBeep`.
2. `unlockFromUserGesture()` joue maintenant TOUS les éléments en muet au
   premier tap — iOS les autorise ensuite à être rejoués à tout moment,
   y compris à l'arrivée d'un appel sans geste. C'est LE mécanisme fiable iOS.
3. Le fallback Web Audio reste en dernier recours.

```text
Mécanisme iOS critique :
tap quelconque dans l'app → éléments <audio> joués en muet → "débloqués"
appel entrant (sans geste) → el.play() AUTORISÉ car élément déjà débloqué
```

---

## ÉTAT PRODUCTION — 2026-06-11 ✅ APPELS VOCAUX FONCTIONNELS

```text
Validé terrain : BZ-652-LL ↔ BE-521-MM — audio bidirectionnel confirmé
```

### Correctifs session 2026-06-11 (PR #292 → #297, tous mergés sur main)

| Fix | Cause | PR |
|---|---|---|
| Token Agora null | Edge Function `get-agora-token` jamais déployée en CI (seulement `immat-brain-dialog`) | #294 |
| HTTP 401 | JWT verification Supabase activée par défaut au redéploiement CI — désactivée via Dashboard | manuel |
| Token null → fallback natif | `npm:agora-token@2.0.4` potentiellement CJS incompatible Deno — implémentation Web Crypto native | #293 |
| Guard double-join | `joinCall()` appelée deux fois en parallèle → `INVALID_OPERATION` | #293 |
| Audio unidirectionnel (A entend B, B n'entend pas A) | `user-published` enregistré APRÈS `join()` → événement raté si A déjà présent | #296 |
| Race condition preMicTrack | `__preMicTrack` pas encore résolu quand `joinCall()` tourne → `null` → fallback iOS échoue | #295 |
| `[object Object]` dans diagnostic | `lastCallEvents` converti via `String(array)` → noms d'événements maintenant affichés | #297 |
| 3 bugs post-audit | guard `_busSignalBound`, `getRuntimeState` read-only, `requestId` dans `CALL_ENDED` | #292 |
| Faux positif « vieille version en cache » | `checkCache()` flaguait Critique dès que l'URL n'avait pas de `?v=x` (heuristique). Remplacé par vraie vérification : `CACHE_NAME` du service-worker.js réseau comparé à `caches.keys()`. Marqueur URL devenu informatif. SW v18, GVC v1.1 | branche feature |
| Stale CALL_ACCEPTED dans Agora | `bus.on('CALL_ACCEPTED')` pouvait joindre un canal Agora même après annulation (event Supabase en retard). `_terminalRequestIds` Set — tout event terminal marque le requestId, `CALL_ACCEPTED` ignoré si marqué | branche feature |
| Action locks double-tap | `_withLock()` wrapper sur Accepter/Refuser/Annuler/Raccrocher — verrou 1.5s, double-tap ignoré | branche feature |
| "Fermer" pendant appel actif | Bouton "Fermer" remplacé par "Réduire" en mode `accepted` — l'appel reste actif (passe en mini), impossible de rater le raccrocher | branche feature |
| `acceptCall()` else : audio non stoppé explicitement | Ajout `AudioManager.stopCallAudio('accept-no-row')` dans la branche échec de acceptCall() | branche feature |
| Variable `wasCallScreenIncoming` inutilisée | Supprimée dans acceptCall() | branche feature |

---

## ÉTAT — 2026-06-11 — RÉPARATION COMPLÈTE calls.js v16 EN PRODUCTION

### Versions en production

```text
calls.js v16 — poussé sur main via MCP GitHub API
Commit local : sur branche claude/immatconnect-pro-app-dEKGR + main
SW : immatconnect-pro-v21 actif — réseau-first, sert toujours le dernier calls.js
```

### Audit complet 2026-06-11 — 4 bugs confirmés, 4 fixes appliqués

#### FIX #1 — `cancelCallRequest` : `_missedTimers.delete(requestId)` manquant

**Cause :** `cancelCallRequest()` n'appelait pas `_missedTimers.delete(requestId)`. Toutes les
autres fonctions (acceptCall, refuseCall, postgres_changes UPDATE, poll detect, broadcast CANCEL)
le font. Nettoyage défensif ajouté.

```js
// après _pendingCallPlate = null :
_missedTimers.delete(requestId); // ← ajouté
```

#### FIX #2 — Double `showOutgoing()` → double tonalité + double render

**Cause :** `requestCall()` appelait `_showSentBanner()` (→ `showOutgoing` direct) PUIS émettait
`CALL_INITIATED` (→ `showOutgoing` via bus call-screen.js). Résultat : overlay rendu deux fois,
timer 30s remis à zéro, double tonalité audio.

**Fix :** ordre inversé dans `requestCall` (CALL_INITIATED en premier), déduplication dans
`_showSentBanner` via `getState()`.

```js
// requestCall — nouvel ordre :
_emitCallEvent('CALL_INITIATED', {...});   // bus → showOutgoing + audio (1er)
_showSentBanner(receiverPlate, data.id);  // 31s timer + dedup check (2ème)

// _showSentBanner — déduplication :
const csState = window.CallScreen.getState();
if (csState.mode === 'outgoing' && csState.requestId === requestId) return; // déjà affiché
```

Path de recovery (`_recoverPendingRequest` → `_showSentBanner`) non affecté : mode ≠ 'outgoing'
au retour arrière-plan → direct `showOutgoing` appelé normalement.

#### FIX #3 — Overlay "Appel en cours" côté A affiche `--` après accept de B

**Cause :** `outgoingUpdateHandler` émettait `CALL_ACCEPTED` avec `r.receiver_plate` brut,
qui peut être `null` en DB → `showAccepted` affichait `--`.

**Fix :** fallback sur `_pendingCallPlate` (mémorisé au moment de l'appel) :

```js
const acceptedPlate = r.receiver_plate || _pendingCallPlate || null;
_emitCallEvent('CALL_ACCEPTED', {'with': acceptedPlate, plate: acceptedPlate, ...});
```

#### FIX #4 — Overlay sortant affiche `--` en recovery (race condition)

**Cause :** `_recoverPendingRequest()` appelée sur visibilitychange avant que `_pendingCallPlate`
soit défini. Partiellement corrigé en v15 — guards maintenus en v16.

```js
// _recoverPendingRequest : fallback _pendingCallPlate + guard if (!receiverPlate) return
// _showSentBanner : effectivePlate = plate || _pendingCallPlate || null
```

### PROCHAINE ACTION — TEST TERRAIN v16

Tester sur les deux iPhones (BZ-652-LL ↔ BE-521-MM) :
1. A appelle B → overlay sortant affiche BE-521-MM (plus de `--`) ← **BUG SIGNALÉ, À CONFIRMER**
2. B accepte → "Appel en cours" côté A affiche BE-521-MM (plus de `--`) ← **À CONFIRMER**
3. A annule → B ferme dans les 1.5s (poll ou broadcast) ← **À CONFIRMER**
4. Une seule tonalité d'appel côté A (plus de double bip) ← **À CONFIRMER**
5. A peut rappeler immédiatement après annulation ← **DÉJÀ OK**

---

## ÉTAT — 2026-06-11 — DIAGNOSTIC SW BLOQUÉ + CORRECTIFS TIMING

### Diagnostic : pourquoi l'utilisateur était sur v8 alors que la production est v20

La capture d'écran du Dashboard montrait `CACHE_NAME: immatconnect-pro-v8`. La version en production est v20/v21. Cause identifiée : `cache.addAll()` est **atomique** — si un seul fichier STATIC_CACHE renvoie une erreur réseau (timeout, 503 GitHub Pages CDN), l'install entier échoue silencieusement. Le browser reste sur la dernière version installée avec succès (v8).

**Fix appliqué (SW v21) :** `Promise.allSettled([...STATIC_CACHE, ...CDN_CACHE].map(url => cache.add(url)))` — non-atomique. Un fichier en échec ne bloque plus l'install.

### Bugs persistants après v8 : état exact

Malgré le SW v8, les scripts `calls.js?v=9`, `call-screen.js?v=4` étaient servis depuis le réseau (cache-first → network-first). Les correctifs P0/P1 ÉTAIENT déployés mais les bugs persistaient quand même. Deux causes racines :

**Bug 1 — Plaque '--' côté appelant :**
- `_recoverPendingRequest()` appelée sur `visibilitychange` refetchait la DB. Si `receiver_plate` était null en DB, écrasait l'affichage correct avec '--'.
- Fix : `_pendingCallPlate` mémorisé en mémoire dans `requestCall()`. `_recoverPendingRequest` l'utilise en fallback.
- Fix : `showOutgoing()` accepte maintenant `data.to || data.plate` (défensif).
- Log ajouté : `console.log('[CallManager] requestCall → plaque:', ...)` pour diagnostic.

**Bug 2 — CANCEL ne ferme pas B immédiatement :**
- La subscription Supabase Realtime du canal signal prend ~300ms à s'établir (SUBSCRIBED). Si A annule dans cette fenêtre, `ch.send()` est ignoré silencieusement.
- Fix A : `cancelCallRequest()` attend maintenant `_signalReady` (Promise qui résout sur SUBSCRIBED) avec timeout 3s avant d'envoyer CANCEL.
- Fix B : dans le callback `.subscribe()`, quand SUBSCRIBED, B vérifie la DB pour détecter un CANCEL émis pendant la fenêtre d'abonnement.
- `_signalReady` effacé dans `_leaveCallSignal()`.

---

---

## ÉTAT — 2026-06-12 — FIX OVERLAY '--' (call-screen.js v6, calls.js v17)

### Bug confirmé par diagnostic terrain (5 captures IMG_5584–IMG_5589)

Séquence observée dans les toasts :
1. `🔍 plate→--` (rouge) — `showAccepted` appelé avec plate null
2. `🔍 plate→BE-521-MM` (vert) — vrai CALL_ACCEPTED avec bonne plaque

### Cause racine — double CALL_ACCEPTED

`call-screen.js` n'avait aucun guard contre les événements Supabase Realtime périmés
(stale events d'un appel précédent). `agora-call-engine.js` avait déjà ce guard via
`_terminalRequestIds`. Bug symétrique, même fix.

### Fixes appliqués

#### Fix A — call-screen.js : _terminalRequestIds (stale event guard)

Toute terminaison d'appel (REFUSED / CANCELLED / MISSED / ENDED) ajoute le requestId
dans `_terminalRequestIds`. `showAccepted` ignore silencieusement les événements dont
le requestId est déjà terminal.

```js
var _terminalRequestIds = new Set();

function _addTerminal(e) {
  var rid = e && e.payload && e.payload.requestId;
  if (rid) _terminalRequestIds.add(rid);
}

// bus.on('CALL_ACCEPTED') :
if (rid && _terminalRequestIds.has(rid)) return; // stale event ignoré
```

#### Fix B — calls.js : _pendingCallPlate restauré en recovery

`_recoverPendingRequest` définissait `_pendingCallId` mais pas `_pendingCallPlate`.
Si l'app reprenait d'arrière-plan et que `receiver_plate` était null en DB, FIX #3
(`r.receiver_plate || _pendingCallPlate`) ne pouvait pas fonctionner.

```js
_pendingCallId = data.id;
if (receiverPlate) _pendingCallPlate = receiverPlate; // ← ajouté
```

#### Diagnostic retiré

Toasts `🔍` et MutationObserver supprimés de call-screen.js (cause identifiée).

### Versions après fix

```text
calls.js       : v=13 (index.html) — même logique v16, +1 ligne _recoverPendingRequest
call-screen.js : v=6 (index.html)  — _terminalRequestIds, diagnostic retiré
```

### ✅ VALIDÉ TERRAIN 2026-06-12

Overlay "📞 Appel en cours" affiche BE-521-MM. Plus de '--'.

### Cause racine confirmée

Supabase postgres_changes UPDATE n'inclut que les colonnes modifiées (status,
responded_at). `receiver_plate` absent du payload → `showAccepted({with: null})` → '--'.

Fix final (call-screen.js v7) : fallback sur `_state.plate` (déjà renseigné par
`showOutgoing`) si le payload ne contient pas de plaque.

---

## ÉTAT — 2026-06-12 — FIX PROPAGATION ANNULATION v14 (audit initial)

### Audit complet 4 bugs identifiés

| # | Sévérité | Cause | Fix |
|---|---|---|---|
| 1 | CERTAIN | `visibilitychange` appelle `_recoverIncomingPendingCalls` (query status=pending). Si A a annulé → status='cancelled' → null → overlay B reste ouvert | `_checkOngoingIncomingCall()` ajouté au handler visibilitychange |
| 2 | PROBABLE | iOS Safari throttle `setInterval` en background → poll 1.5s ne tourne pas | Intervalle réduit à 1s + vérification immédiate avant premier tick |
| 3 | POSSIBLE | Poll query `.eq('id', requestId)` sans `.eq('receiver_id', _uid)` → RLS peut retourner null silencieusement | `.eq('receiver_id', _uid)` ajouté à toutes les queries poll |
| 4 | CERTAIN | CANCEL broadcast envoyé une seule fois. B peut s'abonner ~300-500ms après → broadcast perdu | Retry broadcast après 300ms (deux envois) dans `cancelCallRequest` |

---

## ÉTAT — 2026-06-12 — FIX ARCHITECTURAL cancelCallRequest (calls.js v15)

### Cause racine du bug "annulation ne ferme pas B"

L'ancienne implémentation de `cancelCallRequest` écrivait en DB **EN DERNIER** :

```
1. attend _signalReady (jusqu'à 3s)
2. envoie broadcast CANCEL
3. attend 900ms
4. retry broadcast
5. _leaveCallSignal()
6. _hideSentBanner()
7. DB update cancelled ← TROP TARD
```

Conséquence : `postgres_changes` de B (3ème mécanisme de détection) se déclenchait
~1.1s après le tap d'annulation. Le poll 1s pouvait rater ce créneau.

### Fix architectural appliqué (v15)

Nouvelle séquence dans `cancelCallRequest` :

```
1. DB update FIRST → postgres_changes déclenché immédiatement chez B
2. _emitCallEvent CALL_CANCELLED (UI locale)
3. broadcast CANCEL (best-effort, B est peut-être déjà notifié par postgres_changes)
4. attente 300ms → retry broadcast (couvre B qui vient de s'abonner)
5. _leaveCallSignal()
```

### Mécanismes de détection côté B (tous fonctionnels après v15)

| Mécanisme | Latence après tap A | Statut |
|---|---|---|
| Broadcast CANCEL sur canal signal | 50-200ms | ✅ B abonné avant le cancel |
| postgres_changes UPDATE receiver_id | 200-500ms | ✅ DB en premier → immédiat |
| Poll DB 1s (`_startCancelPoll`) | 0-1000ms | ✅ vérif immédiate + 1s ticks |
| visibilitychange + `_checkOngoingIncomingCall` | au retour foreground | ✅ background safety |

### Versions après fix

```text
calls.js       : v=15 (index.html) — DB-first cancel, robustesse maximale
call-screen.js : v=5  (index.html) — serveur v7 en cache (réseau-first)
```

### PROCHAINE ACTION — TEST TERRAIN avec panneau diagnostic

**Panneau 🔬 flottant en bas à droite de l'app** :
- Tap 🔬 → panel sliding bas avec tous les événements CALL_* horodatés
- Bouton "État" → snapshot CallManager.getRuntimeState()
- Bouton "Copy" → copie tout dans le presse-papier pour partager
- Lit console.log [CallManager] + bus CALL_* events

Tester sur les deux iPhones (BZ-652-LL ↔ BE-521-MM) :
1. A appelle B → ouvrir 🔬 sur chaque téléphone, voir logs showIncomingPopup + requestCall
2. A annule → voir sur B : poll tick → st cancelled OU CANCEL broadcast reçu OU postgres_changes
3. Si B ne ferme pas → copier les logs 🔬 de B et partager pour diagnostic

**Logs clés à observer :**
- Sur A (annulation) : `cancelCallRequest → hasCh: true/false` + `DB → err: none` + `broadcast#1 envoyé`
- Sur B (réception annulation) : `poll tick #N → st: cancelled` OU `CANCEL broadcast reçu`
- Si `hasCh: false` sur A → le canal signal n'est pas ouvert → le broadcast ne peut pas partir
- Si `poll tick → st: null` → RLS bloque la requête ou le requestId est mauvais

---

## ÉTAT — 2026-06-12 ✅ APPELS + ANNULATION + PLAQUE FONCTIONNELS

```text
Validé terrain : BZ-652-LL ↔ BE-521-MM — 2026-06-12 23:31 UTC
- Annulation A → overlay B se ferme ✓
- Plaque de l'appelé visible sur l'overlay sortant ✓
- Appels vocaux bidirectionnels ✓
```

### Cause racine résolue — call-screen.js v8 (2026-06-12)

InteractionEngine ré-émettait CALL_INITIATED / CALL_ACCEPTED / CALL_MISSED sur ImmatBus
avec un payload différent (sans `requestId` au niveau racine). Le handler `bus.on('CALL_INITIATED')`
appelait `showOutgoing(e.payload)` pour les 3 émissions. La 3ème écrasait :
- `_state.requestId = null` → cancel et hangup silencieux (bouton Annuler/Raccrocher sans effet côté B)
- `_state.plate = '--'` → plaque de l'appelé non affichée

**Fix :** Guard `requestId` sur tous les handlers bus + dedup dans show* functions.

### Bugs résolus dans cette session (2026-06-12)

| Bug | Cause | Fix |
|---|---|---|
| A annule → B ne ferme pas | InteractionEngine écrase `_state.requestId=null` | call-screen.js v8 |
| Plaque `--` sur overlay sortant | Même cause | call-screen.js v8 |
| Double `showIncomingPopup` | realtime KO x2 → deux canaux | dedup + debounce v17 |
| CALL_MISSED après appel accepté | Double popup → deuxième timer échappait à clearTimeout | dedup v17 |
| DB cancel en dernier | cancelCallRequest écrivait en DB après broadcasts | DB-first v15 |

## ÉTAT — 2026-06-13 — AUDIT D'EXÉCUTION COMPLET

### Fichier créé : docs/IMPLEMENTATION_GAP_ANALYSIS.md

Audit d'exécution complet — confronte le code réel au MASTER_PLAN et à l'AUDIT_V2.

Contenu :
- Matrice 80+ fonctionnalités (Existe / Partielle / Absente / Priorité / Effort / Dépendances)
- Audit écran par écran (10 écrans)
- Audit base de données (tables, colonnes, index, RLS manquants)
- Audit production (blockers App Store / Play Store)
- Incohérences code vs MASTER_PLAN vs AUDIT_V2
- Éléments à supprimer (call-webrtc.js, get-turn-credentials, Inbox/Outbox séparés…)
- Roadmap Sprint 1→4
- Top 20 actions dans l'ordre exact

### PROCHAINE ACTION — SPRINT 1

**Action #01 (4h) :** Ajouter bouton urgence 15/17/18 dans sigStep2Vehicle et sigStep2Aide  
**Action #02 (30 min) :** Supprimer call-webrtc.js + get-turn-credentials  
**Action #03 (30 min) :** Effacer ic_pending_profile après signup réussi  
**Action #04 (1j) :** Onglet Appels dans nav principale + badge manqués  
**Action #05 (2j) :** Push notifications SW Level 2 (VAPID)  

### RÉSUMÉ ÉTAT DU PROJET (2026-06-13)

```
Fonctionnel : ~35% du plan
Bugs P0 appels : ✅ tous résolus (2026-06-12)
Blockers lancement : 5 (push, urgence, RGPD suppression, ic_pending_profile, onglet appels)
Sprint 1 cible : 2 semaines
Sprint 2 cible : +2 semaines
Sprint 3 cible : +3 semaines
```

---

## SUPABASE

```text
URL        : https://vemgdkkbldgyvaisudkd.supabase.co
Anon key   : sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ
Edge Functions déployées :
  - get-turn-credentials  (ancienne, pour WebRTC natif — obsolète)
  - get-agora-token       (nouvelle, pour tokens Agora RTC)
  - immat-brain-dialog    (IA dialogue)
  - create-call-request   (créer demande d'appel)
  - respond-call-request  (répondre à une demande)
```

---

## INVARIANTS DE SÉCURITÉ

```text
AGORA_APP_CERTIFICATE → jamais dans le code, toujours secrets Supabase
App ID Agora 4771f029e9c6446e872a598870bb74f3 → public par conception Agora, OK dans le client
ANTHROPIC_API_KEY → jamais dans le code
owner_plate → immutable (INV-006)
pas de DELETE sans consentement (INV-COM-009)
payload anonymisé, pas de contenu message dans Edge Functions (INV-COM-010/015)
main = production GitHub Pages
pas d'ouverture automatique de messages sur accepted
```

---

## SESSION 2026-06-16 — BUG PROD "Erreur recherche conducteur" + RÉPARATION PIPELINE MIGRATIONS

### Symptôme terrain

Envoi de message à `BZ-652-LL` → toast "Aucun conducteur ImmatConnect trouvé avec cette plaque." (avant hotfix `findProfileByPlate`), puis après force-update du SW → "Erreur recherche conducteur. Réessaie dans quelques secondes." (le hotfix a remplacé l'échec silencieux par une erreur visible, révélant un vrai problème serveur).

### Root cause n°1 — GRANT manquant sur `profiles`

`information_schema.column_privileges` interrogé via SQL Editor : 0 ligne pour `grantee='authenticated', table_name='profiles', privilege_type='SELECT'`. La policy RLS `profiles_select_authenticated` était bien en place, mais le `GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON public.profiles TO authenticated` qui devait suivre le `REVOKE SELECT` global n'avait **jamais été exécuté en base**, ni manuellement ni par CI.

Fix appliqué manuellement par l'utilisateur en SQL Editor :
```sql
GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON public.profiles TO authenticated;
```
Revérifié : 4 lignes retournées (les 4 colonnes attendues). Confirmé en terrain par l'utilisateur : "Le problème est corrigé."

### Root cause n°2 — pourquoi le GRANT n'a jamais été appliqué par CI

Logs CI (workflow `deploy-edge-functions.yml`, étape "Apply pending migrations", run `27543373052`) :
```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" — Key (version)=(20260613) already exists.
```
12 fichiers dans `supabase/migrations/` avaient des préfixes de version sur 8 chiffres seulement (date sans heure) : 4 fichiers partageaient le préfixe `20260613`, 6 fichiers partageaient `20260614`. `supabase db push` applique par ordre alphabétique de nom de fichier et insère une ligne par version appliquée dans `supabase_migrations.schema_migrations` (clé primaire = version). Le premier fichier `20260613_call_requests_device_id.sql` s'est appliqué avec succès (version `20260613` insérée) ; le fichier suivant partageant le même préfixe (`20260613_push_subscriptions.sql`) a fait échouer l'insertion → `supabase db push` avorte et aucune migration suivante n'est appliquée, donc tout ce qui vient après dans l'ordre alphabétique (y compris `20260615_profiles_column_security.sql`, qui contient le GRANT) n'a jamais atteint la base.

`continue-on-error: true` sur cette étape masquait totalement l'échec : le job GitHub Actions restait vert ("✅ success") malgré l'erreur réelle, ce qui a permis au bug de rester invisible plusieurs jours.

### Réparation appliquée (code uniquement, aucune action DB)

1. **Renommage des 12 fichiers** avec un préfixe complet `AAAAMMJJHHMMSS` basé sur le timestamp de création réel (`ls -la --time-style=full-iso`), ordre chronologique strictement préservé :
   ```
   20260613102534_push_subscriptions.sql
   20260613111026_reports_enhancements.sql
   20260613111247_user_blocks.sql
   20260613111416_call_requests_device_id.sql
   20260613150659_device_sessions.sql
   20260613161030_driver_ratings.sql
   20260613183151_user_trust.sql
   20260613203614_public_profiles_secure.sql
   20260613203627_public_reports_secure.sql
   20260613203636_missing_indexes.sql
   20260613211313_profiles_column_security.sql
   20260615111905_delete_audit_log.sql
   ```
   Chaque version est désormais unique → plus aucune collision de clé primaire possible.

2. **Idempotence renforcée.** Audit ligne par ligne des 12 fichiers : 9 étaient déjà sûrs à rejouer (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, ou `DROP POLICY IF EXISTS` déjà présent avant chaque `CREATE POLICY`). 3 fichiers créaient une policy sans garde préalable, ce qui aurait fait échouer un rejouage si la policy existait déjà : `push_subscriptions.sql` (policy `push_subs_self`), `user_blocks.sql` (`user_blocks_self`), `device_sessions.sql` (4 policies `device_sessions_*`). `DROP POLICY IF EXISTS` ajouté avant chaque `CREATE POLICY` dans ces 3 fichiers.

3. **`continue-on-error: true` retiré** de l'étape "Apply pending migrations" dans `.github/workflows/deploy-edge-functions.yml` — un futur échec de `supabase db push` fera désormais échouer le job visiblement au lieu d'être masqué.

### Conséquence du renommage à anticiper

La base contient déjà un enregistrement `supabase_migrations.schema_migrations` avec l'ancienne version `20260613` (pour `call_requests_device_id`, seule migration ayant atteint la base via CI). Comme les 12 fichiers ont maintenant des versions différentes, le **prochain** `supabase db push` (déclenché par un push sur `main` touchant `supabase/migrations/**`) traitera les 12 fichiers comme nouveaux et les appliquera dans l'ordre. C'est sans risque car tout le SQL est idempotent — rejouer une migration déjà appliquée manuellement (table/policy déjà existante) ne produit ni erreur ni duplication, juste un no-op.

### Inventaire d'impact réel ("qu'est-ce que ça casse en fait ?")

| Catégorie | Éléments | Statut |
|---|---|---|
| Confirmé cassé puis réparé | Envoi de message à une plaque tierce (`findProfileByPlate` dans `messages.js`) | ✅ réparé par le GRANT |
| Probablement dégradé silencieusement (même cause) | Pseudo dans journal d'appels, titre de conversation, aperçu de composition, liste véhicules récents — tous des `.from('profiles').select(...)` directs entourés de try/catch (échec silencieux, pseudo juste absent) | ✅ devrait être réparé par le même GRANT — non re-testé individuellement |
| Non cassé (créé manuellement avant le bug CI) | `device_sessions`, `driver_ratings` (+ `driver_ratings_summary`), `vehicle_trust_scores`, `delete_audit_log` | OK — confirmé par l'historique PROJECT_STATE (S5-HEARTBEAT, S6-RATINGS, S6-TRUST, S8-01 tous marqués faits le 2026-06-13/15, avant l'introduction du mécanisme CI le 2026-06-15 commit `a577b9e`) |
| Non vérifié empiriquement | Table `public_profiles` + trigger `sync_public_profile`, vue `public_reports` (RLS reports sans `reporter_id`), 8 index de `missing_indexes.sql` | `public_profiles` semble exister (signup via `plateAvailable()` fonctionne) mais le trigger de sync n'est pas formellement vérifié ; les index sont inoffensifs en cas d'absence (perf uniquement, jamais d'erreur) |

### Requête de vérification recommandée (à faire exécuter par l'utilisateur si doute)

```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```
Donne la liste authoritative des migrations que Supabase considère comme appliquées — la seule source de vérité fiable, plus fiable que toute déduction depuis l'historique PROJECT_STATE.

### Suite — relance CI, réconciliation et 3ᵉ bug (colonnes position inexistantes sur `reports`)

**Push du fix vers `main` (commit `b3f80dd`)** : déclenche automatiquement le run `27614647067`, qui échoue dès l'étape "Apply pending migrations" (4s) avec :
```
Remote migration versions not found in local migrations directory: 20260613.
supabase migration repair --status reverted 20260613
```
Cause : le renommage des 12 fichiers a laissé `supabase_migrations.schema_migrations` avec une ligne `version='20260613'` qui ne correspond plus à aucun fichier local (l'ancien `20260613_call_requests_device_id.sql` est devenu `20260613111416_call_requests_device_id.sql`). `supabase db push` refuse de continuer tant que l'historique distant référence une version orpheline.

**Fix** : l'utilisateur exécute en SQL Editor (équivalent fonctionnel de `supabase migration repair --status reverted`, qu'il n'a pas via CLI) :
```sql
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260613';
```
Confirmé exécuté (vérifié par un aller-retour de clarification, la première confirmation étant ambiguë).

**Relance du job** via `mcp__github__actions_run_trigger` (`rerun_failed_jobs` sur le run `27614647067`) — interrompue temporairement par une activation du Mode Plan côté session (résolu en écrivant un plan minimal et en appelant `ExitPlanMode`, approuvé par l'utilisateur).

**2ᵉ échec (run `81682367520` / job du run rerun)** : progression beaucoup plus loin (7s, ~7-8 migrations no-op `already exists, skipping` — confirmant qu'elles avaient déjà été appliquées manuellement par le passé), puis échec sur `20260613203627_public_reports_secure.sql` :
```
ERROR: column "latitude" does not exist (SQLSTATE 42703)
At statement: CREATE VIEW public.public_reports AS SELECT ... latitude, ...
```
Root cause suspectée (preuve indirecte, code client `index.html` ligne ~1173, fonction `saveReportRemote`) : un fallback en cascade T1→T4 qui renomme `latitude/longitude` en `lat/lng` à la 3ᵉ tentative — suggérant que les vraies colonnes seraient `lat`/`lng`. **Fix appliqué sur cette hypothèse (commit `32161cc`)** : `lat, lng` à la place de `latitude, longitude` dans la vue. Repoussé sur `main`.

**3ᵉ échec (run `27625228382`, 14:34)** : l'hypothèse `lat`/`lng` était **également fausse** :
```
ERROR: column "lat" does not exist (SQLSTATE 42703)
```
Cette fois, plutôt que de deviner une 3ᵉ fois, demande explicite à l'utilisateur d'exécuter une requête d'introspection en lecture seule :
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='reports' ORDER BY ordinal_position;
```
Résultat (4 captures d'écran successives, table à 12 lignes) — **liste complète et définitive des colonnes de `reports`** :
```
id (uuid), reporter_id (uuid), plate (text), reason (text), created_at (timestamptz),
category (text), status (text), resolved_at (timestamptz), seen_at (timestamptz),
actioned_at (timestamptz), urgency_level (text), target_plate (text)
```
**Aucune colonne de position n'existe sur `reports`.** Les deux tentatives précédentes (`latitude`/`longitude` puis `lat`/`lng`) ne pouvaient donc pas fonctionner, quelle que soit l'hypothèse de nommage.

**Fix définitif (commit `c24749e`)** : la vue `public_reports` ne référence plus que les colonnes réellement présentes (`lat, lng` remplacés par `category`, qui existait déjà mais n'était pas inclus dans la vue). Repoussé sur `claude/immatconnect-pro-app-dEKGR` puis sur `main`.

**Run final `27626558202` (commit `c24749e`, 14:54) : `status=completed`, `conclusion=success`.** Les 12 migrations se sont appliquées sans erreur et les 5 Edge Functions ont été redéployées — première exécution intégralement verte du workflow `deploy-edge-functions.yml` depuis sa création.

### Bug fonctionnel résiduel découvert (hors scope CI, à traiter séparément)

Le code client (`saveReportRemote` dans `index.html`, lignes ~1170-1175) construit systématiquement un payload d'insertion contenant `latitude`/`longitude` (tiers T1/T2) ou les renomme en `lat`/`lng` (tier T3) — mais **aucune de ces colonnes n'existe sur `reports`**. Conséquence très probable : tous les inserts réels passent par le tier T4 ("minimal", sans position), ou échouent silencieusement à transmettre des coordonnées. Les signalements communautaires n'ont donc historiquement jamais de position GPS persistée en base (la position visible en direct vient uniquement du broadcast Realtime, pas de la table). À investiguer/corriger dans une prochaine mission : soit ajouter une migration `ALTER TABLE reports ADD COLUMN lat double precision, ADD COLUMN lng double precision`, soit confirmer que c'est un choix de design volontaire (position éphémère via Realtime uniquement, jamais persistée).

---

## SESSION 2026-06-16 (suite) — Fix du bug résiduel : ajout des colonnes position sur `reports`

Suite à l'instruction explicite de l'utilisateur ("Oui attaque le bug"), le bug ci-dessus a été corrigé directement (pas seulement documenté).

**Décision de nommage :** `latitude`/`longitude` (et non `lat`/`lng`), par cohérence avec la table `user_locations` qui utilise déjà ces noms de colonnes exacts. Ce choix permet aussi au tier T1 (payload complet, non modifié) de `saveReportRemote()` de réussir directement dès le prochain insert — aucun changement côté client n'est nécessaire, puisque ce tier envoyait déjà `latitude`/`longitude`.

**Migration créée :** `supabase/migrations/20260616150925_reports_position_columns.sql`
```sql
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
```
+ `COMMENT ON COLUMN` pour les deux colonnes, + re-création de la vue `public_reports` avec `latitude`/`longitude` ajoutées au SELECT (toujours sans `reporter_id`, conforme à INV-COM-015 de la migration `20260613203627_public_reports_secure.sql`).

**Lecture côté client déjà compatible :** `_handleReport`/`syncCommunityAlerts` lisaient déjà `r.latitude??r.lat??null` — lecture défensive existante, donc aucune modification requise une fois les colonnes ajoutées.

**Déploiement :**
1. Commit `dc952d4` sur `main` (branche de travail de cette session dans le sandbox).
2. Cherry-pick vers `claude/immatconnect-pro-app-dEKGR` (branche de dev désignée), push.
3. Confirmation explicite demandée à l'utilisateur via `AskUserQuestion` avant le push sur `main` (CI prod) — confirmé "Oui, pousse sur main".
4. Push sur `main` → déclenche le workflow `deploy-edge-functions.yml` → run CI `27627683881`.

**Résultat :** run `27627683881` — `status: completed`, `conclusion: success`. Les 12 migrations rejouées sans erreur (la nouvelle s'applique pour la première fois, les 11 autres en no-op), les 5 Edge Functions redéployées sans erreur.

**Reste à faire (non bloquant) :** validation terrain — créer un signalement, recharger l'app (ou se reconnecter), confirmer que sa position est toujours affichée sur la carte (alors qu'avant ce fix, elle disparaissait dès que le signalement n'était plus reçu via le broadcast Realtime en direct).

---

## SESSION 2026-06-23 — Thread compositeur fixe en bas iOS + incident agent

### Contexte

L'utilisateur a montré (IMG_6294/IMG_6295) que le compositeur de message (textarea + bouton Envoyer) défilait avec les messages sur iPhone au lieu de rester fixe en bas. Il voulait : header thread fixe en haut, messages scrollables, composer fixe en bas (IMG_6296 comme cible).

### Analyse de la cause racine

`.ic-thread.show` dans `messages.css` définit `position:absolute; inset:0; overflow:visible`. Le `inset:0` donne une hauteur contrainte, mais `overflow:visible` permet aux enfants flex de l'ignorer sur iOS. Résultat : le flex body (messages) ne sait pas où s'arrêter → le composer "flotte" avec le scroll au lieu de rester ancré en bas.

Les éléments manquants de `flex: 0 0 auto` :
- `.ic-thread-head` : aucun flex déclaré
- `#icTypingLabel` : aucun flex déclaré
- `.ic-thread-composer` : seulement `flex-shrink:0` (mais pas `flex: 0 0 auto`)

### Fix appliqué

5 règles CSS ajoutées dans `app.css` (~l.861) via sélecteur `:has()` (iOS 15.4+) :

```css
/* Thread — overflow:hidden contraint la hauteur iOS (inset:0) → composer reste fixe */
#sheet:has(#panelMessages.on) .ic-thread.show     { overflow: hidden; }
#sheet:has(#panelMessages.on) .ic-thread-head     { flex: 0 0 auto; }
#sheet:has(#panelMessages.on) .ic-thread-body     { -webkit-overflow-scrolling: touch; }
#sheet:has(#panelMessages.on) #icTypingLabel      { flex: 0 0 auto; }
#sheet:has(#panelMessages.on) .ic-thread-composer { flex: 0 0 auto; }
```

**messages.css non modifié** (la règle `overflow:visible` reste, écrasée par `:has()` à spécificité supérieure).
**messages.js non modifié.** Tous IDs JS conservés.

Versions bumpées : `app.css?v=29 → ?v=30`, `service-worker.js CACHE_NAME v220 → v221`.

Commit principal : `b3bd7fb` — poussé sur `main`.

### Incident agent (critique)

Un agent background (subagent) lancé pour synchroniser la branche de session a continué à tourner après que `b3bd7fb` était déjà poussé. Il a poussé :

1. `7ae51f4` : retrait trailing newline dans `app.css` — **inoffensif**
2. `f4cda3c` : **FATAL** — a poussé index.html tronqué à 1 ligne (`<!DOCTYPE html>`) via `mcp__github__push_files`. 4619 lignes supprimées → écran blanc sur l'app en production (IMG_6297). CI failure (E2E Diagnostics run 28049322375, exit 1).

**Récupération :** L'agent lui-même a ensuite poussé le fichier complet dans le commit `7de5370`, restaurant index.html à 4624 lignes. L'app était indisponible ~2 minutes. L'utilisateur a rouvert l'app et confirmé qu'elle fonctionnait à nouveau (IMG_6298).

**Pourquoi le SW n'a pas rendu le problème persistant :** Le handler `fetch` pour les navigations utilise `cache: 'no-store'` → index.html est toujours servi depuis le réseau, jamais depuis le cache SW. Dès que `7de5370` était déployé sur GitHub Pages, rouvrir l'app chargeait le bon index.html.

### État CI après restauration

- Run 28049322375 (commit f4cda3c) : **FAILED** — E2E smoke tests KO (app ne se chargeait pas)
- Run 28049449868 (commit 7de5370) : **SUCCESS** — E2E Diagnostics ✅
- Run 28049450435 (commit 7de5370) : **SUCCESS** — Tests E2E (Playwright) ✅, 18 passed, 16 skipped
- Run 28049450533 (commit 7de5370) : **SUCCESS** — Déploiement GitHub Pages ✅
- Run 28049451090 (commit 7de5370) : **SUCCESS** — Tests unitaires ✅

HEAD actuel `7de5370` : CI entièrement vert.

### Commits de cette session (ordre chronologique)

| SHA | Description | Impact |
|---|---|---|
| 7804842 | docs: PROJECT_STATE update ae1dd82 | Documentation |
| bddcfdb | style(messages): pills filtres pleine largeur | app.css v27, SW v218 |
| 4862bf3 | style(messages): pills bord à bord | app.css v28, SW v219 |
| 68a410a | fix(messages): pills séparées avec gap | app.css v29, SW v220 |
| b3bd7fb | fix(thread): composer fixe en bas iOS | app.css v30, SW v221 |
| 7ae51f4 | trailing newline removal (agent) | inoffensif |
| f4cda3c | **ACCIDENT agent** — index.html tronqué | FATAL (corrigé) |
| 7de5370 | fix: RESTORE index.html complet | HEAD stable |

### Leçon retenue

Ne jamais lancer d'agent background pour des opérations git/push quand la branche cible est `main` (production). Les agents background n'ont pas de visibilité sur l'état courant de la branche et peuvent écraser du travail valide.

### État final

- `app.css` : v30, 5 règles thread ajoutées ~l.861
- `index.html` : 4624 lignes, `app.css?v=30` référencé, intact
- `service-worker.js` : v221
- Branche `main` HEAD : `7de5370`
- CI : vert ✅

