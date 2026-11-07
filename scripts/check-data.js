// Memastikan data game di SERVER (src/gamedata.js) dan di CLIENT (public/js/script.js) tidak melenceng.
// Jalankan: npm run check
import fs from 'node:fs';
import vm from 'node:vm';
import * as G from '../src/gamedata.js';

const src = fs.readFileSync(new URL('../public/js/script.js', import.meta.url), 'utf8');

/** Ambil `const NAME = { ... };` dari script.js lalu evaluasi dalam sandbox. */
function grab(name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`const ${name} tidak ditemukan di script.js`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  return vm.runInNewContext(`(${src.slice(from, i + 1)})`, { asset: (p) => p });
}

const ITEMS = grab('ITEMS');
const CROPS = grab('CROPS');
const problems = [];
const bad = (m) => problems.push(m);

// Harga beli
for (const [key, price] of Object.entries(G.SHOP_PRICES)) {
  if (!ITEMS[key]) bad(`ITEMS.${key} tidak ada di client`);
  else if (ITEMS[key].price !== price) bad(`harga ${key}: server ${price}, client ${ITEMS[key].price}`);
}
if (ITEMS.item_energy_boost?.price !== G.ENERGY_UPGRADE_PRICE) bad('harga item_energy_boost berbeda');
// Barang berharga di client tapi tidak dijual di server (kecuali upgrade energi)
for (const [key, it] of Object.entries(ITEMS)) {
  if (it.price && key !== 'item_energy_boost' && G.SHOP_PRICES[key] === undefined) bad(`${key} dijual di client tapi tidak di server`);
}

// Harga jual
for (const [key, it] of Object.entries(ITEMS)) {
  const clientSell = it.sellPrice !== undefined ? it.sellPrice : it.type === 'consumable' ? Math.floor(it.price * 0.5) || 5 : null;
  const serverSell = G.SELL_PRICES[key] ?? null;
  if (clientSell !== serverSell) bad(`harga jual ${key}: server ${serverSell}, client ${clientSell}`);
}

// Tanaman
for (const [crop, c] of Object.entries(G.CROPS)) {
  const cc = CROPS[crop];
  if (!cc) { bad(`CROPS.${crop} tidak ada di client`); continue; }
  if (cc.duration !== c.duration) bad(`durasi ${crop}: server ${c.duration}, client ${cc.duration}`);
  if (cc.seedKey !== c.seed) bad(`seed ${crop} berbeda`);
  if (cc.resultKey !== c.result) bad(`hasil panen ${crop} berbeda`);
}

// Ikan & umpan
for (const [key, f] of Object.entries(G.FISH)) {
  if (ITEMS[key]?.tier !== f.tier) bad(`tier ${key}: server ${f.tier}, client ${ITEMS[key]?.tier}`);
}
for (const [key, b] of Object.entries(G.BAIT_BONUS)) {
  if (ITEMS[key]?.bonus !== b) bad(`bonus ${key}: server ${b}, client ${ITEMS[key]?.bonus}`);
}

if (problems.length) {
  console.error('DATA TIDAK SINKRON:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('OK: data server & client sinkron (harga, harga jual, durasi, ikan, umpan).');
