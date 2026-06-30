-- ── Zones accidentogènes : UNIQUEMENT les accidents, au-delà d'un seuil ──────────
-- PROBLÈME (signalé PO) : toute alerte (pneu, porte, bouchon, travaux, contrôle,
--   obstacle, danger, info conducteurs) créait une zone rouge dès 1 occurrence.
--   « Tout est confondu » → faux positifs massifs.
-- CORRECTIF :
--   1) le trigger ne compte QUE les accidents (reason ILIKE '%accident%') ;
--   2) le compteur d'incidents n'augmente qu'à l'INSERT (plus de double-comptage
--      au changement de statut) ; le statut résolu/confirmé n'ajuste que la confiance ;
--   3) une zone n'est RETOURNÉE qu'à partir de N accidents dans la cellule (~111 m).
-- Table road_risk_segments = projection dérivée des reports → reconstructible (TRUNCATE OK).

-- 1. Trigger : filtre ACCIDENT + incident compté seulement à l'INSERT
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
  -- Seuls les ACCIDENTS alimentent les zones. Tout autre signalement
  -- (pneu, porte, bouchon, travaux, contrôle, obstacle, danger, info conducteurs, aide)
  -- ne crée AUCUNE zone.
  IF NEW.reason IS NULL OR NEW.reason NOT ILIKE '%accident%' THEN
    RETURN NEW;
  END IF;

  v_lat := NEW.latitude;
  v_lng := NEW.longitude;
  IF v_lat IS NULL OR v_lng IS NULL THEN RETURN NEW; END IF;

  v_lat := ROUND(v_lat::numeric, 3);
  v_lng := ROUND(v_lng::numeric, 3);
  v_key := v_lat::text || '_' || v_lng::text;
  v_conf := CASE WHEN NEW.status IN ('resolved', 'confirmed') THEN 1 ELSE 0 END;

  IF TG_OP = 'INSERT' THEN
    -- Un nouvel accident → +1 incident dans la cellule
    INSERT INTO road_risk_segments (cell_key, lat, lng, incident_count, confirmed_count, last_incident_at)
    VALUES (v_key, v_lat, v_lng, 1, v_conf, COALESCE(NEW.created_at, now()))
    ON CONFLICT (cell_key) DO UPDATE SET
      incident_count   = road_risk_segments.incident_count + 1,
      confirmed_count  = road_risk_segments.confirmed_count + v_conf,
      last_incident_at = GREATEST(road_risk_segments.last_incident_at, COALESCE(NEW.created_at, now())),
      updated_at       = now();
  ELSE
    -- Changement de statut → on n'incrémente PAS l'incident (anti double-comptage),
    -- on ajuste seulement la confirmation (plafonnée au nombre d'incidents).
    UPDATE road_risk_segments SET
      confirmed_count = LEAST(incident_count, confirmed_count + v_conf),
      updated_at      = now()
    WHERE cell_key = v_key;
  END IF;

  -- Score bayésien avec décroissance exponentielle (demi-vie 30 jours)
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

-- (le trigger trg_road_risk reste attaché par la migration 20260619 — même nom de fonction)

-- 2. Reconstruction depuis les ACCIDENTS uniquement (table dérivée → on repart propre)
TRUNCATE road_risk_segments;
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
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND created_at > now() - INTERVAL '6 months'
  AND reason ILIKE '%accident%'                 -- ⬅ ACCIDENTS uniquement
GROUP BY
  ROUND(latitude::numeric, 3),
  ROUND(longitude::numeric, 3)
HAVING COUNT(*) >= 1
ON CONFLICT (cell_key) DO NOTHING;

-- 3. RPC : seuil minimum d'ACCIDENTS pour qu'une zone soit affichée (défaut 3)
DROP FUNCTION IF EXISTS get_risk_zones(double precision, double precision, double precision, double precision);
CREATE OR REPLACE FUNCTION get_risk_zones(
  p_lat           double precision,
  p_lng           double precision,
  p_radius_km     double precision DEFAULT 3,
  p_min_score     double precision DEFAULT 0,
  p_min_incidents integer          DEFAULT 3
)
RETURNS TABLE (
  cell_key         text,
  lat              double precision,
  lng              double precision,
  risk_score       double precision,
  incident_count   integer,
  confirmed_count  integer,
  last_incident_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    s.cell_key, s.lat, s.lng, s.risk_score,
    s.incident_count, s.confirmed_count, s.last_incident_at
  FROM road_risk_segments s
  WHERE
    s.incident_count >= p_min_incidents          -- ⬅ seuil : pas de zone sous N accidents
    AND s.risk_score >= p_min_score
    AND s.last_incident_at > now() - INTERVAL '6 months'
    AND (
      6371.0 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(s.lat))
          * cos(radians(s.lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(s.lat))
        )
      )
    ) <= p_radius_km
  ORDER BY s.risk_score DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION get_risk_zones(double precision, double precision, double precision, double precision, integer)
  TO authenticated;
