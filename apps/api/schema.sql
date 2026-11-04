-- Harumnesia API — schema D1 (SQLite)
-- ponytail: LIKE + index, bukan FTS5. Ganti ke FTS5 kalau /search mulai lambat/ngawur.

CREATE TABLE IF NOT EXISTS perfume (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand           TEXT NOT NULL,
  market          TEXT NOT NULL,      -- 'local' | 'international'
  gender          TEXT NOT NULL,      -- 'men' | 'women' | 'unisex' | 'unknown'
  concentration   TEXT,               -- 'EDP' | 'EDT' | NULL
  price_amount    INTEGER,
  price_currency  TEXT,
  payload_list    TEXT NOT NULL,      -- bentuk runtime (RecommendationPerfume) — dipakai list/search
  payload_detail  TEXT NOT NULL       -- bentuk canonical (Perfume) — dipakai /perfumes/:id
);

CREATE INDEX IF NOT EXISTS idx_perfume_brand  ON perfume(brand);
CREATE INDEX IF NOT EXISTS idx_perfume_name   ON perfume(name);
CREATE INDEX IF NOT EXISTS idx_perfume_market ON perfume(market);
CREATE INDEX IF NOT EXISTS idx_perfume_gender ON perfume(gender);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- BE-03: tabel brand materialized — supaya /brands tidak GROUP BY seluruh tabel tiap request
CREATE TABLE IF NOT EXISTS brand (
  name  TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
