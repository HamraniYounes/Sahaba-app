create extension if not exists pgtap with schema extensions;
begin;
select plan(20);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'locations', 'locations table exists');
select has_table('public', 'reviews', 'reviews table exists');
select has_table('public', 'owner_replies', 'owner_replies table exists');
select has_table('public', 'favorites', 'favorites table exists');
select has_table('public', 'reports', 'reports table exists');
select has_table('public', 'claims', 'claims table exists');
select has_table('public', 'moderation_sessions', 'moderation_sessions table exists');
select has_table('public', 'ads', 'ads table exists');

select ok((select relrowsecurity from pg_class where oid='public.profiles'::regclass), 'RLS enabled on profiles');
select ok((select relrowsecurity from pg_class where oid='public.locations'::regclass), 'RLS enabled on locations');
select ok((select relrowsecurity from pg_class where oid='public.reviews'::regclass), 'RLS enabled on reviews');
select ok((select relrowsecurity from pg_class where oid='public.owner_replies'::regclass), 'RLS enabled on owner_replies');
select ok((select relrowsecurity from pg_class where oid='public.favorites'::regclass), 'RLS enabled on favorites');
select ok((select relrowsecurity from pg_class where oid='public.reports'::regclass), 'RLS enabled on reports');
select ok((select relrowsecurity from pg_class where oid='public.claims'::regclass), 'RLS enabled on claims');
select ok((select relrowsecurity from pg_class where oid='public.moderation_sessions'::regclass), 'RLS enabled on moderation_sessions');
select ok((select relrowsecurity from pg_class where oid='public.ads'::regclass), 'RLS enabled on ads');

select ok(
  exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='locations' and policyname='signed-in users propose locations'
  ),
  'proposal insert policy exists'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='locations' and policyname='creator or owner updates location'
  ),
  'creator, owner and moderation update policy exists'
);
select * from finish();
rollback;
