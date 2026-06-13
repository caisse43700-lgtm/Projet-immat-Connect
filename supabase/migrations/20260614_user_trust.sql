-- Migration : Trust Engine — vehicle_trust_scores
-- Idempotent (IF NOT EXISTS partout)
-- Aucun user_id exposé côté client

CREATE TABLE IF NOT EXISTS vehicle_trust_scores (
  owner_plate  text        PRIMARY KEY,
  trust_score  integer     NOT NULL CHECK (trust_score BETWEEN 0 AND 100),
  trust_level  text        NOT NULL CHECK (trust_level IN ('ambassador','trusted','neutral','caution')),
  signals_ok   integer     NOT NULL DEFAULT 0,
  signals_bad  integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicle_trust_scores ENABLE ROW LEVEL SECURITY;

-- Lecture publique : plate + score + level uniquement (aucune PII)
DROP POLICY IF EXISTS "trust_select_public" ON vehicle_trust_scores;
CREATE POLICY "trust_select_public" ON vehicle_trust_scores
  FOR SELECT USING (true);

-- Écriture réservée au service_role (pas d'accès client direct)
DROP POLICY IF EXISTS "trust_insert_blocked" ON vehicle_trust_scores;
CREATE POLICY "trust_insert_blocked" ON vehicle_trust_scores
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "trust_update_blocked" ON vehicle_trust_scores;
CREATE POLICY "trust_update_blocked" ON vehicle_trust_scores
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "trust_delete_blocked" ON vehicle_trust_scores;
CREATE POLICY "trust_delete_blocked" ON vehicle_trust_scores
  FOR DELETE USING (false);

CREATE INDEX IF NOT EXISTS idx_vehicle_trust_level ON vehicle_trust_scores (trust_level);

-- Fonction principale : calcule et persiste le score pour une plaque donnée.
-- SECURITY DEFINER : accède à profiles + reports + driver_ratings_summary
-- sans exposer user_id au client appelant.
CREATE OR REPLACE FUNCTION refresh_vehicle_trust(p_plate text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      uuid;
  v_confirmed    integer := 0;
  v_disputed     integer := 0;
  v_ratings_avg  numeric;
  v_ratings_cnt  integer := 0;
  v_score        integer;
  v_level        text;
  v_ratings_bonus integer := 0;
BEGIN
  -- Normaliser la plaque (uppercase, sans tirets)
  p_plate := upper(regexp_replace(p_plate, '[-\s]', '', 'g'));
  IF p_plate IS NULL OR length(p_plate) < 2 THEN RETURN; END IF;

  -- Résoudre la plaque → user_id via profiles
  SELECT id INTO v_user_id
  FROM profiles
  WHERE upper(regexp_replace(owner_plate, '[-\s]', '', 'g')) = p_plate
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Plaque sans propriétaire lié : aucun score, supprimer l'entrée si elle existe
    DELETE FROM vehicle_trust_scores WHERE owner_plate = p_plate;
    RETURN;
  END IF;

  -- Signalements confirmés (status = 'resolved')
  SELECT COUNT(*)::integer INTO v_confirmed
  FROM reports
  WHERE reporter_id = v_user_id AND status = 'resolved';

  -- Signalements contestés — colonne is_disputed facultative (peut ne pas exister encore)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'is_disputed'
  ) THEN
    SELECT COUNT(*)::integer INTO v_disputed
    FROM reports
    WHERE reporter_id = v_user_id AND is_disputed = true;
  ELSE
    v_disputed := 0;
    RAISE WARNING '[trust] colonne is_disputed absente sur reports — v_disputed forcé à 0';
  END IF;

  -- Notes conducteur (driver_ratings_summary)
  SELECT avg_score, total
  INTO v_ratings_avg, v_ratings_cnt
  FROM driver_ratings_summary
  WHERE rated_plate = p_plate;

  -- Si aucune activité du tout : pas de score (ligne supprimée)
  IF v_confirmed = 0 AND v_disputed = 0 AND COALESCE(v_ratings_cnt, 0) = 0 THEN
    DELETE FROM vehicle_trust_scores WHERE owner_plate = p_plate;
    RETURN;
  END IF;

  -- Bonus/malus issu des notes conducteur (avg 1-5 → -15 à +15)
  IF v_ratings_avg IS NOT NULL THEN
    v_ratings_bonus := CASE
      WHEN v_ratings_avg >= 4.5 THEN  15
      WHEN v_ratings_avg >= 3.5 THEN   8
      WHEN v_ratings_avg >= 2.5 THEN   0
      WHEN v_ratings_avg >= 1.5 THEN  -8
      ELSE                            -15
    END;
  END IF;

  -- Formule principale
  v_score := 50
    + LEAST(30, v_confirmed * 5)    -- +5 par signalement confirmé, max +30
    - LEAST(50, v_disputed * 12)    -- -12 par signalement contesté, max -50
    + v_ratings_bonus;

  v_score := LEAST(100, GREATEST(0, v_score));

  -- Niveau de confiance
  v_level := CASE
    WHEN v_score >= 75 THEN 'ambassador'
    WHEN v_score >= 55 THEN 'trusted'
    WHEN v_score >= 35 THEN 'neutral'
    ELSE                     'caution'
  END;

  -- Upsert (insert ou mise à jour atomique)
  INSERT INTO vehicle_trust_scores (owner_plate, trust_score, trust_level, signals_ok, signals_bad, updated_at)
  VALUES (p_plate, v_score, v_level, v_confirmed, v_disputed, now())
  ON CONFLICT (owner_plate) DO UPDATE SET
    trust_score = EXCLUDED.trust_score,
    trust_level = EXCLUDED.trust_level,
    signals_ok  = EXCLUDED.signals_ok,
    signals_bad = EXCLUDED.signals_bad,
    updated_at  = EXCLUDED.updated_at;

  RAISE LOG '[trust] % → score=% level=%', p_plate, v_score, v_level;
END;
$$;
