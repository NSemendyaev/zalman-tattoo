import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(url && /^https?:\/\//.test(url) && key && !url.includes('your-project'));
const supabase = isConfigured ? createClient(url, key) : null;
export default supabase;
