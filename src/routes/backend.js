import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { q, tx } from '../db.js';
import * as G from '../gamedata.js';
import {
  GameError,
  createSession,
  destroySession,
  destroyUserSessions,
  fail,
  getQuests,
  getState,
  nowSec,
  rateLimit,
  syncEnergy,
  todayJakarta,
  updateQuestProgress,
  userFromToken,
} from '../helpers.js';

// Dibatasi ke rentang INTEGER Postgres supaya angka raksasa dari client tidak memicu error database
const int = (v) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-2147483648, Math.min(2147483647, n));
};
const qty = (v) => Math.max(1, Math.min(99, int(v) || 1));
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const MAX_INT = 2147483647;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function passwordProblem(p) {
  if (p.length < 6) return 'Password too short (min 6 characters)!';
  if (Buffer.byteLength(p) > 72) return 'Password too long (max 72 bytes)!';
  return null;
}

/* ------------------------------------------------------------------ */
/* Aksi publik (tanpa token)                                          */
/* ------------------------------------------------------------------ */

async function register({ input, req }) {
  const username = str(input.username);
  const email = str(input.email).trim();
  const password = str(input.password);

  if (!username || !email || !password) return { success: false, message: 'All fields are required!' };
  if (username.length > 8) return { success: false, message: 'Username too long (max 8 characters)!' };
  if (!/^[A-Za-z0-9]+$/.test(username))
    return { success: false, message: 'Username can only contain letters and numbers!' };
  if (email.length > 100 || !EMAIL_RE.test(email)) return { success: false, message: 'Invalid email address!' };
  const pwProblem = passwordProblem(password);
  if (pwProblem) return { success: false, message: pwProblem };
  if (!rateLimit(`register:${req.ip}`, 10, 3600_000))
    return { success: false, message: 'Too many sign-ups from your network. Try again later.' };

  const taken = await q('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)', [
    username,
    email,
  ]);
  if (taken.length > 0) return { success: false, message: 'Username or Email already taken!' };

  const hash = await bcrypt.hash(password, 10);
  try {
    await tx(async (t) => {
      const rows = await t(
        `INSERT INTO users (username, email, password, gold, energy, max_energy, last_updated)
         VALUES (?, ?, ?, 25, 30, 30, ?) RETURNING id`,
        [username, email, hash, nowSec()]
      );
      const id = rows[0].id;
      await t("INSERT INTO plots (user_id, plot_index, state) VALUES (?, 0, 'empty')", [id]);
      await t("INSERT INTO inventory (user_id, item_key) SELECT ?::int, 'seeds_wheat' FROM generate_series(1, 3)", [id]);
    });
  } catch (e) {
    if (e.code === '23505') return { success: false, message: 'Username or Email already taken!' };
    throw e;
  }
  return { success: true, message: 'Account created! Please login.' };
}

async function login({ input, req }) {
  const username = str(input.username);
  const password = str(input.password);
  if (!rateLimit(`login:${req.ip}`, 30, 300_000) || !rateLimit(`loginu:${req.ip}:${username.toLowerCase()}`, 10, 300_000))
    return { success: false, message: 'Too many login attempts. Please wait a few minutes.' };

  const rows = await q('SELECT * FROM users WHERE lower(username) = lower(?)', [username]);
  // Pesan sama untuk user tidak ada / password salah, supaya username tidak bisa ditebak
  const bad = { success: false, message: 'Invalid username or password' };
  if (rows.length === 0) return bad;

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return bad;

  const token = await createSession(user.id);
  return { success: true, message: 'Login successful', token, username: user.username };
}

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function forgotPassword({ input, req }) {
  const email = str(input.email).trim();
  // Balasan selalu sama, supaya orang luar tidak bisa mengecek email mana yang terdaftar
  const generic = { success: true, message: 'If that email is registered, reset instructions have been sent.' };
  if (!rateLimit(`forgot:${req.ip}`, 5, 3600_000) || !rateLimit(`forgote:${req.ip}:${email.toLowerCase()}`, 3, 3600_000))
    return { success: false, message: 'Too many requests. Please try again later.' };

  const rows = await q('SELECT id FROM users WHERE lower(email) = lower(?)', [email]);
  if (rows.length === 0) return generic;

  const userId = rows[0].id;
  const token = crypto.randomBytes(16).toString('hex');
  const expiry = nowSec() + 3600; // 1 jam

  await q('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  await q('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiry]);

  const base = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const resetLink = `${base}/index.html?reset_token=${token}`;

  try {
    await mailer().sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Bit Garden'}" <${process.env.SMTP_FROM || 'noreply@bitgarden.game'}>`,
      to: email,
      subject: 'Password Reset - Bit Garden',
      html:
        'Hello,<br><br>You requested a password reset for your Bit Garden account.<br><br>' +
        'Click the link below to set a new password:<br>' +
        `<a href="${resetLink}">${resetLink}</a><br><br>` +
        'If you did not request this, please ignore this email.<br>' +
        'This link will expire in 1 hour.',
    });
  } catch (e) {
    // Dicatat di log server saja (jangan bocorkan ke pemain)
    console.error('[mail]', e.message, '- cek SMTP_USER / SMTP_PASS');
  }
  return generic;
}

