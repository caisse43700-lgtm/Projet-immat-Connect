-- Migration : rate limiting côté DB pour les messages
-- Limite : 30 messages par minute par utilisateur (via RLS WITH CHECK)

-- Fonction SECURITY DEFINER pour compter les messages récents de l'expéditeur.
-- Contourne le RLS pour pouvoir lire la table messages sans boucle infinie.
CREATE OR REPLACE FUNCTION check_message_rate_limit(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) < 30
  FROM messages
  WHERE sender_id = uid
    AND created_at > NOW() - INTERVAL '1 minute';
$$;

-- Politique d'insertion avec vérification du rate limit.
-- Si la politique "messages_insert_own" existe déjà, on la remplace.
DROP POLICY IF EXISTS "messages_rate_limited_insert" ON messages;

CREATE POLICY "messages_rate_limited_insert" ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND check_message_rate_limit(auth.uid())
  );
