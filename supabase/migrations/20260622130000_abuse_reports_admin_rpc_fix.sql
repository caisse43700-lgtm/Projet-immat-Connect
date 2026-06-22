-- Migration : correctif RPC get_abuse_reports_admin()
-- Corrige ERROR 42702 "column reference id is ambiguous" dans PL/pgSQL
-- La clause WHERE id = auth.uid() est ambiguë — on qualifie via alias de table
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
  -- Qualification explicite via alias pour éviter 42702 (id ambigu en PL/pgSQL)
  SELECT u.raw_user_meta_data->>'role'
  INTO v_role
  FROM auth.users u
  WHERE u.id = auth.uid()
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

-- Droits inchangés (déjà posés par la migration précédente, idempotent)
REVOKE ALL ON FUNCTION public.get_abuse_reports_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_abuse_reports_admin() TO authenticated;

COMMENT ON FUNCTION public.get_abuse_reports_admin() IS
  'Lecture admin des signalements d''abus. Accès réservé au rôle gardien (raw_user_meta_data). SECURITY DEFINER. Fix alias 42702.';
