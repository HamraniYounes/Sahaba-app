-- Secure self-service account deletion. Submitted locations must be resolved first.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.app_role;
  v_created_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role = 'admin'::public.app_role then
    raise exception 'An administrator account must be deleted by another administrator';
  end if;

  select count(*)::integer into v_created_count
  from public.locations l
  where l.created_by = v_user_id;

  if v_created_count > 0 then
    raise exception 'Transfer or remove your submitted locations before deleting your account';
  end if;

  -- owner_id uses ON DELETE SET NULL; personal rows tied to auth.uid() cascade.
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
