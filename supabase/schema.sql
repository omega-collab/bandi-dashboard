-- ========================================
-- BANDI DASHBOARD · SCHÉMA SUPABASE
-- À exécuter dans l'éditeur SQL de Supabase
-- ========================================

-- Table 1 : snapshots quotidiens (1 ligne par jour)
CREATE TABLE IF NOT EXISTS bandi_snapshots (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  score_monde INT,
  rang_monde INT,
  pays_n1 INT DEFAULT 0,
  pays_top10 INT DEFAULT 0,
  rang_moyen NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2 : positions par pays par jour
CREATE TABLE IF NOT EXISTS bandi_country_rankings (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  pays TEXT NOT NULL,
  code_pays TEXT,
  rang INT NOT NULL,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, pays)
);

-- Table 3 : Top 10 TV Shows monde (pour comparaison concurrents)
CREATE TABLE IF NOT EXISTS netflix_tv_top10_world (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  rang INT NOT NULL,
  titre TEXT NOT NULL,
  score INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, rang)
);

-- Index pour les lectures fréquentes
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON bandi_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_country_date ON bandi_country_rankings(date DESC);
CREATE INDEX IF NOT EXISTS idx_top10_date ON netflix_tv_top10_world(date DESC);

-- Row Level Security : lecture publique, écriture service_role uniquement
ALTER TABLE bandi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandi_country_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE netflix_tv_top10_world ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read snapshots"
  ON bandi_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read countries"
  ON bandi_country_rankings FOR SELECT USING (true);
CREATE POLICY "Public read top10"
  ON netflix_tv_top10_world FOR SELECT USING (true);
