-- Run in an empty disposable fixture after migrations 001 and 003.
\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public."Client"(first_name,last_name,phone)
values ('Private','Person','not-for-public');
insert into public."Project"(client_id,project_title,status_id,date_start)
select id,'Private project title',1,current_date from public."Client"
where first_name='Private';
insert into public."Session"(project_id,status_id,appointment_date,appointment_time)
select id,4,current_date+1,'12:00' from public."Project"
where project_title='Private project title';
insert into public."PortfolioProject"(project_id,public_title,public_summary)
select id,'Public floral piece','A botanical design.' from public."Project"
where project_title='Private project title';
insert into public."PortfolioPhoto"(portfolio_project_id,session_id,source_path,public_path)
select pp.id,s.id,'projects/private/photo.jpg','portfolio/safe-photo.webp'
from public."PortfolioProject" pp
join public."Session" s on s.project_id=pp.project_id;
insert into storage.objects(bucket_id,name) values ('Portfolio Photos','portfolio/safe-photo.webp');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  if exists(select 1 from public."PortfolioProject") then raise exception 'Draft project leaked'; end if;
  if exists(select 1 from public."PortfolioPhoto") then raise exception 'Draft photo leaked'; end if;
  begin
    perform project_id from public."PortfolioProject";
    raise exception 'Private project ID readable';
  exception when insufficient_privilege then null; end;
  begin
    perform source_path from public."PortfolioPhoto";
    raise exception 'Private source path readable';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('Portfolio Photos','portfolio/unapproved.webp');
    raise exception 'Anonymous portfolio upload allowed';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
update public."PortfolioProject" set published=true;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  if (select count(*) from public."PortfolioProject") <> 1 then raise exception 'Published project hidden'; end if;
  if (select count(*) from public."PortfolioPhoto") <> 1 then raise exception 'Published photo hidden'; end if;
  if (select public_title from public."PortfolioProject") <> 'Public floral piece' then raise exception 'Wrong public title'; end if;
  if (select public_path from public."PortfolioPhoto") <> 'portfolio/safe-photo.webp' then raise exception 'Wrong public path'; end if;
  begin
    perform first_name from public."Client";
    raise exception 'Private client readable';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
