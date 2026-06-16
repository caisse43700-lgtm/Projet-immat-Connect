-- Migration : ajoute les colonnes de position manquantes sur reports
-- saveReportRemote() (index.html) envoie systématiquement latitude/longitude
-- depuis le tout premier déploiement, mais la table reports n'a jamais eu
-- ces colonnes (confirmé via information_schema.columns, 12/06/16) :
-- les inserts retombaient donc sur un fallback sans position (tier T3/T4),
-- et la position des signalements n'était jamais persistée — seul le
-- broadcast Realtime (reçu en direct) la transportait. Tout signalement
-- relu depuis la base (reload, reconnexion, postgres_changes) la perdait.
-- Idempotente.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN public.reports.latitude  IS 'Latitude GPS du signalement au moment de l''envoi';
COMMENT ON COLUMN public.reports.longitude IS 'Longitude GPS du signalement au moment de l''envoi';

-- Vue public_reports : ré-expose désormais latitude/longitude (colonnes
-- réelles, vérifiées) — toujours sans reporter_id (INV-COM-015).
DROP VIEW IF EXISTS public.public_reports;
CREATE VIEW public.public_reports AS
  SELECT
    id,
    plate,
    reason,
    category,
    latitude,
    longitude,
    status,
    created_at,
    urgency_level,
    target_plate,
    resolved_at,
    seen_at,
    actioned_at
  FROM public.reports;

GRANT SELECT ON public.public_reports TO authenticated;
