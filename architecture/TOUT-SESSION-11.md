# TOUT CE QUI A ÉTÉ FAIT — SESSION 11
> Copier-coller intégral. Chaque section indique le fichier cible et où trouver la ligne.

---

## ══════════════════════════════════════════
## FICHIER : index.html
## ══════════════════════════════════════════

### ① quickMsg() — chercher : `$('iMsg').value=t;this.panel('contact')`

REMPLACER :
```
quickMsg(t){const target=this.selectedTargetPlate();if(!target){if(S.selPlate&&S.selPlate!==this.ownPlate())$('iTarget').value=S.selPlate;else return toast('Choisis un autre véhicule.','bad')}$('iMsg').value=t;this.panel('contact')},
```

PAR :
```
quickMsg(t){const target=this.selectedTargetPlate();if(!target)return toast('Choisis un autre véhicule.','bad');if($('icComposePlate'))$('icComposePlate').value=fPlate(target);this.panel('messages');setTimeout(()=>{try{window.ImmatMessages?.setMode?.('compose');if($('icComposeText')){$('icComposeText').value=t;$('icComposeText').focus()}}catch(e){}},120)},
```

---

### ② quickReply() — chercher : `$('iTarget').value=S.conv;$('iMsg').value=t;this.panel('contact')`

REMPLACER :
```
quickReply(t){if(!S.conv||S.conv==='all')return toast('Choisis une conversation.','bad');$('iTarget').value=S.conv;$('iMsg').value=t;this.panel('contact')},
```

PAR :
```
quickReply(t){if(!S.conv||S.conv==='all')return toast('Choisis une conversation.','bad');if($('icComposePlate'))$('icComposePlate').value=fPlate(S.conv);this.panel('messages');setTimeout(()=>{try{window.ImmatMessages?.setMode?.('compose');if($('icComposeText')){$('icComposeText').value=t;$('icComposeText').focus()}}catch(e){}},120)},
```

---

### ③ Boutons debug — chercher : `onclick="App.restoreMessages()">📨 Restaurer msgs`

REMPLACER :
```
<button type="button" class="settings-btn" onclick="App.restoreMessages()">📨 Restaurer msgs</button><button type="button" class="settings-btn" onclick="App.forceSyncAlerts()">🔄 Sync alertes</button>
```

PAR :
```
<button type="button" class="settings-btn gardien-debug-tool" onclick="App.restoreMessages()">📨 Restaurer msgs</button><button type="button" class="settings-btn gardien-debug-tool" onclick="App.forceSyncAlerts()">🔄 Sync alertes</button>
```

---

### ④ CSS gardien-debug-tool — chercher : `#angeFab{display:none;position:fixed`

REMPLACER (en début de ligne, juste avant `#angeFab`) :
```
#angeFab{display:none;position:fixed;
```

PAR (ajouter le bloc CSS devant) :
```
.gardien-debug-tool{display:none}body.is-gardien .gardien-debug-tool{display:inline-flex}#angeFab{display:none;position:fixed;
```

---

### ⑤ afterAuth() détection rôle — chercher : `S.isGardien=(role==='gardien');}catch(e){S.isGardien=false;}`

REMPLACER :
```
try{const {data:role}=await sb.rpc('get_my_role');S.isGardien=(role==='gardien');}catch(e){S.isGardien=false;}
if(!S.isGardien)setTimeout(async()=>{try{const {data:r}=await sb.rpc('get_my_role');if(r==='gardien'){S.isGardien=true;const fab=$('angeFab');if(fab&&S.profile)fab.style.display='flex';}}catch(e){}},1500);
```

PAR :
```
try{const {data:role}=await sb.rpc('get_my_role');S.isGardien=(role==='gardien');if(S.isGardien)document.body.classList.add('is-gardien');}catch(e){S.isGardien=false;}
if(!S.isGardien)setTimeout(async()=>{try{const {data:r}=await sb.rpc('get_my_role');if(r==='gardien'){S.isGardien=true;document.body.classList.add('is-gardien');const fab=$('angeFab');if(fab&&S.profile)fab.style.display='flex';}}catch(e){}},1500);
```

---

### ⑥ openMap() fallback rôle — chercher : `if(S.isGardien){if($('angeFab'))$('angeFab').style.display='flex';}else if(S.isGardien===undefined)`

REMPLACER :
```
if(S.isGardien){if($('angeFab'))$('angeFab').style.display='flex';}else if(S.isGardien===undefined){sb.rpc('get_my_role').then(({data:r})=>{if(r==='gardien'){S.isGardien=true;if($('angeFab'))$('angeFab').style.display='flex';}else S.isGardien=false;}).catch(()=>{S.isGardien=false;});}
```

PAR :
```
if(S.isGardien){document.body.classList.add('is-gardien');if($('angeFab'))$('angeFab').style.display='flex';}else if(S.isGardien===undefined){sb.rpc('get_my_role').then(({data:r})=>{if(r==='gardien'){S.isGardien=true;document.body.classList.add('is-gardien');if($('angeFab'))$('angeFab').style.display='flex';}else S.isGardien=false;}).catch(()=>{S.isGardien=false;});}
```

