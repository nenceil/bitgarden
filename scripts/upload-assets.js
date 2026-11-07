// Unggah isi folder assets/ (img, audio, dst.) ke bucket publik Supabase Storage.
// Pakai: npm run upload-assets
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureBucket, putObject, useSupabase } from '../src/storage.js';

const BUCKET = process.env.SUPABASE_ASSET_BUCKET || 'assets';
const ROOT = path.resolve('assets');
const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'Thumbs.db') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (!useSupabase()) {
  console.error('Isi SUPABASE_URL dan SUPABASE_SECRET_KEY di .env terlebih dahulu.');
  process.exit(1);
}

const files = [];
try {
  for await (const f of walk(ROOT)) files.push(f);
} catch {
  console.error(`Folder ${ROOT} tidak ditemukan.`);
  process.exit(1);
}

await ensureBucket(BUCKET);

let next = 0, ok = 0, failed = 0;
async function worker() {
  while (next < files.length) {
    const file = files[next++];
    const key = path.relative(ROOT, file).split(path.sep).join('/');
    try {
      const buf = await fs.readFile(file);
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      await putObject(BUCKET, key, buf, type, 'max-age=86400');
      ok++;
      console.log(`  ok  ${key} (${Math.round(buf.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      console.error(`  GAGAL ${key}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

console.log(`\nSelesai: ${ok} file diunggah, ${failed} gagal.`);
console.log(`URL dasar: ${process.env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}`);
process.exit(failed ? 1 : 0);
