// Membuat public/js/config.js dari environment (dijalankan otomatis saat npm start / build Netlify)
import 'dotenv/config';
import fs from 'node:fs';

let base = process.env.ASSET_BASE;
if (base === undefined && process.env.SUPABASE_URL) {
  const bucket = process.env.SUPABASE_ASSET_BUCKET || 'assets';
  base = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}`;
}
base = (base || '').replace(/\/+$/, '');

fs.writeFileSync('public/js/config.js', `window.ASSET_BASE = ${JSON.stringify(base)};\n`);
console.log(base ? `ASSET_BASE = ${base}` : 'ASSET_BASE kosong (aset diambil dari folder assets/ lokal)');
