// Data game yang dipegang SERVER (sumber kebenaran harga, durasi, hadiah).
// Client punya salinan untuk tampilan (ITEMS/CROPS di public/js/script.js).
// Jalankan `npm run check` untuk memastikan keduanya masih sinkron.

export const CROPS = {
  wheat: { duration: 30000, seed: 'seeds_wheat', result: 'crop_wheat' },
  tomato: { duration: 120000, seed: 'seeds_tomato', result: 'crop_tomato' },
  potato: { duration: 300000, seed: 'seeds_potato', result: 'crop_potato' },
  carrot: { duration: 900000, seed: 'seeds_carrot', result: 'crop_carrot' },
  banana: { duration: 3600000, seed: 'seeds_banana', result: 'crop_banana' },
  apple: { duration: 10800000, seed: 'seeds_apple', result: 'crop_apple' },
  durian: { duration: 28800000, seed: 'seeds_durian', result: 'crop_durian' },
};

// Barang yang dijual di toko (harga per buah). Vitamin (upgrade energi) ditangani terpisah.
export const SHOP_PRICES = {
  seeds_wheat: 1,
  seeds_tomato: 5,
  seeds_potato: 10,
  seeds_carrot: 25,
  seeds_banana: 100,
  seeds_apple: 500,
  seeds_durian: 2000,
  tool_watering_can: 100,
  item_pesticide: 25,
  tool_fishing_rod: 500,
  tool_silver_rod: 2500,
};
export const ENERGY_UPGRADE_PRICE = 1000;

// Harga jual dasar. Mutasi: wet 2x, shocked 5x, wet+shocked 7x.
const BASE_CROP_PRICE = { wheat: 5, tomato: 40, potato: 100, carrot: 400, banana: 2500, apple: 15000, durian: 80000 };
export const SELL_PRICES = {
  fish_rainbow: 1,
  fish_archer: 3,
  fish_snakehead: 8,
  fish_gourami: 20,
  fish_wallago: 60,
  item_pesticide: 12,
};
for (const [crop, base] of Object.entries(BASE_CROP_PRICE)) {
  SELL_PRICES[`crop_${crop}`] = base;
  SELL_PRICES[`crop_${crop}_wet`] = base * 2;
  SELL_PRICES[`crop_${crop}_shocked`] = base * 5;
  SELL_PRICES[`crop_${crop}_wet_shocked`] = base * 7;
}

export const FISH = {
  fish_rainbow: { tier: 1, difficulty: 5 },
  fish_archer: { tier: 2, difficulty: 7 },
  fish_snakehead: { tier: 3, difficulty: 10 },
  fish_gourami: { tier: 4, difficulty: 12 },
  fish_wallago: { tier: 5, difficulty: 17 },
};
const FISH_BY_TIER = ['', 'fish_rainbow', 'fish_archer', 'fish_snakehead', 'fish_gourami', 'fish_wallago'];

// Tier ikan terbesar yang sanggup ditangkap tiap pancing
export const ROD_CAPACITY = { tool_fishing_rod: 2, tool_silver_rod: 5 };
export const BAIT_BONUS = { bait_grasshopper: 30, bait_caterpillar: 40, bait_spider: 50 };

export const MAX_PLOTS = 20;
export const landCost = (plotCount) => 250 * 2 ** Math.max(0, plotCount - 1);

export const PEST_PENALTY = [0, 0.2, 0.5, 0.8];

/** Harga jual (integer) dengan potongan hama. Pakai integer math supaya tidak kena floating point. */
export function sellValue(key, penalty = 0) {
  const base = SELL_PRICES[key];
  if (base === undefined) return null;
  const pct = Math.min(100, Math.max(0, Math.round((Number(penalty) || 0) * 100)));
  return Math.floor((base * (100 - pct)) / 100);
}

const tierOf = (r) => (r < 50 ? 1 : r < 70 ? 2 : r < 85 ? 3 : r < 95 ? 4 : 5);

/**
 * Lempar ikan. Umpan menggeser hasil ke ikan lebih langka, TAPI tidak pernah melewati
 * kemampuan pancing (umpan tidak boleh membuat tali putus). Tali hanya putus kalau
 * lemparan alaminya memang ikan yang terlalu kuat.
 */
export function rollFish(bonus, capacity, rand = Math.random) {
  const natural = rand() * 100;
  const naturalTier = tierOf(natural);
  if (naturalTier > capacity) return { key: FISH_BY_TIER[naturalTier], snapped: true };
  const tier = Math.min(tierOf(natural + (bonus || 0)), capacity);
  return { key: FISH_BY_TIER[tier], snapped: false };
}

export function rollBait(rand = Math.random) {
  const r = rand() * 100;
  if (r < 20) return 'bait_spider';
  if (r < 40) return 'bait_caterpillar';
  if (r < 80) return 'bait_grasshopper';
  return null;
}

export function rollPest(rand = Math.random) {
  const r = rand() * 100;
  if (r < 1) return 3;
  if (r < 3) return 2;
  if (r < 8) return 1;
  return 0;
}

/** Hama muncul setelah 40% masa tumbuh. Dihitung malas (lazy) dari waktu server. */
export function effectivePest(row, nowMs) {
  let level = row.pest_level || 0;
  let target = row.target_pest || 0;
  if (row.state === 'growing' && level === 0 && target > 0) {
    const dur = row.duration || 0;
    const start = Number(row.start_time) || 0;
    if (dur > 0 && (nowMs - start) / dur > 0.4) {
      level = target;
      target = 0;
    }
  }
  return { level, target };
}

/**
 * Cuaca terjadwal (UTC, jadi sama untuk semua pemain & server).
 * Menit 0-2 tiap setengah jam: hujan. Menit 3-5: petir (acak deterministik per slot) atau cerah.
 * HARUS sama persis dengan getScheduledWeather() di public/js/script.js.
 */
export function weatherAt(ms) {
  const slotLen = 30 * 60 * 1000;
  const slotMin = Math.floor((ms % slotLen) / 60000);
  if (slotMin <= 2) return 'rain';
  if (slotMin <= 5) {
    const n = Math.floor(ms / slotLen);
    return (((n * 2654435761) >>> 16) & 1) === 0 ? 'thunder' : 'clear';
  }
  return 'clear';
}

export function resultKey(crop, wet, shocked) {
  const base = CROPS[crop].result;
  if (wet && shocked) return `${base}_wet_shocked`;
  if (shocked) return `${base}_shocked`;
  if (wet) return `${base}_wet`;
  return base;
}
