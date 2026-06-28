-- Migration : Aide V1 — Lot A (serveur seul, sans impact UI)
-- Event-driven pragmatique : help_events = VÉRITÉ (append-only) ;
-- help_requests / help_engagements = PROJECTIONS ; help_config = délais (fallback sûr).
-- Toute écriture via RPC SECURITY DEFINER (événement + projection même transaction).
-- Pas de message / pas de help_response / pas de thank_helper (séparation Activité/Messages).
-- Additive, idempotente. Ne touche ni reports, ni vehicle_trust_scores, ni driver_ratings,
-- ni le flux Aide legacy (bascule client = Lot B).
--
-- DÉCISION #8 : help_events.request_id N'A PAS de FK vers help_requests. Le journal est
-- IMMORTEL (append-only) : une FK ON DELETE CASCADE entrerait en conflit avec le trigger
-- anti-DELETE (suppression de compte/RGPD bloquée). Orphelins assumés (uuid, sans PII).

-- ============================================================
-- 1. help_config — délais métier (modifiables sans redéploiement)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.help_config (
  famille                                  text PRIMARY KEY,           -- 'entraide' | 'urgence'
  delai_alternatives_min                   integer,
  delai_expiration_no_helper_min           integer,                    -- NULL = jamais d'expiration silencieuse
  delai_inactivite_avant_confirmation_min  integer,
  delai_confirmation_to_expire_min         integer
);
INSERT INTO public.help_config
  (famille, delai_alternatives_min, delai_expiration_no_helper_min, delai_inactivite_avant_confirmation_min, delai_confirmation_to_expire_min)
VALUES ('entraide',10,45,45,30), ('urgence',5,NULL,60,60)
ON CONFLICT (famille) DO NOTHING;

-- ============================================================
-- 2. help_requests (projection demande)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.help_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demandeur_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type               text NOT NULL,
  famille            text NOT NULL DEFAULT 'entraide',
  lat                double precision,
  lng                double precision,
  status             text NOT NULL DEFAULT 'ouverte'
                       CHECK (status IN ('ouverte','resolue','annulee','expiree')),
  close_reason       text,
  resolved_helper_id uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_event_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_help_requests_status    ON public.help_requests (status);
CREATE INDEX IF NOT EXISTS idx_help_requests_demandeur ON public.help_requests (demandeur_id);

-- ============================================================
-- 3. help_engagements (projection, 1 par (demande, helper))
-- ============================================================
CREATE TABLE IF NOT EXISTS public.help_engagements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  demandeur_id  uuid NOT NULL,                       -- dénormalisé pour Realtime (filtre égalité)
  helper_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode          text NOT NULL CHECK (mode IN ('sur_place','distance')),
  type          text NOT NULL DEFAULT 'peer' CHECK (type IN ('peer','pro')),
  status        text NOT NULL DEFAULT 'proposee'
                  CHECK (status IN ('proposee','retiree','clos_par_demandeur')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, helper_id)
);
CREATE INDEX IF NOT EXISTS idx_help_engagements_request   ON public.help_engagements (request_id);
CREATE INDEX IF NOT EXISTS idx_help_engagements_helper    ON public.help_engagements (helper_id);
CREATE INDEX IF NOT EXISTS idx_help_engagements_demandeur ON public.help_engagements (demandeur_id);

-- ============================================================
-- 4. help_events (VÉRITÉ, append-only) — voir DÉCISION #8 (pas de FK request_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.help_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL,
  actor_id        uuid NOT NULL,
  type            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- événements système : payload.source = 'system'
  client_event_id uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, client_event_id)
);
CREATE INDEX IF NOT EXISTS idx_help_events_request ON public.help_events (request_id, created_at);

-- append-only verrouillé : aucun UPDATE/DELETE (trigger + REVOKE explicite)
CREATE OR REPLACE FUNCTION public.help_events_no_mutate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'help_events est append-only (ni UPDATE ni DELETE)'; END; $$;
DROP TRIGGER IF EXISTS help_events_block_update ON public.help_events;
CREATE TRIGGER help_events_block_update BEFORE UPDATE ON public.help_events
  FOR EACH ROW EXECUTE FUNCTION public.help_events_no_mutate();
