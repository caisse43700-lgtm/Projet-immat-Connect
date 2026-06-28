-- Tests fonctionnels Aide V1 — Lot A (version ISOLÉE, résultats en table). Base de DEV.
-- Chaque vérification est INDÉPENDANTE (demande dédiée) → aucune contamination croisée.
-- Transaction ROLLBACK : rien n'est persisté. Simule auth.uid() via request.jwt.claims.
-- Lecture du résultat : le dernier SELECT affiche une colonne "tous_verts" = true si tout passe.
BEGIN;
CREATE TEMP TABLE _r(test text, ok boolean, detail text);
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub',p::text)::text, true);
$$;
DO $$
DECLARE
  u_dem uuid:='11111111-1111-1111-1111-111111111111';
  u_h1  uuid:='22222222-2222-2222-2222-222222222222';
  u_h2  uuid:='33333333-3333-3333-3333-333333333333';
  r uuid; cc uuid; v_ok boolean; v_status text; v_detail jsonb;
BEGIN
  INSERT INTO auth.users(id) VALUES (u_dem),(u_h1),(u_h2) ON CONFLICT DO NOTHING;
  INSERT INTO user_locations(id,latitude,longitude,updated_at) VALUES (u_h1,48.8566,2.3522,now())
    ON CONFLICT (id) DO UPDATE SET latitude=EXCLUDED.latitude;

  -- create idempotent (même client_event_id → 1 demande)
  PERFORM pg_temp.as_user(u_dem); cc:=gen_random_uuid();
  r:=create_help_request(cc,'panne','entraide',48.0,2.0);
  INSERT INTO _r VALUES('create idempotent',
    r=create_help_request(cc,'panne','entraide',48.0,2.0) AND (SELECT count(*) FROM help_requests WHERE id=r)=1, 'rid='||r);

  -- auto-engagement interdit
  v_ok:=false; BEGIN PERFORM propose_help(gen_random_uuid(),r,'sur_place');
  EXCEPTION WHEN others THEN v_ok:=(SQLERRM LIKE '%auto-engagement%'); END;
  INSERT INTO _r VALUES('auto-engagement rejeté', v_ok, '');

  -- propose idempotent + dedup (demande dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  PERFORM pg_temp.as_user(u_h1); cc:=gen_random_uuid();
  PERFORM propose_help(cc,r,'sur_place'); PERFORM propose_help(cc,r,'sur_place'); PERFORM propose_help(gen_random_uuid(),r,'distance');
  INSERT INTO _r VALUES('propose dedup (1 engagement / 1 event)',
    (SELECT count(*) FROM help_engagements WHERE request_id=r AND helper_id=u_h1)=1
    AND (SELECT count(*) FROM help_events WHERE request_id=r AND type='engagement_proposed' AND actor_id=u_h1)=1, '');

  -- create -> propose -> confirm VALIDE -> resolue (demande dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  PERFORM pg_temp.as_user(u_h1); PERFORM propose_help(gen_random_uuid(),r,'sur_place');
  PERFORM pg_temp.as_user(u_dem); cc:=gen_random_uuid();
  PERFORM confirm_help_received(cc,r,u_h1); PERFORM confirm_help_received(cc,r,u_h1);   -- 2e = no-op
  SELECT status INTO v_status FROM help_requests WHERE id=r;
  INSERT INTO _r VALUES('confirm valide -> resolue (idempotent)',
    v_status='resolue' AND (SELECT resolved_helper_id FROM help_requests WHERE id=r)=u_h1, 'status='||v_status);

  -- helper non engagé rejeté (demande dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  v_ok:=false; BEGIN PERFORM confirm_help_received(gen_random_uuid(),r,u_h2);
  EXCEPTION WHEN others THEN v_ok:=(SQLERRM LIKE '%engagement actif%'); END;
  INSERT INTO _r VALUES('helper non engagé rejeté', v_ok, '');

  -- helper RETIRÉ non désignable (demande dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  PERFORM pg_temp.as_user(u_h2); PERFORM propose_help(gen_random_uuid(),r,'sur_place'); PERFORM retract_help(gen_random_uuid(),r);
  PERFORM pg_temp.as_user(u_dem);
  v_ok:=false; BEGIN PERFORM confirm_help_received(gen_random_uuid(),r,u_h2);
  EXCEPTION WHEN others THEN v_ok:=(SQLERRM LIKE '%engagement actif%'); END;
  INSERT INTO _r VALUES('helper retiré non désignable', v_ok, '');

  -- nearby : arrondi ~1km + exclut les miennes (demande dédiée u_dem, vue par u_h1)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.8566,2.3522);
  PERFORM pg_temp.as_user(u_h1);
  INSERT INTO _r VALUES('nearby arrondi ~1km',
    (SELECT approx_lat FROM get_nearby_requests(10) WHERE request_id=r)=round(48.8566::numeric,2)::double precision, '');
  PERFORM pg_temp.as_user(u_dem);
  INSERT INTO _r VALUES('nearby exclut les miennes', NOT EXISTS(SELECT 1 FROM get_nearby_requests(10) WHERE request_id=r), '');

  -- position précise réservée sur_place (demande dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  PERFORM pg_temp.as_user(u_h1); PERFORM propose_help(gen_random_uuid(),r,'sur_place');
  INSERT INTO _r VALUES('precise sur_place autorisé', EXISTS(SELECT 1 FROM get_request_precise_location(r)), '');
  PERFORM pg_temp.as_user(u_h2);
  INSERT INTO _r VALUES('precise refusé hors engagement', NOT EXISTS(SELECT 1 FROM get_request_precise_location(r)), '');

  -- append-only (UPDATE/DELETE help_events → exception)
  v_ok:=false; BEGIN UPDATE help_events SET type='x' WHERE request_id=r; EXCEPTION WHEN others THEN v_ok:=(SQLERRM LIKE '%append-only%'); END;
  INSERT INTO _r VALUES('append-only UPDATE bloqué', v_ok, '');
  v_ok:=false; BEGIN DELETE FROM help_events WHERE request_id=r; EXCEPTION WHEN others THEN v_ok:=(SQLERRM LIKE '%append-only%'); END;
  INSERT INTO _r VALUES('append-only DELETE bloqué', v_ok, '');

  -- masquage resolved_helper_id (demande résolue dédiée)
  PERFORM pg_temp.as_user(u_dem); r:=create_help_request(gen_random_uuid(),'panne','entraide',48.0,2.0);
  PERFORM pg_temp.as_user(u_h1); PERFORM propose_help(gen_random_uuid(),r,'sur_place');
  PERFORM pg_temp.as_user(u_dem); PERFORM confirm_help_received(gen_random_uuid(),r,u_h1);
  PERFORM pg_temp.as_user(u_h2); v_detail:=get_help_request_detail(r);
  INSERT INTO _r VALUES('resolved_helper_id masqué au tiers', v_detail IS NULL OR v_detail->>'resolved_helper_id' IS NULL, '');
  PERFORM pg_temp.as_user(u_dem); v_detail:=get_help_request_detail(r);
  INSERT INTO _r VALUES('demandeur voit resolved_helper_id', (v_detail->>'resolved_helper_id')::uuid=u_h1, '');

  -- expiration no_helper + fallback config absente
  PERFORM pg_temp.as_user(u_dem);
  PERFORM create_help_request(gen_random_uuid(),'panne','__inconnue__',48.0,2.0);   -- famille sans config
  r:=create_help_request(gen_random_uuid(),'carburant','entraide',48.0,2.0);
  PERFORM process_help_timeouts(now()+interval '60 minutes');
  SELECT status INTO v_status FROM help_requests WHERE id=r;
  INSERT INTO _r VALUES('expiration no_helper',
    v_status='expiree' AND (SELECT close_reason FROM help_requests WHERE id=r)='no_helper', 'status='||v_status);
  INSERT INTO _r VALUES('config absente = pas d''expiration',
    NOT EXISTS(SELECT 1 FROM help_requests WHERE famille='__inconnue__' AND status='expiree'), '');
END $$;
-- Détail par test :
SELECT test, CASE WHEN ok THEN '✅' ELSE '❌ ÉCHEC' END AS resultat, detail FROM _r ORDER BY ok, test;
-- Verdict global :
SELECT bool_and(ok) AS tous_verts, count(*) FILTER (WHERE NOT ok) AS nb_echecs FROM _r;
ROLLBACK;
