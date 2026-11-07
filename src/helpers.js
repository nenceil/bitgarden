import crypto from 'node:crypto';
import { q } from './db.js';
import { effectivePest } from './gamedata.js';

const TZ = 'Asia/Jakarta';
const SESSION_DAYS = 30;
const MAX_SESSIONS_PER_USER = 5;

export const nowSec = () => Math.floor(Date.now() / 1000);

/** Error yang aman ditampilkan ke pemain (selain itu dibalas "Server error"). */
export class GameError extends Error {}
export const fail = (message) => {
  throw new GameError(message);
};

/** 'YYYY-MM-DD' menurut zona waktu Asia/Jakarta. */
export function todayJakarta() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Setara htmlspecialchars() PHP. */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Pembatas laju sederhana di memori (per instance; cukup untuk menahan spam/brute force kasar). */
const hits = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 3600000) hits.delete(k);
  }
  return true;
}

/* ------------------------------ Sesi ------------------------------ */

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  await q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
    token,
    userId,
    nowSec() + SESSION_DAYS * 86400,
  ]);
  // Maksimal beberapa perangkat per akun; yang paling lama dibuang
  await q(
    `DELETE FROM sessions WHERE user_id = ? AND token NOT IN (
       SELECT token FROM sessions WHERE user_id = ? ORDER BY expires_at DESC LIMIT ${MAX_SESSIONS_PER_USER}
     )`,
    [userId, userId]
  );
  await q('DELETE FROM sessions WHERE expires_at < ?', [nowSec()]);
  return token;
}

export const destroySession = (token) => q('DELETE FROM sessions WHERE token = ?', [token]);
export const destroyUserSessions = (userId) => q('DELETE FROM sessions WHERE user_id = ?', [userId]);

/** Cari user dari session token. Mengembalikan { id, username } atau null. */
export async function userFromToken(token) {
  if (!token || typeof token !== 'string' || token.length > 64) return null;
  const rows = await q(
    `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, nowSec()]
  );
  return rows[0] || null;
}

/* ------------------------------ Quest ------------------------------ */

/** Tanggal DATE bisa berupa string atau Date; samakan ke 'YYYY-MM-DD'. */
function asDateStr(v) {
  if (v instanceof Date) return v.toLocaleDateString('en-CA', { timeZone: TZ });
  return String(v).slice(0, 10);
}

/** Satu pernyataan upsert, jadi aman terhadap request paralel (tidak ada race insert ganda). */
export async function updateQuestProgress(userId, type, amount = 1) {
  const today = todayJakarta();
  const quests = await q('SELECT id, target_amount FROM daily_quests WHERE quest_type = ?', [type]);

  for (const quest of quests) {
    const target = quest.target_amount;
    await q(
      `INSERT INTO user_quests (user_id, quest_id, current_progress, is_completed, is_claimed, last_reset)
       VALUES (?, ?, ?, ?, 0, ?::date)
       ON CONFLICT (user_id, quest_id) DO UPDATE SET
         current_progress = CASE
           WHEN user_quests.last_reset <> EXCLUDED.last_reset THEN EXCLUDED.current_progress
           WHEN user_quests.is_completed = 1 THEN user_quests.current_progress
           ELSE user_quests.current_progress + EXCLUDED.current_progress END,
         is_completed = CASE
           WHEN user_quests.last_reset <> EXCLUDED.last_reset THEN EXCLUDED.is_completed
           WHEN user_quests.is_completed = 1 THEN 1
           WHEN user_quests.current_progress + EXCLUDED.current_progress >= ? THEN 1
           ELSE 0 END,
         is_claimed = CASE
           WHEN user_quests.last_reset <> EXCLUDED.last_reset THEN 0
           ELSE user_quests.is_claimed END,
         last_reset = EXCLUDED.last_reset`,
      [userId, quest.id, amount, amount >= target ? 1 : 0, today, target]
    );
  }
}

export async function getQuests(userId) {
  const today = todayJakarta();
  const all = await q('SELECT * FROM daily_quests ORDER BY id');
  const mine = await q('SELECT * FROM user_quests WHERE user_id = ?', [userId]);
  const byQuest = new Map(mine.map((r) => [r.quest_id, r]));

  return all.map((quest) => {
    const uq = byQuest.get(quest.id);
    const fresh = uq && asDateStr(uq.last_reset) === today;
    return {
      id: quest.id,
      type: quest.quest_type,
      target: quest.target_amount,
      reward: quest.reward_gold,
      desc: quest.description,
      progress: fresh ? uq.current_progress : 0,
      completed: fresh ? !!uq.is_completed : false,
      claimed: fresh ? !!uq.is_claimed : false,
    };
  });
}

/* ------------------------------ Energi ------------------------------ */

/**
 * Regenerasi energi (1 per 60 detik) dihitung di server SETIAP aksi, jadi tidak ada lagi regen
 * yang hilang. Sisa detik dipertahankan (last_updated maju sebesar menit penuh saja), dan saat
 * energi penuh jam regen di-reset supaya setelah dipakai tidak langsung "melompat".
 */
export async function syncEnergy(userId) {
  const now = nowSec();
  await q(
    `UPDATE users u SET
       energy = LEAST(u.max_energy, u.energy + s.d),
       last_updated = CASE
         WHEN u.last_updated <= 0 OR u.energy + s.d >= u.max_energy THEN ?
         ELSE u.last_updated + s.d * 60 END
     FROM (
       SELECT id, CASE WHEN last_updated <= 0 THEN 0 ELSE GREATEST(0, ? - last_updated) / 60 END AS d
       FROM users WHERE id = ?
     ) s
     WHERE u.id = s.id`,
    [now, now, userId]
  );
}

/* ------------------------------ State ------------------------------ */

export async function getState(userId) {
  const [user] = await q('SELECT gold, energy, max_energy, last_updated FROM users WHERE id = ?', [userId]);

  let plotRows = await q('SELECT * FROM plots WHERE user_id = ? ORDER BY plot_index ASC', [userId]);
  if (plotRows.length === 0) {
    await q("INSERT INTO plots (user_id, plot_index, state) VALUES (?, 0, 'empty') ON CONFLICT DO NOTHING", [userId]);
    plotRows = await q('SELECT * FROM plots WHERE user_id = ? ORDER BY plot_index ASC', [userId]);
  }

  const nowMs = Date.now();
  const plots = plotRows.map((row) => {
    let mutations = { wet: false, shocked: false };
    if (row.mutations) {
      try {
        mutations = { ...mutations, ...JSON.parse(row.mutations) };
      } catch {
        /* pakai default */
      }
    }
    const pest = effectivePest(row, nowMs);
    return {
      id: row.plot_index,
      state: row.state,
      plantTime: Number(row.start_time) || 0,
      growthDuration: row.duration || 0,
      cropType: row.crop_type,
      pestLevel: pest.level,
      targetPest: pest.target,
      watered: !!row.watered,
      mutations,
    };
  });

  const invRows = await q('SELECT id, item_key, penalty FROM inventory WHERE user_id = ? ORDER BY id', [userId]);
  const inventory = invRows.map((row) => ({
    id: row.id,
    key: row.item_key,
    penalty: Number(row.penalty) || 0,
  }));

  return {
    user: { gold: user.gold, energy: user.energy, maxEnergy: user.max_energy, lastUpdated: user.last_updated },
    plots,
    inventory,
    quests: await getQuests(userId),
    serverTime: nowMs,
  };
}
