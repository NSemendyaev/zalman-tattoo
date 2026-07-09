# OFF React Tutorial

This is a first React project built with Vite, React Router, and Supabase. The app is shaped like a small tattoo/client project tracker: users can sign in, view project cards, open project details, add clients, create projects, and preview selected files before a future upload flow is connected.

## Tech Stack

- React for the UI.
- Vite for local development and bundling.
- React Router for browser routes.
- Supabase for authentication and database access.
- ESLint for code quality checks.

## Current Features

- Supabase authentication context with sign-up, sign-in, and sign-out helpers.
- `/login` route for signing in.
- Main app route with a navigation bar, project grid, and footer.
- Project cards loaded from the Supabase `Project` table with related `Client` data.
- Project details modal with client/project information.
- Add-client modal that inserts a new row into the `Client` table.
- Create-project modal that checks for an existing client, then inserts a new row into the `Project` table.
- Session form and session cards as UI placeholders for future session storage.
- File uploader preview that shows the selected file name, size, and type.

## Project Structure

```text
src/
  components/
    layout/        Navigation and footer components
    modals/        Client, project, and session modal forms
  context/         Auth context, provider, and useAuth hook
  features/
    auth/          Login page
    projects/      Project grid, cards, and project details
    uploader/      File preview/upload UI
  lib/             Shared Supabase client
  App.jsx          Logged-in app shell
  main.jsx         React entry point
  router.jsx       Route definitions
```

## Environment Variables

Create a `.env` file locally with the Supabase values used by `src/lib/supabaseClient.js`:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Notes For Future Development

- Replace hard-coded session cards with real session rows from Supabase.
- Show loading and error messages in the UI instead of only logging to the console.
- Add form validation before sending data to Supabase.
- Close modals after successful inserts when that matches the desired user flow.
- Connect the file uploader to Supabase Storage or another upload endpoint.
- Add route protection so unauthenticated users cannot view the main app route.