---

### ⑦ voicePlate / voiceMsg — chercher : `voicePlate(){this.voiceInput('iTarget','plate')}`

REMPLACER :
```
voicePlate(){this.voiceInput('iTarget','plate')},voiceMsg(){this.voiceInput('iMsg','message')},
```

PAR :
```
voicePlate(){this.voiceInput('icComposePlate','plate')},voiceMsg(){this.voiceInput('icComposeText','message')},
```

---

### ⑧ fallback vehicleAlertQuick — chercher : `await this.sendMsg?.();`

REMPLACER :
```
    } else {
      if($('iTarget'))$('iTarget').value=plate;
      if($('iMsg'))$('iMsg').value=msg;
      await this.sendMsg?.();
      sent=true;
    }
```

PAR :
```
    } else {
      if($('icComposePlate'))$('icComposePlate').value=plate;
      if($('icComposeText'))$('icComposeText').value=msg;
      this.panel('messages');
      setTimeout(()=>{try{window.ImmatMessages?.setMode?.('compose')}catch(e){}},120);
      sent=true;
    }
```

---

### ⑨ fallback actQuickReply — chercher : `this.panel('contact');` dans actQuickReply

REMPLACER :
```
    }else{
      if($('iTarget'))$('iTarget').value=plate;
      if($('iMsg'))$('iMsg').value=msg;
      this.panel('contact');
    }
```

PAR :
```
    }else{
      if($('icComposePlate'))$('icComposePlate').value=plate;
      if($('icComposeText'))$('icComposeText').value=msg;
      this.panel('messages');
      setTimeout(()=>{try{window.ImmatMessages?.setMode?.('compose')}catch(e){}},120);
    }
```

---

### ⑩ panel() routing — chercher : `['altet','drive','contact','messages'`

REMPLACER :
```
panel(p){['altet','drive','contact','messages','settings','activite'].forEach(x=>{
```

PAR :
```
panel(p){['altet','drive','messages','settings','activite'].forEach(x=>{
```

---

### ⑪ SUPPRIMER div#panelContact — chercher : `id="panelContact"`

SUPPRIMER ENTIÈREMENT CES 2 LIGNES :
```
<div id="panelContact" class="panel">
<div class="section-lbl">Envoyer un message</div><div class="msg-input-row"><input id="iTarget" class="plate-input inp-light" placeholder="AB-123-CD" maxlength="9"><button type="button" class="msg-send-btn" onclick="App.sendMsg()">Envoyer</button></div><div id="hTarget" class="hint"></div><textarea id="iMsg" class="msg-textarea" placeholder="Message court et utile…"></textarea><div id="hMsg" class="hint"></div><div class="contact-only-note">Ici, tu peux uniquement envoyer un message au véhicule sélectionné. Les signalements se font depuis le bouton Signaler.</div><div class="voice-row"><button type="button" onclick="App.voicePlate()">🎙 Plaque</button><button type="button" onclick="App.voiceMsg()">🎙 Message</button></div><button type="button" class="clear-btn" onclick="App.clearMsg()">Vider message</button></div>
```

---

## ══════════════════════════════════════════
## FICHIER COMPLET : supabase/functions/immat-brain-dialog/index.ts
## ══════════════════════════════════════════

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { NS } from '../_shared/nervous-system.ts';

// ── Configuration ─────────────────────────────────────────────────────────
// CLAUDE_MODEL peut être surchargé via secret Supabase (CLAUDE_MODEL=claude-opus-4-8)
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ── Anonymisation ─────────────────────────────────────────────────────────
function anonymize(text: string): string {
  return text
    .replace(/\b[A-Z]{2}-\d{3}-[A-Z]{2}\b/g, '**-***-**')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uid]');
}

// ── Validation schéma NS (DET-002) ───────────────────────────────────────
// Fail-fast au démarrage : toute erreur de schéma NS est détectée avant usage.
function validateNSSchema(): void {
  const ns = NS as Record<string, unknown>;
  const required: Array<[string, string]> = [
    ['organs',        'Record<organe, {...}>'],
    ['routing',       'Record<signal, organe>'],
    ['inhibitions',   'Record<flag, description>'],
    ['invariants',    'Record<id, {label, severity}>'],
    ['ange_identity', '{posture, evaluation, limite}'],
  ];
  for (const [field, shape] of required) {
    if (!ns[field] || typeof ns[field] !== 'object') {
      throw new Error(`[validateNSSchema] NS.${field} manquant ou invalide (attendu : ${shape})`);
    }
  }
  const organs = ns.organs as Record<string, unknown>;
  if (Object.keys(organs).length === 0) {
    throw new Error('[validateNSSchema] NS.organs vide — aucun organe défini');
  }
  const id = ns.ange_identity as Record<string, unknown>;
  for (const f of ['posture', 'evaluation', 'limite']) {
    if (typeof id[f] !== 'string' || !(id[f] as string).trim()) {
      throw new Error(`[validateNSSchema] NS.ange_identity.${f} manquant ou vide`);
    }
  }
}

