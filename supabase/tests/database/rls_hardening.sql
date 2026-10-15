-- Database security and performance regression tests.
-- Run with the Supabase test harness/pgTAP in an isolated test database.

begin;
create extension if not exists pgtap;

select plan(27);

-- RPC execution privileges.
select ok(
  has_function_privilege('anon', 'public.increment_location_view(uuid)', 'execute'),
  'anonymous users can execute the atomic view RPC'
);
select ok(
  not has_function_privilege('public', 'public.increment_location_view(uuid)', 'execute'),
  'public role cannot execute the view RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.approve_location_claim(uuid)', 'execute'),
  'authenticated users can execute claim approval RPC'
);
select ok(
  not has_function_privilege('anon', 'public.approve_location_claim(uuid)', 'execute'),
  'anonymous users cannot execute claim approval RPC'
);

-- RLS helper functions remain callable because policies depend on them.
select ok(
  has_function_privilege('anon', 'public.current_app_role()', 'execute'),
  'role helper is callable by anon for public RLS'
);
select ok(
  has_function_privilege('authenticated', 'public.is_admin_or_moderator()', 'execute'),
  'moderation helper is callable by authenticated users'
);

-- Trigger functions exist but are not exposed through the Data API.
select ok(
  to_regprocedure('public.protect_location_system_fields()') is not null,
  'location trigger protection function exists'
);
select ok(
  to_regprocedure('public.protect_profile_role()') is not null,
  'profile role protection function exists'
);
select ok(
  not has_function_privilege('anon', 'public.protect_location_system_fields()', 'execute'),
  'location trigger function is not callable by anon'
);
select ok(
  not has_function_privilege('authenticated', 'public.refresh_location_rating()', 'execute'),
  'rating trigger function is not callable by authenticated users'
);

-- Claim approval must lock and validate the location before ownership changes.
select ok(
  strpos(lower(pg_get_functiondef('public.approve_location_claim(uuid)'::regprocedure)), 'for update') > 0,
  'claim approval locks rows during validation'
);
select ok(
  strpos(lower(pg_get_functiondef('public.approve_location_claim(uuid)'::regprocedure)), 'location is no longer available for claim approval') > 0,
  'claim approval rejects stale location state'
);
select ok(
  strpos(lower(pg_get_functiondef('public.approve_location_claim(uuid)'::regprocedure)), 'role = ''owner''::public.app_role') > 0,
  'approved claim promotes a normal claimant to owner'
);

-- Owner is a first-class application role and may submit claims.
select ok(
  exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='app_role' and e.enumlabel='owner'),
  'owner role exists in the app_role enum'
);

-- Opening hours and closure records are part of the public data contract.
select col_not_null('public', 'locations', 'timezone', 'locations have a timezone for live opening status');
select col_is_fk('public', 'location_closures', 'location_id', 'closures belong to a location');
select ok(
  to_regclass('public.location_closures_location_dates_idx') is not null,
  'closure date index exists'
);
select ok(
  to_regprocedure('public.protect_location_closure_identity()') is not null,
  'closure identity protection function exists'
);
select ok(
  pg_get_constraintdef(oid) like '%closure_type = ''definitive''%'
  from pg_constraint
  where conrelid = 'public.location_closures'::regclass
    and conname = 'location_closures_dates_check',
  'definitive closures cannot have an end date'
);

-- Required integrity constraints remain present.
select col_is_pk('public', 'locations', 'id', 'locations has a primary key');
select col_not_null('public', 'locations', 'view_count', 'view_count remains non-null');
select col_not_null('public', 'locations', 'favorite_count', 'favorite_count remains non-null');
select col_not_null('public', 'locations', 'review_count', 'review_count remains non-null');

-- Directory query indexes remain present for the expected filter/search shape.
select ok(
  to_regclass('public.locations_public_category_created_idx') is not null,
  'directory category/status index exists'
);
select ok(
  to_regclass('public.locations_name_trgm_idx') is not null,
  'name substring index exists'
);
select ok(
  to_regclass('public.locations_city_trgm_idx') is not null,
  'city substring index exists'
);
select ok(
  to_regclass('public.locations_description_trgm_idx') is not null,
  'description substring index exists'
);

select * from finish();
rollback;
