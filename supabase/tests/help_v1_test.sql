-- Tests fonctionnels Aide V1 — Lot A
-- À exécuter dans une base de DEV. Tout est encapsulé dans une transaction ROLLBACK :
-- rien n'est persisté. Simule auth.uid() via le GUC request.jwt.claims (modèle Supabase).
-- Pré-requis : auth.uid() = (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid
-- (par défaut sur Supabase). Crée 2 utilisateurs temporaires dans auth.users.

BEGIN;

-- Helpers de test : positionner / réinitialiser l'utilisateur courant
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p::text)::text, true);
$$;

DO $$
DECLARE
  u_dem uuid := '11111111-1111-1111-1111-111111111111';
  u_h1  uuid := '22222222-2222-2222-2222-222222222222';
  u_h2  uuid := '33333333-3333-3333-3333-333333333333';
  v_req uuid; v_cnt int; v_ev int; v_status text; v_ok boolean;
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid(); c5 uuid := gen_random_uuid(); c6 uuid := gen_random_uuid(); c7 uuid := gen_random_uuid();
  v_detail jsonb;
BEGIN
  -- utilisateurs temporaires (FK demandeur_id/helper_id → auth.users)
  INSERT INTO auth.users (id) VALUES (u_dem),(u_h1),(u_h2) ON CONFLICT DO NOTHING;
  INSERT INTO user_locations (id, latitude, longitude, updated_at)
    VALUES (u_h1, 48.8566, 2.3522, now()) ON CONFLICT (id) DO UPDATE SET latitude=EXCLUDED.latitude;

  -- T1 : create ×2 même client_event_id → 1 demande
  PERFORM pg_temp.as_user(u_dem);
  v_req := create_help_request(c1,'panne','entraide',48.8566,2.3522);
  ASSERT v_req = create_help_request(c1,'panne','entraide',48.8566,2.3522), 'T1 idempotence create KO';
  SELECT count(*) INTO v_cnt FROM help_requests WHERE demandeur_id=u_dem;
  ASSERT v_cnt = 1, 'T1 doublon de demande';

  -- T4 : auto-engagement interdit
  v_ok := false;
  BEGIN PERFORM propose_help(gen_random_uuid(), v_req, 'sur_place');
  EXCEPTION WHEN others THEN v_ok := (SQLERRM LIKE '%auto-engagement%'); END;
  ASSERT v_ok, 'T4 auto-engagement non rejeté';

  -- T2/T3 : propose ×2 même client_event_id → 1 engagement/1 event ; puis client_event_id ≠ → pas de 2e event
  PERFORM pg_temp.as_user(u_h1);
  PERFORM propose_help(c2, v_req, 'sur_place');
  PERFORM propose_help(c2, v_req, 'sur_place');                       -- retry même id
  PERFORM propose_help(c3, v_req, 'distance');                        -- id ≠ mais déjà engagé → no-op
  SELECT count(*) INTO v_cnt FROM help_engagements WHERE request_id=v_req AND helper_id=u_h1;
  ASSERT v_cnt = 1, 'T2/T3 doublon engagement';
  SELECT count(*) INTO v_ev FROM help_events WHERE request_id=v_req AND type='engagement_proposed' AND actor_id=u_h1;
  ASSERT v_ev = 1, 'T2/T3 doublon engagement_proposed';

  -- T8 : precise_location refusé sans engagement sur_place... h1 EST sur_place → autorisé
  ASSERT EXISTS (SELECT 1 FROM get_request_precise_location(v_req)), 'T8 sur_place devrait voir la position';
  PERFORM pg_temp.as_user(u_h2);                                      -- h2 non engagé
  ASSERT NOT EXISTS (SELECT 1 FROM get_request_precise_location(v_req)), 'T8 non-engagé ne doit PAS voir la position';

  -- T7 : nearby ne fuit pas la position précise (arrondi ~1 km) + exclut les miennes
  PERFORM pg_temp.as_user(u_h1);
  SELECT count(*) INTO v_cnt FROM get_nearby_requests(10) WHERE request_id=v_req;
  ASSERT v_cnt = 1, 'T7 la demande proche devrait apparaître';
  ASSERT (SELECT approx_lat FROM get_nearby_requests(10) WHERE request_id=v_req)
         = round(48.8566::numeric,2)::double precision, 'T7 position non arrondie (fuite)';
  PERFORM pg_temp.as_user(u_dem);                                     -- le demandeur ne voit pas la sienne
  ASSERT NOT EXISTS (SELECT 1 FROM get_nearby_requests(10) WHERE request_id=v_req), 'T7 demandeur voit sa propre demande';

  -- #7 : confirm avec un helper NON engagé → rejet
  PERFORM pg_temp.as_user(u_dem);
  v_ok := false;
  BEGIN PERFORM confirm_help_received(gen_random_uuid(), v_req, u_h2);
  EXCEPTION WHEN others THEN v_ok := (SQLERRM LIKE '%sans engagement%'); END;
  ASSERT v_ok, '#7 helper non engagé non rejeté';

  -- #2 : un helper RETIRÉ ne peut pas être désigné (propose puis retract → confirm rejette)
  PERFORM pg_temp.as_user(u_h2); PERFORM propose_help(c6, v_req, 'sur_place'); PERFORM retract_help(c7, v_req);
  PERFORM pg_temp.as_user(u_dem); v_ok := false;
  BEGIN PERFORM confirm_help_received(gen_random_uuid(), v_req, u_h2);
  EXCEPTION WHEN others THEN v_ok := (SQLERRM LIKE '%engagement actif%'); END;
  ASSERT v_ok, '#2 helper retiré désignable (devrait être rejeté)';

  -- T5 : confirm ×2 → 1 résolution ; status reste resolue
  PERFORM confirm_help_received(c4, v_req, u_h1);
  PERFORM confirm_help_received(c4, v_req, u_h1);
  SELECT status INTO v_status FROM help_requests WHERE id=v_req;
  ASSERT v_status='resolue', 'T5 status attendu resolue';
  ASSERT (SELECT resolved_helper_id FROM help_requests WHERE id=v_req)=u_h1, 'T5 helper désigné incorrect';

  -- #3 : après résolution, get_help_request_detail masque resolved_helper_id aux tiers.
  PERFORM pg_temp.as_user(u_h2);                                  -- tiers (engagement retiré → lecture autorisée)
  v_detail := get_help_request_detail(v_req);
  ASSERT v_detail->>'resolved_helper_id' IS NULL, '#3 resolved_helper_id exposé à un tiers';
  ASSERT (v_detail->>'resolved_by_me')::boolean = false, '#3 resolved_by_me incorrect pour un tiers';
  PERFORM pg_temp.as_user(u_dem);                                 -- le demandeur, lui, le voit
  v_detail := get_help_request_detail(v_req);
  ASSERT (v_detail->>'resolved_helper_id')::uuid = u_h1, '#3 le demandeur doit voir resolved_helper_id';

  -- T6 : cancel après resolve → no-op (reste resolue)
  PERFORM cancel_help_request(c5, v_req);
  SELECT status INTO v_status FROM help_requests WHERE id=v_req;
  ASSERT v_status='resolue', 'T6 cancel après resolve a modifié le status';

  -- T10 : help_events append-only (UPDATE et DELETE → exception)
  v_ok := false;
  BEGIN UPDATE help_events SET type='x' WHERE request_id=v_req; EXCEPTION WHEN others THEN v_ok := (SQLERRM LIKE '%append-only%'); END;
  ASSERT v_ok, 'T10 UPDATE help_events non bloqué';
  v_ok := false;
  BEGIN DELETE FROM help_events WHERE request_id=v_req; EXCEPTION WHEN others THEN v_ok := (SQLERRM LIKE '%append-only%'); END;
  ASSERT v_ok, 'T10 DELETE help_events non bloqué';

  -- #1/T9b : config absente → aucune expiration (fallback sûr)
  PERFORM create_help_request(gen_random_uuid(),'panne','__inconnue__',48.0,2.0);
  PERFORM process_help_timeouts(now() + interval '10 years');
  ASSERT NOT EXISTS (SELECT 1 FROM help_requests WHERE famille='__inconnue__' AND status='expiree'),
         '#1 famille inconnue a expiré (fallback non respecté)';

  -- T9 : timeouts — ouverte sans helper → expiree(no_helper) (délai entraide 45 min)
  PERFORM pg_temp.as_user(u_dem);
  v_req := create_help_request(gen_random_uuid(),'carburant','entraide',48.0,2.0);
  PERFORM process_help_timeouts(now() + interval '60 minutes');
  SELECT status INTO v_status FROM help_requests WHERE id=v_req;
  ASSERT v_status='expiree', 'T9 expiration no_helper KO';
  ASSERT (SELECT close_reason FROM help_requests WHERE id=v_req)='no_helper', 'T9 reason KO';

  RAISE NOTICE '[help_v1_test] TOUS LES TESTS PASSENT ✅';
END $$;

ROLLBACK;
