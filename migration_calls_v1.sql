-- Migration Phase 1 : système d'appels internes ImmatConnect
-- À exécuter dans Supabase SQL Editor (Settings → SQL Editor)

-- ── Table call_preferences
create table if not exists public.call_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  allow_calls boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table public.call_preferences enable row level security;

-- Chaque utilisateur lit/modifie uniquement sa ligne
create policy "call_pref_own"
  on public.call_preferences
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Les autres peuvent lire allow_calls pour savoir si l'appel est possible
create policy "call_pref_read_allow"
  on public.call_preferences
  for select
  using (true);

-- ── Table call_requests
create table if not exists public.call_requests (
  id               uuid primary key default gen_random_uuid(),
  requester_id     uuid not null references auth.users(id) on delete cascade,
  receiver_id      uuid not null references auth.users(id) on delete cascade,
  requester_plate  text,
  receiver_plate   text,
  status           text not null default 'pending'
                     check (status in ('pending','accepted','refused','expired','cancelled')),
  source           text not null default 'vehicle_contact',
  related_message_id uuid,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 seconds'),
  responded_at     timestamptz,
  constraint no_self_call check (requester_id != receiver_id)
);

alter table public.call_requests enable row level security;

-- Lecture : requester ou receiver uniquement
create policy "call_req_read"
  on public.call_requests
  for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Insertion : uniquement par le requester, jamais soi-même
create policy "call_req_insert"
  on public.call_requests
  for insert
  with check (auth.uid() = requester_id and requester_id != receiver_id);

-- Mise à jour accept/refuse : uniquement par le receiver sur statut pending
create policy "call_req_respond"
  on public.call_requests
  for update
  using  (auth.uid() = receiver_id and status = 'pending')
  with check (status in ('accepted','refused','expired'));

-- Annulation : uniquement par le requester
create policy "call_req_cancel"
  on public.call_requests
  for update
  using  (auth.uid() = requester_id and status = 'pending')
  with check (status = 'cancelled');

-- Index pour les requêtes fréquentes
create index if not exists call_requests_receiver_pending_idx
  on public.call_requests (receiver_id, status)
  where status = 'pending';

create index if not exists call_requests_requester_recent_idx
  on public.call_requests (requester_id, created_at desc);

create index if not exists call_requests_expires_idx
  on public.call_requests (expires_at)
  where status = 'pending';

-- Vue pour nettoyer les demandes expirées (optionnel — pg_cron ou Edge Function)
-- UPDATE public.call_requests SET status = 'expired' WHERE status = 'pending' AND expires_at < now();
