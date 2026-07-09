import { createClient } from '@supabase/supabase-js';

// The Supabase client is created once and reused throughout the app.
// Vite exposes environment variables through `import.meta.env`, and only
// variables starting with `VITE_` are available in browser code.
// Keeping this setup in one file avoids recreating the client in every component.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export default supabase;
