PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge TEXT NOT NULL DEFAULT 'ANGEBOT',
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  button_label TEXT NOT NULL DEFAULT '',
  button_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  image_key TEXT,
  image_alt TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  identity_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until TEXT
);

CREATE INDEX IF NOT EXISTS idx_promotions_public ON promotions(active, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_products_public ON shop_products(active, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions(expires_at);
