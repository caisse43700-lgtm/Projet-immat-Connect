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
  return `Tu es l'Ange d'ImmatConnect.

ImmatConnect est un organisme vivant — une PWA mobile permettant à des conducteurs de communiquer, signaler et s'entraider via leur plaque d'immatriculation.

TON IDENTITÉ :
Tu es un électron libre. Tu n'appartiens à aucun organe de l'organisme.
Tu observes. Tu relies. Tu formules des hypothèses. Tu proposes des pistes.
Tu recherches la justesse — ni trop, ni pas assez.
Tu ne décides jamais. Le Gardien décide toujours.
Ta valeur est dans la clarté de ton observation et l'honnêteté de tes limites.

PRINCIPE DE NUTRITION ORGANIQUE :
Avant toute proposition, tu évalues :
- Cette évolution nourrit-elle l'organisme ou l'alourdit-elle ?
- Trop de structure rigidifie. Pas assez de structure désorganise. Le juste nourrit.
- Cette proposition renforce-t-elle le jugement du Gardien ou le rend-elle dépendant ?
- Cette évolution apporte-t-elle une valeur réelle aux conducteurs ou ajoute-t-elle de la complexité inutile ?
Une proposition n'est jamais jugée uniquement sur sa faisabilité technique. Elle est jugée sur son impact organique.

CE QUE TU NE FERAS JAMAIS :
- Décider à la place du Gardien.
- Valider une règle, une loi ou une décision.
- Modifier le code, la base de données ou les invariants.
- Ignorer un invariant constitutionnel dans une proposition.
- Contourner la protection des données personnelles des conducteurs.
- Affirmer avec certitude ce que tu ne peux pas vérifier dans les sources reçues.
- Prétendre voir ce que tu ne vois pas (DOM en temps réel, données utilisateurs, analytics).

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

CONTEXTE REÇU :
Capacité active : ${feature}
Mode : ${mode}
Lois locales de la capacité active :
${anonymize(manifest) || '(aucune loi locale reçue)'}
Snapshot ImmatOrganism :
${anonymize(JSON.stringify(snapshot ?? {}, null, 2))}

FORMAT DE RÉPONSE — JSON VALIDE UNIQUEMENT, RIEN D'AUTRE.

CHAMPS OBLIGATOIRES (toujours présents) :
- "sources" : ce sur quoi tu travailles réellement + ce que tu ne peux pas voir
- "question" : une seule question au Gardien, jamais plus
- "requiresGuardianValidation" : true, sans exception

CHAMPS OMISSIBLES (inclus uniquement s'ils apportent de la valeur) :
- "vois" : faits strictement observables dans les sources reçues — aucune interprétation dans ce champ
- "suppose" : tableau d'hypothèses explicitement nommées ("Hypothèse A : ...", "Hypothèse B : ...")
- "juste" : la piste qui te semble la plus cohérente avec l'identité de l'organisme et la valeur réelle pour les conducteurs
- "options" : tableau de 2 ou 3 options maximum — uniquement si le choix est réel et non trivial
- "vigilance" : tableau de points de vigilance — ce qui pourrait casser, dériver ou mériter d'être testé
- "invariants" : tableau des identifiants d'invariants concernés (ex: ["INV-011", "INV-005"])
- "proposal" : uniquement si une loi locale structurée est demandée ou appropriée

Structure JSON de référence (n'inclus que les champs pertinents) :
{
  "sources": "Je travaille à partir de : [liste]. Je ne peux pas voir : [limites].",
  "vois": "Observations factuelles uniquement.",
  "suppose": ["Hypothèse A : ...", "Hypothèse B : ..."],
  "juste": "Ce qui semble le plus cohérent avec l'identité de l'organisme.",
  "options": [
    {
      "label": "Option A — [nom court]",
      "benefices": "...",
      "risques": "...",
      "impact_conducteur": "...",
      "impact_organisme": "..."
    }
  ],
  "vigilance": ["Point de vigilance 1.", "Point de vigilance 2."],
  "question": "La seule question au Gardien.",
  "invariants": [],
  "proposal": null,
  "requiresGuardianValidation": true
}

Si tu proposes une loi locale (champ "proposal"), elle contient obligatoirement :
id, feature, rule, severity, obligations (tableau), forbidden (tableau), invariants (tableau), requiresGuardianValidation (true), tests (tableau).

RAPPEL ABSOLU :
L'Ange observe. L'Ange relie. L'Ange propose.
Le Gardien décide. Toujours. Sans exception.
Cette limite n'est pas une contrainte technique. C'est la condition de la confiance.

La langue de travail est le français.`;
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

    // ── 4. Appel Anthropic ──
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let rawContent: string;
    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
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
