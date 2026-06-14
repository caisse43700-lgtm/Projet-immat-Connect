-- Migration : index manquants — performance et scalabilité
-- Chaque index correspond à une requête critique identifiée dans l'audit.
-- Tous idempotents (CREATE INDEX IF NOT EXISTS).

-- user_locations : filtre updated_at dans loadOthers() (SELECT WHERE updated_at >= cut)
CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at
  ON public.user_locations (updated_at DESC);

-- profiles : résolution plaque → user_id dans refresh_vehicle_trust()
CREATE INDEX IF NOT EXISTS idx_profiles_owner_plate
  ON public.profiles (owner_plate);

-- reports : requêtes par statut + date pour les alertes communautaires actives
CREATE INDEX IF NOT EXISTS idx_reports_status_at
  ON public.reports (status, created_at DESC);

-- reports : requêtes par auteur (export, delete-account, analytics)
CREATE INDEX IF NOT EXISTS idx_reports_reporter
  ON public.reports (reporter_id, created_at DESC);

-- messages : requêtes par expéditeur et destinataire (conversations)
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver
  ON public.messages (receiver_id, created_at DESC);

-- call_requests : requêtes par demandeur et destinataire (historique appels)
CREATE INDEX IF NOT EXISTS idx_calls_requester
  ON public.call_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_receiver
  ON public.call_requests (receiver_id, created_at DESC);
