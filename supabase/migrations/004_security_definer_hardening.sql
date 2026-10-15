-- Harden SECURITY DEFINER functions against search_path hijacking.
-- All object references are schema-qualified so an empty search_path is safe.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user'::public.app_role)
$$;

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_app_role() in ('admin','moderator')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end;
$$;

create or replace function public.protect_location_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin_or_moderator() then
    if new.status is distinct from old.status
       or new.owner_id is distinct from old.owner_id
       or new.moderation_note is distinct from old.moderation_note
       or new.moderated_by is distinct from old.moderated_by
       or new.moderated_at is distinct from old.moderated_at then
      raise exception 'Only moderators can change publication or ownership fields';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.increment_location_view(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
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

create or replace function public.protect_location_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
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

create or replace function public.refresh_location_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
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
set search_path = ''
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
set search_path = ''
as $$
begin
  if public.current_app_role() is distinct from 'admin'
     and (new.role is distinct from old.role
       or new.contribution_badge is distinct from old.contribution_badge) then
    raise exception 'Only administrators can change role or contribution badge';
  end if;
  return new;
end;
$$;

revoke all on function public.increment_location_view(uuid) from public;
grant execute on function public.increment_location_view(uuid) to anon, authenticated;
