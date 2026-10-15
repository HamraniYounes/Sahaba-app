-- Apply after 001_initial_schema.sql in the Supabase SQL Editor.
-- Public read access for location images; uploads are isolated by authenticated user ID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('location-photos', 'location-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view location photos" on storage.objects;
create policy "Public can view location photos" on storage.objects for select using (bucket_id='location-photos');
drop policy if exists "Users upload photos to own folder" on storage.objects;
create policy "Users upload photos to own folder" on storage.objects for insert to authenticated with check (bucket_id='location-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users update own location photos" on storage.objects;
create policy "Users update own location photos" on storage.objects for update to authenticated using (bucket_id='location-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='location-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own location photos" on storage.objects;
create policy "Users delete own location photos" on storage.objects for delete to authenticated using (bucket_id='location-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin_or_moderator()));

-- Prevent duplicate favorites and review abuse at the database layer (the original schema already has uniqueness constraints).
create index if not exists locations_updated_idx on public.locations(updated_at desc);
create index if not exists ads_active_window_idx on public.ads(is_active, starts_at, ends_at);

-- Atomic claim approval: assigning the owner and approving the claim succeed or fail together.
create or replace function public.approve_location_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
  v_claimant_id uuid;
begin
  if public.current_app_role() not in ('admin','moderator') then
    raise exception 'Insufficient permissions';
  end if;
  select location_id, claimant_id into v_location_id, v_claimant_id
  from public.claims where id = p_claim_id and status = 'pending' for update;
  if v_location_id is null or v_claimant_id is null then
    raise exception 'Pending claim not found';
  end if;
  update public.locations set owner_id = v_claimant_id, status = 'claimed', moderated_by = auth.uid(), moderated_at = now()
  where id = v_location_id;
  update public.claims set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_claim_id;
end;
$$;
revoke all on function public.approve_location_claim(uuid) from public;
grant execute on function public.approve_location_claim(uuid) to authenticated;
