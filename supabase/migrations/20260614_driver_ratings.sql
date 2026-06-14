CREATE TABLE IF NOT EXISTS driver_ratings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_plate text        NOT NULL,
  score       smallint    NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment     text        CHECK (char_length(comment) <= 280),
  context     text        NOT NULL CHECK (context IN ('call','message','alert','encounter')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rater_id, rated_plate, context)
);

ALTER TABLE driver_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_own" ON driver_ratings;
CREATE POLICY "ratings_select_own" ON driver_ratings
  FOR SELECT USING (
    auth.uid() = rater_id
    OR rated_plate = (SELECT owner_plate FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "ratings_insert_own" ON driver_ratings;
CREATE POLICY "ratings_insert_own" ON driver_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND score BETWEEN 1 AND 5
  );

DROP POLICY IF EXISTS "ratings_delete_own" ON driver_ratings;
CREATE POLICY "ratings_delete_own" ON driver_ratings
  FOR DELETE USING (
    auth.uid() = rater_id
    AND created_at > now() - interval '10 minutes'
  );

CREATE INDEX IF NOT EXISTS idx_driver_ratings_plate_at   ON driver_ratings (rated_plate, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_rater_at   ON driver_ratings (rater_id,    created_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS driver_ratings_summary AS
  SELECT
    rated_plate,
    round(avg(score)::numeric, 2) AS avg_score,
    count(*)::int                  AS total,
    max(created_at)                AS last_rated_at
  FROM driver_ratings
  GROUP BY rated_plate
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_ratings_summary_plate
  ON driver_ratings_summary (rated_plate);

CREATE OR REPLACE FUNCTION refresh_ratings_summary()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_ratings_summary;
END;
$$;
