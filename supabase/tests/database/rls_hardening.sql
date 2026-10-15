-- Database security regression tests.
-- Run with the Supabase test harness/pgTAP in an isolated test database.

begin;
create extension if not exists pgtap;

select plan(8);

-- The RPCs exist and expose only the intended execution surface.
select has_function_privilege(
  'anon',
  'public.increment_location_view(uuid)',
  'execute'
),
'atomic view RPC is callable';

select is(
  has_function_privilege('public', 'public.increment_location_view(uuid)', 'execute'),
  false,
  'public role cannot execute the view RPC'
);

-- Trigger functions are present after migration.
select has_function('public', 'protect_location_system_fields', 'trigger protection function exists');
select has_function('public', 'protect_profile_role', 'profile role protection function exists');

-- Required integrity constraints remain present.
select col_is_pk('public', 'locations', 'id', 'locations has a primary key');
select col_not_null('public', 'locations', 'view_count', 'view_count remains non-null');
select col_not_null('public', 'locations', 'favorite_count', 'favorite_count remains non-null');
select col_not_null('public', 'locations', 'review_count', 'review_count remains non-null');

select * from finish();
rollback;
