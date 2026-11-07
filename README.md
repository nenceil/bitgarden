# Bit Garden (JavaScript)

Game farming retro. Backend Node.js + Express, database Supabase (PostgreSQL), foto avatar dan aset game (gambar/audio) di Supabase Storage. Bisa dijalankan lokal/VPS atau di-deploy ke Netlify.

## 1. Siapkan Supabase
1. Buat project di https://supabase.com (catat Database Password).
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, klik **Run**. (Server lokal juga menjalankannya otomatis saat start.)
3. Ambil `SUPABASE_SECRET_KEY` di **Project Settings > API Keys > Secret key** dan `SUPABASE_URL` di **Project Settings > API**. Bucket `avatars` dibuat otomatis saat upload pertama.

## 2. Unggah aset game
Gambar dan audio ada di folder `assets/` (bukan di `public/`) dan dilayani dari Supabase Storage (bucket publik `assets`, dibuat otomatis).
```
npm run upload-assets
```
- Menambah aset baru: taruh file di `assets/img` atau `assets/audio`, jalankan lagi perintah di atas. Tidak perlu deploy ulang.
- File yang namanya sama akan ditimpa. Cache browser aset adalah 1 hari, jadi perubahan bisa butuh waktu tampil; kalau ingin langsung, ganti nama file.
- Di kode, semua path aset lewat fungsi `asset('img/nama.png')` (JS) atau atribut `data-asset="img/nama.png"` (HTML), yang membaca `ASSET_BASE`. `ASSET_BASE` dibuat otomatis dari `SUPABASE_URL` oleh `scripts/gen-config.js`. Kalau suatu saat aset dipindah ke layanan lain, cukup isi `ASSET_BASE` dengan URL barunya.
- Folder `assets/` ada di `.gitignore` supaya repo tetap ringan. Simpan salinannya sendiri (atau hapus baris itu di `.gitignore` kalau ingin ikut di-commit).

## 3. Jalankan lokal
```
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm start                 # http://localhost:3000
```
Isi `DATABASE_URL` dengan **Session pooler** (port 5432). Kalau `SUPABASE_URL`/`SUPABASE_SECRET_KEY` dikosongkan, avatar disimpan di folder `uploads/` dan aset diambil dari folder `assets/` lokal. Kalau `SUPABASE_URL` terisi, aset diambil dari Supabase, jadi jalankan `npm run upload-assets` dulu.

## 4. Deploy ke Netlify
1. Push proyek ke GitHub (file `.env` jangan ikut; sudah ada di `.gitignore`).
2. Netlify > **Add new site > Import from Git**, pilih repo. Pengaturan build sudah ada di `netlify.toml`, jadi kosongkan build command.
3. **Site configuration > Environment variables**, isi:
   - `DATABASE_URL`: URI **Transaction pooler** (port 6543) dari Supabase
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (`SUPABASE_URL` juga dipakai saat build untuk menentukan alamat aset, jadi jangan dibatasi ke scope Functions saja)
   - `SMTP_USER`, `SMTP_PASS` (dan `SMTP_*` lain jika perlu)
   - `BASE_URL`: alamat situs Netlify Anda
4. Deploy. Skema database harus sudah dijalankan (langkah 1.2) karena function tidak membuat tabel.

## Update dari versi sebelumnya (v2.1)
Versi ini memindahkan semua perhitungan penting ke **server** (gold, energi, harga, hasil panen, hama, mancing), jadi angka tidak bisa lagi diubah lewat DevTools.
1. **Jalankan ulang `supabase/schema.sql`** di SQL Editor. Aman diulang dan tidak menghapus data; ia menambah kolom/tabel baru (`plots.target_pest`, `plots.watered`, `users.pending_fish`, tabel `sessions`, dll). Di Netlify ini wajib dilakukan manual karena function tidak membuat tabel.
2. Pemain **login ulang satu kali** (sesi sekarang disimpan di tabel `sessions`, berlaku 30 hari, bisa dipakai beberapa perangkat sekaligus, dan dicabut saat logout / reset password).
3. Harga, durasi tanam, harga jual, dan peluang ikan/umpan sekarang ada di `src/gamedata.js` (server). Tampilan di `public/js/script.js` memegang salinannya. Setiap mengubah salah satunya, jalankan `npm run check` supaya keduanya tetap sinkron.
4. Opsional: isi `DATABASE_SSL_CA` (PEM CA dari Supabase) agar identitas server database ikut diverifikasi.

Perilaku yang berubah dibanding versi lama:
- Bibit, energi, dan harga dipotong **server**; item baru selalu memakai id dari database.
- Waktu tanam memakai jam server (jam komputer pemain yang salah tidak lagi berpengaruh). Cuaca terjadwal berdasarkan UTC dan sama untuk semua pemain.
- Hama dan penyiraman tersimpan (reload tidak lagi menghapusnya). Mutasi cuaca (basah/tersambar petir) diundi server.
- Memancing: server menentukan ikan saat melempar. Umpan tidak pernah membuat tali putus (hanya ikan terlalu kuat dari lemparan alami yang bisa memutuskannya). Ikan baru dihitung setelah pemain memilih SELL/KEEP; kalau pindah halaman saat memilih, ikan otomatis disimpan.
- Batas 20 lahan per pemain. Alat (pancing, penyiram) hanya bisa dibeli sekali.
- Password minimal 6 karakter; login dan lupa password dibatasi lajunya; pesan error login/lupa password tidak membocorkan apakah akun ada.

## Tes
```
npm test        # cek sinkron data server-client + tes alur backend (tanpa database / npm install)
```
Tes backend memakai `pg` palsu, jadi SQL-nya belum diuji di Postgres sungguhan. Coba semua aksi sekali di Supabase setelah deploy.

## Struktur
| Path | Fungsi |
| --- | --- |
| `public/` | Frontend (HTML, CSS, JS) |
| `assets/` | Gambar dan audio game (diunggah ke Supabase Storage) |
| `scripts/` | `upload-assets.js` (unggah aset), `gen-config.js` (buat `public/js/config.js`) |
| `src/gamedata.js` | Harga, durasi, harga jual, peluang ikan/umpan, jadwal cuaca (sumber kebenaran server) |
| `tests/` | Tes backend tanpa database (`npm test`) |
| `src/app.js` | API Express: `/api/backend`, `/api/messages`, `/api/upload-avatar`, `/api/leaderboard` |
| `netlify/functions/api.js` | Pembungkus Express jadi Netlify Function |
| `supabase/schema.sql` | Skema PostgreSQL + data awal + RLS |
| `server.js` | Server lokal / VPS |
