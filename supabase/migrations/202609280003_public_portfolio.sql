-- An opt-in public portfolio. No existing project or session is published.
begin;

create table public."PortfolioProject" (
  id uuid primary key default gen_random_uuid(),
  project_id bigint not null unique references public."Project"(id) on delete cascade,
  public_title text not null check (length(btrim(public_title)) between 1 and 100),
  public_summary text not null default '' check (length(public_summary) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public."PortfolioPhoto" (
  id uuid primary key default gen_random_uuid(),
  portfolio_project_id uuid not null references public."PortfolioProject"(id) on delete cascade,
  session_id bigint not null references public."Session"(id) on delete cascade,
  source_path text not null,
  public_path text not null unique,
  created_at timestamptz not null default now(),
  unique(portfolio_project_id, source_path)
);
create index on public."PortfolioPhoto"(portfolio_project_id);
create index on public."PortfolioPhoto"(session_id);

alter table public."PortfolioProject" enable row level security;
alter table public."PortfolioPhoto" enable row level security;
revoke all on public."PortfolioProject", public."PortfolioPhoto" from public, anon, authenticated;
grant select(id, public_title, public_summary, published, created_at) on public."PortfolioProject" to anon;
grant select(id, portfolio_project_id, public_path) on public."PortfolioPhoto" to anon;
grant select, insert, update, delete on public."PortfolioProject", public."PortfolioPhoto" to authenticated;

create policy "Published portfolio projects" on public."PortfolioProject"
  for select to anon using (published);
create policy "Studio manages portfolio projects" on public."PortfolioProject"
  for all to authenticated using ((select public.is_studio_member()))
  with check ((select public.is_studio_member()));
create policy "Photos of published projects" on public."PortfolioPhoto"
  for select to anon using (
    exists (select 1 from public."PortfolioProject" p
            where p.id=portfolio_project_id and p.published)
  );
create policy "Studio manages portfolio photos" on public."PortfolioPhoto"
  for all to authenticated using ((select public.is_studio_member()))
  with check ((select public.is_studio_member()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('Portfolio Photos', 'Portfolio Photos', true, 10485760,
        array['image/webp'])
on conflict (id) do nothing;
create policy "Studio manages portfolio photo files" on storage.objects
  for all to authenticated
  using (bucket_id='Portfolio Photos' and (select public.is_studio_member()))
  with check (bucket_id='Portfolio Photos' and (select public.is_studio_member()));
-- A public bucket serves files by URL, but browser roles cannot upload, list,
-- move, or delete its objects unless they are approved studio members.
create policy "Portfolio photo file boundary" on storage.objects
  as restrictive for all to public
  using (bucket_id <> 'Portfolio Photos'
         or (auth.role()='authenticated' and (select public.is_studio_member())))
  with check (bucket_id <> 'Portfolio Photos'
              or (auth.role()='authenticated' and (select public.is_studio_member())));

notify pgrst, 'reload schema';
commit;
