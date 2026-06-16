-- delete_audit_log — traçabilité RGPD art. 17 — Sprint 8 S8-01
CREATE TABLE IF NOT EXISTS delete_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT        DEFAULT 'pending',
  error           TEXT,
  steps_completed TEXT[]
);

-- Accessible uniquement via service_role (Edge Function delete-account)
ALTER TABLE delete_audit_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy pour authenticated → seul service_role peut lire/écrire
