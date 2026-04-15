-- ============================================================
-- BANDI · Notes externes (IMDb, Allociné, ...)
-- Alimentées par scripts/scrape-imdb.js + scripts/scrape-allocine.js
-- Utilisées par le Completion Score (signal "Notes critiques")
-- ============================================================

CREATE TABLE IF NOT EXISTS external_ratings (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,                     -- jour du snapshot (UTC)
  source TEXT NOT NULL,                   -- 'imdb' | 'allocine_public' | 'allocine_press'
  rating NUMERIC(4,2),                    -- note normalisée
  rating_max NUMERIC(4,2) DEFAULT 10,     -- échelle native (10 pour IMDb, 5 pour Allociné)
  rating_norm NUMERIC(4,2),               -- note ramenée sur 10 pour comparaison
  votes INT,                              -- nombre total d'avis/votes (si dispo)
  reviews_count INT,                      -- nombre de critiques (Allociné presse)
  url TEXT,                               -- URL source
  raw JSONB,                              -- dump complet (debug / forward-compat)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, source)
);

CREATE INDEX IF NOT EXISTS idx_external_ratings_source_date
  ON external_ratings(source, date DESC);

-- RLS : lecture publique, écriture service_role uniquement
ALTER TABLE external_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read external_ratings" ON external_ratings;
CREATE POLICY "Public read external_ratings" ON external_ratings
  FOR SELECT USING (true);
