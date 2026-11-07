-- Skema Bit Garden untuk Supabase (PostgreSQL)
-- Dijalankan otomatis saat server start, atau bisa ditempel manual di Supabase > SQL Editor.
-- Aman dijalankan berulang kali.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL DEFAULT '',
  gold          INTEGER DEFAULT 25,
  energy        INTEGER DEFAULT 30,
  max_energy    INTEGER DEFAULT 30,
  session_token VARCHAR(64) DEFAULT NULL,
  last_updated  BIGINT DEFAULT 0,
  fish_caught   INTEGER DEFAULT 0,
  avatar        VARCHAR(255) DEFAULT NULL,
  current_title VARCHAR(50) DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS users_session_token_idx ON users (session_token);
-- MySQL membandingkan username/email tanpa peduli huruf besar/kecil; Postgres tidak.
-- Indeks ini mencegah "Budi" dan "budi" jadi dua akun berbeda.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  token      VARCHAR(64) NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets (token);

CREATE TABLE IF NOT EXISTS plots (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER,
  plot_index INTEGER,
  state      VARCHAR(20) DEFAULT 'empty',
  crop_type  VARCHAR(50) DEFAULT NULL,
  pest_level INTEGER DEFAULT 0,
  start_time DOUBLE PRECISION DEFAULT NULL,
  duration   INTEGER DEFAULT NULL,
  mutations  TEXT DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS plots_user_plot_idx ON plots (user_id, plot_index);

CREATE TABLE IF NOT EXISTS inventory (
  id       SERIAL PRIMARY KEY,
  user_id  INTEGER,
  item_key VARCHAR(50),
  weight   DOUBLE PRECISION DEFAULT 0,
  penalty  DOUBLE PRECISION DEFAULT 0
);
CREATE INDEX IF NOT EXISTS inventory_user_idx ON inventory (user_id);

CREATE TABLE IF NOT EXISTS titles (
  id               SERIAL PRIMARY KEY,
  title_name       VARCHAR(50) NOT NULL,
  description      VARCHAR(255),
  requirement_gold INTEGER DEFAULT 0,
  requirement_fish INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_titles (
  user_id  INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS daily_quests (
  id            SERIAL PRIMARY KEY,
  quest_type    VARCHAR(50) NOT NULL,
  target_amount INTEGER NOT NULL,
  reward_gold   INTEGER NOT NULL,
  description   VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_quests (
  user_id          INTEGER NOT NULL,
  quest_id         INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_completed     SMALLINT DEFAULT 0,
  is_claimed       SMALLINT DEFAULT 0,
  last_reset       DATE NOT NULL,
  PRIMARY KEY (user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  message    VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Migrasi v2.1 (aman dijalankan berulang kali, juga untuk database yang sudah ada)
-- ---------------------------------------------------------------------------
-- Hama & penyiraman sekarang disimpan di server
ALTER TABLE plots ADD COLUMN IF NOT EXISTS target_pest INTEGER DEFAULT 0;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS watered SMALLINT DEFAULT 0;
-- Memancing & cuaca dihitung di server
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_fish VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_fish_at BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_weather_tick BIGINT DEFAULT 0;

-- Sesi login (beberapa perangkat sekaligus, kedaluwarsa 30 hari, bisa logout dari server).
-- Kolom users.session_token lama tidak dipakai lagi; pemain cukup login ulang satu kali.
CREATE TABLE IF NOT EXISTS sessions (
  token      VARCHAR(64) PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS inventory_user_item_idx ON inventory (user_id, item_key);
CREATE INDEX IF NOT EXISTS messages_user_created_idx ON messages (user_id, created_at);

-- Data awal (hanya jika tabel masih kosong)
INSERT INTO titles (title_name, description, requirement_gold, requirement_fish)
SELECT * FROM (VALUES
  ('Novice Farmer',    'Starting out on the farm.',      0,      0),
  ('Gold Miner',       'Accumulated 10,000 Gold.',       10000,  0),
  ('Rich Merchant',    'Accumulated 100,000 Gold.',      100000, 0),
  ('Beginner Fisher',  'Caught your first few fish.',    0,      5),
  ('River Master',     'Caught 50 fish.',                0,      50),
  ('Legendary Angler', 'Caught 200 fish.',               0,      200)
) AS v(title_name, description, requirement_gold, requirement_fish)
WHERE NOT EXISTS (SELECT 1 FROM titles);

INSERT INTO daily_quests (quest_type, target_amount, reward_gold, description)
SELECT * FROM (VALUES
  ('plant',       5,  5,  'Plant 5 seeds on your farm.'),
  ('harvest',     10, 15, 'Harvest 10 mature crops.'),
  ('fish',        3,  2,  'Catch 3 fish from the river.'),
  ('search_bait', 5,  3,  'Search for bait in the thicket 5 times.')
) AS v(quest_type, target_amount, reward_gold, description)
WHERE NOT EXISTS (SELECT 1 FROM daily_quests);

-- KEAMANAN: aktifkan RLS tanpa policy. Server Node.js terhubung langsung sebagai
-- role postgres (bypass RLS), sedangkan akses lewat REST API Supabase (anon key)
-- jadi ditolak, sehingga hash password tidak bisa dibaca dari luar.
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
