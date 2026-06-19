-- ── Zones à risque : accidents uniquement ────────────────────────────────────
-- Corrige le trigger update_road_risk_on_report pour n'accumuler les
-- zones à risque QUE sur les vrais dangers de route :
--   [ROUTE] Accident, [ROUTE] Obstacle, [ROUTE] Danger
--
-- Exclus intentionnellement :
--   [ROUTE] Contrôle (police)  — information, pas un danger physique
--   [ROUTE] Travaux            — signalétique déjà présente, temporaire
--   [ROUTE] Bouchon            — temporaire, se résorbe seul
--   [ASSISTANCE] *             — situations individuelles, pas des zones dangereuses

CREATE OR REPLACE FUNCTION update_road_risk_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lat  double precision;
  v_lng  double precision;
  v_key  text;
  v_conf integer;
BEGIN
  -- Filtre strict : seuls les vrais dangers routiers créent une zone à risque.
  -- La raison est stockée comme '[ROUTE] Accident', '[ROUTE] Obstacle', etc.
  IF NEW.reason IS NULL
     OR NOT (
       NEW.reason LIKE '[ROUTE] Accident%'
       OR NEW.reason LIKE '[ROUTE] Obstacle%'
       OR NEW.reason LIKE '[ROUTE] Danger%'
     ) THEN
    RETURN NEW;   -- police, travaux, bouchons, assistance → ignorés
  END IF;

  v_lat := NEW.latitude;
  v_lng := NEW.longitude;
  IF v_lat IS NULL OR v_lng IS NULL THEN RETURN NEW; END IF;

  -- Cellule à 3 décimales ≈ 111 m
  v_lat := ROUND(v_lat::numeric, 3);
  v_lng := ROUND(v_lng::numeric, 3);
  v_key := v_lat::text || '_' || v_lng::text;
  v_conf := CASE WHEN NEW.status IN ('resolved', 'confirmed') THEN 1 ELSE 0 END;

  INSERT INTO road_risk_segments (cell_key, lat, lng, incident_count, confirmed_count, last_incident_at)
  VALUES (v_key, v_lat, v_lng, 1, v_conf, COALESCE(NEW.created_at, now()))
  ON CONFLICT (cell_key) DO UPDATE SET
    incident_count   = road_risk_segments.incident_count + 1,
    confirmed_count  = road_risk_segments.confirmed_count + v_conf,
    last_incident_at = GREATEST(road_risk_segments.last_incident_at, COALESCE(NEW.created_at, now())),
    updated_at       = now();

  -- Score bayésien avec décroissance (demi-vie 30 jours) — identique à l'original
  UPDATE road_risk_segments SET
    risk_score = LEAST(100,
      incident_count::double precision
      * GREATEST(0.1, confirmed_count::double precision / GREATEST(incident_count, 1))
      * EXP(-GREATEST(0, EXTRACT(EPOCH FROM (now() - last_incident_at))) / (30.0 * 86400))
      * 20.0
    ),
    updated_at = now()
  WHERE cell_key = v_key;

  RETURN NEW;
END;
$$;

-- Re-créer le trigger (REPLACE FUNCTION suffit, mais recréer le trigger
-- garantit qu'il est bien attaché à la fonction mise à jour)
DROP TRIGGER IF EXISTS trg_road_risk ON reports;
CREATE TRIGGER trg_road_risk
  AFTER INSERT OR UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION update_road_risk_on_report();

-- ── Recalibration des données existantes ─────────────────────────────────────
-- Les données accumulées avant ce fix contiennent des zones gonflées
-- par des signalements police/travaux/bouchons. On repart de zéro proprement.

TRUNCATE road_risk_segments;

-- Re-population depuis les données existantes — UNIQUEMENT accidents/obstacles/dangers
INSERT INTO road_risk_segments (cell_key, lat, lng, incident_count, confirmed_count, last_incident_at, risk_score)
SELECT
  ROUND(latitude::numeric, 3)::text || '_' ||
  ROUND(longitude::numeric, 3)::text                              AS cell_key,
  ROUND(latitude::numeric, 3)::double precision                   AS cell_lat,
  ROUND(longitude::numeric, 3)::double precision                  AS cell_lng,
  COUNT(*)::integer                                               AS incident_count,
  COUNT(*) FILTER (WHERE status IN ('resolved','confirmed'))::integer AS confirmed_count,
  MAX(created_at)                                                 AS last_incident_at,
  LEAST(100,
    COUNT(*)::double precision
    * GREATEST(0.1,
        COUNT(*) FILTER (WHERE status IN ('resolved','confirmed'))::double precision / COUNT(*)
      )
    * EXP(-GREATEST(0, EXTRACT(EPOCH FROM (now() - MAX(created_at)))) / (30.0 * 86400))
    * 20.0
  )                                                               AS risk_score
FROM reports
WHERE latitude  IS NOT NULL
  AND longitude IS NOT NULL
  AND created_at > now() - INTERVAL '6 months'
  AND (
    reason LIKE '[ROUTE] Accident%'
    OR reason LIKE '[ROUTE] Obstacle%'
    OR reason LIKE '[ROUTE] Danger%'
  )
GROUP BY
  ROUND(latitude::numeric, 3),
  ROUND(longitude::numeric, 3)
HAVING COUNT(*) >= 2     -- minimum 2 accidents distincts au même endroit
ON CONFLICT (cell_key) DO NOTHING;
