-- Migration : table user_blocks — blocages persistés cross-device
-- Sprint 2 S2-6 — ImmatConnect Pro

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_plate text        NOT NULL,
  level         text        NOT NULL DEFAULT 'BLOCK_ALL'
                            CHECK (level IN ('BLOCK_MESSAGES','BLOCK_CALLS','BLOCK_ALL')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, blocked_plate)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur gère uniquement ses propres blocages
DROP POLICY IF EXISTS "user_blocks_self" ON public.user_blocks;
CREATE POLICY "user_blocks_self" ON public.user_blocks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index pour lookup rapide par user
CREATE INDEX IF NOT EXISTS user_blocks_user_id_idx ON public.user_blocks (user_id);

COMMENT ON TABLE public.user_blocks IS 'Blocages de plaques par utilisateur — persistés cross-device';
COMMENT ON COLUMN public.user_blocks.blocked_plate IS 'Plaque normalisée (majuscules, sans espaces)';
COMMENT ON COLUMN public.user_blocks.level IS 'BLOCK_MESSAGES | BLOCK_CALLS | BLOCK_ALL';
