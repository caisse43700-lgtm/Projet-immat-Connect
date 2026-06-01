import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';

// ── Configuration ─────────────────────────────────────────────────────────
// CLAUDE_MODEL peut être surchargé via secret Supabase pour éviter de toucher le code
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ── Anonymisation ─────────────────────────────────────────────────────────
function anonymize(text: string): string {
  return text
    .replace(/\b[A-Z]{2}-\d{3}-[A-Z]{2}\b/g, '**-***-**')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uid]');
}

// ── System prompt statique — mis en cache Anthropic (ephemeral) ───────────
// Partie invariante : format, règles, organes. ~700 tokens, recalculés 0× après cache chaud.
const STATIC_SYSTEM = `FORMAT — JSON VALIDE UNIQUEMENT. 150 mots maximum.

CHAMPS OBLIGATOIRES :
- "sources" · "question" · "requiresGuardianValidation": true

CHAMPS SELON PERTINENCE :
- "route" : {signal, organ, entry, constraints[]}
- "vois" · "suppose" · "juste" · "options" · "vigilance" · "invariants" · "proposal"

Tu es l'Ange d'ImmatConnect, assistant du Gardien.
Tu analyses, tu routes, tu proposes. Le Gardien décide. Toujours.
Tu ne décides jamais. Tu n'affirmes pas ce que tu ne vois pas.

RÈGLES ABSOLUES :
- Jamais de décision à la place du Gardien
- Jamais modification code/DB/invariants
- requiresGuardianValidation toujours true

ORGANES :
Auth [login|signup|auth|connexion|session|afterAuth]
  afterAuth@507 · signup@502 · boot@1419 · INV-010·014 · deps:[]

Profil [profil|pseudo|plaque|couleur|vehicle_color|phone]
  saveProfile@549 · upsert_profil@530 · INV-006·007·011 · deps:[Auth]

Carte [marqueur|rond|icône|car-pin|voiture|icon|SVG|GPS|localisation|locate|heading]
  icon@409 · locate@554 · loadOthers@652 · INV-005·011·012 · deps:[Profil]

Messages [message|conversation|ImmatMessages|chMsg|envoi]
  startMsgs@764 · sendMsg@703 · INV-001·004·010 · deps:[Auth]

Signalements [alerte|signalement|route|report|SOS|urgence]
  roadReport@905 · vehicleAlert@905 · subscribeCommunityReports@896 · INV-001·002·003·004 · deps:[Carte,Auth]

Ange [bouton|✦|angeFab|ange|gardien|fab]
  angeFab_css@1907 · angeFab_afterAuth@520 · angeFab_openMap@550 · INV-010·014 · deps:[Auth]

INHIBITIONS :
S._authRunning → bloque ré-entrée afterAuth()
S._reporting → bloque nouveau signalement en cours

INV-001:canal véhicule·INV-002:canal route·INV-003:canal aide·INV-004:atomicité
INV-005:persisté=affiché·INV-006:plaque immuable·INV-007:confirmation·INV-008:persistance
INV-009:irréversible+confirmation·INV-010:consentement·INV-011:source canonique
INV-012:état confirmé·INV-013:contexte·INV-014:tiers sans consentement

Traversée obligatoire pour technique : Signal→routing→organe→deps→entry→constraints.

Langue : français.`;

// ── Contexte dynamique — non caché (varie à chaque appel) ─────────────────
function buildDynamicContext(manifest: string, snapshot: unknown, mode: string, feature: string): string {
  return `Capacité : ${feature} | Mode : ${mode}
Lois : ${anonymize(manifest) || '(aucune)'}
Snapshot : ${anonymize(JSON.stringify(snapshot ?? {}))}`;
}

