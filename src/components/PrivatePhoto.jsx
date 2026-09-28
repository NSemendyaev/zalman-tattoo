import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient.js';
import { PHOTO_BUCKET, photoPath } from '../lib/photos.js';

export default function PrivatePhoto({ path, alt, ...props }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const objectPath = photoPath(path, import.meta.env.VITE_SUPABASE_URL);
        const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(objectPath, 3600);
        if (error) throw error;
        if (active) setResult({ path, url: data.signedUrl });
      } catch {
        if (active) setResult({ path, error: true });
      }
    }
    load();
    const refresh = window.setInterval(load, 50 * 60 * 1000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [path]);
  if (result?.path !== path) return <span className="photo-placeholder">Loading photo…</span>;
  if (result.error) return <span className="photo-placeholder" role="status">Photo unavailable</span>;
  return <img {...props} src={result.url} alt={alt} onError={() => setResult({ path, error: true })} />;
}
