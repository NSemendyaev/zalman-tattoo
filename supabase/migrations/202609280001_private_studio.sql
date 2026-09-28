-- Upgrade the existing single-studio schema without deleting its records.
-- Prerequisite: Client, Project, Session, Status and the Session Photos bucket.
-- Dates/times are studio-local Europe/London wall-clock values.
begin;

create table if not exists public."StudioMember" (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public."StudioMember" enable row level security;
revoke all on public."StudioMember" from anon, authenticated;
grant select on public."StudioMember" to authenticated;
create policy "Read own studio membership" on public."StudioMember"
  for select to authenticated using (user_id = (select auth.uid()));

-- Preserve access for the sole existing account; never enroll arbitrary signups.
do $$
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Expected exactly one existing studio account. Review membership explicitly before applying.';
  end if;
  insert into public."StudioMember"(user_id) select id from auth.users;
end $$;

create or replace function public.is_studio_member()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public."StudioMember" where user_id = (select auth.uid()));
$$;
revoke all on function public.is_studio_member() from public;
grant execute on function public.is_studio_member() to authenticated;

-- Restrictive policies also constrain the original permissive policies.
do $$
declare target text;
begin
  foreach target in array array['Client','Project','Session','Status'] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on public.%I from anon', target);
    execute format('create policy "Studio membership required" on public.%I as restrictive for all to public using ((select public.is_studio_member())) with check ((select public.is_studio_member()))', target);
  end loop;
end $$;
grant select, insert, update, delete on public."Client", public."Project", public."Session" to authenticated;
grant select on public."Status" to authenticated;
revoke insert, update, delete on public."Status" from authenticated;
grant usage, select on sequence public."Client_id_seq", public."Project_id_seq", public."Session_id_seq" to authenticated;

-- Seed without assuming that IDs or the identity sequence match the old data.
select setval(pg_get_serial_sequence('public."Status"','id'), greatest(coalesce((select max(id) from public."Status"),0),1));
insert into public."Status"(status)
select label from unnest(array['In Progress','In Review','Completed','Upcoming','Recorded','Cancelled','Rescheduled']) label
where not exists (select 1 from public."Status" s where s.status=label);

update storage.buckets set public=false, file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='Session Photos';
create policy "Private studio photos" on storage.objects for all to authenticated
  using (bucket_id='Session Photos' and (select public.is_studio_member()))
  with check (bucket_id='Session Photos' and (select public.is_studio_member()));
-- Stop legacy broad policies from granting access to nonmembers.
create policy "Studio photo boundary" on storage.objects as restrictive for all to public
  using (bucket_id <> 'Session Photos' or (auth.role()='authenticated' and (select public.is_studio_member())))
  with check (bucket_id <> 'Session Photos' or (auth.role()='authenticated' and (select public.is_studio_member())));

create or replace function public.studio_upcoming_session(p_project_id bigint default null)
returns table(project_id bigint, project_title text, first_name text, last_name text,
  appointment_date date, appointment_time time)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.project_title, c.first_name, c.last_name, s.appointment_date, s.appointment_time
  from public."Session" s
  join public."Project" p on p.id=s.project_id
  join public."Client" c on c.id=p.client_id
  join public."Status" status on status.id=s.status_id
  where (p_project_id is null or p.id=p_project_id)
    and status.status in ('Upcoming','Rescheduled')
    and s.appointment_date+s.appointment_time >= (now() at time zone 'Europe/London')
  order by s.appointment_date,s.appointment_time,s.id limit 1;
$$;
revoke all on function public.studio_upcoming_session(bigint) from public;
grant execute on function public.studio_upcoming_session(bigint) to authenticated;

-- The database deletion is atomic; the UI removes returned storage paths afterwards.
create or replace function public.studio_delete_project(p_project_id bigint)
returns text[] language plpgsql security invoker set search_path = '' as $$
declare paths text[];
begin
  perform 1 from public."Project" where id=p_project_id for update;
  if not found then raise exception 'Project not found or access denied'; end if;
  select coalesce(array_agg(photo),array[]::text[]) into paths
    from public."Session" s cross join lateral unnest(s.img_urls) photo where s.project_id=p_project_id;
  delete from public."Session" where project_id=p_project_id;
  delete from public."Project" where id=p_project_id;
  return paths;
end $$;
revoke all on function public.studio_delete_project(bigint) from public;
grant execute on function public.studio_delete_project(bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
