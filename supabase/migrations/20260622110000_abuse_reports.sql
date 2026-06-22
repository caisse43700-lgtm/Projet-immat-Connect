-- Migration : abuse_reports — signalements utilisateur
-- RLS : INSERT authentifié uniquement (reporter_uid = auth.uid())
--       SELECT / UPDATE / DELETE interdits côté app
-- Idempotent (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_uid   uuid        NOT NULL REFERENCES auth.users(id),
  reported_plate text        NOT NULL,
  category       text        NOT NULL,
  details        text,
  status         text        NOT NULL DEFAULT 'open',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index admin
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter
  ON public.abuse_reports (reporter_uid);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_plate
  ON public.abuse_reports (reported_plate);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_status
  ON public.abuse_reports (status);

-- RLS
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

-- INSERT : utilisateur connecté, reporter_uid forcément égal à auth.uid()
CREATE POLICY "abuse_reports_insert" ON public.abuse_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_uid = auth.uid());

-- Aucune politique SELECT / UPDATE / DELETE → accès refusé côté app par défaut