async function resetPassword({ input, req }) {
  const token = str(input.token);
  const password = str(input.password);
  if (!password) return { success: false, message: 'Password required' };
  const pwProblem = passwordProblem(password);
  if (pwProblem) return { success: false, message: pwProblem };
  if (!rateLimit(`reset:${req.ip}`, 20, 3600_000)) return { success: false, message: 'Too many attempts.' };

  const rows = await q('SELECT user_id FROM password_resets WHERE token = ? AND expires_at > ?', [token, nowSec()]);
  if (rows.length === 0) return { success: false, message: 'Invalid or expired token' };

  const userId = rows[0].user_id;
  const hash = await bcrypt.hash(password, 10);
  await q('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
  await q('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  await destroyUserSessions(userId); // semua perangkat harus login ulang
  return { success: true, message: 'Password updated! Please login.' };
}

const PUBLIC_ACTIONS = {
  register,
  login,
  forgot_password: forgotPassword,
  reset_password: resetPassword,
};

/* ------------------------------------------------------------------ */
/* Helper transaksi                                                   */
/* ------------------------------------------------------------------ */

/** Kunci baris user supaya aksi yang bersamaan dari satu akun dieksekusi bergantian. */
async function lockUser(t, userId) {
  const [u] = await t('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
  if (!u) fail('Invalid Session');
  return u;
}

async function spendGold(t, userId, amount) {
  if (amount <= 0) return;
  const r = await t('UPDATE users SET gold = gold - ? WHERE id = ? AND gold >= ?', [amount, userId, amount]);
  if (r.rowCount === 0) fail('Not enough gold!');
}

const addGold = (t, userId, amount) =>
  t('UPDATE users SET gold = LEAST(gold + ?::bigint, ?::bigint) WHERE id = ?', [amount, MAX_INT, userId]);

async function spendEnergy(t, userId, amount) {
  const r = await t('UPDATE users SET energy = energy - ? WHERE id = ? AND energy >= ?', [amount, userId, amount]);
  if (r.rowCount === 0) fail(`Need ${amount} Energy!`);
}

async function insertItems(t, userId, key, count, penalty = 0) {
  return t(
    `INSERT INTO inventory (user_id, item_key, penalty)
     SELECT ?::int, ?::text, ?::float8 FROM generate_series(1, ?::int) RETURNING id`,
    [userId, key, penalty, count]
  );
}

async function getPlot(t, userId, idx) {
  const [plot] = await t('SELECT * FROM plots WHERE user_id = ? AND plot_index = ? FOR UPDATE', [userId, idx]);
  if (!plot) fail('Plot not found');
  return plot;
}

const parseMutations = (raw) => {
  const base = { wet: false, shocked: false };
  if (!raw) return base;
  try {
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
};

/* ------------------------------------------------------------------ */
/* Aksi yang butuh login                                              */
/* ------------------------------------------------------------------ */

const AUTH_ACTIONS = {
  async init({ userId }) {
    return { success: true, data: await getState(userId) };
  },

  async logout({ input }) {
    await destroySession(str(input.token));
    return { success: true };
  },

  async plant({ input, userId }) {
    const type = str(input.cropType);
    const crop = G.CROPS[type];
    if (!crop) fail('Unknown crop');
    const idx = int(input.plotIndex);

    const out = await tx(async (t) => {
      await lockUser(t, userId);
      const plot = await getPlot(t, userId, idx);
      if (plot.state !== 'empty') fail('Plot is not empty');

      const seed = await t(
        `DELETE FROM inventory WHERE id = (
           SELECT id FROM inventory WHERE user_id = ? AND item_key = ? ORDER BY id ASC LIMIT 1
         ) RETURNING id`,
        [userId, crop.seed]
      );
      if (seed.length === 0) fail('No seeds!');
      await spendEnergy(t, userId, 1);

      const start = Date.now();
      const target = G.rollPest();
      await t(
        `UPDATE plots SET state = 'growing', crop_type = ?, start_time = ?, duration = ?,
                pest_level = 0, target_pest = ?, watered = 0, mutations = NULL
         WHERE user_id = ? AND plot_index = ?`,
        [type, start, crop.duration, target, userId, idx]
      );
      return {
        seedId: seed[0].id,
        plot: {
          id: idx,
          state: 'growing',
          plantTime: start,
          growthDuration: crop.duration,
          cropType: type,
          pestLevel: 0,
          targetPest: target,
          watered: false,
          mutations: { wet: false, shocked: false },
        },
      };
    });
    await updateQuestProgress(userId, 'plant');
    return { success: true, ...out, quests: await getQuests(userId) };
  },

  async harvest({ input, userId }) {
    const idx = int(input.plotIndex);
    const nowMs = Date.now();

    const out = await tx(async (t) => {
      await lockUser(t, userId);
      const plot = await getPlot(t, userId, idx);
      if (plot.state !== 'growing' || !G.CROPS[plot.crop_type]) fail('Nothing to harvest');

      const elapsed = nowMs - (Number(plot.start_time) || 0);
      if (elapsed < (plot.duration || 0) - 1000) fail('Crop is not ready yet');

      await spendEnergy(t, userId, 1);

      const mut = parseMutations(plot.mutations);
      const pest = G.effectivePest(plot, nowMs);
      const penalty = G.PEST_PENALTY[pest.level] || 0;
      const key = G.resultKey(plot.crop_type, mut.wet, mut.shocked);
      const [item] = await insertItems(t, userId, key, 1, penalty);

      await t(
        `UPDATE plots SET state = 'empty', crop_type = NULL, pest_level = 0, target_pest = 0, watered = 0,
                start_time = 0, duration = 0, mutations = NULL
         WHERE user_id = ? AND plot_index = ?`,
        [userId, idx]
      );
      return { item: { id: item.id, key, penalty }, mutated: mut.wet || mut.shocked };
    });
    await updateQuestProgress(userId, 'harvest');
    return { success: true, ...out, quests: await getQuests(userId) };
  },

  async water({ input, userId }) {
    const idx = int(input.plotIndex);
    const out = await tx(async (t) => {
      await lockUser(t, userId);
      const plot = await getPlot(t, userId, idx);
      if (plot.state !== 'growing') fail('Nothing is growing here');
      if (plot.watered) fail('Already watered!');
      const can = await t("SELECT id FROM inventory WHERE user_id = ? AND item_key = 'tool_watering_can' LIMIT 1", [
        userId,
      ]);
      if (can.length === 0) fail('Buy a Watering Can!');
      const newStart = (Number(plot.start_time) || 0) - 60000; // percepat 1 menit
      await t('UPDATE plots SET start_time = ?, watered = 1 WHERE user_id = ? AND plot_index = ?', [
        newStart,
        userId,
        idx,
      ]);
      return { plantTime: newStart };
    });
    return { success: true, ...out };
  },

  async use_spray({ input, userId }) {
    const idx = int(input.plotIndex);
    const sprayId = await tx(async (t) => {
      await lockUser(t, userId);
      const plot = await getPlot(t, userId, idx);
      if (plot.state !== 'growing') fail('Nothing is growing here');
      if (G.effectivePest(plot, Date.now()).level === 0) fail('No pests here');
      const spray = await t(
        `DELETE FROM inventory WHERE id = (
           SELECT id FROM inventory WHERE user_id = ? AND item_key = 'item_pesticide' ORDER BY id ASC LIMIT 1
         ) RETURNING id`,
        [userId]
      );
      if (spray.length === 0) fail('Need Bug Spray!');
      await t('UPDATE plots SET pest_level = 0, target_pest = 0 WHERE user_id = ? AND plot_index = ?', [userId, idx]);
      return spray[0].id;
    });
    return { success: true, sprayId };
  },

  async destroy_plot({ input, userId }) {
    await q(
      `UPDATE plots SET state = 'empty', crop_type = NULL, pest_level = 0, target_pest = 0, watered = 0,
              start_time = 0, duration = 0, mutations = NULL
       WHERE user_id = ? AND plot_index = ?`,
      [userId, int(input.plotIndex)]
    );
    return { success: true };
  },

  async weather_tick({ userId }) {
    const nowMs = Date.now();
    const weather = G.weatherAt(nowMs);
    if (weather === 'clear') return { success: true, weather, changes: [] };

    // Maksimal 1 tick per ~10 detik per akun (atomik, tahan spam)
    const claim = await q(
      'UPDATE users SET last_weather_tick = ? WHERE id = ? AND last_weather_tick <= ? RETURNING id',
      [nowMs, userId, nowMs - 9000]
    );
    if (claim.length === 0) return { success: true, weather, changes: [] };

    const plots = await q("SELECT plot_index, mutations FROM plots WHERE user_id = ? AND state = 'growing'", [userId]);
    const changes = [];
    for (const p of plots) {
      const mut = parseMutations(p.mutations);
      const added = [];
      if (!mut.wet && Math.random() < 0.2) {
        mut.wet = true;
        added.push('wet');
      }
      if (!mut.shocked && weather === 'thunder' && Math.random() < 0.15) {
        mut.shocked = true;
        added.push('shocked');
      }
      if (added.length > 0) {
        await q('UPDATE plots SET mutations = ? WHERE user_id = ? AND plot_index = ?', [
          JSON.stringify(mut),
          userId,
          p.plot_index,
        ]);
        changes.push({ plotIndex: p.plot_index, mutations: mut, added });
      }
    }
    return { success: true, weather, changes };
  },

  async buy_item({ input, userId }) {
    const key = str(input.itemKey);
    const price = G.SHOP_PRICES[key];
    if (price === undefined) fail('This item is not for sale');
    const isTool = key.startsWith('tool_');
    const n = isTool ? 1 : qty(input.qty);

    const rows = await tx(async (t) => {
      await lockUser(t, userId);
      if (isTool) {
        const owned = await t('SELECT id FROM inventory WHERE user_id = ? AND item_key = ? LIMIT 1', [userId, key]);
        if (owned.length > 0) fail('Already owned!');
      }
      await spendGold(t, userId, price * n);
      return insertItems(t, userId, key, n);
    });
    return { success: true, items: rows.map((r) => ({ id: r.id, key })) };
  },

  async upgrade_energy({ input, userId }) {
    const n = qty(input.qty);
    await tx(async (t) => {
      await lockUser(t, userId);
      await spendGold(t, userId, G.ENERGY_UPGRADE_PRICE * n);
      await t('UPDATE users SET max_energy = max_energy + ?, energy = energy + ? WHERE id = ?', [n, n, userId]);
    });
    const [user] = await q('SELECT max_energy FROM users WHERE id = ?', [userId]);
    return { success: true, new_max_energy: user.max_energy, message: 'Max Energy increased!' };
  },

  async sell_item({ input, userId }) {
    const id = int(input.itemId);
    const out = await tx(async (t) => {
      await lockUser(t, userId);
      const rows = await t('DELETE FROM inventory WHERE id = ? AND user_id = ? RETURNING id, item_key, penalty', [
        id,
        userId,
      ]);
      if (rows.length === 0) fail('Item not found');
      const value = G.sellValue(rows[0].item_key, rows[0].penalty);
      if (value === null) fail('This item cannot be sold'); // batalkan penghapusan
      await addGold(t, userId, value);
      return { value };
    });
    return { success: true, ...out };
  },

  async sell_all({ input, userId }) {
    const ids = Array.isArray(input.itemIds) ? [...new Set(input.itemIds.map(int))].filter((n) => n > 0) : [];
    if (ids.length === 0) fail('Nothing to sell');
    if (ids.length > 2000) fail('Too many items at once');
    const out = await tx(async (t) => {
      await lockUser(t, userId);
      const rows = await t(
        'DELETE FROM inventory WHERE id = ANY(?::int[]) AND user_id = ? RETURNING id, item_key, penalty',
        [ids, userId]
      );
      if (rows.length === 0) fail('Items not found');
      let total = 0;
      for (const r of rows) {
        const v = G.sellValue(r.item_key, r.penalty);
        if (v === null) fail('Some items cannot be sold');
        total += v;
      }
      await addGold(t, userId, total);
      return { sold: rows.map((r) => r.id), total };
    });
    return { success: true, ...out };
  },

  async buy_land({ userId }) {
    const plot = await tx(async (t) => {
      await lockUser(t, userId);
      const [{ n, next_idx: next }] = await t(
        'SELECT COUNT(*)::int AS n, COALESCE(MAX(plot_index) + 1, 0)::int AS next_idx FROM plots WHERE user_id = ?',
        [userId]
      );
      if (n >= G.MAX_PLOTS) fail('You already own the maximum number of plots!');
      await spendGold(t, userId, G.landCost(n));
      await t("INSERT INTO plots (user_id, plot_index, state) VALUES (?, ?, 'empty')", [userId, next]);
      return { id: next, state: 'empty', plantTime: 0, growthDuration: 0, cropType: null, pestLevel: 0, targetPest: 0, watered: false, mutations: { wet: false, shocked: false } };
    });
    return { success: true, plot };
  },

  async search_bait({ userId }) {
    const out = await tx(async (t) => {
      await lockUser(t, userId);
      await spendEnergy(t, userId, 1);
      const key = G.rollBait();
      if (!key) return { found: null, item: null };
      const [row] = await insertItems(t, userId, key, 1);
      return { found: key, item: { id: row.id, key, penalty: 0 } };
    });
    if (out.found) await updateQuestProgress(userId, 'search_bait');
    return { success: true, ...out, quests: await getQuests(userId) };
  },

  async cast_rod({ input, userId }) {
    const baitId = int(input.baitId);
    return {
      success: true,
      ...(await tx(async (t) => {
        await lockUser(t, userId);
        const rods = await t('SELECT item_key FROM inventory WHERE user_id = ? AND item_key = ANY(?::text[])', [
          userId,
          Object.keys(G.ROD_CAPACITY),
        ]);
        if (rods.length === 0) fail('Need a Rod (Check Shop)!');
        const capacity = Math.max(...rods.map((r) => G.ROD_CAPACITY[r.item_key]));

        await spendEnergy(t, userId, 2);

        let bonus = 0;
        let baitUsed = null;
        if (baitId > 0) {
          const bait = await t(
            'DELETE FROM inventory WHERE id = ? AND user_id = ? AND item_key = ANY(?::text[]) RETURNING id, item_key',
            [baitId, userId, Object.keys(G.BAIT_BONUS)]
          );
          if (bait.length === 0) fail('Bait not found');
          bonus = G.BAIT_BONUS[bait[0].item_key];
          baitUsed = bait[0].id;
        }

        const fish = G.rollFish(bonus, capacity);
        await t('UPDATE users SET pending_fish = ?, pending_fish_at = ? WHERE id = ?', [
          fish.snapped ? null : fish.key,
          Date.now(),
          userId,
        ]);
        return { fishKey: fish.key, snapped: fish.snapped, difficulty: G.FISH[fish.key].difficulty, baitUsed };
      })),
    };
  },

  async resolve_fish({ input, userId }) {
    const choice = str(input.choice) === 'sell' ? 'sell' : 'keep';
    const out = await tx(async (t) => {
      const user = await lockUser(t, userId);
      if (!user.pending_fish) fail('No fish on the line');
      if (Date.now() - (Number(user.pending_fish_at) || 0) < 3500) fail('That was too fast!');
      const key = user.pending_fish;

      await t('UPDATE users SET pending_fish = NULL, fish_caught = fish_caught + 1 WHERE id = ?', [userId]);
      if (choice === 'sell') {
        const value = G.sellValue(key, 0);
        await addGold(t, userId, value);
        return { fishKey: key, choice, value };
      }
      const [row] = await insertItems(t, userId, key, 1);
      return { fishKey: key, choice, item: { id: row.id, key, penalty: 0 } };
    });
    await updateQuestProgress(userId, 'fish');
    return { success: true, ...out, quests: await getQuests(userId) };
  },

  async get_profile({ input, userId }) {
    const cols = 'username, gold, energy, max_energy, fish_caught, avatar, current_title';
    let rows;
    if (int(input.userId)) rows = await q(`SELECT ${cols} FROM users WHERE id = ?`, [int(input.userId)]);
    else if (str(input.username))
      rows = await q(`SELECT ${cols} FROM users WHERE lower(username) = lower(?)`, [str(input.username)]);
    else rows = await q(`SELECT ${cols} FROM users WHERE id = ?`, [userId]);

    if (rows.length === 0) fail('User not found');
    return { success: true, profile: rows[0] };
  },

  async get_titles({ userId }) {
    const [user] = await q('SELECT gold, fish_caught FROM users WHERE id = ?', [userId]);
    // Auto-unlock title yang syaratnya sudah terpenuhi
    await q(
      `INSERT INTO user_titles (user_id, title_id)
       SELECT ?::int, id FROM titles WHERE requirement_gold <= ? AND requirement_fish <= ?
       ON CONFLICT DO NOTHING`,
      [userId, user.gold, user.fish_caught]
    );
    const rows = await q(
      `SELECT t.*, (ut.user_id IS NOT NULL) AS owned
       FROM titles t
       LEFT JOIN user_titles ut ON t.id = ut.title_id AND ut.user_id = ?
       ORDER BY t.id`,
      [userId]
    );
    return {
      success: true,
      titles: rows.map((r) => ({
        id: r.id,
        name: r.title_name,
        desc: r.description,
        owned: !!r.owned,
        req_gold: r.requirement_gold,
        req_fish: r.requirement_fish,
      })),
    };
  },

  async equip_title({ input, userId }) {
    const titleName = str(input.titleName);
    if (titleName !== '') {
      const owned = await q(
        `SELECT t.id FROM titles t
         JOIN user_titles ut ON t.id = ut.title_id
         WHERE ut.user_id = ? AND t.title_name = ?`,
        [userId, titleName]
      );
      if (owned.length === 0) fail('Title not owned');
    }
    await q('UPDATE users SET current_title = ? WHERE id = ?', [titleName === '' ? null : titleName, userId]);
    return { success: true };
  },

  async claim_quest({ input, userId }) {
    const qid = int(input.questId);
    const reward = await tx(async (t) => {
      await lockUser(t, userId);
      // Atomik + hanya quest hari ini yang selesai & belum diklaim
      const claim = await t(
        `UPDATE user_quests SET is_claimed = 1
         WHERE user_id = ? AND quest_id = ? AND is_completed = 1 AND is_claimed = 0 AND last_reset = ?::date
         RETURNING quest_id`,
        [userId, qid, todayJakarta()]
      );
      if (claim.length === 0) fail('Quest not ready to claim');
      const [quest] = await t('SELECT reward_gold FROM daily_quests WHERE id = ?', [qid]);
      await addGold(t, userId, quest.reward_gold);
      return quest.reward_gold;
    });
    return { success: true, reward, quests: await getQuests(userId) };
  },
};

/* ------------------------------------------------------------------ */
/* Handler Express                                                    */
/* ------------------------------------------------------------------ */

export async function backendHandler(req, res) {
  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const action = str(input.action);
  let response = { success: false, message: 'Invalid action' };
  let userId = null;

  try {
    if (Object.hasOwn(PUBLIC_ACTIONS, action)) {
      response = await PUBLIC_ACTIONS[action]({ input, req });
    } else if (action) {
      const token = str(input.token);
      if (!token) fail('Not logged in');
      const user = await userFromToken(token);
      if (!user) fail('Invalid Session');
      userId = user.id;

      if (Object.hasOwn(AUTH_ACTIONS, action)) {
        // Regenerasi energi dihitung di server sebelum aksi apa pun dijalankan
        if (action !== 'logout') await syncEnergy(userId);
        response = await AUTH_ACTIONS[action]({ input, userId, req });
      }
    }
  } catch (e) {
    if (!(e instanceof GameError)) console.error('[backend]', e);
    response = { success: false, message: e instanceof GameError ? e.message : 'Server error' };
  }

  // Setiap balasan aksi login membawa angka terbaru (gold/energi), jadi client selalu sinkron
  if (userId && action !== 'init' && action !== 'logout') {
    try {
      const [u] = await q('SELECT gold, energy, max_energy, last_updated FROM users WHERE id = ?', [userId]);
      if (u) response.user = { gold: u.gold, energy: u.energy, maxEnergy: u.max_energy, lastUpdated: u.last_updated };
    } catch {
      /* abaikan */
    }
  }
  if (userId) response.serverTime = Date.now();

  res.json(response);
}
