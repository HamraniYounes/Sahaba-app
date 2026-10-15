-- Database security and performance regression tests.
-- Run with the Supabase test harness/pgTAP in an isolated test database.

begin;
create extension if not exists pgtap;

select plan(20);

-- The RPCs exist and expose only the intended execution surface.
select has_function_privilege('anon','public.increment_location_view(uuid)','execute'),
'atomic view RPC is callable';
select is(
  has_function_privilege('public','public.increment_location_view(uuid)','execute'),
  false,
  'public role cannot execute the view RPC'
);
select has_function_privilege('authenticated','public.approve_location_claim(uuid)','execute'),
'claim approval RPC is callable by authenticated users';
select is(
  has_function_privilege('anon','public.approve_location_claim(uuid)','execute'),
  false,
  'anonymous users cannot execute claim approval RPC'
);

-- RLS helper functions remain callable because policies depend on them.
select has_function_privilege('anon','public.current_app_role()','execute'),
'role helper is callable by anon for public RLS';
select has_function_privilege('authenticated','public.is_admin_or_moderator()','execute'),
'moderation helper is callable by authenticated users';

-- Trigger functions are present but not exposed through the Data API.
select has_function('public','protect_location_system_fields','trigger protection function exists');
select has_function('public','protect_profile_role','profile role protection function exists');
select is(
  has_function_privilege('anon','public.protect_location_system_fields()','execute'),
  false,
  'location trigger function is not callable by anon'
);
select is(
  has_function_privilege('authenticated','public.refresh_location_rating()','execute'),
  false,
  'rating trigger function is not callable by authenticated users'
);

-- Claim approval must lock and validate the location before ownership changes.
select like(
  pg_get_functiondef('public.approve_location_claim(uuid)'::regprocedure),
  '%for update%',
  'claim approval locks rows during validation'
);
select like(
  pg_get_functiondef('public.approve_location_claim(uuid)'::regprocedure),
  '%Location is no longer available for claim approval%',
  'claim approval rejects stale location state'
);

-- Required integrity constraints remain present.
select col_is_pk('public','locations','id','locations has a primary key');
select col_not_null('public','locations','view_count','view_count remains non-null');
select col_not_null('public','locations','favorite_count','favorite_count remains non-null');
select col_not_null('public','locations','review_count','review_count remains non-null');

-- Directory query indexes remain present for the expected filter/search shape.
select has_index('public','locations','locations_public_category_created_idx','directory category/status index exists');
select has_index('public','locations','locations_name_trgm_idx','name substring index exists');
select has_index('public','locations','locations_city_trgm_idx','city substring index exists');
select has_index('public','locations','locations_description_trgm_idx','description substring index exists');

select * from finish();
rollback;
