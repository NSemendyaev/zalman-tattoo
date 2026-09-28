-- Run after database-fixture.sql and the migration, in the disposable database.
\set ON_ERROR_STOP on
begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare v_client_id bigint; v_project_id bigint; next_session record; removed text[];
begin
  if not public.is_studio_member() then raise exception 'Member denied'; end if;
  insert into public."Client"(first_name,last_name,phone) values ('Test','Client','test-only') returning id into v_client_id;
  insert into public."Project"(client_id,project_title,status_id,date_start) values (v_client_id,'Database regression',1,current_date) returning id into v_project_id;
  insert into public."Session"(project_id,status_id,appointment_date,appointment_time,img_urls)
    values (v_project_id,4,current_date+2,'12:00',array['projects/test/photo.jpg']);
  insert into public."Session"(project_id,status_id,appointment_date,appointment_time)
    select v_project_id,id,current_date+1,'09:00' from public."Status" where status='Cancelled';
  select * into next_session from public.studio_upcoming_session(v_project_id);
  if next_session.appointment_date <> current_date+2 or next_session.project_title <> 'Database regression' then raise exception 'Upcoming RPC contract/filter broken'; end if;
  insert into storage.objects(bucket_id,name) values ('Session Photos','projects/test/photo.jpg');
  if (select count(*) from storage.objects) <> 1 then raise exception 'Member photo access broken'; end if;
  removed := public.studio_delete_project(v_project_id);
  if removed <> array['projects/test/photo.jpg'] then raise exception 'Deleted project lost cleanup paths'; end if;
  if exists(select 1 from public."Session" s where s.project_id=v_project_id) then raise exception 'Session deletion failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
begin
  if public.is_studio_member() then raise exception 'Unapproved user became member'; end if;
  if exists(select 1 from public."Client") or exists(select 1 from public."StudioMember") or exists(select 1 from storage.objects) then raise exception 'Unapproved user read private data'; end if;
  begin
    insert into public."Client"(first_name,last_name,phone) values ('Blocked','User','test');
    raise exception 'Unapproved write allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('Session Photos','unauthorized.jpg');
    raise exception 'Unapproved photo upload allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public."StudioMember" values ('00000000-0000-0000-0000-000000000002');
    raise exception 'Self-enrollment allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  begin perform * from public."Client"; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.studio_upcoming_session(); raise exception 'Anonymous RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select public from storage.buckets where id='Session Photos') then raise exception 'Bucket still public'; end if;
end $$;
rollback;
