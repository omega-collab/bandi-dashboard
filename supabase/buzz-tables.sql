-- ================================================================
-- BANDI · Tables onglet Buzz (schéma vérité + migrations)
-- Exécuter dans l'éditeur SQL Supabase. Idempotent.
-- ================================================================

-- Table 1 : Articles de presse (Google News, presse locale, GDELT, spécialisés)
CREATE TABLE IF NOT EXISTS buzz_articles (
  id            BIGSERIAL PRIMARY KEY,
  url           TEXT NOT NULL,                 -- clé de déduplication
  title         TEXT NOT NULL,
  description   TEXT,                          -- résumé court (max 500)
  source_name   TEXT,                          -- ex. "Le Monde", "France-Antilles Martinique"
  source_type   TEXT,                          -- "local" | "national" | "international"
  language      TEXT DEFAULT 'fr',             -- "fr" | "en" | "es" | "pt"
  country_code  TEXT,                          -- ISO 3166-1 alpha-2
  published_at  TIMESTAMPTZ,
  image_url     TEXT,
  tone          REAL,                          -- score tonalité GDELT (-1 à +1)
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations idempotentes (si la table existait avec l'ancien schéma)
DO $$ BEGIN
  BEGIN ALTER TABLE buzz_articles RENAME COLUMN source TO source_name;    EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_articles RENAME COLUMN excerpt TO description;   EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_articles RENAME COLUMN thumbnail TO image_url;   EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
END $$;

ALTER TABLE buzz_articles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE buzz_articles ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE buzz_articles ADD COLUMN IF NOT EXISTS source_name  TEXT;
ALTER TABLE buzz_articles ADD COLUMN IF NOT EXISTS image_url    TEXT;

-- Contrainte d'unicité sur url (le scraper fait onConflict:'url')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buzz_articles_url_unique'
  ) THEN
    ALTER TABLE buzz_articles ADD CONSTRAINT buzz_articles_url_unique UNIQUE (url);
  END IF;
END $$;

-- Colonne guid legacy : la garder nullable pour compat mais ne plus s'en servir
ALTER TABLE buzz_articles ALTER COLUMN guid DROP NOT NULL;

-- Table 2 : Posts sociaux (Reddit, Bluesky, YouTube)
CREATE TABLE IF NOT EXISTS buzz_social (
  id                BIGSERIAL PRIMARY KEY,
  platform          TEXT NOT NULL,              -- "reddit" | "bluesky" | "youtube"
  post_id           TEXT NOT NULL,              -- id natif
  url               TEXT,
  author_name       TEXT,
  content           TEXT,                       -- texte + description (600 chars max)
  engagement_score  INT DEFAULT 0,              -- upvotes Reddit / vues YouTube / likes+reposts Bluesky
  comment_count     INT DEFAULT 0,
  published_at      TIMESTAMPTZ,
  thumbnail_url     TEXT,
  subreddit         TEXT,                       -- Reddit uniquement
  fetched_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, post_id)
);

DO $$ BEGIN
  BEGIN ALTER TABLE buzz_social RENAME COLUMN author TO author_name;          EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_social RENAME COLUMN title TO content;               EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_social RENAME COLUMN score TO engagement_score;     EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_social RENAME COLUMN thumbnail TO thumbnail_url;    EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE buzz_social RENAME COLUMN comments TO comment_count;    EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_column THEN NULL; END;
END $$;

ALTER TABLE buzz_social ADD COLUMN IF NOT EXISTS author_name      TEXT;
ALTER TABLE buzz_social ADD COLUMN IF NOT EXISTS content          TEXT;
ALTER TABLE buzz_social ADD COLUMN IF NOT EXISTS engagement_score INT DEFAULT 0;
ALTER TABLE buzz_social ADD COLUMN IF NOT EXISTS comment_count    INT DEFAULT 0;
ALTER TABLE buzz_social ADD COLUMN IF NOT EXISTS thumbnail_url    TEXT;

-- Table 3 : Tendances Google Trends
CREATE TABLE IF NOT EXISTS buzz_trends (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  interest_score  INT,                          -- 0–100
  fetched_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les lectures fréquentes
CREATE INDEX IF NOT EXISTS idx_buzz_articles_published   ON buzz_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_articles_source_type ON buzz_articles(source_type);
CREATE INDEX IF NOT EXISTS idx_buzz_social_platform      ON buzz_social(platform);
CREATE INDEX IF NOT EXISTS idx_buzz_social_published     ON buzz_social(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_trends_date          ON buzz_trends(date DESC);

-- RLS : lecture publique, écriture service_role uniquement
ALTER TABLE buzz_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzz_social   ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzz_trends   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read buzz_articles" ON buzz_articles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public read buzz_social"   ON buzz_social   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public read buzz_trends"   ON buzz_trends   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

SELECT 'Tables Buzz alignées ✅' AS status;
