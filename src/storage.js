import fs from 'node:fs/promises';
import path from 'node:path';

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';

export const useSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

const base = () => process.env.SUPABASE_URL.replace(/\/+$/, '');

function headers(extra = {}) {
  const key = process.env.SUPABASE_SECRET_KEY;
  const h = { apikey: key, ...extra };
  // Key lama (JWT service_role) juga harus dikirim sebagai Bearer; key baru sb_secret_... tidak boleh
  if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

export const publicUrl = (bucket, key) =>
  `${base()}/storage/v1/object/public/${bucket}/${encodeKey(key)}`;

const readyBuckets = new Set();

/** Buat bucket publik jika belum ada. */
export async function ensureBucket(bucket) {
  if (readyBuckets.has(bucket)) return;
  const res = await fetch(`${base()}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (!/already exists|Duplicate/i.test(txt)) throw new Error(`Gagal membuat bucket: ${txt}`);
  }
  readyBuckets.add(bucket);
}

/** Unggah (atau timpa) satu file ke Supabase Storage. */
export async function putObject(bucket, key, buffer, contentType, cacheControl = 'max-age=3600') {
  const upload = () =>
    fetch(`${base()}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      method: 'POST',
      headers: headers({
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': cacheControl,
      }),
      body: buffer,
    });

  let res = await upload();
  if (!res.ok) {
    const txt = await res.text();
    if (/bucket not found/i.test(txt) || res.status === 404) {
      await ensureBucket(bucket);
      res = await upload();
      if (!res.ok) throw new Error(`Upload ke Supabase Storage gagal: ${await res.text()}`);
    } else {
      throw new Error(`Upload ke Supabase Storage gagal: ${txt}`);
    }
  }
}

/**
 * Simpan avatar. Mengembalikan nilai untuk kolom users.avatar:
 * URL publik Supabase Storage, atau path lokal 'uploads/avatars/...' saat dev tanpa Supabase.
 */
export async function saveAvatar(fileName, buffer, contentType) {
  if (!useSupabase()) {
    const dir = path.resolve('uploads', 'avatars');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer);
    return `uploads/avatars/${fileName}`;
  }
  await putObject(AVATAR_BUCKET, fileName, buffer, contentType);
  return publicUrl(AVATAR_BUCKET, fileName);
}
