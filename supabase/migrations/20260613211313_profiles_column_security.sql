-- Migration : sécurité colonnes profiles — column-level grants
-- Remplace l'approche owner-only SELECT (trop stricte : casse calls.js et messages.js)
-- par un accès row-level public + restriction column-level sur les colonnes PII.
--
-- Résultat :
--   authenticated peut lire toutes les lignes de profiles
--   MAIS uniquement les colonnes : id, owner_plate, pseudo, vehicle_color
--   email et phone sont inaccessibles via REST API (/rest/v1/profiles?select=email → 42501)
--   Le propriétaire lit son profil complet via get_my_profile() SECURITY DEFINER
--
-- Idempotente.

-- ============================================================
-- 1. Changer la policy SELECT : toutes les lignes accessibles
--    (les colonnes PII restent protégées via grants ci-dessous)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own"           ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 2. Column-level security : révoquer SELECT global,
--    accorder uniquement les colonnes non-PII aux clients
-- ============================================================
-- Révoquer le SELECT global (probablement accordé par le bootstrap Supabase)
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Accorder uniquement les colonnes sans PII pour les clients authentifiés
-- → id            : résolution uuid ↔ plaque (calls.js, messages.js)
-- → owner_plate   : résolution plaque ↔ uuid (calls.js, messages.js)
-- → pseudo        : affichage dans les conversations
-- → vehicle_color : affichage dans la carte
GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON public.profiles TO authenticated;

-- anon ne lit pas profiles directement (utilise public_profiles)
-- pas de GRANT sur profiles pour anon

-- ============================================================
-- 3. Fonction SECURITY DEFINER — profil complet pour le propriétaire
--    Permet à get_my_profile() de retourner email + phone sans
--    les exposer via la table directement.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile json;
BEGIN
  SELECT row_to_json(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid();
  RETURN v_profile;
END;
$$;

-- Note : row_to_json retourne tous les champs de la ligne (email, phone inclus).
-- Cette fonction ne peut être appelée que par un utilisateur authentifié
-- et ne retourne que sa propre ligne (WHERE p.id = auth.uid()).
