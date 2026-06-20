-- Migration : rate limiting côté DB pour les messages
-- Limite : 30 messages par minute par utilisateur (via RLS WITH CHECK)

-- Fonction SECURITY DEFINER pour compter les messages récents de l'expéditeur.
-- Contourne le RLS pour pouvoir lire la table messages sans boucle infinie.
-- VOLATILE (pas STABLE) : le COUNT(*) change entre deux INSERTs dans la même session.
-- SET search_path : protège contre l'injection de schéma (CVE SECURITY DEFINER).
CREATE OR REPLACE FUNCTION check_message_rate_limit(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = pg_catalog, public
AS $$
  SELECT COUNT(*) < 30
  FROM messages
  WHERE sender_id = uid
    AND created_at > NOW() - INTERVAL '1 minute';
$$;

-- Restreint l'accès : seuls les rôles internes appelleront cette fonction via la policy RLS.
-- PUBLIC (y compris anon) ne peut pas sonder l'activité d'autres utilisateurs via /rpc.
REVOKE EXECUTE ON FUNCTION check_message_rate_limit(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION check_message_rate_limit(UUID) TO authenticated;

-- Politique d'insertion avec vérification du rate limit.
DROP POLICY IF EXISTS "messages_rate_limited_insert" ON messages;

CREATE POLICY "messages_rate_limited_insert" ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND check_message_rate_limit(auth.uid())
  );
