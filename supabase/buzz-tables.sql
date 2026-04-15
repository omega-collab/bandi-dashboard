-- ================================================================
-- BANDI · Tables onglet Buzz
-- Exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ================================================================

-- Table 1 : Articles de presse (Google News, GDELT, presse locale)
CREATE TABLE IF NOT EXISTS buzz_articles (
  id BIGSERIAL PRIMARY KEY,
  guid TEXT UNIQUE NOT NULL,           -- identifiant dédupliqué (URL ou hash)
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,                          -- nom du média (ex. "Le Monde", "France-Antilles")
  source_type TEXT,                     -- "local" | "national" | "international"
  language TEXT DEFAULT 'fr',           -- "fr" | "en" | "es" | "pt"
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  thumbnail TEXT,                       -- URL image OG (optionnel)
  excerpt TEXT,                         -- résumé court
  tone REAL,                            -- score tonalité GDELT (-1 à +1), nullable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2 : Posts sociaux (Reddit, Bluesky, YouTube)
CREATE TABLE IF NOT EXISTS buzz_social (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,               -- "reddit" | "bluesky" | "youtube"
  post_id TEXT NOT NULL,                -- identifiant natif de la plateforme
  title TEXT,
  url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  score INT DEFAULT 0,                  -- upvotes Reddit, likes Bluesky, etc.
  comments INT DEFAULT 0,
  thumbnail TEXT,
  subreddit TEXT,                       -- uniquement Reddit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, post_id)
);

-- Table 3 : Tendances Google Trends
CREATE TABLE IF NOT EXISTS buzz_trends (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  interest_score INT,                   -- 0–100
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les lectures fréquentes
CREATE INDEX IF NOT EXISTS idx_buzz_articles_published ON buzz_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_articles_source_type ON buzz_articles(source_type);
CREATE INDEX IF NOT EXISTS idx_buzz_social_platform ON buzz_social(platform);
CREATE INDEX IF NOT EXISTS idx_buzz_social_published ON buzz_social(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_trends_date ON buzz_trends(date DESC);

-- RLS : lecture publique, écriture service_role uniquement
ALTER TABLE buzz_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzz_social    ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzz_trends    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read buzz_articles" ON buzz_articles FOR SELECT USING (true);
CREATE POLICY "Public read buzz_social"   ON buzz_social   FOR SELECT USING (true);
CREATE POLICY "Public read buzz_trends"   ON buzz_trends   FOR SELECT USING (true);

SELECT 'Tables Buzz créées ✅' AS status;
