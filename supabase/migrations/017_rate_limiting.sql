-- Database-enforced anti-spam limits for authenticated user-generated actions.
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('location_create','review_create','claim_create','report_create','ownership_transfer_create')),
  created_at timestamptz not null default now()
);

create index rate_limit_events_actor_action_created_idx
  on public.rate_limit_events(actor_id, action, created_at desc);

alter table public.rate_limit_events enable row level security;

create or replace function public.enforce_user_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  action_name text;
  max_events integer;
  window_interval interval;
  recent_events integer;
begin
  if actor is null then
    return new;
  end if;

  action_name := case tg_table_name
    when 'locations' then 'location_create'
    when 'reviews' then 'review_create'
    when 'claims' then 'claim_create'
    when 'reports' then 'report_create'
    when 'ownership_transfers' then 'ownership_transfer_create'
    else null
  end;

  if action_name is null then
    return new;
  end if;

  if action_name = 'location_create' then
    max_events := 5;
    window_interval := interval '1 hour';
  elsif action_name = 'review_create' then
    max_events := 10;
    window_interval := interval '1 hour';
  elsif action_name = 'claim_create' then
    max_events := 5;
    window_interval := interval '24 hours';
  elsif action_name = 'report_create' then
    max_events := 20;
    window_interval := interval '1 hour';
  else
    max_events := 3;
    window_interval := interval '24 hours';
  end if;

  -- Serialize concurrent requests for the same actor/action so the limit
  -- cannot be bypassed by sending several inserts at once.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || action_name, 0));

  delete from public.rate_limit_events
  where actor_id = actor
    and action = action_name
    and created_at < now() - interval '7 days';

  select count(*)::integer
    into recent_events
    from public.rate_limit_events
   where actor_id = actor
     and action = action_name
     and created_at >= now() - window_interval;

  if recent_events >= max_events then
    raise exception 'Trop de demandes. Réessayez plus tard.' using errcode = 'P0001';
  end if;

  insert into public.rate_limit_events(actor_id, action)
  values (actor, action_name);

  return new;
end;
$$;

revoke all on function public.enforce_user_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_location_create_rate_limit on public.locations;
create trigger enforce_location_create_rate_limit
before insert on public.locations
for each row execute procedure public.enforce_user_rate_limit();

drop trigger if exists enforce_review_create_rate_limit on public.reviews;
create trigger enforce_review_create_rate_limit
before insert on public.reviews
for each row execute procedure public.enforce_user_rate_limit();

drop trigger if exists enforce_claim_create_rate_limit on public.claims;
create trigger enforce_claim_create_rate_limit
before insert on public.claims
for each row execute procedure public.enforce_user_rate_limit();

drop trigger if exists enforce_report_create_rate_limit on public.reports;
create trigger enforce_report_create_rate_limit
before insert on public.reports
for each row execute procedure public.enforce_user_rate_limit();

drop trigger if exists enforce_ownership_transfer_create_rate_limit on public.ownership_transfers;
create trigger enforce_ownership_transfer_create_rate_limit
before insert on public.ownership_transfers
for each row execute procedure public.enforce_user_rate_limit();
