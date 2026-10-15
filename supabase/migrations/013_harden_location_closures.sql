create or replace function public.protect_location_closure_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.location_id is distinct from old.location_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Closure location and creator cannot be changed';
  end if;
  return new;
end;
$$;

create trigger protect_location_closure_identity
before update on public.location_closures
for each row execute procedure public.protect_location_closure_identity();

revoke all on function public.protect_location_closure_identity() from public;
