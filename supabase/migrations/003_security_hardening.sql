-- Security hardening and atomic counters.
-- Apply after 002_storage_and_production.sql.

create or replace function public.increment_location_view(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_location_id is null then
    raise exception 'Location id is required';
  end if;
  perform set_config('sahaba.internal_aggregate_update', 'on', true);
  update public.locations
     set view_count = view_count + 1
   where id = p_location_id
     and status in ('published','claimed');
end;
$$;
revoke all on function public.increment_location_view(uuid) from public;
grant execute on function public.increment_location_view(uuid) to anon, authenticated;

create or replace function public.protect_location_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('sahaba.internal_aggregate_update', true) = 'on' then
    return new;
  end if;

  if public.is_admin_or_moderator() then
    return new;
  end if;

  if new.created_at is distinct from old.created_at
     or new.average_rating is distinct from old.average_rating
     or new.review_count is distinct from old.review_count
     or new.view_count is distinct from old.view_count
     or new.favorite_count is distinct from old.favorite_count then
    raise exception 'System-managed location fields cannot be changed directly';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_location_system_fields on public.locations;
create trigger protect_location_system_fields
before update on public.locations
for each row execute procedure public.protect_location_system_fields();

create or replace function public.refresh_location_rating()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid;
begin
  target_id := coalesce(new.location_id,old.location_id);
  perform set_config('sahaba.internal_aggregate_update', 'on', true);
  update public.locations l
  set review_count = coalesce(x.cnt,0), average_rating = coalesce(x.avg_rating,0)
  from (
    select count(*)::int cnt, coalesce(round(avg(rating)::numeric,2),0) avg_rating
    from public.reviews
    where location_id=target_id and is_hidden=false
  ) x
  where l.id=target_id;
  return coalesce(new,old);
end;
$$;

create or replace function public.refresh_location_favorite_count()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid;
begin
  target_id := coalesce(new.location_id,old.location_id);
  perform set_config('sahaba.internal_aggregate_update', 'on', true);
  update public.locations
     set favorite_count=(select count(*) from public.favorites where location_id=target_id)
   where id=target_id;
  return coalesce(new,old);
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.current_app_role() <> 'admin'
     and (new.role is distinct from old.role
       or new.contribution_badge is distinct from old.contribution_badge) then
    raise exception 'Only administrators can change role or contribution badge';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute procedure public.protect_profile_role();

create index if not exists reviews_location_visible_idx
  on public.reviews(location_id, created_at desc)
  where is_hidden=false;

create index if not exists favorites_location_idx
  on public.favorites(location_id);

comment on function public.increment_location_view(uuid)
  is 'Atomically increments a published/claimed location view counter without exposing direct counter updates.';
