# Zalman Tattoo Studio Tracker

A personal web app project for organizing the work behind a tattoo appointment: client details, design briefs, deposits, sessions, and progress photos in one studio dashboard.

**Status: private studio beta.** Originally a paused personal project, now being prepared for one studio to use with approved accounts. The repository includes the frontend, a migration for the existing backend, and workflow/access-control regression tests. Hosting and a real-user handoff are separate setup steps.

## The idea

A tattoo project can span several appointments. The tracker groups those appointments under a project and connects them to a client, so the artist can review the design, payment details, session history, and photos together.

The main workflow is **add a client → create a project → schedule sessions → record progress**.

## What I built

- **Authentication:** email/password sign-in and sign-out through Supabase Auth, with shared authentication state in React Context.
- **Project dashboard:** sortable project cards, status counts, photo previews, and upcoming appointment summaries.
- **Studio insights:** year-by-year charts for recorded session payments, popular tattoo styles, and completed-session weekdays, plus summary metrics.
- **Client records:** contact details, duplicate-phone checks when adding a client, and editing from the project view.
- **Project management:** design briefs, placement, size, style, equipment notes, agreed prices, and deposit tracking; project editing and deletion with confirmation.
- **Session tracking:** scheduling, date/time changes, database-backed statuses, payment amounts, notes, and a session timeline. Past unresolved appointments appear in a review list until their outcome is recorded or they are rescheduled.
- **Progress photos:** multiple image uploads attached to a session, private signed photo access, upload validation/rollback, and photo removal.
- **Interface states:** loading placeholders, empty states, and feedback for many failed loads and saves.

These describe features implemented in the source. They do not imply that every workflow has been verified against a live backend.

## Technical work demonstrated

This project brings together React forms and state, component composition, routing, relational data, authentication, and file storage around a practical workflow. Some useful parts to review:

| Area | Implementation |
| --- | --- |
| Authentication lifecycle | [AuthProvider.jsx](src/context/AuthProvider.jsx) restores a session and subscribes to authentication changes. |
| Relational data and dashboard state | [ProjectsGrid.jsx](src/features/projects/ProjectsGrid.jsx) loads related client/status records and coordinates project and session views. |
| Form-to-database mapping | [CreateProjectModal.jsx](src/components/modals/CreateProjectModal.jsx) maps form state to a project insert and links it to an existing client. |
| Session scheduling | [ScheduleSession.jsx](src/components/modals/ScheduleSession.jsx) schedules a future appointment against its project. |
| Photo storage | The session editor in [ProjectsGrid.jsx](src/features/projects/ProjectsGrid.jsx) uploads files and saves their storage paths to a session record. |

**Stack:** React, JavaScript, React Router, Vite, Supabase (Auth, Postgres, Storage), CSS, Lucide/React Icons, and ESLint. The Vite configuration also enables React Compiler.

See [architecture and tradeoffs](docs/ARCHITECTURE.md) for a closer look at the structure and remaining technical work.

## Run locally

Use **Node.js 24** (also specified in `.nvmrc`) and npm.

```bash
git clone https://github.com/NSemendyaev/zalman-tattoo.git
cd zalman-tattoo
npm ci
cp .env.example .env.local
```

Replace the placeholders in `.env.local` with your own Supabase project URL and publishable/anon key, then start the app:

```bash
npm run dev
```

**A configured Supabase backend and an existing Auth user are required to use the dashboard.** There is no bundled demo account or offline demo. The included migration upgrades the existing studio schema; it is not a full fresh-project bootstrap. Copying the environment template alone does not create the backend. See [backend setup and data requirements](docs/SETUP.md).

For a source review, lint and build can run without connecting to a backend:

```bash
npm test
npm run lint
npm run build
```

`npm run preview` serves the production build locally. GitHub Actions runs a clean dependency install, workflow unit tests, lint, and build on pushes and pull requests. Database regression tests run separately in a disposable PostgreSQL instance.

## Current limits

- The migration targets the existing studio schema. A completely fresh Supabase project needs the base tables first.
- Studio members share the same records; this is not a multi-tenant service for unrelated studios.
- Self-service signup and password recovery are not exposed in the app; accounts are managed through Supabase Auth.
- Storage cleanup cannot share a transaction with database writes. Cleanup failures are reported for administrator follow-up.
- AI summaries, Instagram post generation, and notifications remain ideas only.
- A production browser link, your friend's account, backups, and final live workflow checks are required for handoff.

See [setup and handoff](docs/SETUP.md) for the access model and deployment steps.
