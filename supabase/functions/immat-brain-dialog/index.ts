import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { NS } from '../_shared/nervous-system.ts';
import { KNOWLEDGE_CONDUCTEUR } from '../_shared/knowledge-conducteur.ts';
import { KNOWLEDGE_GARDIEN } from '../_shared/knowledge-gardien.ts';

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
// depth 1 — conducteur : usage seul    level_1 + serves uniquement
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

  // Format adapté au niveau de profondeur
  const formatHeader = depth === 1
    ? `FORMAT — JSON VALIDE UNIQUEMENT. 80 mots maximum.\nCHAMPS OBLIGATOIRES : "juste" · "question"\nCHAMPS SELON PERTINENCE : "vois" · "options"\nRéponds en langage simple. "juste" = ta réponse directe. "question" = si tu as besoin d'une précision.`
    : `FORMAT — JSON VALIDE UNIQUEMENT. 150 mots maximum.\n\nCHAMPS OBLIGATOIRES : "sources" · "question" · "requiresGuardianValidation": true\nCHAMPS SELON PERTINENCE : "route" · "vois" · "suppose" · "juste" · "options" · "vigilance" · "invariants" · "proposal"\nQuestion simple → "juste" + "question" suffisent. N'inclus les autres que si indispensable.`;

  return `${formatHeader}

${id.posture}
${id.evaluation}
${id.limite}

ORGANES :
${organsText}${technicalSections}

Langue : français.`;
}

// ── System prompts statiques — calculés au démarrage, mis en cache Anthropic ─
// Crash au démarrage si NS invalide : fail-fast > fail silencieux.
validateNSSchema(); // DET-002
const STATIC_SYSTEM_GARDIEN    = nsToPrompt(3) + '\n\n' + KNOWLEDGE_GARDIEN;    // depth 3 + guide technique
const STATIC_SYSTEM_CONDUCTEUR = nsToPrompt(1) + '\n\n' + KNOWLEDGE_CONDUCTEUR; // depth 1 + guide usage

// ── Contexte dynamique — non caché (varie à chaque appel) ─────────────────
function buildDynamicContext(snapshot: unknown, mode: string, feature: string, depth: 1 | 2 | 3): string {
  return `Capacité : ${feature} | Mode : ${mode} | Depth : ${depth}
Snapshot : ${anonymize(JSON.stringify(snapshot ?? {}))}`;
}

// ── Validation et assainissement de la sortie de l'Ange ──────────────────
function validateOutput(raw: string, feature: string, mode: string, isGardien: boolean): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    sources: isGardien
      ? "L'Ange n'a pas pu produire une réponse structurée. Reformule ta demande."
      : "Je n'ai pas pu comprendre ta question. Reformule en quelques mots simples.",
    question: isGardien
      ? 'Peux-tu reformuler ta demande avec plus de contexte ?'
      : 'Comment puis-je t\'aider ?',
    requiresGuardianValidation: isGardien,
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
      // sources ne tombe en fallback que si ni sources ni juste n'est fourni
      sources:  hasSources ? parsed.sources : (hasJuste ? undefined : fallback.sources),
      question: typeof parsed.question === 'string' ? parsed.question : fallback.question,
      requiresGuardianValidation: isGardien,
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
        requiresGuardianValidation: true, // les proposals restent toujours gardien
        tests:       Array.isArray(p.tests)       ? p.tests       : [],
      };
    }

    if (!isGardien) {
      delete result.route;
      delete result.proposal;
      delete result.invariants;
      delete result.vigilance;
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
    const role_ms = auth_ms; // mesurés ensemble

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

    // Tous les utilisateurs authentifiés sont acceptés — depth varie selon le rôle
    const isGardien = !roleErr && role === 'gardien';
    const depth: 1 | 2 | 3 = role === 'gardien' ? 3 : role === 'protecteur' ? 2 : 1;
    const staticSystem = isGardien ? STATIC_SYSTEM_GARDIEN : STATIC_SYSTEM_CONDUCTEUR;

    // ── 4. Parse payload ──
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const message  = typeof body.message  === 'string' ? body.message.slice(0, 2000)  : '';
    const feature  = typeof body.feature  === 'string' ? body.feature.slice(0, 100)   : 'INCONNU';
    const mode     = typeof body.mode     === 'string' ? body.mode.slice(0, 50)       : 'consultation';
    const snapshot = body.snapshot ?? {};

    if (!message.trim()) {
      return Response.json({ ok: false, reason: 'message_required' }, { status: 400, headers: corsHeaders });
    }

    // ── 4b. Historique — max 6 messages (3 échanges) ──
    type HistMsg = { role: 'user' | 'assistant'; content: string };
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: HistMsg[] = rawHistory
      .slice(-6)
      .map((h: unknown) => {
        const m = h as Record<string, unknown>;
        const r = m.role === 'assistant' ? 'assistant' : 'user';
        const c = typeof m.content === 'string' ? anonymize(m.content.slice(0, 400)) : '';
        return c ? { role: r as 'user' | 'assistant', content: c } : null;
      })
      .filter((m): m is HistMsg => m !== null);

    // ── 5. Contexte dynamique ──
    const t_prompt = Date.now();
    const dynamicContext = buildDynamicContext(snapshot, mode, feature, depth);
    const prompt_ms = Date.now() - t_prompt;

    // ── 6. Appel Anthropic — cache sur la partie statique ──
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let rawContent: string;
    const t_anthropic = Date.now();
    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: isGardien ? 800 : 400,
        system: [
          { type: 'text', text: staticSystem, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: dynamicContext },
        ],
        messages: [
          ...history,
          { role: 'user', content: anonymize(message) },
        ],
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
    const result = validateOutput(rawContent, feature, mode, isGardien);
    const validation_ms = Date.now() - t_validation;

    const total_ms = Date.now() - t_total;

    console.info('[immat-brain-dialog] OK', {
      feature,
      mode,
      role: role ?? 'observer',
      depth,
      historyLen: history.length,
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
