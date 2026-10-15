-- Owners can submit claims, while moderators/admins still approve them.
-- Approval atomically assigns the location and promotes a normal user to owner.
drop policy if exists "users create own claims" on public.claims;
create policy "users create own claims" on public.claims
  for insert to authenticated
  with check (
    claimant_id = auth.uid()
    and public.current_app_role() in ('user'::public.app_role, 'owner'::public.app_role)
    and exists (
      select 1
      from public.locations l
      where l.id = location_id
        and l.status = 'published'::public.location_status
        and l.owner_id is null
    )
  );

create or replace function public.approve_location_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
  v_claimant_id uuid;
  v_owner_id uuid;
  v_status public.location_status;
  v_claimant_role public.app_role;
begin
  if public.current_app_role() not in ('admin'::public.app_role, 'moderator'::public.app_role) then
    raise exception 'Insufficient permissions';
  end if;

  select c.location_id, c.claimant_id
    into v_location_id, v_claimant_id
    from public.claims c
   where c.id = p_claim_id
     and c.status = 'pending'::public.claim_status
   for update;

  if v_location_id is null or v_claimant_id is null then
    raise exception 'Pending claim not found';
  end if;

  select l.owner_id, l.status
    into v_owner_id, v_status
    from public.locations l
   where l.id = v_location_id
   for update;

  if v_owner_id is not null or v_status <> 'published'::public.location_status then
    raise exception 'Location is no longer available for claim approval';
  end if;

  update public.locations
     set owner_id = v_claimant_id,
         status = 'claimed'::public.location_status,
         moderated_by = auth.uid(),
         moderated_at = now()
   where id = v_location_id;

  select p.role
    into v_claimant_role
    from public.profiles p
   where p.id = v_claimant_id
   for update;

  if v_claimant_role = 'user'::public.app_role then
    update public.profiles
       set role = 'owner'::public.app_role
     where id = v_claimant_id;
  end if;

  update public.claims
     set status = 'approved'::public.claim_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_claim_id;
end;
$$;

revoke all on function public.approve_location_claim(uuid) from public;
grant execute on function public.approve_location_claim(uuid) to authenticated;
