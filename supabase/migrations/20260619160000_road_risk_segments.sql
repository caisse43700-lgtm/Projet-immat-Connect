-- ── Carte de risque vivante ─────────────────────────────────────────────────
-- Chaque cellule ~100 m × 100 m accumule les signalements confirmés et calcule
-- un score bayésien avec décroissance temporelle (demi-vie 30 jours).

-- 1. Colonne météo sur reports (enrichissement en arrière-plan à chaque signalement)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS weather_condition text;

-- 2. Table principale
CREATE TABLE IF NOT EXISTS road_risk_segments (
  id               uuid             DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_key         text             UNIQUE NOT NULL,   -- "48.853_2.349" ≈ 111 m
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  risk_score       double precision DEFAULT 0,         -- 0–100
  incident_count   integer          DEFAULT 0,
  confirmed_count  integer          DEFAULT 0,
  last_incident_at timestamptz,
  updated_at       timestamptz      DEFAULT now(),
  created_at       timestamptz      DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_road_risk_score   ON road_risk_segments (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_road_risk_updated ON road_risk_segments (updated_at DESC);

-- RLS
ALTER TABLE road_risk_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "road_risk_read"    ON road_risk_segments;
DROP POLICY IF EXISTS "road_risk_service" ON road_risk_segments;
CREATE POLICY "road_risk_read"    ON road_risk_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "road_risk_service" ON road_risk_segments FOR ALL    TO service_role  USING (true);

-- 3. Trigger : mise à jour du score à chaque INSERT/UPDATE de status sur reports
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
  -- reports utilise uniquement latitude/longitude (migration 20260616)
  v_lat := NEW.latitude;
  v_lng := NEW.longitude;
  IF v_lat IS NULL OR v_lng IS NULL THEN RETURN NEW; END IF;

  -- Cellule à 3 décimales ≈ 111 m de précision
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

DROP TRIGGER IF EXISTS trg_road_risk ON reports;
CREATE TRIGGER trg_road_risk
  AFTER INSERT OR UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION update_road_risk_on_report();

-- 4. Population initiale depuis les données existantes (idempotent)
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
GROUP BY
  ROUND(latitude::numeric, 3),
  ROUND(longitude::numeric, 3)
HAVING COUNT(*) >= 1
ON CONFLICT (cell_key) DO NOTHING;

-- 5. RPC exposée au front — zones à risque dans un rayon donné
CREATE OR REPLACE FUNCTION get_risk_zones(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km double precision DEFAULT 3,
  p_min_score double precision DEFAULT 15
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
    s.risk_score  >= p_min_score
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

GRANT EXECUTE ON FUNCTION get_risk_zones(double precision, double precision, double precision, double precision)
  TO authenticated;
