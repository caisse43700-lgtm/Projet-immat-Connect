-- Modération : exposer le rôle dans admin_list_users() pour que l'UI marque les gardiens comme
-- NON suspendables (badge « GARDIEN », pas de bouton « Suspendre »). Le verrou serveur existe déjà
-- (admin_suspend_user refuse une cible gardien et l'auto-suspension) ; ici on ajoute la cohérence UI.
--
-- Changement de signature (colonne is_gardien) → DROP obligatoire (CREATE OR REPLACE refuse un
-- changement de type de retour). Idempotent, additif.

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id     uuid,
  owner_plate text,
  pseudo      text,
  email       text,
  suspended   boolean,
  is_gardien  boolean,
  created_at  timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'gardien' THEN RAISE EXCEPTION 'réservé au rôle gardien'; END IF;
  RETURN QUERY
  SELECT
    p.id, p.owner_plate, p.pseudo, p.email,
    EXISTS (SELECT 1 FROM public.account_bans b WHERE b.user_id = p.id) AS suspended,
    (u.raw_app_meta_data->>'role' = 'gardien') AS is_gardien,
    u.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '[admin_list_users] OK — colonne is_gardien exposée';
END; $$;
