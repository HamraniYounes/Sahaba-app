-- Global Nominatim rate limiter: one shared slot for the whole application.
-- No direct table access is granted to clients; only the invoker-safe RPC is exposed.
create table if not exists public.geocoding_rate_limit (
  id boolean primary key default true check (id),
  next_allowed_at timestamptz not null default now()
);

insert into public.geocoding_rate_limit (id)
values (true)
on conflict (id) do nothing;

alter table public.geocoding_rate_limit enable row level security;

revoke all on table public.geocoding_rate_limit from anon, authenticated;

create or replace function public.reserve_geocoding_slot(p_interval_ms integer default 1100)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_next_allowed_at timestamptz;
  slot_at timestamptz;
  wait_ms integer;
  safe_interval_ms integer := least(greatest(coalesce(p_interval_ms, 1100), 1000), 10000);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select next_allowed_at
    into current_next_allowed_at
    from public.geocoding_rate_limit
    where id = true
    for update;

  slot_at := greatest(current_next_allowed_at, clock_timestamp());
  wait_ms := greatest(0, ceil(extract(epoch from (slot_at - clock_timestamp())) * 1000)::integer);

  update public.geocoding_rate_limit
     set next_allowed_at = slot_at + make_interval(secs => safe_interval_ms / 1000.0)
   where id = true;

  return wait_ms;
end;
$$;

revoke all on function public.reserve_geocoding_slot(integer) from public, anon;
grant execute on function public.reserve_geocoding_slot(integer) to authenticated;
