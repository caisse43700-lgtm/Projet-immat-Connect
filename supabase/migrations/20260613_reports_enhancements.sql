-- Migration : enrichissement table reports pour le cycle de vie complet
-- Sprint 2 S2-4 — ImmatConnect Pro
--
-- Colonnes ajoutées :
--   seen_at       : timestamp quand le destinataire a vu le signalement
--   actioned_at   : timestamp quand le destinataire a agi (répondu, marqué résolu…)
--   urgency_level : 'low' | 'medium' | 'high' | 'critical'
--   target_plate  : plaque du destinataire direct (peut différer de plate pour ROUTE/CONDUCTEURS)
--   resolved_at   : timestamp résolution (certains inserts omettaient cette colonne)
--
-- Idempotent : utilise IF NOT EXISTS / DO $$ ... IF NOT EXISTS

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS seen_at        timestamptz,
  ADD COLUMN IF NOT EXISTS actioned_at    timestamptz,
  ADD COLUMN IF NOT EXISTS urgency_level  text CHECK (urgency_level IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS target_plate   text,
  ADD COLUMN IF NOT EXISTS resolved_at    timestamptz;

-- Index pour requêtes courantes
CREATE INDEX IF NOT EXISTS reports_seen_at_idx     ON public.reports (seen_at)     WHERE seen_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_urgency_idx     ON public.reports (urgency_level);
CREATE INDEX IF NOT EXISTS reports_target_plate_idx ON public.reports (target_plate) WHERE target_plate IS NOT NULL;

-- Valeur par défaut urgency_level selon reason (optionnel, rétrocompatible)
-- UPDATE public.reports SET urgency_level = 'high'
--   WHERE reason ILIKE '%urgent%' OR reason ILIKE '%pneu%' OR reason ILIKE '%fumée%'
--   AND urgency_level IS NULL;

COMMENT ON COLUMN public.reports.seen_at      IS 'Timestamp où le destinataire a ouvert/vu ce signalement';
COMMENT ON COLUMN public.reports.actioned_at  IS 'Timestamp où le destinataire a agi (répondu, résolu…)';
COMMENT ON COLUMN public.reports.urgency_level IS 'Niveau d''urgence : low | medium | high | critical';
COMMENT ON COLUMN public.reports.target_plate IS 'Plaque du destinataire direct (différent de plate pour ROUTE/CONDUCTEURS)';
COMMENT ON COLUMN public.reports.resolved_at  IS 'Timestamp de résolution (set quand status = resolved)';
