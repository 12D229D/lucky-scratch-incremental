-- ============================================================================
-- Lucky Scratch Incremental — SQLite Declarative Schema
-- Compatible con SQLite 3.45+ y Cloudflare D1
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_economy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  coins_mantissa REAL NOT NULL DEFAULT 0.0,
  coins_exponent INTEGER NOT NULL DEFAULT 0,
  clovers INTEGER NOT NULL DEFAULT 0,
  golden_shards INTEGER NOT NULL DEFAULT 0,
  lifetime_coins_mantissa REAL NOT NULL DEFAULT 0.0,
  lifetime_coins_exponent INTEGER NOT NULL DEFAULT 0,
  cards_scratched_count INTEGER NOT NULL DEFAULT 0,
  last_save_timestamp INTEGER NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0.0'
);

CREATE TABLE IF NOT EXISTS helpers_purchased (
  helper_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS purchased_upgrades (
  upgrade_id TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  purchased_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prestige_purchased (
  prestige_id TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scratch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  card_rarity TEXT NOT NULL,
  coins_won_mantissa REAL NOT NULL,
  coins_won_exponent INTEGER NOT NULL,
  clovers_won INTEGER NOT NULL,
  is_jackpot INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER NOT NULL
);

-- Índices de optimización de consultas
CREATE INDEX IF NOT EXISTS idx_scratch_history_timestamp ON scratch_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scratch_history_card_id ON scratch_history(card_id);
