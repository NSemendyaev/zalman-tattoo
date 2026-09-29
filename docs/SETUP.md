# Private artist workspace setup

This app is intended for one independent artist and explicitly approved users. It uses Supabase Auth, Postgres and a private `Session Photos` bucket. The browser receives only a publishable key; access is enforced in the database and storage policies.

## Existing ZalmanTattoo backend

The migration was applied to the connected ZalmanTattoo project on 28 September 2026. Do not run it again there. Anonymous read requests to all four studio tables were verified to return HTTP 401.

The migration in [202609280001_private_studio.sql](../supabase/migrations/202609280001_private_studio.sql) upgrades the existing `Client`, `Project`, `Session` and `Status` schema without deleting records. It expects exactly one existing Auth user, preserves that user's access, and fails rather than guessing when there are several accounts.

Apply the migration once through the Supabase SQL editor after reviewing it. It is transactional and is not a repeatable seed script. It:

- Adds `StudioMember`, readable only by its own member and writable only by an administrator.
- Restricts the existing table policies to approved members and revokes anonymous table access.
- Makes the photo bucket private and allows approved accounts to manage its files.
- Limits new images to JPEG, PNG and WebP, at most 10 MB each.
- Adds missing session statuses without changing existing IDs.
- Adds `studio_upcoming_session(p_project_id default null)` and `studio_delete_project(p_project_id)`.

These functions run with the caller's permissions. Appointment date/time values are interpreted in **Europe/London**, including daylight-saving changes. Cancelled, expired and recorded sessions do not appear as upcoming appointments.

## Statuses and past appointments

`In Review` is a **project** status. The interface calls it **Client review**, meaning a design or project is awaiting client feedback. It is not a session outcome. Some older sessions may still have `In Review` because both record types share the `Status` table; the app flags those for review without silently changing the data.

New sessions start as `Upcoming` and must be scheduled in the future. When an `Upcoming` or `Rescheduled` appointment passes, the app displays **Overdue** and adds it to **Sessions to review**. This is a display state, not an automatic database change: only the artist can know whether work happened. Open the listed session and set `Completed`, `Cancelled`, or a new date with `Rescheduled`. Older `Expired` sessions also appear in the review list and remain unchanged until someone resolves them. The review check uses Europe/London time, including daylight-saving changes.

The original `fetch_upcoming_session*` functions may remain in the backend for compatibility, but the current app no longer calls them.

## Give your friend access

1. Create your friend's user through Supabase **Authentication → Users**, with them completing any password setup themselves. The app has no public signup screen.
2. In the SQL editor, add their Auth user UUID to `public."StudioMember"`. This grants access to the artist's shared records and photos. Do not commit real account identifiers to this repository.
3. Verify that the account can sign in, create a client/project, schedule a session, and upload/view a photo.
4. Remove obsolete test memberships when the artist switches to real records. Disabling public signups in Supabase Auth is also appropriate for this private app; membership remains the authorization boundary even if an unapproved account exists.

Password setup and recovery need an administrator-assisted handoff. The app does not yet provide a screen for choosing a new password, so a Supabase recovery email alone is not a complete recovery workflow.

## Local development

Use Node.js 24 and npm:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set your project URL and publishable/anon key in `.env.local` before starting Vite. Never use a secret or service-role key in a `VITE_` variable. Vite includes these values in the browser bundle. Local environment files and `dist/` are ignored by Git.

The app displays a setup message if the environment is missing, and a sign-in screen when no session exists.

## Hosting for your friend

Build with `npm run build` and serve `dist/` on an HTTPS static host. Configure the two environment variables in that host's build settings. Configure an SPA fallback to `index.html` for `/login` and other application routes; `public/_redirects` provides this for Netlify-compatible hosts. Set the Supabase Auth site URL to the deployed origin.

`npm run dev` and `npm run preview` are local development tools, not a permanent hosted service. Until a host is configured, your friend cannot use the app through a public browser link.

### Netlify deployment

`netlify.toml` supplies the build command, Node version, output directory and basic response headers. `public/_redirects` supplies the client-side routing fallback.

1. Commit the reviewed source changes and push them to your repository. This repository's earlier privacy cleanup rewrote local Git history, so resolve that remote-history update deliberately before connecting it.
2. Import that repository into Netlify and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables. Never upload `.env.local` or set a service-role key.
3. Deploy and open the HTTPS URL. Set this URL in Supabase Auth's site URL configuration.
4. Test a direct visit to `/login`, sign in with an approved account, and confirm a private photo loads.
5. Share the URL with your friend after their account is added to `StudioMember`.

