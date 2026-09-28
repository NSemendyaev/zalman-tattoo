-- Private credentials and per-user event mappings for Google Calendar sync.
-- Apply after 202609280001_private_studio.sql.
begin;

create table public."GoogleCalendarConnection" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text
);
create table public."GoogleCalendarOAuthState" (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table public."GoogleCalendarEvent" (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id bigint not null,
  event_id text not null,
  payload_hash text not null,
  primary key (user_id, session_id)
);

-- Only the Edge Function's service role can access OAuth tokens or mappings.
alter table public."GoogleCalendarConnection" enable row level security;
alter table public."GoogleCalendarOAuthState" enable row level security;
alter table public."GoogleCalendarEvent" enable row level security;
revoke all on public."GoogleCalendarConnection", public."GoogleCalendarOAuthState", public."GoogleCalendarEvent" from public, anon, authenticated;
grant all on public."GoogleCalendarConnection", public."GoogleCalendarOAuthState", public."GoogleCalendarEvent" to service_role;

notify pgrst, 'reload schema';
commit;
