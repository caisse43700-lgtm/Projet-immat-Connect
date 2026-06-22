-- Migration : RPC get_abuse_reports_admin()
-- Lecture des signalements d'abus réservée au rôle gardien
-- SECURITY DEFINER + search_path explicite (évite injection via search_path)
-- Idempotent (CREATE OR REPLACE)

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  -- Vérification rôle gardien via raw_user_meta_data (contourne JWT stale)
  SELECT raw_user_meta_data->>'role'
  INTO v_role
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_role IS DISTINCT FROM 'gardien' THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    ar.id,
    ar.reported_plate,
    ar.category,
    ar.details,
    ar.status,
    ar.created_at,
    ar.reporter_uid,
    COUNT(*) OVER (PARTITION BY ar.reported_plate)::bigint AS plate_count
  FROM public.abuse_reports ar
  ORDER BY ar.created_at DESC
  LIMIT 200;
END;
$$;

-- Révoquer l'accès public direct
REVOKE ALL ON FUNCTION public.get_abuse_reports_admin() FROM PUBLIC;

-- Autoriser uniquement les utilisateurs authentifiés (garde supplémentaire côté RLS)
GRANT EXECUTE ON FUNCTION public.get_abuse_reports_admin() TO authenticated;

COMMENT ON FUNCTION public.get_abuse_reports_admin() IS
  'Lecture admin des signalements d''abus. Accès réservé au rôle gardien (raw_user_meta_data). SECURITY DEFINER.';