No Netlify account, site, custom domain, or paid plan is created by these repository settings. See [Netlify's Vite deployment guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

## Google Calendar (optional)

The Google Calendar integration is prepared but **not enabled on the existing Supabase project**. It requires a Google Cloud OAuth client and the friend's one-time Google consent. Do not set `VITE_GOOGLE_CALENDAR_ENABLED` until the backend is ready.

1. Apply `supabase/migrations/202609280002_google_calendar.sql` to the artist's Supabase project. It creates private connection, OAuth state, and event-mapping tables. Only the Edge Function service role can read the stored Google refresh token.
2. In Google Cloud, enable the Google Calendar API, configure the OAuth consent screen, and create a **Web application** OAuth client. Grant the `calendar.events.owned` scope. Set its authorized redirect URI to `https://<project-ref>.supabase.co/functions/v1/google-calendar`. If the OAuth app is in External/Testing mode, add the friend as a test user; [Google says its refresh tokens expire after seven days in that mode](https://developers.google.com/identity/protocols/oauth2), so they would need to reconnect weekly until the consent setup supports longer-lived tokens.
3. In Supabase Edge Function secrets, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (the exact URI above), and `APP_ORIGIN` (the static site's HTTPS origin, with no trailing slash). Keep the client secret out of Vite variables and Git. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function.
4. Deploy `google-calendar` from `supabase/functions/google-calendar` with `supabase/config.toml`. This function intentionally has `verify_jwt = false` because Google calls its public OAuth callback. Its POST operations verify the Supabase bearer token and approved account membership themselves.
5. Add `VITE_GOOGLE_CALENDAR_ENABLED=true` to the static host's build environment and redeploy the frontend. Sign in to the artist's app, click **Connect Google Calendar**, and complete the Google consent screen. Check that a future session appears on the account's primary calendar, then edit, reschedule, and cancel a test session to verify updates.

The integration writes events **from the artist's sessions to Google Calendar**. It does not import edits made in Google Calendar. Only future Upcoming/Rescheduled sessions are initially imported; existing mapped events remain as history when marked Completed. Cancelled and deleted sessions are removed. Event titles include the project title, but not client contact details or private notes. Times use Europe/London; sessions without a duration default to two hours. The app syncs after its scheduling/edit/deletion actions, when opened, and every two minutes while open. It does not run a server-side background job while the app is closed. Disconnect stops future writes but leaves already-created Google events in place.

## Public portfolio

The public portfolio migration, `supabase/migrations/202609280003_public_portfolio.sql`, was applied to the connected ZalmanTattoo project on 28 September 2026. Do not run it again there. It adds separate `PortfolioProject` and `PortfolioPhoto` tables plus a **public** `Portfolio Photos` bucket. The live check found zero public projects and photos, with the new bucket public and `Session Photos` still private. No existing project, session, or photo was published by the migration. Anonymous visitors can read only explicitly published titles, summaries, and selected public photo paths. They cannot read client records, private project/session fields, the source photo paths, or the private `Session Photos` bucket.

The landing page is `/` for signed-out visitors and `/portfolio` for anyone, including a signed-in artist previewing it. Its featured image and project gallery use only selected public photos. Open a project in the artist dashboard, write a public title and short overview in **Public portfolio**, and publish that overview. Then choose individual photos with **Show on public page**, or tick the individual checkboxes when adding new session photos. Newly public photos are re-encoded to WebP at up to 2000 pixels to strip original filenames and image metadata before upload. Check the *image contents* yourself for faces, names, identifying marks, or other details you do not want to publish.

Removing a photo from the public page or unpublishing a project removes its public copy. Removing a private photo, session, or project also attempts to clean up its public copy. Storage and database changes are separate operations; cleanup failures are shown and require administrator attention. Previously downloaded or cached public images cannot be recalled from visitors.

The portfolio database regression test is `tests/portfolio-access.sql`; run it only against an empty disposable PostgreSQL fixture after the private-studio and public-portfolio migrations.

## Photos and cleanup

New session records store storage object paths in `Session.img_urls`. Existing public URLs from the same Supabase project are converted to paths when read. The app requests signed URLs valid for one hour and refreshes them while the view stays open. Making the bucket private prevents old public URLs from serving the images directly.

Uploads validate every selected file before starting. If an upload or session save fails, the app attempts to remove files already uploaded during that save. Removing a photo first updates the session, then cleans up storage. Deleting a project removes its session rows in one database transaction and returns the photo references for cleanup. Database deletion and storage deletion are separate operations; cleanup failures are reported and need administrator attention.

## Verification

```bash
npm test
npm run lint
npm run build
```

The Node tests cover upload rollback paths, file restrictions, legacy photo URL handling, phone normalization, and date/payment validation. GitHub Actions runs these tests, lint and build.

On 28 September 2026, live browser checks created the dummy `Studio SmokeTest` client and `Studio workflow smoke test` project, scheduled a session, saved notes and a zero payment, and uploaded/viewed a generated PNG through private storage. The dashboard and project details were also checked in a 393-pixel-wide viewport. These dummy records remain available for review. Anonymous table requests were denied. Destructive project deletion and nonmember access were tested in the disposable database, not by deleting hosted records.

For database regression testing, use **an empty disposable PostgreSQL database only**. Run `tests/database-fixture.sql`, then the migration, then `tests/database-access.sql` with `psql -v ON_ERROR_STOP=1`. The fixture emulates the Supabase schemas and roles and must never run against the hosted project. Tests cover member/nonmember/anonymous access, self-enrollment denial, next-session filtering, and atomic project/session deletion. Actual Supabase Storage delivery still requires a browser smoke test.

Before handing over real data, verify sign-in/sign-out, add/edit client, create/edit project, schedule/edit session, upload/view/remove photos, and a phone-sized layout. Confirm backup and recovery arrangements in the Supabase dashboard.
