-- Add the owner role without changing the existing moderation roles.
-- A user becomes an owner after an approved location claim; admins can also
-- assign the role manually from the administration UI.
alter type public.app_role add value if not exists 'owner';
