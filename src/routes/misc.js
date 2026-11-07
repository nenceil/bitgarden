import multer from 'multer';
import { q } from '../db.js';
import { GameError, escapeHtml, fail, userFromToken } from '../helpers.js';
import { saveAvatar } from '../storage.js';

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/* --------------------------- Leaderboard --------------------------- */

export async function leaderboardHandler(_req, res) {
  try {
    const topGold = await q('SELECT username, gold FROM users ORDER BY gold DESC LIMIT 10');
    const topFish = await q(
      'SELECT username, fish_caught FROM users ORDER BY fish_caught DESC LIMIT 10'
    );
    res.json({ success: true, gold_leaderboard: topGold, fish_leaderboard: topFish });
  } catch (e) {
    console.error('[leaderboard]', e);
    res.json({ success: false, message: 'Server error' });
  }
}

/* ----------------------------- Chat ------------------------------- */

export async function messagesHandler(req, res) {
  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const action = str(input.action);

  try {
    if (!str(input.token) && action !== 'get_messages') fail('Authentication required');

    let user = null;
    if (input.token) {
      user = await userFromToken(str(input.token));
      if (!user && action !== 'get_messages') fail('Invalid Session');
    }

    if (action === 'send_message') {
      if (!user) fail('You must be logged in to chat');
      const message = str(input.message).trim();
      if (!message) fail('Message cannot be empty');
      if (message.length > 200) fail('Message too long (max 200 chars)');

      // Anti-spam: satu pesan per 2 detik per akun (dicek di database, jadi berlaku di serverless juga)
      const recent = await q(
        "SELECT 1 FROM messages WHERE user_id = ? AND created_at > now() - interval '2 seconds' LIMIT 1",
        [user.id]
      );
      if (recent.length > 0) fail('Slow down! You are sending messages too fast.');

      await q('INSERT INTO messages (user_id, message) VALUES (?, ?)', [user.id, message]);
      return res.json({ success: true });
    }

    if (action === 'get_messages') {
      const lastId = Number.parseInt(input.lastId, 10) || 0;
      const rows = await q(
        `SELECT m.id, m.message, to_char(m.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') AS hhmm, u.username
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.id > ?
         ORDER BY m.id DESC LIMIT 50`,
        [lastId]
      );
      const messages = rows
        .map((r) => ({
          id: r.id,
          username: r.username,
          message: escapeHtml(r.message),
          time: r.hhmm,
        }))
        .reverse();
      return res.json({ success: true, messages });
    }

    res.json({ success: false, message: 'Invalid action' });
  } catch (e) {
    if (!(e instanceof GameError)) console.error('[messages]', e);
    res.json({ success: false, message: e instanceof GameError ? e.message : 'Server error' });
  }
}

/* ----------------------------- Avatar ----------------------------- */

const MAX_AVATAR = 2 * 1024 * 1024; // 2 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_AVATAR } });

// Deteksi tipe file dari byte awal (bukan dari header client yang bisa dipalsukan)
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length > 4 && buf.subarray(0, 4).toString('hex') === '89504e47')
    return { ext: 'png', type: 'image/png' };
  if (buf.length > 4 && buf.subarray(0, 4).toString('latin1') === 'GIF8')
    return { ext: 'gif', type: 'image/gif' };
  return null;
}

export function avatarHandler(req, res) {
  upload.single('avatar')(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') fail('File too large (max 2MB)');
        fail('Upload failed');
      }
      if (!str(req.body?.token)) fail('Authentication required');
      const user = await userFromToken(str(req.body?.token));
      if (!user) fail('Invalid Session');
      if (!req.file) fail('No file uploaded');

      const img = sniffImage(req.file.buffer);
      if (!img) fail('Invalid file type (JPG, PNG, GIF only)');

      const fileName = `avatar_${user.id}_${Date.now()}.${img.ext}`;
      const avatarPath = await saveAvatar(fileName, req.file.buffer, img.type);
      await q('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, user.id]);
      res.json({ success: true, avatarPath });
    } catch (e) {
      console.error('[avatar]', e.message);
      res.json({ success: false, message: e instanceof GameError ? e.message : 'Server error' });
    }
  });
}
