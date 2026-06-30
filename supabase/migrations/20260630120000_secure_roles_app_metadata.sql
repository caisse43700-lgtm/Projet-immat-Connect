-- C1 — SÉCURITÉ (priorité absolue) : les rôles sensibles (gardien) ne sont lus QUE depuis
-- raw_app_meta_data (NON modifiable par le client), jamais raw_user_meta_data (modifiable par
-- le client via auth.updateUser({data:{role:'gardien'}})). Ferme l'élévation de privilège.
--
-- ⚠️ PRÉREQUIS OBLIGATOIRE AVANT D'APPLIQUER CETTE MIGRATION :
-- le compte gardien doit DÉJÀ avoir raw_app_meta_data->>'role' = 'gardien' (voir procédure),
-- sinon l'accès gardien (Dashboard, gouvernance flotte, signalements d'abus) est perdu.

-- 1) get_my_role() : app_metadata UNIQUEMENT
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;

-- 2) get_abuse_reports_admin() : passe par get_my_role() (donc app_metadata) — plus de lecture user_meta
CREATE OR REPLACE FUNCTION public.get_abuse_reports_admin()
RETURNS TABLE (
  id             uuid,
  reported_plate text,
  category       text,
  details        text,
  status         text,
  created_at     timestamptz,
  reporter_uid   uuid,
  plate_count    bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_my_role();           -- app_metadata uniquement
  IF v_role IS DISTINCT FROM 'gardien' THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT
    ar.id, ar.reported_plate, ar.category, ar.details, ar.status, ar.created_at, ar.reporter_uid,
    COUNT(*) OVER (PARTITION BY ar.reported_plate)::bigint AS plate_count
  FROM public.abuse_reports ar
  ORDER BY ar.created_at DESC
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_abuse_reports_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_abuse_reports_admin() TO authenticated;

-- 3) set_feature_flag_fleet() : vérifie déjà get_my_role() → automatiquement sécurisée par (1).
--    (aucun changement ici ; rappel pour la traçabilité de l'audit C1.)

-- 4) Auto-vérification : get_my_role ne lit plus user_metadata
DO $$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.get_my_role()'::regprocedure);
  ASSERT position('raw_app_meta_data' in def) > 0, 'get_my_role ne lit pas app_metadata';
  ASSERT position('raw_user_meta_data' in def) = 0, 'get_my_role lit encore user_metadata (FAILLE)';
  RAISE NOTICE '[secure_roles] OK — rôles sensibles via app_metadata uniquement';
END;
$$;
