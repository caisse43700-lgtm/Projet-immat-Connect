-- ============================================================
-- Migration v2 — Appels internes ImmatConnect (PRODUCTION)
-- Remplace et corrige intégralement v1.
-- À exécuter dans Supabase SQL Editor.
-- ============================================================

-- ── 0. Trigger partagé set_updated_at ─────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. call_preferences ───────────────────────────────────
create table if not exists public.call_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  allow_calls boolean      not null default false,
  updated_at  timestamptz  not null default now()
);

alter table public.call_preferences enable row level security;

-- Suppression de la policy "using (true)" (fuite de données)
drop policy if exists "call_pref_read_allow" on public.call_preferences;
drop policy if exists "call_pref_own"        on public.call_preferences;

-- Lecture et écriture : uniquement sa propre ligne
create policy "call_pref_self"
  on public.call_preferences
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_call_pref_updated_at on public.call_preferences;
create trigger trg_call_pref_updated_at
  before update on public.call_preferences
  for each row execute function public.set_updated_at();

-- ── 2. RPC sécurisée — vérifier appels sans exposer la table
-- Remplace le SELECT direct sur call_preferences depuis le client.
-- Retourne uniquement un boolean pour un uid donné.
create or replace function public.can_receive_calls(target_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select allow_calls from public.call_preferences where user_id = target_uid),
    false
  );
$$;

-- Accessible uniquement aux utilisateurs authentifiés
revoke all on function public.can_receive_calls(uuid) from public, anon;
grant execute on function public.can_receive_calls(uuid) to authenticated;

-- ── 3. call_requests ──────────────────────────────────────
create table if not exists public.call_requests (
  id                 uuid         primary key default gen_random_uuid(),
  requester_id       uuid         not null references auth.users(id) on delete cascade,
  receiver_id        uuid         not null references auth.users(id) on delete cascade,
  requester_plate    text,
  receiver_plate     text,
  status             text         not null default 'pending'
                       check (status in ('pending','accepted','refused','expired','cancelled')),
  source             text         not null default 'vehicle_contact',
  related_message_id uuid,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),
  expires_at         timestamptz  not null default (now() + interval '30 seconds'),
  responded_at       timestamptz,
  constraint no_self_call check (requester_id != receiver_id)
);

-- Realtime complet : inclut old + new sur UPDATE
alter table public.call_requests replica identity full;

alter table public.call_requests enable row level security;

-- Suppression des policies v1
drop policy if exists "call_req_read"    on public.call_requests;
drop policy if exists "call_req_insert"  on public.call_requests;
drop policy if exists "call_req_respond" on public.call_requests;
drop policy if exists "call_req_cancel"  on public.call_requests;

-- Lecture : requester ou receiver uniquement
create policy "call_req_read"
  on public.call_requests for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Insertion : requester seulement, jamais soi-même
create policy "call_req_insert"
  on public.call_requests for insert
  with check (auth.uid() = requester_id and requester_id != receiver_id);

-- Mise à jour receiver (accept/refuse) : uniquement depuis pending
create policy "call_req_respond"
  on public.call_requests for update
  using  (auth.uid() = receiver_id   and status = 'pending')
  with check (status in ('accepted', 'refused'));

-- Annulation requester : uniquement depuis pending
create policy "call_req_cancel"
  on public.call_requests for update
  using  (auth.uid() = requester_id and status = 'pending')
  with check (status = 'cancelled');

-- ── 4. Trigger : updated_at + validation transitions ──────
drop trigger if exists trg_call_req_updated_at on public.call_requests;

create or replace function public.call_request_on_update()
returns trigger language plpgsql as $$
begin
  -- updated_at automatique
  new.updated_at = now();

  -- Transitions valides uniquement depuis 'pending'
  if old.status != 'pending' then
    raise exception 'Transition invalide : statut % ne peut plus évoluer.', old.status
      using errcode = 'check_violation';
  end if;

  -- responded_at automatique si transition terminale
  if new.status in ('accepted','refused') and new.responded_at is null then
    new.responded_at = now();
  end if;

  return new;
end;
$$;

create trigger trg_call_req_on_update
  before update on public.call_requests
  for each row execute function public.call_request_on_update();

-- ── 5. Trigger INSERT : anti-spam backend ─────────────────
create or replace function public.call_request_on_insert()
returns trigger language plpgsql as $$
declare
  v_count   int;
  v_cooldown timestamptz;
begin
  -- Anti-spam : max 3 demandes / 10 min entre les mêmes utilisateurs
  select count(*) into v_count
    from public.call_requests
   where requester_id = new.requester_id
     and receiver_id  = new.receiver_id
     and created_at   > now() - interval '10 minutes';

  if v_count >= 3 then
    raise exception 'spam_limit'
      using errcode = 'check_violation';
  end if;

  -- Cooldown : 5 min après un refus
  select max(responded_at) into v_cooldown
    from public.call_requests
   where requester_id = new.requester_id
     and receiver_id  = new.receiver_id
     and status       = 'refused';

  if v_cooldown is not null and v_cooldown > now() - interval '5 minutes' then
    raise exception 'cooldown_active'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_call_req_on_insert on public.call_requests;
create trigger trg_call_req_on_insert
  before insert on public.call_requests
  for each row execute function public.call_request_on_insert();

-- ── 6. Index ──────────────────────────────────────────────

-- UNIQUE : un seul pending entre deux utilisateurs (garantie DB)
create unique index if not exists call_requests_unique_pending_idx
  on public.call_requests (requester_id, receiver_id)
  where status = 'pending';

-- Lookup appels entrants par receiver
create index if not exists call_requests_receiver_pending_idx
  on public.call_requests (receiver_id, status)
  where status = 'pending';

-- Lookup historique / anti-spam par requester
create index if not exists call_requests_requester_recent_idx
  on public.call_requests (requester_id, created_at desc);

-- Nettoyage demandes expirées
create index if not exists call_requests_expires_idx
  on public.call_requests (expires_at)
  where status = 'pending';

-- ── 7. Nettoyage automatique des demandes expirées ────────
-- À appeler par pg_cron (Supabase → Database → Extensions → pg_cron)
-- ou par une Edge Function planifiée.
--
-- Activer pg_cron (une seule fois) :
--   create extension if not exists pg_cron;
--
-- Planifier toutes les minutes :
--   select cron.schedule(
--     'expire-call-requests',
--     '* * * * *',
--     $$update public.call_requests
--       set status = 'expired', updated_at = now()
--       where status = 'pending' and expires_at < now()$$
--   );

-- Commande manuelle de nettoyage si pas de pg_cron :
-- update public.call_requests
--   set status = 'expired', updated_at = now()
--   where status = 'pending' and expires_at < now();
