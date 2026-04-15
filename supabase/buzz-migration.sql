-- ================================================================
-- BANDI · Migration tables Buzz
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase
--
-- Contexte : les colonnes DB (buzz-tables.sql) ne correspondent pas
-- aux colonnes attendues par scrape-press.js, scrape-social.js et app.js
-- Cette migration les aligne.
-- ================================================================

-- ────────────────────────────────────────────
-- buzz_articles
-- ────────────────────────────────────────────

-- 1. Rendre guid nullable (le scraper ne génère pas de guid)
ALTER TABLE buzz_articles ALTER COLUMN guid DROP NOT NULL;

-- 2. Renommer les colonnes pour correspondre aux scrapers + app.js
ALTER TABLE buzz_articles RENAME COLUMN source    TO source_name;
ALTER TABLE buzz_articles RENAME COLUMN thumbnail TO image_url;
ALTER TABLE buzz_articles RENAME COLUMN excerpt   TO description;

-- 3. Ajouter contrainte UNIQUE sur url (onConflict: 'url' dans le scraper)
ALTER TABLE buzz_articles ADD CONSTRAINT buzz_articles_url_key UNIQUE (url);

-- 4. Ajouter colonne country_code (insérée par scrape-press.js)
ALTER TABLE buzz_articles ADD COLUMN IF NOT EXISTS country_code TEXT;

-- ────────────────────────────────────────────
-- buzz_social
-- ────────────────────────────────────────────

-- 5. Renommer les colonnes
ALTER TABLE buzz_social RENAME COLUMN author    TO author_name;
ALTER TABLE buzz_social RENAME COLUMN title     TO content;
ALTER TABLE buzz_social RENAME COLUMN score     TO engagement_score;
ALTER TABLE buzz_social RENAME COLUMN thumbnail TO thumbnail_url;

-- ────────────────────────────────────────────
-- Vérification
-- ────────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('buzz_articles', 'buzz_social')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
