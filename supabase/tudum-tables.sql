-- ================================================================
-- BANDI · Table Tudum (classement officiel Netflix)
-- Source : https://www.netflix.com/tudum/top10
-- Exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ================================================================

CREATE TABLE IF NOT EXISTS tudum_global_weekly (
  id            BIGSERIAL PRIMARY KEY,
  week_start    DATE        NOT NULL,          -- Lundi de la semaine couverte
  categorie     TEXT        NOT NULL,          -- 'tv_english' | 'tv_non_english' | 'film_english' | 'film_non_english'
  rang          INT         NOT NULL,
  titre         TEXT        NOT NULL,
  saison        TEXT,                          -- ex. "Season 2"
  heures_vues   NUMERIC(12,2),                 -- millions d'heures vues (colonne "Hours Viewed")
  semaines_top10 INT        DEFAULT 0,         -- nb cumulé de semaines dans le top 10
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start, categorie, rang)
);

CREATE INDEX IF NOT EXISTS idx_tudum_week_cat ON tudum_global_weekly(week_start DESC, categorie);
CREATE INDEX IF NOT EXISTS idx_tudum_titre     ON tudum_global_weekly(titre);

-- RLS
ALTER TABLE tudum_global_weekly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tudum" ON tudum_global_weekly FOR SELECT USING (true);

SELECT 'Table Tudum créée ✅' AS status;
