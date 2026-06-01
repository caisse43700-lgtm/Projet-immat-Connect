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

// ── Transformation NS → prompt lisible (INV-015) ──────────────────────────
// Source unique : _shared/nervous-system.ts (dérivé de immat-nervous-system.json)
// Ne jamais écrire ce texte à la main — modifier la source, pas ce fichier.
function nsToPrompt(): string {
  // Guards : crash au démarrage plutôt qu'en production
  const organs     = NS.organs     as Record<string, { entry?: Record<string, string>; constraints?: string[]; deps?: string[] }>;
  const routing    = NS.routing    as Record<string, string>;
  const inhibitions = NS.inhibitions as Record<string, string>;
  const invariants = NS.invariants  as Record<string, { label: string; severity: string }>;
  const id         = NS.ange_identity;

  if (!organs || !routing || !inhibitions || !invariants || !id) {
    throw new Error('[nsToPrompt] NS schema invalide — vérifier _shared/nervous-system.ts');
  }

  const organsText = Object.entries(organs).map(([name, o]) => {
    const keywords = Object.entries(routing)
      .filter(([, v]) => v === name)
      .map(([k]) => k)
      .join('|');
    const entry = o.entry ?? {};
    const entries = Object.entries(entry)
      .map(([k, v]) => `${k}@${String(v).replace('index.html:', '')}`)
      .join(' · ');
    const constraints = (o.constraints ?? []).join('·');
    const deps = (o.deps ?? []).length ? `deps:[${(o.deps ?? []).join(',')}]` : 'deps:[]';
    return `${name} [${keywords}]\n  ${entries} · ${constraints} · ${deps}`;
  }).join('\n\n');

  const inhibitionsText = Object.entries(inhibitions)
    .map(([k, v]) => `${k} → ${v}`)
    .join('\n');

  const invariantsText = Object.entries(invariants)
    .map(([k, v]) => `${k}:${v.label} (${v.severity})`)
    .join('\n');

  return `FORMAT — JSON VALIDE UNIQUEMENT. 150 mots maximum.

CHAMPS OBLIGATOIRES : "sources" · "question" · "requiresGuardianValidation": true
CHAMPS SELON PERTINENCE : "route" · "vois" · "suppose" · "juste" · "options" · "vigilance" · "invariants" · "proposal"

${id.posture}
${id.evaluation}
${id.limite}

ORGANES :
${organsText}

INHIBITIONS :
${inhibitionsText}

INVARIANTS :
${invariantsText}

Traversée obligatoire pour technique : Signal→routing→organe→deps→entry→constraints.

Langue : français.`;
}

// ── System prompt statique — calculé au démarrage, mis en cache Anthropic ─
// Crash au démarrage si NS invalide : fail-fast > fail silencieux.
const STATIC_SYSTEM = nsToPrompt();

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

    const result: Record<string, unknown> = {
      sources:  typeof parsed.sources  === 'string' ? parsed.sources  : fallback.sources,
      question: typeof parsed.question === 'string' ? parsed.question : fallback.question,
      requiresGuardianValidation: true,
      feature,
      mode,
    };

    if (typeof parsed.vois   === 'string' && parsed.vois.trim())    result.vois      = parsed.vois;
    if (typeof parsed.juste  === 'string' && parsed.juste.trim())   result.juste     = parsed.juste;
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

    const t_auth = Date.now();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    const auth_ms = Date.now() - t_auth;

    if (authErr || !user) {
      console.warn('[immat-brain-dialog] Auth échouée.', authErr?.message ?? 'user null');
      return Response.json({ ok: false, reason: 'unauthenticated' }, { status: 401, headers: corsHeaders });
    }

    // ── 3. Contrôle rôle via RPC — évite le JWT stale (INV-010) ──
    const t_role = Date.now();
    const { data: role, error: roleErr } = await sb.rpc('get_my_role');
    const role_ms = Date.now() - t_role;

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
