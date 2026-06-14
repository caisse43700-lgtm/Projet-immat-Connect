-- Migration : accepted_device_id sur call_requests
-- Sprint 2 S2-7 — ImmatConnect Pro
-- Permet de détecter "appel pris sur un autre appareil" quand B a 2 devices ouverts.

ALTER TABLE public.call_requests
  ADD COLUMN IF NOT EXISTS accepted_device_id text;

COMMENT ON COLUMN public.call_requests.accepted_device_id
  IS 'device_id du téléphone de B qui a accepté l''appel — permet au 2e appareil de B de se déconnecter proprement';
