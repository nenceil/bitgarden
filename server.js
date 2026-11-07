// Server lokal / VPS. Untuk Netlify dipakai netlify/functions/api.js
import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { app } from './src/app.js';
import { closeDb, initSchema } from './src/db.js';

// File statis: hanya public/ (dan uploads/ untuk avatar lokal saat dev)
app.use('/uploads', express.static(path.resolve('uploads')));
// Aset game lokal (hanya dipakai jika ASSET_BASE kosong; di produksi aset dari Supabase Storage)
app.use('/img', express.static(path.resolve('assets', 'img')));
app.use('/audio', express.static(path.resolve('assets', 'audio')));
app.use(express.static(path.resolve('public')));

const port = Number(process.env.PORT || 3000);

initSchema()
  .then(() => {
    const server = app.listen(port, () =>
      console.log(`Bit Garden berjalan di http://localhost:${port}`)
    );
    const shutdown = () => server.close(() => closeDb().finally(() => process.exit(0)));
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((e) => {
    console.error('Gagal menginisialisasi database:', e.message);
    process.exit(1);
  });