DROP TRIGGER IF EXISTS help_events_block_delete ON public.help_events;
CREATE TRIGGER help_events_block_delete BEFORE DELETE ON public.help_events
  FOR EACH ROW EXECUTE FUNCTION public.help_events_no_mutate();
REVOKE UPDATE, DELETE ON public.help_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.help_events FROM authenticated, anon;

-- ============================================================
-- 5. RLS — deny-all écriture ; SELECT minimal pour Realtime "le mien"
--    (le helper engagé lit la demande via get_help_request_detail, pas en direct →
--     la position précise ne fuit jamais par RLS.)
-- ============================================================
ALTER TABLE public.help_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_config      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS help_requests_select_own ON public.help_requests;
CREATE POLICY help_requests_select_own ON public.help_requests
  FOR SELECT USING (auth.uid() = demandeur_id);

DROP POLICY IF EXISTS help_engagements_select_party ON public.help_engagements;
CREATE POLICY help_engagements_select_party ON public.help_engagements
  FOR SELECT USING (auth.uid() = demandeur_id OR auth.uid() = helper_id);

DROP POLICY IF EXISTS help_config_select ON public.help_config;
CREATE POLICY help_config_select ON public.help_config FOR SELECT USING (true);
-- help_events : aucune policy => deny-all. Aucune policy INSERT/UPDATE/DELETE => écriture via RPC.

-- ============================================================
-- 6. RPC — écriture (client_event_id obligatoire ; renvoient l'ÉTAT COURANT en jsonb)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_help_request(
  p_client_event_id uuid, p_type text, p_famille text, p_lat double precision, p_lng double precision)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_req uuid; v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  SELECT request_id INTO v_existing FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;          -- idempotence retry
  v_req := gen_random_uuid();
  INSERT INTO help_requests (id,demandeur_id,type,famille,lat,lng,status,created_at,last_event_at)
    VALUES (v_req,v_uid,p_type,COALESCE(p_famille,'entraide'),p_lat,p_lng,'ouverte',now(),now());
  INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
    VALUES (v_req,v_uid,'request_created',jsonb_build_object('type',p_type,'famille',COALESCE(p_famille,'entraide')),p_client_event_id);
  RETURN v_req;
END; $$;

