-- Harden the remaining SECURITY DEFINER claim-approval function.
-- Keep the function usable by authenticated moderators while preventing
-- search_path-dependent object resolution.

create or replace function public.approve_location_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
  v_claimant_id uuid;
begin
  if public.current_app_role() not in ('admin'::public.app_role, 'moderator'::public.app_role) then
    raise exception 'Insufficient permissions';
  end if;

  select location_id, claimant_id
    into v_location_id, v_claimant_id
    from public.claims
   where id = p_claim_id
     and status = 'pending'::public.claim_status
   for update;

  if v_location_id is null or v_claimant_id is null then
    raise exception 'Pending claim not found';
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
