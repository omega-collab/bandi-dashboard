-- ============================================================
-- BANDI · Notes externes multi-sources
-- Alimentées par les scripts scripts/scrape-*.js (8 sources au total)
-- Utilisées par le Completion Score (signal "Notes critiques")
--
-- Sources supportées (colonne source) :
--   'imdb'              → IMDb aggregateRating   (échelle /10)
--   'tmdb'              → TMDB vote_average      (échelle /10)
--   'allocine_public'   → Allociné Spectateurs   (échelle /5)
--   'allocine_press'    → Allociné Presse        (échelle /5)
--   'senscritique'      → SensCritique           (échelle /10)
--   'rt_critics'        → Rotten Tomatoes Tomatometer (échelle /100)
--   'rt_audience'       → Rotten Tomatoes Audience    (échelle /100)
--   'filmaffinity'      → Filmaffinity communauté ES  (échelle /10)
--
-- Toutes les notes sont également stockées normalisées sur /10 (rating_norm)
-- pour permettre une comparaison directe côté frontend.
-- ============================================================

CREATE TABLE IF NOT EXISTS external_ratings (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,                     -- jour du snapshot (UTC)
  source TEXT NOT NULL,                   -- voir liste des sources ci-dessus
  rating NUMERIC(5,2),                    -- note brute (échelle native)
  rating_max NUMERIC(5,2) DEFAULT 10,     -- échelle native (5, 10 ou 100)
  rating_norm NUMERIC(4,2),               -- note ramenée sur /10 pour comparaison
  votes INT,                              -- nombre total d'avis/votes (si dispo)
  reviews_count INT,                      -- nombre de critiques (Allociné presse, RT)
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

-- ============================================================
-- BANDI · Wikipedia pageviews (signal d'intérêt encyclopédique)
-- Alimentée par scripts/scrape-wikipedia.js (API officielle Wikimedia)
-- Utilisée par le Completion Score (composant "Recherche" élargi)
-- ============================================================

CREATE TABLE IF NOT EXISTS wikipedia_pageviews (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,                     -- jour des pageviews
  project TEXT NOT NULL DEFAULT 'fr.wikipedia',  -- 'fr.wikipedia', 'en.wikipedia', ...
  article TEXT NOT NULL,                  -- titre avec underscores (ex: 'Bandi_(2026)')
  views INT NOT NULL DEFAULT 0,           -- nombre de vues ce jour-là
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, project, article)
);

CREATE INDEX IF NOT EXISTS idx_wikipedia_pageviews_date
  ON wikipedia_pageviews(date DESC);
CREATE INDEX IF NOT EXISTS idx_wikipedia_pageviews_project_article
  ON wikipedia_pageviews(project, article, date DESC);

ALTER TABLE wikipedia_pageviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read wikipedia_pageviews" ON wikipedia_pageviews;
CREATE POLICY "Public read wikipedia_pageviews" ON wikipedia_pageviews
  FOR SELECT USING (true);
