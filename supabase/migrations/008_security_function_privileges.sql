-- Security hardening follow-up.
-- Keep SECURITY DEFINER functions callable only where the client actually needs them.
-- Also pin SECURITY DEFINER search_path to the empty path and fully qualify relations.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'user'::public.app_role)
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
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
  if p_location_id is null then raise exception 'Location id is required'; end if;
  perform set_config('sahaba.internal_aggregate_update', 'on', true);
  update public.locations set view_count = view_count + 1
  where id = p_location_id and status in ('published','claimed');
end;
$$;

create or replace function public.protect_location_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('sahaba.internal_aggregate_update', true) = 'on' then return new; end if;
  if public.is_admin_or_moderator() then return new; end if;
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
  from (select count(*)::int cnt, coalesce(round(avg(rating)::numeric,2),0) avg_rating
        from public.reviews where location_id=target_id and is_hidden=false) x
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
     and (new.role is distinct from old.role or new.contribution_badge is distinct from old.contribution_badge) then
    raise exception 'Only administrators can change role or contribution badge';
  end if;
  return new;
end;
$$;

create or replace function public.approve_location_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_location_id uuid; v_claimant_id uuid;
begin
  if public.current_app_role() not in ('admin','moderator') then raise exception 'Insufficient permissions'; end if;
  select location_id, claimant_id into v_location_id, v_claimant_id
  from public.claims where id=p_claim_id and status='pending' for update;
  if v_location_id is null or v_claimant_id is null then raise exception 'Pending claim not found'; end if;
  update public.locations set owner_id=v_claimant_id,status='claimed',moderated_by=auth.uid(),moderated_at=now()
  where id=v_location_id;
  update public.claims set status='approved',reviewed_by=auth.uid(),reviewed_at=now()
  where id=p_claim_id;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_location_system_fields() from public, anon, authenticated;
revoke execute on function public.refresh_location_rating() from public, anon, authenticated;
revoke execute on function public.refresh_location_favorite_count() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.approve_location_claim(uuid) from public, anon;
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_admin_or_moderator() to anon, authenticated;
grant execute on function public.approve_location_claim(uuid) to authenticated;

drop policy if exists "anyone can submit a report" on public.reports;
create policy "anyone can submit a report" on public.reports for insert
with check (
  (reporter_id is null or reporter_id=auth.uid())
  and exists (select 1 from public.locations l where l.id=location_id and l.status in ('published','claimed'))
);

drop policy if exists "users create own claims" on public.claims;
create policy "users create own claims" on public.claims for insert to authenticated
with check (
  claimant_id=auth.uid()
  and exists (select 1 from public.locations l where l.id=location_id and l.status='published' and l.owner_id is null)
);

comment on function public.current_app_role() is 'Returns the caller application role for RLS checks.';
comment on function public.is_admin_or_moderator() is 'Returns whether the caller can moderate protected records.';
