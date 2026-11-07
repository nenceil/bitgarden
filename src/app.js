import express from 'express';
import { backendHandler } from './routes/backend.js';
import { avatarHandler, leaderboardHandler, messagesHandler } from './routes/misc.js';

/** App Express berisi API saja. Dipakai server lokal (server.js) dan Netlify Function. */
export const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const api = express.Router();
api.post('/backend', backendHandler);
api.post('/messages', messagesHandler);
api.post('/upload-avatar', avatarHandler);
api.get('/leaderboard', leaderboardHandler);

// Di-mount di dua prefix: URL asli (/api/...) dan path internal Netlify Functions
app.use('/api', api);
app.use('/.netlify/functions/api', api);

// Body JSON rusak / kebesaran -> balas JSON (bukan halaman HTML) supaya frontend bisa menampilkan pesan
app.use((err, _req, res, _next) => {
  console.error('[app]', err.message);
  res.status(err.status || 400).json({ success: false, message: 'Bad request' });
});
