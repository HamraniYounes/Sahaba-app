-- Sahaba initial schema. Execute in Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','moderator','user');
create type public.location_status as enum ('pending','published','rejected','claimed');
create type public.report_status as enum ('pending','resolved','rejected');
create type public.claim_status as enum ('pending','approved','rejected','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  role public.app_role not null default 'user',
  contribution_badge text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('restaurant','fast_food','cafe','boulangerie','boucherie','epicerie','mosquee','salle_priere','ecole_coran','association','funeraire','sante','bien_etre','vetements','librairie','finance','voyage','hebergement','services','autre')),
  address text,
  city text not null,
  country text not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  phone text,
  email text,
  website text,
  description text check (char_length(description) <= 10000),
  cover_image text,
  photos text[] not null default '{}',
  status public.location_status not null default 'pending',
  created_by uuid not null references auth.users(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  halal_full boolean not null default false,
  alcohol_free boolean not null default false,
  women_only boolean not null default false,
  prayer_room boolean not null default false,
  wudu_facilities boolean not null default false,
  burkini_friendly boolean not null default false,
  vegetarian_options boolean not null default false,
  vegan_options boolean not null default false,
  accessible boolean not null default false,
  parking boolean not null default false,
  price_range smallint check (price_range between 1 and 4),
  opening_hours jsonb not null default '{}'::jsonb,
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  view_count bigint not null default 0 check (view_count >= 0),
  favorite_count bigint not null default 0 check (favorite_count >= 0),
  moderation_note text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_public_created_idx on public.locations(status, created_at desc);
create index locations_city_idx on public.locations(lower(city));
create index locations_category_idx on public.locations(category);
create index locations_name_search_idx on public.locations using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(address,'')));
create index locations_coordinates_idx on public.locations(latitude,longitude);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 3000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(location_id,user_id)
);
create index reviews_location_idx on public.reviews(location_id,created_at desc);

create table public.owner_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,location_id)
);
create index favorites_user_idx on public.favorites(user_id,created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('obsolete','incorrect','inappropriate','closed','other')),
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'pending',
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_pending_idx on public.reports(status,created_at) where status='pending';

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  evidence_path text,
  message text check (char_length(message) <= 3000),
  status public.claim_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index claims_one_pending_per_user_location on public.claims(location_id,claimant_id) where status='pending';

create table public.moderation_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  scheduled_at timestamptz not null,
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cta_label text,
  target_url text,
  image_url text,
  placement text not null default 'both' check (placement in ('home','detail','both')),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user'::public.app_role)
$$;

create or replace function public.is_admin_or_moderator()
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_app_role() in ('admin','moderator')
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger locations_updated_at before update on public.locations for each row execute procedure public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute procedure public.set_updated_at();
create trigger owner_replies_updated_at before update on public.owner_replies for each row execute procedure public.set_updated_at();
create trigger ads_updated_at before update on public.ads for each row execute procedure public.set_updated_at();

create or replace function public.refresh_location_rating()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_id uuid;
begin
  target_id := coalesce(new.location_id,old.location_id);
  update public.locations l
  set review_count = coalesce(x.cnt,0), average_rating = coalesce(x.avg_rating,0)
  from (select count(*)::int cnt, coalesce(round(avg(rating)::numeric,2),0) avg_rating
        from public.reviews where location_id=target_id and is_hidden=false) x
  where l.id=target_id;
  return coalesce(new,old);
end;
$$;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews for each row execute procedure public.refresh_location_rating();

create or replace function public.refresh_location_favorite_count()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_id uuid;
begin
  target_id := coalesce(new.location_id,old.location_id);
  update public.locations set favorite_count=(select count(*) from public.favorites where location_id=target_id) where id=target_id;
  return coalesce(new,old);
end;
$$;
create trigger favorites_refresh_count after insert or delete on public.favorites for each row execute procedure public.refresh_location_favorite_count();

-- Prevent non-moderators from changing publication, ownership, or moderation fields.
create or replace function public.protect_location_moderation_fields()
returns trigger language plpgsql security definer set search_path=public as $$
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
create trigger protect_location_moderation_fields before update on public.locations for each row execute procedure public.protect_location_moderation_fields();

-- The original contributor is immutable; otherwise an owner could rewrite attribution.
create or replace function public.protect_location_creator()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The original location creator cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_location_creator before update on public.locations for each row execute procedure public.protect_location_creator();

