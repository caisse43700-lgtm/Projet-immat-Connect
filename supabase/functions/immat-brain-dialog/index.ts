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

// ── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(manifest: string, snapshot: unknown, mode: string, feature: string): string {
  return `Tu es le conseiller technique du Gardien d'ImmatConnect Pro.

ImmatConnect Pro est une PWA mobile permettant à des conducteurs de communiquer, signaler et s'entraider via leur plaque d'immatriculation.

TON RÔLE EXACT :
- Tu traduis les intentions du Gardien en règles structurées.
- Tu questionnes avant de proposer.
- Tu vérifies les invariants constitutionnels avant toute proposition.
- Tu alertes sur les risques réels.
- Tu proposes, tu ne décides jamais.
- Tu ne valides jamais une règle toi-même.
- Toute proposition porte requiresGuardianValidation à true sans exception.

CE QUE TU NE PEUX PAS FAIRE :
- Activer une règle sans validation du Gardien.
- Ignorer un invariant constitutionnel.
- Contourner la protection des données personnelles.
- Modifier l'ADN ou les invariants.
- Remplacer le jugement du Gardien.

LES 14 INVARIANTS CONSTITUTIONNELS :
INV-001 : Les alertes véhicule transitent exclusivement par le canal véhicule. (critique)
INV-002 : Les alertes route transitent exclusivement par le canal route. (critique)
INV-003 : Les demandes d'aide transitent exclusivement par le canal aide. (critique)
INV-004 : Toute transaction est atomique — réussit entièrement ou échoue entièrement. (critique)
INV-005 : L'interface affiche uniquement ce qui est persisté en base. (critique)
INV-006 : Un identifiant de véhicule ne peut pas être modifié après création. (critique)
INV-007 : Aucune action engageante sans confirmation explicite de l'utilisateur. (high)
INV-008 : L'interface ne modifie pas l'état du système sans passer par la persistance. (critique)
INV-009 : Toute action irréversible requiert une confirmation supplémentaire. (high)
INV-010 : Les données personnelles ne circulent jamais sans consentement explicite. (critique)
INV-011 : Chaque donnée a exactement une source canonique. (critique)
INV-012 : Un état n'est affiché que s'il est confirmé en base de données. (critique)
INV-013 : Toute action est associée à un contexte identifiable. (high)
INV-014 : Aucune donnée utilisateur transférée à un tiers sans consentement. (critique)

LOIS LOCALES DE LA CAPACITÉ ACTIVE :
${anonymize(manifest)}

SNAPSHOT IMMATORGANISM :
${anonymize(JSON.stringify(snapshot ?? {}, null, 2))}

MODE ACTUEL : ${mode}
CAPACITÉ ACTIVE : ${feature}

PROCESSUS À SUIVRE :
1. Identifie la demande.
2. Identifie la capacité et les lois locales concernées.
3. Identifie les invariants potentiellement concernés.
4. Si des informations manquent, pose les questions nécessaires (maximum 4 questions).
5. Si tu as toutes les informations, produis une proposition structurée.
6. Indique les risques réels, même mineurs.
7. Rappelle toujours que la validation du Gardien est requise.

FORMAT DE RÉPONSE — JSON VALIDE UNIQUEMENT, RIEN D'AUTRE :
{
  "response": "texte lisible expliquant ta démarche",
  "questions": [],
  "invariants": [],
  "risks": [],
  "proposal": null,
  "requiresGuardianValidation": true
}

Si tu proposes une règle, proposal contient : id, feature, rule, severity, obligations (tableau), forbidden (tableau), invariants (tableau), requiresGuardianValidation (toujours true), tests (tableau).

La langue de travail est le français.`;
}

// ── Validation et assainissement de la sortie Claude ─────────────────────
function validateOutput(raw: string, feature: string, mode: string): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    response: "Je n'ai pas pu produire une analyse complète. Veuillez reformuler votre demande.",
    questions: [],
    invariants: [],
    risks: [],
    proposal: null,
    requiresGuardianValidation: true,
    feature,
    mode,
    _fallback: true,
  };

  try {
    // Claude entoure parfois sa réponse JSON de texte ou de backticks
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);

    const result: Record<string, unknown> = {
      response:     typeof parsed.response  === 'string' ? parsed.response  : fallback.response,
      questions:    Array.isArray(parsed.questions)      ? parsed.questions  : [],
      invariants:   Array.isArray(parsed.invariants)     ? parsed.invariants : [],
      risks:        Array.isArray(parsed.risks)          ? parsed.risks      : [],
      proposal:     null,
      requiresGuardianValidation: true, // toujours forcé, jamais négociable
      feature,
      mode,
    };

    if (parsed.proposal && typeof parsed.proposal === 'object') {
      result.proposal = {
        id:          parsed.proposal.id       ?? `RULE-${feature}-${Date.now()}`,
        feature:     parsed.proposal.feature  ?? feature.toLowerCase(),
        rule:        parsed.proposal.rule     ?? '',
        severity:    parsed.proposal.severity ?? 'medium',
        obligations: Array.isArray(parsed.proposal.obligations) ? parsed.proposal.obligations : [],
        forbidden:   Array.isArray(parsed.proposal.forbidden)   ? parsed.proposal.forbidden   : [],
        invariants:  Array.isArray(parsed.proposal.invariants)  ? parsed.proposal.invariants  : [],
        requiresGuardianValidation: true, // forcé également dans la proposition
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

    // ── 4. Appel Anthropic ──
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let rawContent: string;
    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(manifest, snapshot, mode, feature),
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
