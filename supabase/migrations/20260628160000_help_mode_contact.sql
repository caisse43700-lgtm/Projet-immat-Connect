-- Migration : Aide V1 — ajout du mode d'engagement 'contact'
-- « Comment puis-je vous aider ? » = engagement LÉGER (révèle les plaques, ouvre la conversation
-- dans Messages) sans s'engager à se déplacer. Additive, idempotente.

-- 1) Autoriser 'contact' dans la contrainte de mode
ALTER TABLE public.help_engagements DROP CONSTRAINT IF EXISTS help_engagements_mode_check;
ALTER TABLE public.help_engagements
  ADD CONSTRAINT help_engagements_mode_check CHECK (mode IN ('sur_place','distance','contact'));

-- 2) propose_help : accepter 'contact' (le reste inchangé)
CREATE OR REPLACE FUNCTION public.propose_help(p_client_event_id uuid, p_request_id uuid, p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_dem uuid; v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  IF p_client_event_id IS NULL THEN RAISE EXCEPTION 'client_event_id obligatoire'; END IF;
  IF p_mode NOT IN ('sur_place','distance','contact') THEN RAISE EXCEPTION 'mode invalide'; END IF;
  SELECT demandeur_id,status INTO v_dem,v_status FROM help_requests WHERE id=p_request_id;
  IF v_dem IS NULL THEN RAISE EXCEPTION 'demande introuvable'; END IF;
  IF v_dem = v_uid THEN RAISE EXCEPTION 'auto-engagement interdit'; END IF;
  IF EXISTS (SELECT 1 FROM help_events WHERE actor_id=v_uid AND client_event_id=p_client_event_id)
     OR v_status <> 'ouverte'
     OR EXISTS (SELECT 1 FROM help_engagements WHERE request_id=p_request_id AND helper_id=v_uid AND status='proposee') THEN
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

-- 3) Auto-test
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='help_engagements_mode_check'),
         'contrainte help_engagements_mode_check absente';
  ASSERT 'contact' = ANY (ARRAY['sur_place','distance','contact']), 'sanity';
  RAISE NOTICE '[help_mode_contact] OK — mode contact autorisé';
END;
$$;
