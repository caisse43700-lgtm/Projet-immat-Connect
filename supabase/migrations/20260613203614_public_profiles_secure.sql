-- Migration : sécurisation profiles + table public_profiles sans PII
-- Objectif : aucun utilisateur ne peut lire email/phone/id d'un autre via REST API
-- Idempotente (DROP IF EXISTS + CREATE IF NOT EXISTS)

-- ============================================================
-- 1. Activer RLS sur profiles (idempotent)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Supprimer TOUTES les policies SELECT existantes sur profiles
--    (évite qu'une ancienne policy "public" contredise la nouvelle)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'profiles'
      AND schemaname = 'public'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Policy SELECT restrictive : owner uniquement
-- ============================================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ============================================================
-- 4. Table public_profiles — données publiques, aucune PII
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_profiles (
  owner_plate   text        PRIMARY KEY,
  pseudo        text,
  vehicle_color text,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DROP POLICY IF EXISTS "public_profiles_select" ON public.public_profiles;
CREATE POLICY "public_profiles_select" ON public.public_profiles
  FOR SELECT USING (true);

-- Écriture interdite aux clients (trigger + service_role uniquement)
DROP POLICY IF EXISTS "public_profiles_insert_blocked" ON public.public_profiles;
CREATE POLICY "public_profiles_insert_blocked" ON public.public_profiles
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "public_profiles_update_blocked" ON public.public_profiles;
CREATE POLICY "public_profiles_update_blocked" ON public.public_profiles
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "public_profiles_delete_blocked" ON public.public_profiles;
CREATE POLICY "public_profiles_delete_blocked" ON public.public_profiles
  FOR DELETE USING (false);

-- ============================================================
-- 5. Trigger de synchronisation profiles → public_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.owner_plate IS NOT NULL THEN
    INSERT INTO public.public_profiles (owner_plate, pseudo, vehicle_color, updated_at)
    VALUES (NEW.owner_plate, NEW.pseudo, NEW.vehicle_color, now())
    ON CONFLICT (owner_plate)
    DO UPDATE SET
      pseudo        = EXCLUDED.pseudo,
      vehicle_color = EXCLUDED.vehicle_color,
      updated_at    = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_profile ON public.profiles;
CREATE TRIGGER trg_sync_public_profile
  AFTER INSERT OR UPDATE OF pseudo, vehicle_color, owner_plate
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

-- ============================================================
-- 6. RPC SECURITY DEFINER — résolution uuid → données publiques
--    Permet à profilesByIds() de fonctionner sans exposer profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(p_ids uuid[])
RETURNS TABLE(user_id uuid, pseudo text, owner_plate text, vehicle_color text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id          AS user_id,
    pp.pseudo,
    pp.owner_plate,
    pp.vehicle_color
  FROM public.profiles pr
  JOIN public.public_profiles pp ON pp.owner_plate = pr.owner_plate
  WHERE pr.id = ANY(p_ids);
END;
$$;

-- ============================================================
-- 7. Backfill : peupler public_profiles depuis profiles existants
-- ============================================================
INSERT INTO public.public_profiles (owner_plate, pseudo, vehicle_color, updated_at)
SELECT
  owner_plate,
  pseudo,
  vehicle_color,
  now()
FROM public.profiles
WHERE owner_plate IS NOT NULL
ON CONFLICT (owner_plate) DO UPDATE SET
  pseudo        = EXCLUDED.pseudo,
  vehicle_color = EXCLUDED.vehicle_color,
  updated_at    = EXCLUDED.updated_at;
