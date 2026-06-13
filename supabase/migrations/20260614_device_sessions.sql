-- Migration : device_sessions — multi-appareils + heartbeat
-- À exécuter dans SQL Editor > Supabase Dashboard

CREATE TABLE IF NOT EXISTS device_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  platform      TEXT, -- 'ios' | 'android' | 'web'
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  push_endpoint TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_sessions_select_own" ON device_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "device_sessions_insert_own" ON device_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_sessions_update_own" ON device_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "device_sessions_delete_own" ON device_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_last_seen ON device_sessions (last_seen DESC);

-- Nettoyage automatique des sessions inactives depuis plus de 7 jours
-- (à appeler via pg_cron ou manuellement)
-- DELETE FROM device_sessions WHERE last_seen < now() - interval '7 days';
