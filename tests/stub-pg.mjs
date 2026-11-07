// pg palsu: memvalidasi placeholder & parameter, lalu memanggil globalThis.__db(sql, params)
const log = (globalThis.__sqlLog = []);
function exec(text, params = []) {
  const nums = [...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const max = nums.length ? Math.max(...nums) : 0;
  if (max !== params.length) throw new Error(`Jumlah parameter salah (SQL butuh ${max}, diberi ${params.length}): ${text.replace(/\s+/g, ' ').slice(0, 140)}`);
  for (let i = 1; i <= max; i++) if (!nums.includes(i)) throw new Error(`$${i} tidak dipakai: ${text.slice(0, 100)}`);
  if (params.some((p) => p === undefined)) throw new Error('parameter undefined: ' + text.slice(0, 100));
  log.push({ text: text.replace(/\s+/g, ' ').trim(), params });
  const out = globalThis.__db(text.replace(/\s+/g, ' ').trim(), params);
  const rows = Array.isArray(out) ? out : out.rows || [];
  return { rows, rowCount: out.rowCount ?? rows.length };
}
class Client { async query(t, p) { if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(t)) { log.push({ text: t, params: [] }); return { rows: [], rowCount: 0 }; } return exec(t, p); } release() {} }
class Pool { constructor() {} on() {} async query(t, p) { return exec(t, p); } async connect() { return new Client(); } async end() {} }
const types = { setTypeParser() {} };
export default { Pool, types };
