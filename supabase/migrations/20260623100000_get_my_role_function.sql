-- get_my_role() : retourne le rôle gardien depuis raw_user_meta_data
-- Bypass JWT stale — lit auth.users directement avec SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    raw_app_meta_data->>'role'
  )
  FROM auth.users
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
