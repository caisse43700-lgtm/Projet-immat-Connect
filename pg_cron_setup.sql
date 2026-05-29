-- ══════════════════════════════════════════════════════════════════
-- pg_cron — Nettoyage automatique des demandes de contact expirées
-- ImmatConnect Pro — m-02
--
-- Instructions : coller les 2 blocs ci-dessous dans
--   Supabase Dashboard → SQL Editor → New Query → Run
--
-- Étape 1 : activer l'extension (à faire une seule fois)
-- ══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;

-- ══════════════════════════════════════════════════════════════════
-- Étape 2 : planifier le job (toutes les minutes)
-- ══════════════════════════════════════════════════════════════════

select cron.schedule(
  'expire-call-requests',        -- nom du job (unique)
  '* * * * *',                   -- cron : toutes les minutes
  $$
    update public.call_requests
      set status     = 'expired',
          updated_at = now()
    where status     = 'pending'
      and expires_at < now()
  $$
);

-- ══════════════════════════════════════════════════════════════════
-- Vérification : lister les jobs actifs
-- ══════════════════════════════════════════════════════════════════
-- select * from cron.job;

-- ══════════════════════════════════════════════════════════════════
-- Suppression du job (si besoin)
-- ══════════════════════════════════════════════════════════════════
-- select cron.unschedule('expire-call-requests');
