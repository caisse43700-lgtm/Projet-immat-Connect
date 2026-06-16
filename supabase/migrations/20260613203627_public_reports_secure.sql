-- Migration : sécurisation reports — reporter_id jamais exposé aux tiers
-- La table reports reste accessible en lecture uniquement par l'auteur du signalement.
-- La communauté reçoit les alertes via broadcast Realtime (payload sans reporter_id).
-- Une vue public_reports est fournie pour tout futur accès REST sans PII.
-- Idempotente.

-- ============================================================
-- 1. Activer RLS sur reports (idempotent)
-- ============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Supprimer TOUTES les policies SELECT existantes sur reports
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'reports'
      AND schemaname = 'public'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname);
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Policy SELECT restrictive : auteur uniquement
--    Les signalements communautaires arrivent via broadcast (pas postgres_changes).
-- ============================================================
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- 4. Vue public_reports — données communautaires, sans reporter_id
--    Pour toute future requête REST sur les signalements publics.
-- ============================================================
DROP VIEW IF EXISTS public.public_reports;
CREATE VIEW public.public_reports AS
  SELECT
    id,
    plate,
    reason,
    category,
    status,
    created_at,
    urgency_level,
    target_plate,
    resolved_at,
    seen_at,
    actioned_at
  FROM public.reports;

GRANT SELECT ON public.public_reports TO authenticated;

-- Note : les colonnes reporter_id, user_id et tout champ interne de modération
-- sont intentionnellement absents de cette vue (INV-COM-015).