// ── Transformation NS → prompt compact (INV-015) ─────────────────────────
// Source unique : _shared/nervous-system.ts (dérivé de immat-nervous-system.json)
// Ne jamais écrire ce texte à la main — modifier la source, pas ce fichier.
//
// depth 3 — gardien    : technique    entry · constraints · deps · serves · 2 failure_modes + inhibitions + invariants
// depth 2 — protecteur : usage+comport  level_1 + level_2 + serves — sans entrées techniques
// depth 1 — futur      : usage seul    level_1 + serves uniquement
function nsToPrompt(depth: 1 | 2 | 3 = 3): string {
  const organs = NS.organs as Record<string, {
    entry?:    Record<string, string>;
    constraints?: string[];
    deps?:        string[];
    serves?:      string[];
    level_1?:     { what_user_sees?: string[]; common_questions?: string[]; resolution?: string[] };
    level_2?:     { behaviors?: string[]; failure_modes?: string[] };
  }>;
  const routing     = NS.routing     as Record<string, string>;
  const inhibitions = NS.inhibitions as Record<string, string>;
  const invariants  = NS.invariants  as Record<string, { label: string; severity: string }>;
  const id          = NS.ange_identity;

  if (!organs || !routing || !inhibitions || !invariants || !id) {
    throw new Error('[nsToPrompt] NS schema invalide — vérifier _shared/nervous-system.ts');
  }

  const organsText = Object.entries(organs).map(([name, o]) => {
    const keywords = Object.entries(routing)
      .filter(([, v]) => v === name)
      .map(([k]) => k)
      .join('|');

    if (depth === 3) {
      const entries     = Object.entries(o.entry ?? {})
        .map(([k, v]) => `${k}@${String(v)}`)
        .join(' · ');
      const constraints = (o.constraints ?? []).join('·');
      const deps        = (o.deps   ?? []).length ? `deps:[${(o.deps ?? []).join(',')}]`    : '';
      const serves      = (o.serves ?? []).length ? `serves:[${(o.serves ?? []).join(',')}]` : '';
      const failures    = (o.level_2?.failure_modes ?? []).slice(0, 2).join(' / ');
      const line1       = [entries, constraints, deps, serves].filter(Boolean).join(' · ');
      return `${name} [${keywords}]\n  ${line1}${failures ? `\n  ⚠ ${failures}` : ''}`;

    } else if (depth === 2) {
      const serves      = (o.serves ?? []).length ? `serves:[${(o.serves ?? []).join(',')}]` : '';
      const sees        = (o.level_1?.what_user_sees ?? []).join(' | ');
      const behaviors   = (o.level_2?.behaviors ?? []).slice(0, 2).join(' | ');
      const failures    = (o.level_2?.failure_modes ?? []).slice(0, 2).join(' / ');
      return [
        `${name} [${keywords}] ${serves}`,
        sees        ? `  voit : ${sees}` : '',
        behaviors   ? `  fait : ${behaviors}` : '',
        failures    ? `  ⚠ ${failures}` : '',
      ].filter(Boolean).join('\n');

    } else {
      const serves = (o.serves ?? []).length ? `serves:[${(o.serves ?? []).join(',')}]` : '';
      const sees   = (o.level_1?.what_user_sees ?? []).join(' | ');
      return `${name} [${keywords}] ${serves}\n  voit : ${sees}`;
    }
  }).join('\n\n');

  // inhibitions + invariants : gardien seulement (données techniques)
  const technicalSections = depth === 3
    ? `\nINHIBITIONS :\n${Object.entries(inhibitions).map(([k, v]) => `${k} → ${v}`).join('\n')}\n\nINVARIANTS :\n${Object.entries(invariants).map(([k, v]) => `${k}:${v.label} (${v.severity})`).join('\n')}\n\nTraversée obligatoire pour technique : Signal→routing→organe→deps→entry→constraints.`
    : '';

  return `FORMAT — JSON VALIDE UNIQUEMENT. 150 mots maximum.

CHAMPS OBLIGATOIRES : "sources" · "question" · "requiresGuardianValidation": true
CHAMPS SELON PERTINENCE : "route" · "vois" · "suppose" · "juste" · "options" · "vigilance" · "invariants" · "proposal"
Question simple → "juste" + "question" suffisent. N'inclus les autres que si indispensable.

${id.posture}
${id.evaluation}
${id.limite}

ORGANES :
${organsText}${technicalSections}

Langue : français.`;
}
}

// ── System prompt statique — calculé au démarrage, mis en cache Anthropic ─
// Crash au démarrage si NS invalide : fail-fast > fail silencieux.
validateNSSchema(); // DET-002
const STATIC_SYSTEM = nsToPrompt(3); // gardien : depth 3

