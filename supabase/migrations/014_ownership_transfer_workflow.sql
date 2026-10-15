-- Secure owner-to-user transfer workflow with recipient acceptance.
create table if not exists public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  from_owner_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ownership_transfers_distinct_users check (from_owner_id <> to_user_id)
);
create unique index if not exists ownership_transfers_one_pending_per_location_idx on public.ownership_transfers(location_id) where status = 'pending';
create index if not exists ownership_transfers_recipient_status_idx on public.ownership_transfers(to_user_id, status, created_at desc);
create index if not exists ownership_transfers_owner_status_idx on public.ownership_transfers(from_owner_id, status, created_at desc);
alter table public.ownership_transfers enable row level security;
drop policy if exists "transfer participants can view own transfers" on public.ownership_transfers;
create policy "transfer participants can view own transfers" on public.ownership_transfers for select to authenticated using (from_owner_id = auth.uid() or to_user_id = auth.uid());
revoke all on public.ownership_transfers from anon, authenticated;
grant select on public.ownership_transfers to authenticated;

drop function if exists public.request_ownership_transfer(uuid, text, text);
create or replace function public.request_ownership_transfer(p_location_id uuid, p_target_email text, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_target_id uuid; v_transfer_id uuid; v_owner_id uuid; v_status public.location_status; v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.current_app_role() not in ('owner'::public.app_role, 'admin'::public.app_role, 'moderator'::public.app_role) then raise exception 'Only an owner can transfer a location'; end if;
  v_email := lower(trim(coalesce(p_target_email, '')));
  if v_email = '' then raise exception 'Target email is required'; end if;
  if length(v_email) > 320 then raise exception 'Target email is too long'; end if;
  select l.owner_id, l.status into v_owner_id, v_status from public.locations l where l.id = p_location_id for update;
  if v_owner_id is null or v_owner_id <> auth.uid() or v_status <> 'claimed'::public.location_status then raise exception 'You are not the owner of this location'; end if;
  select u.id into v_target_id from auth.users u where lower(u.email) = v_email limit 1;
  if v_target_id is null then raise exception 'No account matches this email'; end if;
  if v_target_id = auth.uid() then raise exception 'The target account must be different'; end if;
  if exists (select 1 from public.ownership_transfers t where t.location_id = p_location_id and t.status = 'pending') then raise exception 'A transfer is already pending for this location'; end if;
  insert into public.ownership_transfers(location_id, from_owner_id, to_user_id, message) values (p_location_id, auth.uid(), v_target_id, nullif(trim(p_message), '')) returning id into v_transfer_id;
  return v_transfer_id;
end; $$;

create or replace function public.accept_ownership_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_location_id uuid; v_from_owner_id uuid; v_target_id uuid; v_owner_id uuid; v_status public.location_status; v_transfer_status text; v_role public.app_role;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select t.location_id, t.from_owner_id, t.to_user_id, t.status into v_location_id, v_from_owner_id, v_target_id, v_transfer_status from public.ownership_transfers t where t.id = p_transfer_id for update;
  if v_target_id is null or v_target_id <> auth.uid() or v_transfer_status <> 'pending' then raise exception 'Transfer is not available for acceptance'; end if;
  select l.owner_id, l.status into v_owner_id, v_status from public.locations l where l.id = v_location_id for update;
  if v_owner_id is null or v_owner_id <> v_from_owner_id or v_status <> 'claimed'::public.location_status then raise exception 'Location is no longer transferable'; end if;
  update public.locations set owner_id = auth.uid(), status = 'claimed'::public.location_status where id = v_location_id;
  select p.role into v_role from public.profiles p where p.id = auth.uid() for update;
  if v_role = 'user'::public.app_role then update public.profiles set role = 'owner'::public.app_role where id = auth.uid(); end if;
  update public.ownership_transfers set status = 'approved', reviewed_at = now() where id = p_transfer_id;
end; $$;

create or replace function public.reject_ownership_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.ownership_transfers set status = 'rejected', reviewed_at = now() where id = p_transfer_id and to_user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Transfer is not available for rejection'; end if;
end; $$;

create or replace function public.cancel_ownership_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.ownership_transfers set status = 'cancelled', reviewed_at = now() where id = p_transfer_id and from_owner_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Transfer is not available for cancellation'; end if;
end; $$;

revoke all on function public.request_ownership_transfer(uuid, text, text) from public, anon;
revoke all on function public.accept_ownership_transfer(uuid) from public, anon;
revoke all on function public.reject_ownership_transfer(uuid) from public, anon;
revoke all on function public.cancel_ownership_transfer(uuid) from public, anon;
grant execute on function public.request_ownership_transfer(uuid, text, text) to authenticated;
grant execute on function public.accept_ownership_transfer(uuid) to authenticated;
grant execute on function public.reject_ownership_transfer(uuid) to authenticated;
grant execute on function public.cancel_ownership_transfer(uuid) to authenticated;
