-- Migration : S6-TRUST auto-refresh
-- Ajoute is_disputed sur reports + trigger de recalcul automatique
-- Idempotent (IF NOT EXISTS / CREATE OR REPLACE)

-- 1. Colonne is_disputed (booléen, false par défaut)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS is_disputed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reports_disputed
  ON public.reports (reporter_id)
  WHERE is_disputed = true;

COMMENT ON COLUMN public.reports.is_disputed IS
  'True quand ce signalement a été contesté par le destinataire';

-- 2. Fonction trigger : recalcule le score de confiance du reporter
--    quand status ou is_disputed change sur un de ses signalements.
--    SECURITY DEFINER : refresh_vehicle_trust() accède à profiles sans exposer auth.users.
CREATE OR REPLACE FUNCTION public._trg_report_trust_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plate text;
BEGIN
  SELECT owner_plate INTO v_plate
  FROM public.profiles
  WHERE id = COALESCE(NEW.reporter_id, OLD.reporter_id)
  LIMIT 1;

  IF v_plate IS NOT NULL THEN
    PERFORM public.refresh_vehicle_trust(v_plate);
  END IF;

  RETURN NULL; -- trigger AFTER, valeur ignorée
END;
$$;

-- 3. Trigger : se déclenche uniquement quand status ou is_disputed change réellement
DROP TRIGGER IF EXISTS trg_report_trust_refresh ON public.reports;

CREATE TRIGGER trg_report_trust_refresh
AFTER UPDATE OF status, is_disputed ON public.reports
FOR EACH ROW
WHEN (
  OLD.status       IS DISTINCT FROM NEW.status
  OR OLD.is_disputed IS DISTINCT FROM NEW.is_disputed
)
EXECUTE FUNCTION public._trg_report_trust_refresh();