-- Prevent users from changing their own role or moderation fields.
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() = old.id and public.current_app_role() <> 'admin'
     and (new.role is distinct from old.role
       or new.contribution_badge is distinct from old.contribution_badge) then
    raise exception 'Changing your own role or contribution badge is not permitted';
  end if;
  return new;
end;
$$;
create trigger protect_profile_role before update on public.profiles for each row execute procedure public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.reviews enable row level security;
alter table public.owner_replies enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.claims enable row level security;
alter table public.moderation_sessions enable row level security;
alter table public.ads enable row level security;

create policy "users read own profile and moderators read profiles" on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin_or_moderator());
create policy "profile owner updates own non-role fields" on public.profiles for update using (auth.uid()=id or public.current_app_role()='admin') with check (auth.uid()=id or public.current_app_role()='admin');
create policy "admin manages profiles" on public.profiles for all using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

create policy "public reads published locations" on public.locations for select using (status in ('published','claimed') or created_by=auth.uid() or owner_id=auth.uid() or public.is_admin_or_moderator());
create policy "signed-in users propose locations" on public.locations for insert to authenticated with check (created_by=auth.uid() and owner_id is null and status='pending');
create policy "creator or owner updates location" on public.locations for update to authenticated using (created_by=auth.uid() or owner_id=auth.uid() or public.is_admin_or_moderator()) with check (created_by=auth.uid() or owner_id=auth.uid() or public.is_admin_or_moderator());
create policy "creator or admin deletes location" on public.locations for delete to authenticated using (created_by=auth.uid() or public.current_app_role()='admin');

create policy "public reads visible reviews" on public.reviews for select using (is_hidden=false or user_id=auth.uid() or public.is_admin_or_moderator());
create policy "signed-in users add reviews for public places" on public.reviews for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.locations l where l.id=location_id and l.status in ('published','claimed')));
create policy "authors update own reviews" on public.reviews for update to authenticated using (user_id=auth.uid() or public.is_admin_or_moderator()) with check (user_id=auth.uid() or public.is_admin_or_moderator());
create policy "authors or admins delete reviews" on public.reviews for delete to authenticated using (user_id=auth.uid() or public.is_admin_or_moderator());

create policy "public reads visible owner replies" on public.owner_replies for select using (is_hidden=false or owner_id=auth.uid() or public.is_admin_or_moderator());
create policy "verified owners reply" on public.owner_replies for insert to authenticated with check (owner_id=auth.uid() and exists(select 1 from public.reviews r join public.locations l on l.id=r.location_id where r.id=review_id and l.owner_id=auth.uid()));
create policy "owners or moderators update replies" on public.owner_replies for update to authenticated using (owner_id=auth.uid() or public.is_admin_or_moderator()) with check (owner_id=auth.uid() or public.is_admin_or_moderator());
create policy "owners or moderators delete replies" on public.owner_replies for delete to authenticated using (owner_id=auth.uid() or public.is_admin_or_moderator());

create policy "users read own favorites" on public.favorites for select to authenticated using (user_id=auth.uid() or public.is_admin_or_moderator());
create policy "users add own favorites" on public.favorites for insert to authenticated with check (user_id=auth.uid());
create policy "users remove own favorites" on public.favorites for delete to authenticated using (user_id=auth.uid() or public.is_admin_or_moderator());

create policy "anyone can submit a report" on public.reports for insert with check (reporter_id is null or reporter_id=auth.uid());
create policy "moderators manage reports" on public.reports for select to authenticated using (public.is_admin_or_moderator());
create policy "moderators update reports" on public.reports for update to authenticated using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

create policy "users create own claims" on public.claims for insert to authenticated with check (claimant_id=auth.uid());
create policy "claimants read own claims" on public.claims for select to authenticated using (claimant_id=auth.uid() or public.is_admin_or_moderator());
create policy "moderators review claims" on public.claims for update to authenticated using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

create policy "moderators manage moderation sessions" on public.moderation_sessions for all to authenticated using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());
create policy "public reads active ads" on public.ads for select using (is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
create policy "admins manage ads" on public.ads for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

-- First admin: register a user, then run this statement manually with their actual UUID:
-- update public.profiles set role='admin' where id='YOUR-AUTH-USER-UUID';
-- Do not expose any service_role key to the frontend.
