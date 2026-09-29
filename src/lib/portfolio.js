import { PHOTO_BUCKET, photoPath } from './photos.js';

export const PORTFOLIO_BUCKET = 'Portfolio Photos';

export function portfolioNotInstalled(error) {
  return ['42P01', 'PGRST205'].includes(error?.code);
}

// Re-encoding removes original filenames and image metadata (including EXIF)
// before a deliberately selected private image is copied to the public bucket.
export async function publicImageBlob(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
    if (!blob || blob.type !== 'image/webp') throw new Error('Could not prepare this photo for the public portfolio.');
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function publishPhoto(client, { portfolioProjectId, sessionId, source, file }) {
  const sourcePath = photoPath(source, import.meta.env.VITE_SUPABASE_URL);
  let original = file;
  if (!original) {
    const { data, error } = await client.storage.from(PHOTO_BUCKET).download(sourcePath);
    if (error) throw error;
    original = data;
  }
  const publicBlob = await publicImageBlob(original);
  const publicPath = `${portfolioProjectId}/${crypto.randomUUID()}.webp`;
  const bucket = client.storage.from(PORTFOLIO_BUCKET);
  const { error: uploadError } = await bucket.upload(publicPath, publicBlob, {
    contentType: 'image/webp', upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from('PortfolioPhoto').insert({
    portfolio_project_id: portfolioProjectId,
    session_id: sessionId,
    source_path: sourcePath,
    public_path: publicPath,
  }).select('id, portfolio_project_id, session_id, source_path, public_path').single();
  if (error) {
    await bucket.remove([publicPath]);
    throw error;
  }
  return data;
}

export async function unpublishPhoto(client, photo) {
  const { error: storageError } = await client.storage.from(PORTFOLIO_BUCKET).remove([photo.public_path]);
  if (storageError) throw storageError;
  const { error } = await client.from('PortfolioPhoto').delete().eq('id', photo.id);
  if (error) throw error;
}

export async function removePublicFiles(client, paths) {
  if (!paths.length) return;
  const { error } = await client.storage.from(PORTFOLIO_BUCKET).remove([...new Set(paths)]);
  if (error) throw error;
}

export async function portfolioPhotos(client, portfolioProjectId) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client.from('PortfolioPhoto')
      .select('id, public_path, source_path, session_id')
      .eq('portfolio_project_id', portfolioProjectId)
      .order('id').range(start, start + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export function publicPhotoUrl(client, path) {
  return client.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
}