-- propose_help : "Je viens vous aider" (sur_place) / "Je vous guide" (distance).
-- #11 : un helper RETIRÉ peut revenir (ON CONFLICT repasse 'proposee' + nouvel événement) — voulu.
CREATE OR REPLACE FUNCTION public.propose_help(p_client_event_id uuid, p_request_id uuid, p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_dem uuid; v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  IF p_mode NOT IN ('sur_place','distance') THEN RAISE EXCEPTION 'mode invalide'; END IF;
  SELECT demandeur_id,status INTO v_dem,v_status FROM help_requests WHERE id=p_request_id;
  IF v_dem IS NULL THEN RAISE EXCEPTION 'demande introuvable'; END IF;
  IF v_dem = v_uid THEN RAISE EXCEPTION 'auto-engagement interdit'; END IF;
  IF EXISTS (SELECT 1 FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id)
     OR v_status <> 'ouverte'
     OR EXISTS (SELECT 1 FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid AND status='proposee')
  THEN
    -- no-op (retry / terminale / déjà engagé) → renvoie l'état courant
    RETURN jsonb_build_object('request_id',p_request_id,'request_status',v_status,
             'engagement_status',(SELECT status FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid),'noop',true);
  END IF;
  INSERT INTO help_engagements (request_id,demandeur_id,helper_id,mode,type,status,created_at,updated_at)
    VALUES (p_request_id,v_dem,v_uid,p_mode,'peer','proposee',now(),now())
    ON CONFLICT (request_id,helper_id) DO UPDATE SET status='proposee', mode=EXCLUDED.mode, updated_at=now();
  UPDATE help_requests SET last_event_at=now() WHERE id=p_request_id;
  INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
    VALUES (p_request_id,v_uid,'engagement_proposed',jsonb_build_object('mode',p_mode),p_client_event_id);
  RETURN jsonb_build_object('request_id',p_request_id,'request_status','ouverte','engagement_status','proposee');
END; $$;

CREATE OR REPLACE FUNCTION public.retract_help(p_client_event_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  IF EXISTS (SELECT 1 FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id)
     OR NOT EXISTS (SELECT 1 FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid AND status='proposee')
  THEN
    RETURN jsonb_build_object('request_id',p_request_id,
             'engagement_status',(SELECT status FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid),'noop',true);
  END IF;
  UPDATE help_engagements SET status='retiree', updated_at=now() WHERE request_id=p_request_id AND helper_id=v_uid;
  UPDATE help_requests SET last_event_at=now() WHERE id=p_request_id;
  INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
    VALUES (p_request_id,v_uid,'engagement_retracted','{}'::jsonb,p_client_event_id);
  RETURN jsonb_build_object('request_id',p_request_id,'engagement_status','retiree');
END; $$;

-- confirm_help_received : #7 → si p_helper_id non null, il DOIT avoir un engagement sur la demande.
CREATE OR REPLACE FUNCTION public.confirm_help_received(p_client_event_id uuid, p_request_id uuid, p_helper_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_dem uuid; v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  SELECT demandeur_id,status INTO v_dem,v_status FROM help_requests WHERE id=p_request_id;
  IF v_dem IS NULL THEN RAISE EXCEPTION 'demande introuvable'; END IF;
  IF v_dem <> v_uid THEN RAISE EXCEPTION 'seul le demandeur peut clôturer'; END IF;
  IF p_helper_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM help_engagements
                     WHERE request_id=p_request_id AND helper_id=p_helper_id AND status='proposee') THEN
    RAISE EXCEPTION 'helper désigné sans engagement actif sur cette demande';  -- #7 + #2 (doit être 'proposee')
  END IF;
  IF EXISTS (SELECT 1 FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id)
     OR v_status <> 'ouverte' THEN
    RETURN jsonb_build_object('request_id',p_request_id,'status',v_status,'noop',true);
  END IF;
  UPDATE help_requests SET status='resolue',
    close_reason = CASE WHEN p_helper_id IS NULL THEN 'resolved_other' ELSE 'aided_by' END,
    resolved_helper_id = p_helper_id, last_event_at=now() WHERE id=p_request_id;
  UPDATE help_engagements SET status='clos_par_demandeur', updated_at=now() WHERE request_id=p_request_id AND status='proposee';
  INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
    VALUES (p_request_id,v_uid,'help_confirmed',
      jsonb_build_object('helper_id',p_helper_id,'kind',CASE WHEN p_helper_id IS NULL THEN 'resolved_other' ELSE 'aided_by' END),
      p_client_event_id);
  RETURN jsonb_build_object('request_id',p_request_id,'status','resolue','resolved_helper_id',p_helper_id);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_help_request(p_client_event_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_dem uuid; v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  SELECT demandeur_id,status INTO v_dem,v_status FROM help_requests WHERE id=p_request_id;
  IF v_dem IS NULL THEN RAISE EXCEPTION 'demande introuvable'; END IF;
  IF v_dem <> v_uid THEN RAISE EXCEPTION 'seul le demandeur peut annuler'; END IF;
  IF EXISTS (SELECT 1 FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id)
     OR v_status <> 'ouverte' THEN
    RETURN jsonb_build_object('request_id',p_request_id,'status',v_status,'noop',true);
  END IF;
  UPDATE help_requests SET status='annulee', close_reason='cancelled', last_event_at=now() WHERE id=p_request_id;
  UPDATE help_engagements SET status='clos_par_demandeur', updated_at=now() WHERE request_id=p_request_id AND status='proposee';
  INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
    VALUES (p_request_id,v_uid,'request_cancelled','{}'::jsonb,p_client_event_id);
  RETURN jsonb_build_object('request_id',p_request_id,'status','annulee');
END; $$;

-- ============================================================
-- 7. RPC — lecture (vie privée / anti-scraping)
-- ============================================================

-- #3 : approximation grossière ~1 km (arrondi DÉTERMINISTE, pré-engagement) — PAS un jitter aléatoire.
--      Position précise via get_request_precise_location, réservée aux engagés sur_place.
-- #4 DETTE V1 : rate-limit NON implémenté ici → à appliquer à la passerelle (cf. messages_rate_limit).
--      Risque de scan progressif documenté ; à traiter avant montée en charge.
CREATE OR REPLACE FUNCTION public.get_nearby_requests(p_max_km double precision DEFAULT 10)
RETURNS TABLE (request_id uuid, type text, famille text, approx_lat double precision, approx_lng double precision,
  distance_band text, created_at timestamptz, helper_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_radius double precision;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_radius := LEAST(COALESCE(p_max_km,10), 10);     -- rayon max serveur imposé
  RETURN QUERY
  WITH me AS (SELECT latitude AS lat, longitude AS lng FROM user_locations WHERE id=v_uid ORDER BY updated_at DESC LIMIT 1),
  cand AS (
    SELECT hr.id,hr.type,hr.famille,hr.lat,hr.lng,hr.created_at,
      (6371*acos(LEAST(1, cos(radians(m.lat))*cos(radians(hr.lat))*cos(radians(hr.lng)-radians(m.lng))
        + sin(radians(m.lat))*sin(radians(hr.lat))))) AS dist
    FROM help_requests hr CROSS JOIN me m
    WHERE hr.status='ouverte' AND hr.demandeur_id<>v_uid AND hr.lat IS NOT NULL AND hr.lng IS NOT NULL)
  SELECT c.id,c.type,c.famille,
    round(c.lat::numeric,2)::double precision, round(c.lng::numeric,2)::double precision,   -- ~1 km
    CASE WHEN c.dist<1 THEN '<1 km' WHEN c.dist<3 THEN '~'||round(c.dist)::text||' km' ELSE '>3 km' END,
    c.created_at,
    (SELECT count(*)::int FROM help_engagements he WHERE he.request_id=c.id AND he.status='proposee')
  FROM cand c WHERE c.dist<=v_radius ORDER BY c.dist ASC LIMIT 50;
END; $$;

-- get_request_precise_location : SEULEMENT si engagement actif sur_place
CREATE OR REPLACE FUNCTION public.get_request_precise_location(p_request_id uuid)
RETURNS TABLE (lat double precision, lng double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid
                 AND status='proposee' AND mode='sur_place') THEN RETURN; END IF;
  RETURN QUERY SELECT hr.lat,hr.lng FROM help_requests hr WHERE hr.id=p_request_id;
END; $$;

-- #12 get_help_request_detail : détail (SANS position précise) pour le demandeur OU un helper engagé.
CREATE OR REPLACE FUNCTION public.get_help_request_detail(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_r record; v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_r FROM help_requests WHERE id=p_request_id;
  IF v_r.id IS NULL THEN RETURN NULL; END IF;
  v_allowed := (v_r.demandeur_id = v_uid)
            OR EXISTS (SELECT 1 FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid);
  IF NOT v_allowed THEN RETURN NULL; END IF;
  -- #3 vie privée : on n'expose JAMAIS l'uuid resolved_helper_id à un tiers.
  -- Le demandeur (qui a lui-même désigné) le voit ; les autres n'ont que resolved_by_me.
  RETURN jsonb_build_object(
    'request_id', v_r.id, 'type', v_r.type, 'famille', v_r.famille,
    'status', v_r.status, 'close_reason', v_r.close_reason,
    'resolved_by_me', (v_r.resolved_helper_id IS NOT NULL AND v_r.resolved_helper_id = v_uid),
    'resolved_helper_id', CASE WHEN v_r.demandeur_id = v_uid THEN v_r.resolved_helper_id ELSE NULL END,
    'created_at', v_r.created_at,
    'approx_lat', round(v_r.lat::numeric,2), 'approx_lng', round(v_r.lng::numeric,2),
    'helper_count', (SELECT count(*)::int FROM help_engagements WHERE request_id=p_request_id AND status='proposee'),
    'my_engagement_status', (SELECT status FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid)
  );
END; $$;

-- ============================================================
-- 8. RPC système — expiration / confirmation (cron) — MÊME chemin atomique
--    #1 fallback explicite (config absente → CONTINUE, pas d'expiration).
--    #9 événements système : payload.source = 'system'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_help_timeouts(p_now timestamptz DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_cfg record; v_has_helper boolean;
BEGIN
  FOR r IN SELECT * FROM help_requests WHERE status='ouverte' FOR UPDATE SKIP LOCKED LOOP
    SELECT * INTO v_cfg FROM help_config WHERE famille=r.famille;
    IF NOT FOUND THEN
      RAISE WARNING '[help_v1] help_config absente pour famille=% → aucune expiration (fallback sûr)', r.famille;
      CONTINUE;                                                                  -- #1 : pas d'expiration agressive
    END IF;
    v_has_helper := EXISTS (SELECT 1 FROM help_engagements WHERE request_id=r.id AND status='proposee');
    IF NOT v_has_helper THEN
      IF v_cfg.delai_expiration_no_helper_min IS NOT NULL
         AND p_now - r.created_at > make_interval(mins => v_cfg.delai_expiration_no_helper_min) THEN
        UPDATE help_requests SET status='expiree', close_reason='no_helper', last_event_at=p_now WHERE id=r.id;
        INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
          VALUES (r.id,r.demandeur_id,'request_expired',jsonb_build_object('reason','no_helper','source','system'),gen_random_uuid());
      END IF;
    ELSE
      IF v_cfg.delai_confirmation_to_expire_min IS NOT NULL
         AND EXISTS (SELECT 1 FROM help_events WHERE request_id=r.id AND type='confirmation_requested'
                     AND p_now - created_at > make_interval(mins => v_cfg.delai_confirmation_to_expire_min)) THEN
        UPDATE help_requests SET status='expiree', close_reason='no_confirmation_after_engagement', last_event_at=p_now WHERE id=r.id;
        UPDATE help_engagements SET status='clos_par_demandeur', updated_at=p_now WHERE request_id=r.id AND status='proposee';
        INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
          VALUES (r.id,r.demandeur_id,'request_expired',jsonb_build_object('reason','no_confirmation_after_engagement','source','system'),gen_random_uuid());
      ELSIF v_cfg.delai_inactivite_avant_confirmation_min IS NOT NULL
         AND p_now - r.last_event_at > make_interval(mins => v_cfg.delai_inactivite_avant_confirmation_min)
         AND NOT EXISTS (SELECT 1 FROM help_events WHERE request_id=r.id AND type='confirmation_requested') THEN
        -- #10 : Lot A journalise seulement. La NOTIFICATION (push/filet lecture) est déclenchée en Lot C.
        INSERT INTO help_events (request_id,actor_id,type,payload,client_event_id)
          VALUES (r.id,r.demandeur_id,'confirmation_requested',jsonb_build_object('source','system'),gen_random_uuid());
      END IF;
    END IF;
  END LOOP;
END; $$;

-- ============================================================
-- 9. GRANTs (process_help_timeouts NON exposée : cron/service uniquement)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_help_request(uuid,text,text,double precision,double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_help(uuid,uuid,text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.retract_help(uuid,uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_help_received(uuid,uuid,uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_help_request(uuid,uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_requests(double precision)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_precise_location(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_help_request_detail(uuid)                 TO authenticated;

-- ============================================================
-- 10. Planification cron (#5 : unschedule puis schedule → idempotent)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    -- #4 idempotence robuste : supprimer par nom dans cron.job (indépendant de la signature
    -- de cron.unschedule selon la version), puis (re)planifier.
    BEGIN DELETE FROM cron.job WHERE jobname='help_timeouts'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN PERFORM cron.schedule('help_timeouts','*/2 * * * *','SELECT public.process_help_timeouts();');
    EXCEPTION WHEN others THEN RAISE WARNING '[help_v1] cron.schedule a échoué (%)', SQLERRM; END;
  ELSE RAISE WARNING '[help_v1] pg_cron absent — process_help_timeouts non planifié (filet lecture requis)'; END IF;
END; $$;

-- ============================================================
-- 11. Auto-test structurel
-- ============================================================
DO $$
BEGIN
  ASSERT to_regclass('public.help_events') IS NOT NULL, 'help_events manquante';
  ASSERT to_regclass('public.help_requests') IS NOT NULL, 'help_requests manquante';
  ASSERT to_regclass('public.help_engagements') IS NOT NULL, 'help_engagements manquante';
  ASSERT (SELECT count(*) FROM help_config) >= 2, 'help_config non seedée';
  ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='help_events_block_update'), 'trigger UPDATE manquant';
  ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='help_events_block_delete'), 'trigger DELETE manquant';
  RAISE NOTICE '[help_v1] auto-test structurel : OK';
END; $$;

-- Tests fonctionnels runnables : supabase/tests/help_v1_test.sql (transaction + jwt claims + ROLLBACK).
