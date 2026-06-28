-- Migration : S6-TRUST V1 — report_feedback (journal de retours sur signalements)
--
-- Périmètre V1 : signalement VÉHICULE uniquement. Persiste le verdict du conducteur
-- concerné (aujourd'hui local-only) pour permettre au signaleur de voir
-- "✅ Confirmé par le conducteur" sur son signalement envoyé.
--
-- INVARIANTS (ADR S6-TRUST V1) :
--   INV-TRUST-001 : stockage unifié, SENS interprété par subject_type. Jamais de
--                   score unique fusionnant les domaines.
--   INV-TRUST-002 : aucune réputation/score visible ; on n'expose qu'un résultat
--                   d'événement précis (un comptage de confirmations).
--   INV-TRUST-003 : les évolutions enrichissent, ne redéfinissent jamais le sens.
--   INV-COM-015   : reporter_id / identités jamais exposés au client.
--
-- Polymorphe : subject_type ∈ {vehicle, route, aide}. SEUL 'vehicle' est actif en V1 ;
-- 'route' et 'aide' sont acceptés par le schéma mais non branchés (V1.1) — aucun
-- changement de schéma ne sera nécessaire pour les activer.
--
-- Migration ADDITIVE et idempotente. Ne touche NI vehicle_trust_scores (parqué)
-- NI driver_ratings (axe ⭐ séparé).

-- ============================================================
-- 1. Journal append-only report_feedback (source de vérité unique)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text        NOT NULL CHECK (subject_type IN ('vehicle','route','aide')),
  subject_id   text        NOT NULL,
  voter_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict      text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- un seul retour par personne et par signalement (anti multi-vote / spam)
  UNIQUE (subject_type, subject_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_report_feedback_subject
  ON public.report_feedback (subject_type, subject_id);

-- ============================================================
-- 2. RLS : aucun accès client direct — tout passe par les RPC
-- ============================================================
ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_feedback_select_blocked" ON public.report_feedback;
CREATE POLICY "report_feedback_select_blocked" ON public.report_feedback
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "report_feedback_insert_blocked" ON public.report_feedback;
CREATE POLICY "report_feedback_insert_blocked" ON public.report_feedback
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "report_feedback_update_blocked" ON public.report_feedback;
CREATE POLICY "report_feedback_update_blocked" ON public.report_feedback
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "report_feedback_delete_blocked" ON public.report_feedback;
CREATE POLICY "report_feedback_delete_blocked" ON public.report_feedback
  FOR DELETE USING (false);

-- ============================================================
-- 3. Écriture : RPC validé (SECURITY DEFINER contourne le deny-all RLS)
--    - voter_id = auth.uid()
--    - vocabulaire validé selon subject_type (V1 : vehicle uniquement)
--    - anti auto-vote : l'auteur d'un signalement ne peut pas le confirmer
--    - upsert : re-confirmer ne crée pas de doublon
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_report_feedback(
  p_subject_type text,
  p_subject_id   text,
  p_verdict      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_author uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentification requise';
  END IF;
  IF p_subject_type IS NULL OR p_subject_id IS NULL OR length(p_subject_id) = 0 THEN
    RETURN;
  END IF;

  IF p_subject_type = 'vehicle' THEN
    IF p_verdict NOT IN ('confirme','faux','disparu') THEN
      RAISE EXCEPTION 'verdict invalide pour vehicle: %', p_verdict;
    END IF;
    -- anti auto-vote : comparaison en texte (id message = uuid ou bigint)
    SELECT sender_id INTO v_author
      FROM messages
     WHERE id::text = p_subject_id
     LIMIT 1;
    IF v_author IS NOT NULL AND v_author = v_uid THEN
      RAISE EXCEPTION 'auto-vote interdit';
    END IF;
  ELSE
    -- route / aide : acceptés par le schéma mais non branchés en V1
    RAISE EXCEPTION 'subject_type non supporté en V1: %', p_subject_type;
  END IF;

  INSERT INTO report_feedback (subject_type, subject_id, voter_id, verdict, created_at)
  VALUES (p_subject_type, p_subject_id, v_uid, p_verdict, now())
  ON CONFLICT (subject_type, subject_id, voter_id) DO UPDATE SET
    verdict    = EXCLUDED.verdict,
    created_at = EXCLUDED.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_report_feedback(text, text, text) TO authenticated;

-- ============================================================
-- 4. Lecture : RPC de COMPTAGE uniquement (aucune identité de votant exposée)
--    Renvoie le nombre de confirmations par signalement.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_report_confirmations(p_subject_ids text[])
RETURNS TABLE (subject_id text, confirmed_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rf.subject_id, COUNT(*)::integer AS confirmed_count
    FROM report_feedback rf
   WHERE rf.subject_type = 'vehicle'
     AND rf.verdict = 'confirme'
     AND rf.subject_id = ANY(COALESCE(p_subject_ids, ARRAY[]::text[]))
   GROUP BY rf.subject_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_report_confirmations(text[]) TO authenticated;

-- ============================================================
-- 5. Auto-test structurel (échoue bruyamment si un objet manque)
--    Les tests FONCTIONNELS (auth requis) sont décrits ci-dessous et joués
--    via le harnais 2 appareils / un script de test authentifié.
-- ============================================================
DO $$
BEGIN
  ASSERT (SELECT to_regclass('public.report_feedback')) IS NOT NULL,
         'table report_feedback absente';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'submit_report_feedback'
  ), 'fonction submit_report_feedback absente';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_report_confirmations'
  ), 'fonction get_report_confirmations absente';
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.report_feedback'::regclass
       AND contype = 'u'
  ), 'contrainte UNIQUE(subject_type,subject_id,voter_id) absente';
  -- get sur un id inconnu = aucune ligne (affichage vide, pas d'erreur)
  ASSERT NOT EXISTS (
    SELECT 1 FROM get_report_confirmations(ARRAY['__inconnu__'])
  ), 'get_report_confirmations doit être vide pour un id inconnu';
  RAISE NOTICE '[report_feedback] auto-test structurel : OK';
END;
$$;

-- ── Tests fonctionnels minimaux (à jouer dans un contexte authentifié) ──
--  1. submit_report_feedback('vehicle', X, 'confirme') puis
--     get_report_confirmations([X]) → confirmed_count = 1
--  2. submit deux fois même (subject, voter) → toujours 1 (upsert/UNIQUE)
--  3. auto-vote (voter = sender du message X) → EXCEPTION 'auto-vote interdit'
--  4. verdict 'xxx' hors {confirme,faux,disparu} → EXCEPTION 'verdict invalide'
--  5. get sur id inconnu → 0 ligne (couvert ci-dessus)
--  6. get ne renvoie jamais voter_id (signature = subject_id, confirmed_count)
--  7. verdict 'faux'/'disparu' → n'incrémente PAS confirmed_count