// ── Contexte dynamique — non caché (varie à chaque appel) ─────────────────
function buildDynamicContext(snapshot: unknown, mode: string, feature: string): string {
  return `Capacité : ${feature} | Mode : ${mode}
Snapshot : ${anonymize(JSON.stringify(snapshot ?? {}))}`;
}

// ── Validation et assainissement de la sortie de l'Ange ──────────────────
function validateOutput(raw: string, feature: string, mode: string): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    sources:  "L'Ange n'a pas pu produire une réponse structurée. Reformule ta demande.",
    question: 'Peux-tu reformuler ta demande avec plus de contexte ?',
    requiresGuardianValidation: true,
    feature,
    mode,
    _fallback: true,
  };

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const hasJuste   = typeof parsed.juste   === 'string' && parsed.juste.trim().length   > 0;
    const hasSources = typeof parsed.sources === 'string' && parsed.sources.trim().length > 0;

    const result: Record<string, unknown> = {
      sources:  hasSources ? parsed.sources : (hasJuste ? undefined : fallback.sources),
      question: typeof parsed.question === 'string' ? parsed.question : fallback.question,
      requiresGuardianValidation: true,
      feature,
      mode,
    };

    if (typeof parsed.vois   === 'string' && parsed.vois.trim())    result.vois      = parsed.vois;
    if (hasJuste)                                                     result.juste     = parsed.juste;
    if (Array.isArray(parsed.suppose)    && parsed.suppose.length)  result.suppose   = parsed.suppose;
    if (Array.isArray(parsed.vigilance)  && parsed.vigilance.length) result.vigilance = parsed.vigilance;
    if (Array.isArray(parsed.invariants) && parsed.invariants.length) result.invariants = parsed.invariants;

    if (parsed.route && typeof parsed.route === 'object' && !Array.isArray(parsed.route)) {
      const r = parsed.route as Record<string, unknown>;
      result.route = {
        signal:      typeof r.signal === 'string' ? r.signal : '',
        organ:       typeof r.organ  === 'string' ? r.organ  : '',
        entry:       typeof r.entry  === 'string' ? r.entry  : '',
        constraints: Array.isArray(r.constraints) ? r.constraints : [],
      };
    }

    if (Array.isArray(parsed.options) && parsed.options.length) {
      result.options = parsed.options.slice(0, 3).map((o: Record<string, unknown>) => ({
        label:             typeof o.label             === 'string' ? o.label             : '',
        benefices:         typeof o.benefices         === 'string' ? o.benefices         : '',
        risques:           typeof o.risques           === 'string' ? o.risques           : '',
        impact_conducteur: typeof o.impact_conducteur === 'string' ? o.impact_conducteur : '',
        impact_organisme:  typeof o.impact_organisme  === 'string' ? o.impact_organisme  : '',
      }));
    }

    if (parsed.proposal && typeof parsed.proposal === 'object' && !Array.isArray(parsed.proposal)) {
      const p = parsed.proposal as Record<string, unknown>;
      result.proposal = {
        id:          typeof p.id       === 'string' ? p.id       : `RULE-${feature}-${Date.now()}`,
        feature:     typeof p.feature  === 'string' ? p.feature  : feature.toLowerCase(),
        rule:        typeof p.rule     === 'string' ? p.rule     : '',
        severity:    typeof p.severity === 'string' ? p.severity : 'medium',
        obligations: Array.isArray(p.obligations) ? p.obligations : [],
        forbidden:   Array.isArray(p.forbidden)   ? p.forbidden   : [],
        invariants:  Array.isArray(p.invariants)  ? p.invariants  : [],
        requiresGuardianValidation: true,
        tests:       Array.isArray(p.tests)       ? p.tests       : [],
      };
    }

    return result;
  } catch {
    return fallback;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method_not_allowed' }, { status: 405, headers: corsHeaders });
  }

  const t_total = Date.now();

  try {
    // ── 1. Clé Anthropic présente ──
    if (!ANTHROPIC_API_KEY) {
      console.error('[immat-brain-dialog] ANTHROPIC_API_KEY absente.');
      return Response.json({ ok: false, reason: 'server_misconfigured' }, { status: 500, headers: corsHeaders });
    }

    // ── 2. Auth Supabase ──
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    // ── 2+3. Auth + rôle en parallèle — évite JWT stale (INV-010) ──
    const t_auth = Date.now();
    const [authResult, roleResult] = await Promise.all([
      sb.auth.getUser(),
      sb.rpc('get_my_role'),
    ]);
    const { data: { user }, error: authErr } = authResult;
    let { data: role, error: roleErr } = roleResult;
    const auth_ms = Date.now() - t_auth;
    const role_ms = auth_ms;

    if (authErr || !user) {
      console.warn('[immat-brain-dialog] Auth échouée.', authErr?.message ?? 'user null');
      return Response.json({ ok: false, reason: 'unauthenticated' }, { status: 401, headers: corsHeaders });
    }

    // Retry rôle une fois si erreur transitoire (cold start Supabase)
    if (roleErr) {
      await new Promise(r => setTimeout(r, 600));
      const retry = await sb.rpc('get_my_role');
      role = retry.data;
      roleErr = retry.error;
    }

    if (roleErr || role !== 'gardien') {
      console.warn('[immat-brain-dialog] Rôle insuffisant :', role ?? 'absent', roleErr?.message ?? '');
      return Response.json({ ok: false, reason: 'forbidden_role' }, { status: 403, headers: corsHeaders });
    }

    // ── 4. Parse payload ──
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const message  = typeof body.message  === 'string' ? body.message.slice(0, 2000)  : '';
    const feature  = typeof body.feature  === 'string' ? body.feature.slice(0, 100)   : 'INCONNU';
    const mode     = typeof body.mode     === 'string' ? body.mode.slice(0, 50)       : 'consultation';
    const snapshot = body.snapshot ?? {};

    if (!message.trim()) {
      return Response.json({ ok: false, reason: 'message_required' }, { status: 400, headers: corsHeaders });
    }

    // ── 5. Contexte dynamique ──
    const t_prompt = Date.now();
    const dynamicContext = buildDynamicContext(snapshot, mode, feature);
    const prompt_ms = Date.now() - t_prompt;

    // ── 6. Appel Anthropic — cache sur la partie statique ──
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let rawContent: string;
    const t_anthropic = Date.now();
    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        system: [
          { type: 'text', text: STATIC_SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: dynamicContext },
        ],
        messages: [{ role: 'user', content: anonymize(message) }],
      });
      rawContent = completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } catch (apiErr: unknown) {
      const detail = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.error('[immat-brain-dialog] Erreur API Anthropic :', detail);
      return Response.json(
        { ok: false, reason: 'model_error', detail },
        { status: 502, headers: corsHeaders }
      );
    }
    const anthropic_ms = Date.now() - t_anthropic;

    // ── 7. Validation sortie ──
    const t_validation = Date.now();
    const result = validateOutput(rawContent, feature, mode);
    const validation_ms = Date.now() - t_validation;

    const total_ms = Date.now() - t_total;

    console.info('[immat-brain-dialog] OK', {
      feature,
      mode,
      hasProposal: Boolean(result.proposal),
      fallback: result._fallback ?? false,
      timings: { auth_ms, role_ms, prompt_ms, anthropic_ms, validation_ms, total_ms },
    });

    return Response.json({ ok: true, ...result }, { headers: corsHeaders });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[immat-brain-dialog] Erreur interne :', detail, { total_ms: Date.now() - t_total });
    return Response.json({ ok: false, reason: 'server_error' }, { status: 500, headers: corsHeaders });
  }
});
```

---

## ══════════════════════════════════════════
## FICHIER COMPLET : scripts/test-brain-routing.js
## ══════════════════════════════════════════

```javascript
#!/usr/bin/env node
// scripts/test-brain-routing.js — Validation comportementale statique du pipeline NS
// TRF-003 · INV-015
//
// Usage:
//   node scripts/test-brain-routing.js
//   node scripts/test-brain-routing.js --verbose
//   node scripts/test-brain-routing.js --check  → exit 1 si anomalies critiques

