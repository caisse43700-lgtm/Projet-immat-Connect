import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';

// ── Configuration ─────────────────────────────────────────────────────────
// CLAUDE_MODEL peut être surchargé via secret Supabase pour éviter de toucher le code
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ── Système nerveux — graphe de navigation des organes ────────────────────
const NERVOUS_SYSTEM = {
  routing: {
    "marqueur|rond|icône|car-pin|voiture|icon|SVG": "Carte",
    "position|GPS|localisation|locate|watchPosition|heading": "Carte",
    "bouton|✦|angeFab|ange|gardien|fab": "Ange",
    "message|conversation|ImmatMessages|chMsg|envoi": "Messages",
    "alerte|signalement|route|report|SOS|urgence": "Signalements",
    "profil|pseudo|plaque|couleur|vehicle_color|phone": "Profil",
    "login|signup|auth|connexion|session|afterAuth": "Auth",
  },
  organs: {
    Auth:         { entry: { afterAuth: "index.html:507", signup: "index.html:502", boot: "index.html:1419" }, constraints: ["INV-010","INV-014"], deps: [], note: "get_my_role() lit raw_user_meta_data directement en DB, bypass JWT stale" },
    Profil:       { entry: { saveProfile: "index.html:549", upsert_profil: "index.html:530" }, constraints: ["INV-006","INV-007","INV-011"], deps: ["Auth"], note: "owner_plate immuable (INV-006). colorHex() utils.js = source canonique couleur" },
    Carte:        { entry: { icon: "index.html:409", locate: "index.html:554", loadOthers: "index.html:652" }, constraints: ["INV-005","INV-011","INV-012"], deps: ["Profil"], note: "icon() consommé par locate():554 et loadOthers():652. colorHex() = source fill" },
    Messages:     { entry: { startMsgs: "index.html:startMsgs", sendMsg: "index.html:sendMsg" }, constraints: ["INV-001","INV-004","INV-010"], deps: ["Auth"], note: "Canal INV-001 = véhicule uniquement" },
    Signalements: { entry: { roadReport: "index.html:roadReport", vehicleAlert: "index.html:vehicleAlert", subscribeCommunityReports: "index.html:896" }, constraints: ["INV-001","INV-002","INV-003","INV-004"], deps: ["Carte","Auth"], note: "Canal véhicule ≠ canal route ≠ canal aide — ne jamais croiser" },
    Ange:         { entry: { angeFab_css: "index.html:1907", angeFab_afterAuth: "index.html:520", angeFab_openMap: "index.html:550", edge_function: "supabase/functions/immat-brain-dialog/index.ts" }, constraints: ["INV-010","INV-014"], deps: ["Auth"], note: "S.isGardien depuis get_my_role() jamais du JWT. Fallback openMap() si undefined" },
  },
  inhibitions: {
    "S._authRunning": "Bloque ré-entrée dans afterAuth(). Libéré par finally{}.",
    "S._reporting":   "Bloque nouveau signalement pendant envoi en cours.",
  },
} as const;

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

SYSTÈME DE NAVIGATION — ORGANES D'IMMATCONNECT :
${JSON.stringify(NERVOUS_SYSTEM)}

Pour toute demande technique, traverse ce graphe avant de répondre :
1. Signal → routing (mots-clés) → organe identifié.
2. Organe → deps → organes dont il dépend.
3. Organe → entry → fichier:ligne exact du point d'intervention.
4. Organe → constraints → invariants à vérifier.
5. Si une seule interprétation survit → remplis le champ "route" et avance.
6. Si plusieurs interprétations restent → une seule question.
Ne parcours pas tout le code. Traverse le graphe.

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
- "route" : { signal, organ, entry, constraints[] } — pour les demandes techniques : organe identifié + point d'entrée code
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
  "route": { "signal": "mot-clé identifié", "organ": "Carte", "entry": "icon()@index.html:409", "constraints": ["INV-011"] },
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
