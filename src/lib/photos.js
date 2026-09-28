export const PHOTO_BUCKET = 'Session Photos';
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Accept old URLs only from this project's bucket. New records store object paths.
export function photoPath(value, supabaseUrl) {
  if (!value) throw new Error('Missing photo path.');
  if (!/^https?:\/\//i.test(value)) {
    if (value.startsWith('/') || value.split('/').includes('..')) throw new Error('Invalid photo path.');
    return value;
  }
  const url = new URL(value);
  if (url.origin !== new URL(supabaseUrl).origin) throw new Error('Photo belongs to a different storage project.');
  const pathname = decodeURIComponent(url.pathname);
  for (const access of ['public', 'sign', 'authenticated']) {
    const prefix = `/storage/v1/object/${access}/${PHOTO_BUCKET}/`;
    if (pathname.startsWith(prefix)) return photoPath(pathname.slice(prefix.length), supabaseUrl);
  }
  throw new Error('Unrecognized photo URL.');
}

export function validatePhotos(files) {
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Use JPEG, PNG, or WebP photos.');
    if (file.size > MAX_PHOTO_BYTES) throw new Error('Each photo must be 10 MB or smaller.');
  }
}

// Keep uploaded paths visible to the caller even if a later upload fails.
export async function uploadPhotos(storage, files, prefix, uploaded) {
  validatePhotos(files);
  for (const file of files) {
    const path = `${prefix}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await storage.upload(path, file, { upsert: false });
    if (error) throw error;
    uploaded.push(path);
  }
}

export async function removePhotos(storage, values, supabaseUrl) {
  if (!values.length) return;
  const paths = [...new Set(values.map((value) => photoPath(value, supabaseUrl)))];
  const { error } = await storage.remove(paths);
  if (error) throw error;
}
