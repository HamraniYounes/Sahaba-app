create extension if not exists pgtap with schema extensions;
begin;
select plan(9);

-- Isolated test users are rolled back with this transaction.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Owner"}', now(), now()),
('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Other"}', now(), now()),
('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-moderator@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Moderator"}', now(), now()),
('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Admin"}', now(), now());

-- Replace trigger-created defaults with explicit test roles before switching to an authenticated caller.
delete from public.profiles where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);
insert into public.profiles (id, display_name, role)
values
('10000000-0000-4000-8000-000000000001', 'RLS Owner', 'user'),
('10000000-0000-4000-8000-000000000002', 'RLS Other', 'user'),
('10000000-0000-4000-8000-000000000003', 'RLS Moderator', 'moderator'),
('10000000-0000-4000-8000-000000000004', 'RLS Admin', 'admin');

insert into public.locations (name, slug, category, city, country, status, created_by, owner_id)
values ('RLS test location', 'rls-test-location', 'restaurant', 'Bruxelles', 'Belgique', 'pending', '10000000-0000-4000-8000-000000000001', null);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.locations where slug='rls-test-location'), 0, 'another regular user cannot read a pending location');
select is((with changed as (update public.locations set name='Unauthorized edit' where slug='rls-test-location' returning id) select count(*)::int from changed), 0, 'another regular user cannot edit the location');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.locations where slug='rls-test-location'), 1, 'creator can read their pending location');
select is((with changed as (update public.locations set description='Creator update' where slug='rls-test-location' returning id) select count(*)::int from changed), 1, 'creator can edit their location');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.locations where slug='rls-test-location'), 1, 'moderator can read pending locations');
select is((with changed as (update public.locations set description='Moderator correction' where slug='rls-test-location' returning id) select count(*)::int from changed), 1, 'moderator can edit location content');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((with changed as (update public.locations set description='Admin correction' where slug='rls-test-location' returning id) select count(*)::int from changed), 1, 'admin can edit location content');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok(
  $$update public.profiles set role='admin' where id=auth.uid()$$,
  'P0001', null,
  'regular user cannot promote their own profile'
);
select throws_ok(
  $$insert into public.locations (name, slug, category, city, country, status, created_by, owner_id) values ('Invalid owner', 'rls-invalid-owner', 'restaurant', 'Bruxelles', 'Belgique', 'pending', auth.uid(), auth.uid())$$,
  '42501', null,
  'regular user cannot self-assign a location owner'
);
select * from finish();
rollback;
