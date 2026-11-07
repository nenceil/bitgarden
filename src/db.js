import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// bigint -> number, DATE -> string 'YYYY-MM-DD' (hindari konversi zona waktu)
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

let pool;

// Di serverless (Netlify/AWS Lambda) tiap instance cukup 1 koneksi
const isServerless = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

function sslConfig() {
  if (process.env.DATABASE_SSL === 'false') return false;
  // Verifikasi sertifikat penuh bila CA diberikan (isi PEM, atau \n sebagai pemisah baris).
  // Tanpa CA, koneksi tetap terenkripsi tapi identitas server tidak diverifikasi.
  const ca = process.env.DATABASE_SSL_CA;
  if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

/** Pool dibuat saat pertama dipakai (lazy), jadi aman untuk serverless. */
function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL belum diisi. Ambil connection string dari Supabase (Connect > pooler) dan taruh di .env / environment variables Netlify'
    );
  }
  pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX || (isServerless ? 1 : 10)),
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    ssl: sslConfig(),
  });
  pool.on('error', (e) => console.error('[pg pool]', e.message));
  return pool;
}

/** Ubah placeholder `?` jadi $1, $2, ... */
const toPg = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

async function run(target, sql, params) {
  const res = await target.query(toPg(sql), params);
  const rows = res.rows;
  rows.rowCount = res.rowCount;
  return rows;
}

/**
 * Jalankan query. Placeholder ditulis `?` lalu diubah ke $1, $2, ...
 * Hasilnya array rows, dengan properti .rowCount (jumlah baris terpengaruh).
 */
export function q(sql, params = []) {
  return run(getPool(), sql, params);
}

/**
 * Jalankan beberapa query dalam satu transaksi. `fn` menerima fungsi query `t(sql, params)`
 * yang memakai koneksi transaksi. Di dalam `fn` JANGAN memanggil q() (pool serverless hanya
 * punya 1 koneksi, jadi akan menunggu selamanya). Error apa pun membatalkan semua perubahan.
 */
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn((sql, params = []) => run(client, sql, params));
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* koneksi sudah putus */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Buat tabel + data awal. Dipakai server lokal; di Netlify jalankan schema.sql sekali manual. */
export async function initSchema() {
  const schema = await fs.readFile(path.resolve('supabase', 'schema.sql'), 'utf8');
  await getPool().query(schema);
}

export async function closeDb() {
  if (pool) await pool.end();
}
