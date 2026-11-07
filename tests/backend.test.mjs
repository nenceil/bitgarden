// Tes alur backend TANPA database & tanpa npm install: pg/bcryptjs/nodemailer diganti stub (lihat tests/stub-*.mjs).
// Stub pg memvalidasi jumlah placeholder SQL vs parameter. Jalankan: npm test
// (Tes ini tidak menjalankan SQL di Postgres sungguhan; itu tetap perlu dicoba di Supabase.)
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'postgres://x';
const { backendHandler } = await import('../src/routes/backend.js');
const G = await import('../src/gamedata.js');

const now = Date.now();
let plotRow, userRow, invRows, rowCountOverride;
const reset = () => {
  userRow = { id: 7, username: 'tester', gold: 1000, energy: 10, max_energy: 30, last_updated: 1, fish_caught: 0, pending_fish: null, pending_fish_at: 0 };
  plotRow = { user_id: 7, plot_index: 0, state: 'empty', crop_type: null, start_time: 0, duration: 0, pest_level: 0, target_pest: 0, watered: 0, mutations: null };
  invRows = [];
  rowCountOverride = {};
};
reset();

// DB palsu: balasan "masuk akal" per jenis query
globalThis.__db = (sql, p) => {
  for (const [re, v] of Object.entries(rowCountOverride)) if (new RegExp(re).test(sql)) return v;
  if (/FROM sessions s JOIN users/.test(sql)) return [{ id: 7, username: 'tester' }];
  if (/^SELECT \* FROM users WHERE id = \$1 FOR UPDATE/.test(sql)) return [userRow];
  if (/^SELECT gold, energy, max_energy/.test(sql)) return [userRow];
  if (/^SELECT \* FROM plots .* FOR UPDATE/.test(sql)) return [plotRow];
  if (/^SELECT plot_index, mutations FROM plots/.test(sql)) return [{ plot_index: 0, mutations: null }, { plot_index: 1, mutations: null }];
  if (/^SELECT COUNT\(\*\)::int AS n/.test(sql)) return [{ n: 1, next_idx: 1 }];
  if (/^SELECT item_key FROM inventory WHERE user_id = \$1 AND item_key = ANY/.test(sql)) return [{ item_key: 'tool_silver_rod' }];
  if (/^SELECT id FROM inventory WHERE user_id = \$1 AND item_key = 'tool_watering_can'/.test(sql)) return [{ id: 5 }];
  if (/^SELECT id FROM inventory WHERE user_id = \$1 AND item_key = \$2 LIMIT 1/.test(sql)) return [];
  if (/^SELECT id, target_amount FROM daily_quests/.test(sql)) return [{ id: 1, target_amount: 5 }];
  if (/^SELECT \* FROM daily_quests/.test(sql)) return [{ id: 1, quest_type: 'plant', target_amount: 5, reward_gold: 5, description: 'x' }];
  if (/^SELECT \* FROM user_quests/.test(sql)) return [];
  if (/^SELECT reward_gold/.test(sql)) return [{ reward_gold: 5 }];
  if (/^SELECT max_energy FROM users/.test(sql)) return [{ max_energy: 31 }];
  if (/^SELECT gold, fish_caught FROM users/.test(sql)) return [userRow];
  if (/^SELECT username, gold/.test(sql)) return [userRow];
  if (/FROM titles t LEFT JOIN/.test(sql)) return [{ id: 1, title_name: 'A', description: 'd', owned: true, requirement_gold: 0, requirement_fish: 0 }];
  if (/^DELETE FROM inventory WHERE id = \(/.test(sql)) return [{ id: 55 }];
  if (/^DELETE FROM inventory WHERE id = \$1 AND user_id = \$2 AND item_key = ANY/.test(sql)) return [{ id: p[0], item_key: 'bait_spider' }];
  if (/^DELETE FROM inventory WHERE id = ANY/.test(sql)) return invRows;
  if (/^DELETE FROM inventory WHERE id = \$1 AND user_id = \$2 RETURNING/.test(sql)) return invRows.slice(0, 1);
  if (/^INSERT INTO inventory .* RETURNING id/.test(sql)) return Array.from({ length: Number(p[3] ?? 1) }, (_, i) => ({ id: 100 + i }));
  if (/^UPDATE user_quests SET is_claimed = 1/.test(sql)) return [{ quest_id: 1 }];
  if (/RETURNING id$/.test(sql) && /last_weather_tick/.test(sql)) return [{ id: 7 }];
  if (/^UPDATE .* (energy|gold) = (energy|gold) - /.test(sql)) return { rows: [], rowCount: 1 };
  return { rows: [], rowCount: 1 };
};

const call = async (body) => {
  let out;
  await backendHandler({ body: { token: 'tok', ...body }, ip: '1.1.1.1', protocol: 'http', get: () => 'h' }, { json: (j) => (out = j) });
  return out;
};
const ok = async (name, body, check) => {
  const r = await call(body);
  assert.equal(r.success, true, `${name}: ${r.message}`);
  if (check) check(r);
  console.log('  ok', name);
  return r;
};
const failsWith = async (name, body, msg) => {
  const r = await call(body);
  assert.equal(r.success, false, `${name} seharusnya gagal`);
  assert.match(r.message, msg, name);
  console.log('  ok', name, '→', r.message);
};

console.log('Aksi game:');
await ok('init', { action: 'init' }, (r) => assert.ok(r.data.serverTime && r.data.user && Array.isArray(r.data.plots)));
await ok('plant', { action: 'plant', plotIndex: 0, cropType: 'wheat' }, (r) => {
  assert.equal(r.plot.growthDuration, 30000); assert.equal(r.seedId, 55); assert.ok(r.user && r.serverTime);
});
await failsWith('plant tanaman ngawur', { action: 'plant', plotIndex: 0, cropType: 'hax' }, /Unknown crop/);
plotRow.state = 'growing';
await failsWith('plant di plot terisi', { action: 'plant', plotIndex: 0, cropType: 'wheat' }, /not empty/);

plotRow = { ...plotRow, state: 'growing', crop_type: 'tomato', start_time: now - 5000, duration: 120000 };
await failsWith('panen belum matang (cheat)', { action: 'harvest', plotIndex: 0 }, /not ready/);
plotRow = { ...plotRow, start_time: now - 130000, target_pest: 3, mutations: JSON.stringify({ wet: true, shocked: true }) };
await ok('panen matang + hama berat + mutasi', { action: 'harvest', plotIndex: 0 }, (r) => {
  assert.equal(r.item.key, 'crop_tomato_wet_shocked'); assert.equal(r.item.penalty, 0.8); assert.equal(r.mutated, true);
});
const ins = globalThis.__sqlLog.filter((l) => /^INSERT INTO inventory/.test(l.text)).pop();
assert.equal(ins.params[1], 'crop_tomato_wet_shocked'); assert.equal(ins.params[2], 0.8);

plotRow = { ...plotRow, state: 'growing', start_time: now, duration: 30000, watered: 0, crop_type: 'wheat', mutations: null };
await ok('water', { action: 'water', plotIndex: 0 }, (r) => assert.ok(Math.abs(r.plantTime - (now - 60000)) < 5));
plotRow.watered = 1;
await failsWith('water dua kali', { action: 'water', plotIndex: 0 }, /Already watered/);
plotRow = { ...plotRow, watered: 0, target_pest: 2, start_time: now - 20000 };
await ok('use_spray (hama sudah muncul >40%)', { action: 'use_spray', plotIndex: 0 }, (r) => assert.equal(r.sprayId, 55));
plotRow = { ...plotRow, target_pest: 0, pest_level: 0 };
await failsWith('use_spray tanpa hama', { action: 'use_spray', plotIndex: 0 }, /No pests/);

await ok('destroy_plot', { action: 'destroy_plot', plotIndex: 0 });

console.log('Toko & jual beli:');
await ok('buy_item x3 bibit', { action: 'buy_item', itemKey: 'seeds_tomato', qty: 3 }, (r) => assert.equal(r.items.length, 3));
const spend = globalThis.__sqlLog.filter((l) => /SET gold = gold - /.test(l.text)).pop();
assert.equal(spend.params[0], 15, 'total harga dihitung server (5 x 3)');
await failsWith('beli item tak dijual', { action: 'buy_item', itemKey: 'crop_durian_wet_shocked', qty: 1 }, /not for sale/);
await failsWith('beli energy_boost lewat buy_item', { action: 'buy_item', itemKey: 'item_energy_boost' }, /not for sale/);
await ok('buy_item tool (rod)', { action: 'buy_item', itemKey: 'tool_fishing_rod', qty: 50 }, (r) => assert.equal(r.items.length, 1));
rowCountOverride['SET gold = gold - '] = { rows: [], rowCount: 0 };
await failsWith('gold tidak cukup', { action: 'buy_item', itemKey: 'seeds_durian', qty: 99 }, /Not enough gold/);
await failsWith('upgrade energy tanpa gold', { action: 'upgrade_energy', qty: 1 }, /Not enough gold/);
delete rowCountOverride['SET gold = gold - '];
await ok('upgrade_energy', { action: 'upgrade_energy', qty: 1 }, (r) => assert.equal(r.new_max_energy, 31));

invRows = [{ id: 9, item_key: 'crop_wheat', penalty: 0.8 }];
await ok('sell_item wheat hama berat (5g → 1g, bukan 0g)', { action: 'sell_item', itemId: 9 }, (r) => assert.equal(r.value, 1));
invRows = [{ id: 9, item_key: 'crop_carrot', penalty: 0.8 }];
await ok('sell_item carrot hama berat (400g → 80g)', { action: 'sell_item', itemId: 9 }, (r) => assert.equal(r.value, 80));
invRows = [{ id: 9, item_key: 'tool_fishing_rod', penalty: 0 }];
await failsWith('jual tool ditolak', { action: 'sell_item', itemId: 9 }, /cannot be sold/);
invRows = [{ id: 1, item_key: 'crop_wheat_wet', penalty: 0 }, { id: 2, item_key: 'fish_wallago', penalty: 0 }];
await ok('sell_all', { action: 'sell_all', itemIds: [1, 2, 2, 'x'] }, (r) => { assert.equal(r.total, 70); assert.deepEqual(r.sold, [1, 2]); });
invRows = [];
await failsWith('sell_item tak ada', { action: 'sell_item', itemId: 12345 }, /not found/);
await failsWith('sell_all kosong', { action: 'sell_all', itemIds: [] }, /Nothing to sell/);

await ok('buy_land', { action: 'buy_land' }, (r) => { assert.equal(r.plot.id, 1); });
const land = globalThis.__sqlLog.filter((l) => /SET gold = gold - /.test(l.text)).pop();
assert.equal(land.params[0], 250, 'plot ke-2 = 250g');

console.log('Memancing & umpan:');
let snaps = 0, caught = 0;
for (let i = 0; i < 200; i++) {
  const r = await call({ action: 'cast_rod' });
  assert.equal(r.success, true); assert.ok(G.FISH[r.fishKey]);
  r.snapped ? snaps++ : caught++;
}
assert.equal(snaps, 0, 'pancing perak tidak pernah putus');
await ok('cast_rod + umpan', { action: 'cast_rod', baitId: 4 }, (r) => assert.equal(r.baitUsed, 4));
userRow.pending_fish = 'fish_gourami'; userRow.pending_fish_at = now - 10000;
await ok('resolve_fish sell', { action: 'resolve_fish', choice: 'sell' }, (r) => assert.equal(r.value, 20));
await ok('resolve_fish keep', { action: 'resolve_fish', choice: 'keep' }, (r) => assert.equal(r.item.key, 'fish_gourami'));
userRow.pending_fish_at = now - 100;
await failsWith('resolve_fish terlalu cepat (cheat)', { action: 'resolve_fish', choice: 'sell' }, /too fast/);
userRow.pending_fish = null;
await failsWith('resolve_fish tanpa ikan (cheat)', { action: 'resolve_fish', choice: 'sell' }, /No fish/);

await ok('search_bait', { action: 'search_bait' });

console.log('Quest, cuaca, lain-lain:');
await ok('claim_quest', { action: 'claim_quest', questId: 1 }, (r) => assert.equal(r.reward, 5));
rowCountOverride['^UPDATE user_quests SET is_claimed = 1'] = [];
await failsWith('claim ganda / quest basi', { action: 'claim_quest', questId: 1 }, /not ready/);
delete rowCountOverride['^UPDATE user_quests SET is_claimed = 1'];
await ok('weather_tick', { action: 'weather_tick' });
await ok('get_titles', { action: 'get_titles' });
await ok('get_profile', { action: 'get_profile' });
await ok('logout', { action: 'logout' });
await failsWith('update_stats lama sudah tidak ada', { action: 'update_stats', gold: 99999999 }, /Invalid action|Server error/).catch(async () => {
  const r = await call({ action: 'update_stats', gold: 99999999 });
  assert.equal(r.success, false); console.log('  ok update_stats ditolak →', r.message);
});

console.log('Auth publik:');
globalThis.__db = (sql) => {
  if (/FROM users WHERE lower\(username\)/.test(sql)) return [];
  if (/FROM users WHERE lower\(email\)/.test(sql)) return [];
  return { rows: [{ id: 1 }], rowCount: 1 };
};
const pub = async (b) => { let o; await backendHandler({ body: b, ip: '9.9.9.9', protocol: 'http', get: () => 'h' }, { json: (j) => (o = j) }); return o; };
assert.match((await pub({ action: 'register', username: 'bob', email: 'bad', password: 'secret1' })).message, /Invalid email/);
assert.match((await pub({ action: 'register', username: 'bob', email: 'a@b.co', password: '123' })).message, /too short/);
assert.equal((await pub({ action: 'register', username: 'bob', email: 'a@b.co', password: 'secret1' })).success, true);
const fp = await pub({ action: 'forgot_password', email: 'nobody@x.co' });
assert.equal(fp.success, true); assert.match(fp.message, /If that email/);
assert.equal(globalThis.__mailSent ?? 0, 0, 'email tak terdaftar tidak dikirimi apa pun, dan balasan sama');
const lg = await pub({ action: 'login', username: 'ghost', password: 'x' });
assert.equal(lg.message, 'Invalid username or password');
for (let i = 0; i < 12; i++) await pub({ action: 'login', username: 'brute', password: 'x' });
assert.match((await pub({ action: 'login', username: 'brute', password: 'x' })).message, /Too many/);
console.log('  ok register/validasi, forgot generik, login seragam, rate limit');

console.log('\nSEMUA TES BACKEND LULUS. Query unik yang dieksekusi:', new Set(globalThis.__sqlLog.map((l) => l.text)).size);
