-- Dashboard V2 — Étape 5 : gouvernance FLOTTE des fonctionnalités (scope fleet).
-- feature_config = vérité serveur d'activation par fonctionnalité (clé = flag legacy : ange_proactive,
-- zones_accidentogenes, demandes_aide, alertes_route, alertes_vehicule, auto_status, ange_monologue…).
-- Lecture par tous les utilisateurs authentifiés ; écriture réservée au rôle 'gardien' via RPC
-- SECURITY DEFINER (INV-DASH-018 : le client ne peut jamais écrire la flotte en direct).
-- Additive, idempotente, non destructive : table vide au départ → aucun impact (le client retombe
-- sur les valeurs device/défaut tant qu'aucune clé n'est gouvernée).

CREATE TABLE IF NOT EXISTS public.feature_config (
  key        text PRIMARY KEY,
  enabled    boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_config ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés (la gouvernance s'applique à toute la flotte).
DROP POLICY IF EXISTS feature_config_read ON public.feature_config;
CREATE POLICY feature_config_read ON public.feature_config FOR SELECT USING (true);
-- Aucune policy INSERT/UPDATE/DELETE → écriture directe refusée. Tout passe par la RPC ci-dessous.

-- Écriture réservée au Gardien (audit minimal : updated_by / updated_at).
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
END; $$;

GRANT EXECUTE ON FUNCTION public.set_feature_flag_fleet(text, boolean) TO authenticated;

-- Auto-test (visible via NOTICE ; le SQL Editor ne l'affiche pas → table créée = succès).
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_config'),
         'feature_config absente';
  RAISE NOTICE '[feature_config] OK — gouvernance flotte prête';
END; $$;
