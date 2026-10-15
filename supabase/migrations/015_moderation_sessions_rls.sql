-- Secure scheduling and management of moderation sessions.
create index if not exists moderation_sessions_scheduled_idx
  on public.moderation_sessions(scheduled_at asc);

alter table public.moderation_sessions enable row level security;

revoke all on public.moderation_sessions from anon, authenticated;
grant select, insert, update, delete on public.moderation_sessions to authenticated;

drop policy if exists "moderators can view moderation sessions" on public.moderation_sessions;
drop policy if exists "moderators can create moderation sessions" on public.moderation_sessions;
drop policy if exists "moderators can update moderation sessions" on public.moderation_sessions;
drop policy if exists "moderators can delete moderation sessions" on public.moderation_sessions;

create policy "moderators can view moderation sessions"
  on public.moderation_sessions for select to authenticated
  using (public.is_admin_or_moderator());

create policy "moderators can create moderation sessions"
  on public.moderation_sessions for insert to authenticated
  with check (public.is_admin_or_moderator() and created_by = auth.uid());

create policy "moderators can update moderation sessions"
  on public.moderation_sessions for update to authenticated
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

create policy "moderators can delete moderation sessions"
  on public.moderation_sessions for delete to authenticated
  using (public.is_admin_or_moderator());
