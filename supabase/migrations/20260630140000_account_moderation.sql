-- Modération des comptes : suspension (« compte suspendu ») + anti-recréation (plaque / email / téléphone).
--
-- Deux verrous complémentaires :
--   1) account_bans = registre des comptes suspendus (snapshot identité : plaque/email/téléphone/pseudo).
--      Sert au blocage à la CONNEXION (par user_id) ET à l'anti-recréation à l'INSCRIPTION
--      (par plaque/email/téléphone) — un banni ne peut pas se refaire un compte avec les mêmes infos.
--   2) check_signup_available() refuse aussi les doublons d'un compte ACTIF (plaque/email/téléphone
--      déjà pris par un autre conducteur), pas seulement les bannis.
--
-- Sécurité : toute écriture passe par RPC SECURITY DEFINER. Le rôle « gardien » vient de get_my_role()
--            (app_metadata uniquement, cf. 20260630120000_secure_roles_app_metadata.sql).
--            Anti-lockout : on ne peut suspendre ni soi-même, ni un gardien.
-- Additive, idempotente, non destructive.

-- ============================================================
-- 1) Table de bannissement / suspension
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_bans (
  user_id     uuid PRIMARY KEY,
  owner_plate text,
  email       text,
  phone       text,
  pseudo      text,
  reason      text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_bans_plate ON public.account_bans (lower(owner_plate));
CREATE INDEX IF NOT EXISTS idx_account_bans_email ON public.account_bans (lower(email));
CREATE INDEX IF NOT EXISTS idx_account_bans_phone ON public.account_bans (phone);

ALTER TABLE public.account_bans ENABLE ROW LEVEL SECURITY;
-- Aucune policy → lecture/écriture directe interdite. Tout passe par les RPC ci-dessous.

-- ============================================================
-- 2) am_i_suspended() : le compte courant est-il suspendu ? (verrou de connexion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.am_i_suspended()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.account_bans WHERE user_id = auth.uid())
    THEN json_build_object(
           'suspended', true,
           'reason', (SELECT reason FROM public.account_bans WHERE user_id = auth.uid()))
    ELSE json_build_object('suspended', false)
  END;
$$;
REVOKE ALL ON FUNCTION public.am_i_suspended() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.am_i_suspended() TO authenticated;

-- ============================================================
-- 3) check_signup_available() : plaque / email / téléphone disponibles ? (verrou d'inscription)
--    Appelée AVANT authentification → accessible à anon. Ne retourne QUE des booléens.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_signup_available(p_plate text, p_email text, p_phone text)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_plate text := lower(nullif(trim(coalesce(p_plate,'')), ''));
  v_email text := lower(nullif(trim(coalesce(p_email,'')), ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');
  v_plate_taken boolean := false;
  v_email_taken boolean := false;
  v_phone_taken boolean := false;
  v_banned      boolean := false;
BEGIN
  IF v_plate IS NOT NULL THEN
    v_plate_taken := EXISTS (
      SELECT 1 FROM public.profiles WHERE lower(owner_plate) = v_plate
    );
  END IF;
  IF v_email IS NOT NULL THEN
    v_email_taken := EXISTS (
      SELECT 1 FROM auth.users WHERE lower(email) = v_email
    );
  END IF;
  IF v_phone IS NOT NULL THEN
    v_phone_taken := EXISTS (
      SELECT 1 FROM public.profiles
      WHERE regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_phone
    );
  END IF;
  v_banned := EXISTS (
    SELECT 1 FROM public.account_bans
    WHERE (v_plate IS NOT NULL AND lower(owner_plate) = v_plate)
       OR (v_email IS NOT NULL AND lower(email) = v_email)
       OR (v_phone IS NOT NULL AND regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_phone)
  );
  RETURN json_build_object(
    'plate_taken', v_plate_taken,
    'email_taken', v_email_taken,
    'phone_taken', v_phone_taken,
    'banned',      v_banned
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_signup_available(text, text, text) TO anon, authenticated;

-- ============================================================
-- 4) admin_list_users() : liste des comptes pour la Modération (gardien uniquement)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id     uuid,
  owner_plate text,
  pseudo      text,
  email       text,
  suspended   boolean,
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
    u.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ============================================================
-- 5) admin_suspend_user() : suspendre un compte (gardien ; anti-lockout)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role        text;
  v_target_role text;
  v_plate text; v_email text; v_phone text; v_pseudo text;
BEGIN
  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'gardien' THEN RAISE EXCEPTION 'réservé au rôle gardien'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id obligatoire'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'impossible de se suspendre soi-même'; END IF;
  SELECT raw_app_meta_data->>'role' INTO v_target_role FROM auth.users WHERE id = p_user_id;
  IF v_target_role = 'gardien' THEN RAISE EXCEPTION 'impossible de suspendre un gardien'; END IF;
  SELECT owner_plate, email, phone, pseudo
    INTO v_plate, v_email, v_phone, v_pseudo
    FROM public.profiles WHERE id = p_user_id;
  INSERT INTO public.account_bans (user_id, owner_plate, email, phone, pseudo, reason, created_by, created_at)
    VALUES (p_user_id, v_plate, v_email, v_phone, v_pseudo,
            nullif(trim(coalesce(p_reason,'')), ''), auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      owner_plate = EXCLUDED.owner_plate,
      email       = EXCLUDED.email,
      phone       = EXCLUDED.phone,
      pseudo      = EXCLUDED.pseudo,
      reason      = EXCLUDED.reason,
      created_by  = auth.uid(),
      created_at  = now();
END;
$$;
REVOKE ALL ON FUNCTION public.admin_suspend_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;

-- ============================================================
-- 6) admin_unsuspend_user() : réactiver un compte (gardien)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'gardien' THEN RAISE EXCEPTION 'réservé au rôle gardien'; END IF;
  DELETE FROM public.account_bans WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_unsuspend_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) TO authenticated;

-- ============================================================
-- 7) Auto-test (NOTICE ; le SQL Editor ne l'affiche pas → table créée = succès)
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='account_bans'),
         'account_bans absente';
  RAISE NOTICE '[account_moderation] OK — suspension + anti-recréation prêtes';
END; $$;
