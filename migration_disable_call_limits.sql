-- migration_disable_call_limits.sql
-- Supprime les limites anti-spam et cooldown sur les demandes d'appel.
-- À exécuter dans Supabase → SQL Editor.

create or replace function public.call_request_on_insert()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;