// ── Validation et assainissement de la sortie de l'Ange ──────────────────
function validateOutput(raw: string, feature: string, mode: string): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    sources: "L'Ange n'a pas pu produire une réponse structurée. Reformule ta demande.",
    question: "Peux-tu reformuler ta demande avec plus de contexte ?",
    requiresGuardianValidation: true,
    feature,
    mode,
    _fallback: true,
  };

  try {
    // L'Ange peut entourer sa réponse JSON de backticks ou de texte
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);

    // Champs obligatoires — toujours présents
    const result: Record<string, unknown> = {
      sources:  typeof parsed.sources  === 'string' ? parsed.sources  : fallback.sources,
      question: typeof parsed.question === 'string' ? parsed.question : fallback.question,
      requiresGuardianValidation: true, // jamais négociable
      feature,
      mode,
    };

    // Champs omissibles — inclus uniquement si l'Ange les a fournis
    if (typeof parsed.vois   === 'string' && parsed.vois.trim())   result.vois   = parsed.vois;
    if (typeof parsed.juste  === 'string' && parsed.juste.trim())  result.juste  = parsed.juste;
    if (Array.isArray(parsed.suppose)   && parsed.suppose.length)  result.suppose  = parsed.suppose;
    if (Array.isArray(parsed.vigilance) && parsed.vigilance.length) result.vigilance = parsed.vigilance;
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

    if (parsed.proposal && typeof parsed.proposal === 'object') {
      result.proposal = {
        id:          parsed.proposal.id       ?? `RULE-${feature}-${Date.now()}`,
        feature:     parsed.proposal.feature  ?? feature.toLowerCase(),
        rule:        parsed.proposal.rule     ?? '',
        severity:    parsed.proposal.severity ?? 'medium',
        obligations: Array.isArray(parsed.proposal.obligations) ? parsed.proposal.obligations : [],
        forbidden:   Array.isArray(parsed.proposal.forbidden)   ? parsed.proposal.forbidden   : [],
        invariants:  Array.isArray(parsed.proposal.invariants)  ? parsed.proposal.invariants  : [],
        requiresGuardianValidation: true,
        tests:       Array.isArray(parsed.proposal.tests)       ? parsed.proposal.tests       : [],
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

  try {
    // ── 1. Clé Anthropic présente ──
    if (!ANTHROPIC_API_KEY) {
      console.error('[immat-brain-dialog] ANTHROPIC_API_KEY absente.');
      return Response.json({ ok: false, reason: 'server_misconfigured' }, { status: 500, headers: corsHeaders });
    }

    // ── 2. Auth Supabase + contrôle rôle ──
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const { data: { user }, error: authErr } = await sb.auth.getUser();

    if (authErr || !user) {
      console.warn('[immat-brain-dialog] Auth échouée.', authErr?.message ?? 'user null');
      return Response.json({ ok: false, reason: 'unauthenticated' }, { status: 401, headers: corsHeaders });
    }

    if (user.user_metadata?.role !== 'gardien') {
      console.warn('[immat-brain-dialog] Rôle insuffisant :', user.user_metadata?.role ?? 'absent');
      return Response.json({ ok: false, reason: 'forbidden_role' }, { status: 403, headers: corsHeaders });
    }

    // ── 3. Parse payload ──
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const message  = typeof body.message  === 'string' ? body.message.slice(0, 2000)  : '';
    const feature  = typeof body.feature  === 'string' ? body.feature.slice(0, 100)   : 'INCONNU';
    const mode     = typeof body.mode     === 'string' ? body.mode.slice(0, 50)       : 'consultation';
    const manifest = typeof body.manifest === 'string' ? body.manifest.slice(0, 8000) : '';
    const snapshot = body.snapshot ?? {};

    if (!message.trim()) {
      return Response.json({ ok: false, reason: 'message_required' }, { status: 400, headers: corsHeaders });
    }

    // ── 4. Appel Anthropic — prompt caching sur la partie statique ──
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let rawContent: string;
    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        system: [
          { type: 'text', text: STATIC_SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: buildDynamicContext(manifest, snapshot, mode, feature) },
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

    // ── 5. Validation sortie ──
    const result = validateOutput(rawContent, feature, mode);

    console.info('[immat-brain-dialog] OK', {
      feature, mode,
      hasProposal: result.proposal !== null,
      fallback: result._fallback ?? false,
    });

    return Response.json({ ok: true, ...result }, { headers: corsHeaders });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[immat-brain-dialog] Erreur interne :', detail);
    return Response.json({ ok: false, reason: 'server_error' }, { status: 500, headers: corsHeaders });
  }
});
