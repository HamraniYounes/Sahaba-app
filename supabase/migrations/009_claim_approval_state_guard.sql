-- Re-apply the claim approval state guard after the privilege hardening migration.
-- Migration 008 recreates the function, so the final definition must retain the
-- transactional ownership/status checks introduced by the claim hardening pass.

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

  update public.claims
     set status = 'approved'::public.claim_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_claim_id;
end;
$$;

revoke all on function public.approve_location_claim(uuid) from public;
grant execute on function public.approve_location_claim(uuid) to authenticated;
