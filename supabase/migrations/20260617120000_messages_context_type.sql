-- Sprint 10 — context_type sur messages
-- Permet de distinguer les messages libres des quick replies/signalements
-- Les messages avec context_type sont affichés dans Activité uniquement (pas dans Messages)
-- Idempotente.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS context_type text;

-- Index pour filtrer efficacement les messages libres vs contextuels
CREATE INDEX IF NOT EXISTS idx_messages_context_type
  ON public.messages (context_type)
  WHERE context_type IS NOT NULL;