const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const NS_SRC = path.join(ROOT, 'immat-nervous-system.json');
const VERBOSE = process.argv.includes('--verbose');
const CHECK   = process.argv.includes('--check');

const ns = JSON.parse(fs.readFileSync(NS_SRC, 'utf8'));

function validateNSSchema(ns) {
  const required = ['organs', 'routing', 'inhibitions', 'invariants', 'ange_identity'];
  const errors = [];
  for (const field of required) {
    if (!ns[field] || typeof ns[field] !== 'object') {
      errors.push(`NS.${field} manquant ou invalide`);
    }
  }
  if (ns.organs && Object.keys(ns.organs).length === 0) {
    errors.push('NS.organs vide');
  }
  if (ns.ange_identity) {
    for (const f of ['posture', 'evaluation', 'limite']) {
      if (typeof ns.ange_identity[f] !== 'string' || !ns.ange_identity[f].trim()) {
        errors.push(`NS.ange_identity.${f} manquant ou vide`);
      }
    }
  }
  return errors;
}

function resolveRouting(question, routing) {
  const matches = [];
  const q = question.toLowerCase();
  for (const [keywords, organ] of Object.entries(routing)) {
    const kws = keywords.split('|').map(k => k.toLowerCase().trim());
    const matched = kws.filter(kw => {
      if (/^[a-zÀ-ɏ-]+$/i.test(kw)) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}[sx]?\\b`).test(q);
      }
      return q.includes(kw);
    });
    if (matched.length > 0) {
      matches.push({ organ, keywords: matched });
    }
  }
  return matches;
}

const TEST_CASES = [
  { q: "Pourquoi l'utilisateur reste bloqué après connexion ?", expect: "Auth" },
  { q: "Un conducteur reçoit une erreur lors de l'afterAuth", expect: "Auth" },
  { q: "La session expire sans que l'utilisateur soit déconnecté", expect: "Auth" },
  { q: "L'email de signup n'arrive pas", expect: "Auth" },
  { q: "Comment modifier le pseudo d'un conducteur ?", expect: "Profil" },
  { q: "Un utilisateur veut changer la couleur de sa plaque", expect: "Profil" },
  { q: "La plaque n'est pas sauvegardée après modification", expect: "Profil" },
  { q: "Les marqueurs ne s'affichent pas sur la carte", expect: "Carte" },
  { q: "La position GPS ne se met plus à jour", expect: "Carte" },
  { q: "Les voitures proches disparaissent de la carte", expect: "Carte" },
  { q: "Le marqueur du conducteur dévie de sa vraie position", expect: "Carte" },
  { q: "Un utilisateur ne reçoit pas les messages envoyés", expect: "Messages" },
  { q: "ImmatMessages ne charge pas les conversations", expect: "Messages" },
  { q: "L'envoi de message échoue silencieusement", expect: "Messages" },
  { q: "Les alertes routières ne s'affichent pas aux conducteurs proches", expect: "Signalements" },
  { q: "Le signalement SOS ne déclenche pas de notification", expect: "Signalements" },
  { q: "Un signalement ne disparaît pas après résolution", expect: "Signalements" },
  { q: "Comment une urgence est-elle transmise aux helpers ?", expect: "Signalements" },
  { q: "L'Ange ne répond pas à mes questions de configuration", expect: "Ange" },
  { q: "Le bouton angeFab n'apparaît pas pour le gardien", expect: "Ange" },
  { q: "Comment soumettre une proposition à l'Ange ?", expect: "Ange" },
  { q: "Le fab du Gardien est inaccessible sur mobile", expect: "Ange" },
  { q: "Pourquoi le bouton de signalement ne s'affiche pas ?", expect: null },
  { q: "Le bouton de l'Ange interfère avec un marqueur SVG", expect: null },
  { q: "L'application plante au démarrage sur iOS", expect: null },
  { q: "Le mode invisible ne fonctionne pas", expect: null },
  { q: "Les notifications push n'arrivent pas", expect: null },
  { q: "L'appel audio échoue immédiatement", expect: null },
  { q: "Comment réinitialiser le cache d'un conducteur ?", expect: null },
];

console.log(`\n${'═'.repeat(60)}`);
console.log(' VALIDATION COMPORTEMENTALE NS — ImmatConnect brain-dialog');
console.log(`${'═'.repeat(60)}\n`);

const schemaErrors = validateNSSchema(ns);
console.log(`1. SCHÉMA NS (_v:${ns._v})`);
schemaErrors.length === 0
  ? console.log('   ✓ Tous les champs obligatoires présents')
  : schemaErrors.forEach(e => console.log(`   ✗ ${e}`));
console.log();

const routingEntries = Object.entries(ns.routing);
const totalKeywords = routingEntries.reduce((acc, [k]) => acc + k.split('|').length, 0);
console.log(`2. ROUTING — ${routingEntries.length} groupes, ${totalKeywords} mots-clés, ${Object.keys(ns.organs).length} organes\n`);

console.log('3. TEST QUESTIONS GARDIEN');
const results = { ok: 0, conflict: 0, unrouted: 0, unexpected: 0 };
const unrouted = [], conflicts = [], unexpected = [];

for (const tc of TEST_CASES) {
  const matches = resolveRouting(tc.q, ns.routing);
  const organs  = [...new Set(matches.map(m => m.organ))];
  if (tc.expect === null) {
    if (organs.length > 1) { conflicts.push({ q: tc.q, organs, matches }); results.conflict++; }
    else if (organs.length === 0) { unrouted.push({ q: tc.q }); results.unrouted++; }
    else if (VERBOSE) console.log(`   ℹ  routé vers ${organs[0]} (unique) : "${tc.q.slice(0,60)}"`);
  } else {
    if (organs.length === 0) { unexpected.push({ q: tc.q, expect: tc.expect, got: 'AUCUN' }); results.unexpected++; }
    else if (!organs.includes(tc.expect)) { unexpected.push({ q: tc.q, expect: tc.expect, got: organs.join(', ') }); results.unexpected++; }
    else {
      results.ok++;
      if (organs.length > 1) { conflicts.push({ q: tc.q, organs, matches }); results.conflict++; }
      if (VERBOSE) {
        const kws = matches.map(m => m.keywords.join('+')).join(', ');
        console.log(`   ✓ [${organs[0]}] "${tc.q.slice(0,55)}" (via: ${kws})`);
      }
    }
  }
}

console.log(`   ✓ ${results.ok} correctement routées`);
if (results.conflict > 0) console.log(`   ⚠ ${results.conflict} conflits (2+ organes matchés)`);
if (results.unrouted > 0) console.log(`   ○ ${results.unrouted} non routées (lacune routing, attendu)`);
if (results.unexpected > 0) console.log(`   ✗ ${results.unexpected} routées vers mauvais organe`);
console.log();

if (conflicts.length > 0) {
  console.log('4. CONFLITS DE ROUTING (2+ organes)');
  conflicts.forEach(c => console.log(`   ⚠ [${c.organs.join(' + ')}] "${c.q.slice(0, 60)}"`));
  console.log();
}
if (unrouted.length > 0) {
  console.log('5. LACUNES ROUTING — questions sans mot-clé connu');
  unrouted.forEach(u => console.log(`   ○ "${u.q}"`));
  console.log(`   → Note : Claude route sémantiquement même sans mot-clé exact.`);
  console.log(`   → Envisager : appel|audio|webrtc|invisible|notification|cache\n`);
}
if (unexpected.length > 0) {
  console.log('6. ERREURS — questions routées vers le mauvais organe');
  unexpected.forEach(u => { console.log(`   ✗ Attendu [${u.expect}] → obtenu [${u.got}]`); console.log(`      "${u.q}"`); });
  console.log();
}

console.log('7. COUVERTURE ORGANES PAR LE ROUTING');
const organCoverage = {};
for (const organ of Object.keys(ns.organs)) organCoverage[organ] = { kws: 0, tests: 0 };
for (const [kwGroup, organ] of routingEntries) {
  if (organ in organCoverage) organCoverage[organ].kws += kwGroup.split('|').length;
}
for (const [organ, cov] of Object.entries(organCoverage)) {
  const tests = TEST_CASES.filter(tc => resolveRouting(tc.q, ns.routing).some(m => m.organ === organ)).length;
  console.log(`   ${organ.padEnd(14)} [${String(cov.kws).padStart(2)} mots-clés]  ${'█'.repeat(Math.min(tests,10)).padEnd(10)}  ${tests} questions`);
}
console.log(`\n   NOTE: NS en singulier — pluriels couverts par Claude (sémantique).`);

const critiques = schemaErrors.length + results.unexpected;
const total = TEST_CASES.filter(tc => tc.expect !== null).length;
console.log(`\n${'═'.repeat(60)}`);
console.log(` SCORE    : ${Math.round(results.ok/total*100)}% (${results.ok}/${total})`);
console.log(` SCHÉMA   : ${schemaErrors.length === 0 ? '✓ valide' : `✗ ${schemaErrors.length} erreur(s)`}`);
console.log(` CRITIQUE : ${critiques} ${critiques === 0 ? '(aucune anomalie)' : '(À CORRIGER)'}`);
console.log();

if (CHECK && critiques > 0) { console.error(`[test-brain-routing] ✗ ${critiques} anomalie(s)`); process.exit(1); }
if (CHECK) { console.log(`[test-brain-routing] ✓ Validation comportementale passée`); process.exit(0); }
```

---

## ══════════════════════════════════════════
## FICHIER COMPLET : scripts/validate-ns-refs.js
## ══════════════════════════════════════════

```javascript
#!/usr/bin/env node
// scripts/validate-ns-refs.js — DET-001 : vérification anchors symboliques NS
// TRF-003 · INV-015
//
// Usage:
//   node scripts/validate-ns-refs.js
//   node scripts/validate-ns-refs.js --verbose
//   node scripts/validate-ns-refs.js --check  → exit 1 si référence introuvable

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const NS_SRC  = path.join(ROOT, 'immat-nervous-system.json');
const HTML    = path.join(ROOT, 'index.html');
const VERBOSE = process.argv.includes('--verbose');
const CHECK   = process.argv.includes('--check');

const ns        = JSON.parse(fs.readFileSync(NS_SRC, 'utf8'));
const htmlLines = fs.readFileSync(HTML, 'utf8').split('\n');

function findInHtml(pattern) {
  for (let i = 0; i < htmlLines.length; i++) {
    if (htmlLines[i].includes(pattern)) return i + 1;
  }
  return null;
}

function resolveSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return { status: 'skip', detail: 'non-string' };
  if (symbol === 'module externe') return { status: 'ok', detail: 'non vérifiable' };
  if (symbol.startsWith('supabase/functions/')) return { status: 'ok', detail: 'edge function' };
  const appMatch = symbol.match(/^App\.([A-Za-z_]+)/);
  if (appMatch) {
    const fn = appMatch[1].replace(' (legacy)', '');
    const line = findInHtml(`${fn}(`);
    return line ? { status: 'ok', detail: `trouvé L${line}` } : { status: 'error', detail: `App.${fn} introuvable dans index.html` };
  }
  const fnMatch = symbol.match(/^fn\.([A-Za-z_]+)/);
  if (fnMatch) {
    const fn = fnMatch[1];
    const line = findInHtml(`function ${fn}(`) || findInHtml(`${fn}(`);
    return line ? { status: 'ok', detail: `trouvé L${line}` } : { status: 'error', detail: `fn.${fn} introuvable dans index.html` };
  }
  if (symbol.startsWith('db.')) return { status: 'ok', detail: 'Supabase (non vérifiable statiquement)' };
  const cssMatch = symbol.match(/^css\.(.+)/);
  if (cssMatch) {
    const sel = cssMatch[1].replace('#', '');
    const line = findInHtml(sel);
    return line ? { status: 'ok', detail: `trouvé L${line}` } : { status: 'warn', detail: `css ${sel} non trouvé` };
  }
  const idMatch = symbol.match(/^#([A-Za-z_-]+)/);
  if (idMatch) {
    const id = idMatch[1];
    const line = findInHtml(`id="${id}"`) || findInHtml(`id='${id}'`) || findInHtml(`$('${id}')`);
    return line ? { status: 'ok', detail: `trouvé L${line}` } : { status: 'error', detail: `#${id} introuvable dans index.html` };
  }
  const complexApp = symbol.match(/^App\.([A-Za-z_]+) > /);
  if (complexApp) {
    const fn = complexApp[1];
    const line = findInHtml(`${fn}(`);
    return line ? { status: 'ok', detail: `trouvé L${line}` } : { status: 'error', detail: `App.${fn} introuvable` };
  }
  return { status: 'warn', detail: `format inconnu : "${symbol}"` };
}

console.log(`\n${'═'.repeat(60)}`);
console.log(' VALIDATION ANCHORS SYMBOLIQUES NS — DET-001');
console.log(`${'═'.repeat(60)}\n`);

let ok = 0, errors = 0, warnings = 0;
const errorList = [];

for (const [organ, data] of Object.entries(ns.organs || {})) {
  const entry = data.entry || {};
  if (!Object.keys(entry).length) continue;
  if (VERBOSE) console.log(`\n${organ}:`);
  for (const [key, symbol] of Object.entries(entry)) {
    const result = resolveSymbol(String(symbol));
    if (result.status === 'ok') {
      ok++;
      if (VERBOSE) console.log(`   ✓ ${key} → ${symbol} (${result.detail})`);
    } else if (result.status === 'warn') {
      warnings++;
      if (VERBOSE) console.log(`   ⚠ ${key} → ${symbol} (${result.detail})`);
    } else if (result.status === 'error') {
      errors++;
      errorList.push({ organ, key, symbol, detail: result.detail });
      console.log(`   ✗ ${organ}.${key} → ${symbol}`);
      console.log(`     ${result.detail}`);
    }
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ✓ ${ok} anchors résolus`);
if (warnings > 0) console.log(`  ⚠ ${warnings} avertissements`);
console.log(errors > 0 ? `  ✗ ${errors} introuvables` : `  ✓ Aucun anchor introuvable`);
if (errors > 0) {
  console.log('\n  ANCHORS INTROUVABLES :');
  errorList.forEach(e => { console.log(`  · ${e.organ}.${e.key} → "${e.symbol}"`); console.log(`    ${e.detail}`); });
}
console.log();

if (CHECK && errors > 0) { console.error(`[validate-ns-refs] ✗ ${errors} anchor(s) introuvable(s)`); process.exit(1); }
if (CHECK) { console.log(`[validate-ns-refs] ✓ Tous les anchors NS résolus`); process.exit(0); }
```

---

## ══════════════════════════════════════════
## NS JSON — section organs[*].entry à remplacer
## Dans : immat-nervous-system.json
## Puis lancer : node scripts/sync-ns.js
## ══════════════════════════════════════════

Dans chaque organe, remplacer les valeurs `"index.html:LIGNE"` par :

```
Auth.entry.afterAuth       → "App.afterAuth"
Auth.entry.signup          → "App.signup"
Auth.entry.boot            → "fn.boot"

Profil.entry.saveProfile   → "App.saveProfile"
Profil.entry.upsert_profil → "db.profiles.upsert"

Carte.entry.icon           → "fn.icon"
Carte.entry.dot            → "fn.dot"
Carte.entry.initMap        → "App.initMap"
Carte.entry.locate         → "App.locate"
Carte.entry.loadOthers     → "App.loadOthers"

Messages.entry.startMsgs   → "App.startMsgs"
Messages.entry.sendMsg     → "App.sendMsg (legacy)"

Signalements.entry.roadReport               → "App.roadReport"
Signalements.entry.vehicleAlert             → "App.vehicleAlert"
Signalements.entry.subscribeCommunityReports → "App.subscribeCommunityReports"
Signalements.entry.addCommunityAlertMarker  → "App.addCommunityAlertMarker"

Ange.entry.angeFab_css       → "css.#angeFab"
Ange.entry.angeFab_afterAuth → "App.afterAuth > #angeFab"
Ange.entry.angeFab_openMap   → "App.openMap > #angeFab"
```

Après modification :
```bash
node scripts/sync-ns.js
```

---

## ══════════════════════════════════════════
## VÉRIFICATION FINALE
## ══════════════════════════════════════════

```bash
node scripts/sync-ns.js --check
node scripts/validate-ns-refs.js --check
node scripts/test-brain-routing.js --check
```

Les 3 commandes doivent terminer sans erreur.
