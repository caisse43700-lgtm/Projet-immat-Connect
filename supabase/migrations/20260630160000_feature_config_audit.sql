-- Journal de gouvernance CÔTÉ SERVEUR (partagé entre appareils, auditable).
-- Complète le journal local (ic_gov_log) : chaque écriture de flag flotte est tracée durablement.
-- set_feature_flag_fleet (déjà gardien-only) journalise désormais dans feature_config_audit.
-- get_feature_audit() : lecture réservée au Gardien (via get_my_role / app_metadata).
-- Additif, idempotent, non destructif.

CREATE TABLE IF NOT EXISTS public.feature_config_audit (
  id          bigserial PRIMARY KEY,
  key         text        NOT NULL,
  enabled     boolean     NOT NULL,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fca_changed_at ON public.feature_config_audit (changed_at DESC);

ALTER TABLE public.feature_config_audit ENABLE ROW LEVEL SECURITY;
-- Aucune policy → lecture/écriture directe interdite ; tout passe par les RPC SECURITY DEFINER.

-- 1) set_feature_flag_fleet : inchangée fonctionnellement + insertion d'une ligne d'audit
CREATE OR REPLACE FUNCTION public.set_feature_flag_fleet(p_key text, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
  BEGIN
    SELECT public.get_my_role() INTO v_role;
  EXCEPTION WHEN others THEN v_role := NULL;
  END;
  IF v_role IS DISTINCT FROM 'gardien' THEN RAISE EXCEPTION 'réservé au rôle gardien'; END IF;
  IF p_key IS NULL OR length(p_key) = 0 THEN RAISE EXCEPTION 'key obligatoire'; END IF;
  INSERT INTO public.feature_config (key, enabled, updated_by, updated_at)
    VALUES (p_key, COALESCE(p_enabled, true), auth.uid(), now())
    ON CONFLICT (key) DO UPDATE
      SET enabled = EXCLUDED.enabled, updated_by = auth.uid(), updated_at = now();
  INSERT INTO public.feature_config_audit (key, enabled, changed_by, changed_at)
    VALUES (p_key, COALESCE(p_enabled, true), auth.uid(), now());
END; $$;

GRANT EXECUTE ON FUNCTION public.set_feature_flag_fleet(text, boolean) TO authenticated;

-- 2) get_feature_audit : journal partagé, réservé au Gardien (avec plaque de l'auteur)
CREATE OR REPLACE FUNCTION public.get_feature_audit(p_limit int DEFAULT 50)
RETURNS TABLE (key text, enabled boolean, changed_by uuid, changed_at timestamptz, plate text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'gardien' THEN RAISE EXCEPTION 'réservé au rôle gardien'; END IF;
  RETURN QUERY
  SELECT a.key, a.enabled, a.changed_by, a.changed_at, p.owner_plate
  FROM public.feature_config_audit a
  LEFT JOIN public.profiles p ON p.id = a.changed_by
  ORDER BY a.changed_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200);
END; $$;
REVOKE ALL ON FUNCTION public.get_feature_audit(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feature_audit(int) TO authenticated;

DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='feature_config_audit'),
         'feature_config_audit absente';
  RAISE NOTICE '[feature_config_audit] OK — journal de gouvernance serveur prêt';
END; $$;
