-- Rich weekly opening hours are stored in locations.opening_hours as JSONB.
-- Existing text values remain readable by the application and are migrated lazily.
alter table public.locations
  add column if not exists timezone text not null default 'Europe/Brussels'
    check (char_length(timezone) between 1 and 80);

create table public.location_closures (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  closure_type text not null check (closure_type in ('exceptional','temporary','definitive')),
  starts_on date not null,
  ends_on date,
  reason text check (char_length(reason) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint location_closures_dates_check check (
    (closure_type = 'definitive' and ends_on is null)
    or (closure_type <> 'definitive' and ends_on is not null and ends_on >= starts_on)
  )
);

create index location_closures_location_dates_idx
  on public.location_closures(location_id, starts_on, ends_on);

create trigger location_closures_updated_at
before update on public.location_closures
for each row execute procedure public.set_updated_at();

alter table public.location_closures enable row level security;

create policy "public reads closures for visible locations"
on public.location_closures for select
using (
  exists (
    select 1 from public.locations l
    where l.id = location_id
      and (l.status in ('published','claimed') or l.created_by = auth.uid() or l.owner_id = auth.uid() or public.is_admin_or_moderator())
  )
);

create policy "owners create location closures"
on public.location_closures for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from public.locations l where l.id = location_id and (l.owner_id = auth.uid() or l.created_by = auth.uid() or public.is_admin_or_moderator()))
);

create policy "owners update location closures"
on public.location_closures for update to authenticated
using (
  created_by = auth.uid() or exists (select 1 from public.locations l where l.id = location_id and (l.owner_id = auth.uid() or public.is_admin_or_moderator()))
)
with check (
  created_by = auth.uid() or exists (select 1 from public.locations l where l.id = location_id and (l.owner_id = auth.uid() or public.is_admin_or_moderator()))
);

create policy "owners delete location closures"
on public.location_closures for delete to authenticated
using (
  created_by = auth.uid() or exists (select 1 from public.locations l where l.id = location_id and (l.owner_id = auth.uid() or public.is_admin_or_moderator()))
);
