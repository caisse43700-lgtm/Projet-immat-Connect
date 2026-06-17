-- Sprint 9 — Détails véhicule (marque, modèle, année, carburant)
-- Idempotente.

-- ============================================================
-- 1. Nouvelles colonnes sur profiles (table privée)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_make  text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year  smallint,
  ADD COLUMN IF NOT EXISTS fuel_type     text;

-- ============================================================
-- 2. Accorder la lecture des nouvelles colonnes aux clients
--    (les PII email/phone restent révoquées — INV-COM-015)
-- ============================================================
GRANT SELECT (vehicle_make, vehicle_model, vehicle_year, fuel_type)
  ON public.profiles TO authenticated;

-- ============================================================
-- 3. Nouvelles colonnes sur public_profiles (miroir public)
-- ============================================================
ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS vehicle_make  text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year  smallint,
  ADD COLUMN IF NOT EXISTS fuel_type     text;

-- ============================================================
-- 4. Mettre à jour le trigger de synchronisation
--    profiles → public_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.owner_plate IS NOT NULL THEN
    INSERT INTO public.public_profiles
      (owner_plate, pseudo, vehicle_color, vehicle_make, vehicle_model, vehicle_year, fuel_type, updated_at)
    VALUES
      (NEW.owner_plate, NEW.pseudo, NEW.vehicle_color,
       NEW.vehicle_make, NEW.vehicle_model, NEW.vehicle_year, NEW.fuel_type, now())
    ON CONFLICT (owner_plate)
    DO UPDATE SET
      pseudo        = EXCLUDED.pseudo,
      vehicle_color = EXCLUDED.vehicle_color,
      vehicle_make  = EXCLUDED.vehicle_make,
      vehicle_model = EXCLUDED.vehicle_model,
      vehicle_year  = EXCLUDED.vehicle_year,
      fuel_type     = EXCLUDED.fuel_type,
      updated_at    = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_profile ON public.profiles;
CREATE TRIGGER trg_sync_public_profile
  AFTER INSERT OR UPDATE OF pseudo, vehicle_color, owner_plate,
                             vehicle_make, vehicle_model, vehicle_year, fuel_type
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

-- ============================================================
-- 5. Mettre à jour la RPC get_public_profiles_by_ids
-- ============================================================
-- DROP requis : CREATE OR REPLACE ne peut pas changer le RETURNS TABLE (SQLSTATE 42P13)
DROP FUNCTION IF EXISTS public.get_public_profiles_by_ids(uuid[]);
CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(p_ids uuid[])
RETURNS TABLE(
  user_id       uuid,
  pseudo        text,
  owner_plate   text,
  vehicle_color text,
  vehicle_make  text,
  vehicle_model text,
  vehicle_year  smallint,
  fuel_type     text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id          AS user_id,
    pp.pseudo,
    pp.owner_plate,
    pp.vehicle_color,
    pp.vehicle_make,
    pp.vehicle_model,
    pp.vehicle_year,
    pp.fuel_type
  FROM public.profiles pr
  JOIN public.public_profiles pp ON pp.owner_plate = pr.owner_plate
  WHERE pr.id = ANY(p_ids);
END;
$$;

-- ============================================================
-- 6. Backfill public_profiles depuis profiles existants
--    (nouvelles colonnes = NULL pour l'existant, attendu)
-- ============================================================
UPDATE public.public_profiles pp
SET
  vehicle_make  = pr.vehicle_make,
  vehicle_model = pr.vehicle_model,
  vehicle_year  = pr.vehicle_year,
  fuel_type     = pr.fuel_type
FROM public.profiles pr
WHERE pp.owner_plate = pr.owner_plate;
