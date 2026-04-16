-- ================================================================
-- BANDI · Table tudum_global_weekly (classement officiel Netflix)
-- Source : https://www.netflix.com/tudum/top10 (TSV hebdomadaire)
-- Exécuter dans l'éditeur SQL Supabase (idempotent)
-- ================================================================

-- NB : La table existante "bandi_tudum_weekly" (ancienne structure) est conservée
-- et n'est PAS modifiée. Cette table est la NOUVELLE structure complète.

CREATE TABLE IF NOT EXISTS tudum_global_weekly (
  id             BIGSERIAL    PRIMARY KEY,
  week_start     DATE         NOT NULL,          -- lundi de la semaine couverte
  categorie      TEXT         NOT NULL,          -- tv_english | tv_non_english | film_english | film_non_english
  rang           INT          NOT NULL,
  titre          TEXT         NOT NULL,
  saison         TEXT,                           -- ex. "Season 2" si présent dans le TSV
  heures_vues    NUMERIC(12,2),                  -- millions d'heures vues
  semaines_top10 INT          DEFAULT 0,         -- cumul semaines dans le top 10
  views_millions NUMERIC(10,2),                  -- foyers (disponible sporadiquement depuis fin 2024)
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(week_start, categorie, rang)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_tudum_week_cat ON tudum_global_weekly (week_start DESC, categorie);
CREATE INDEX IF NOT EXISTS idx_tudum_titre    ON tudum_global_weekly (titre);

-- RLS : lecture publique, écriture service_role uniquement
ALTER TABLE tudum_global_weekly ENABLE ROW LEVEL SECURITY;

-- Supprimer la policy si elle existe déjà (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read tudum" ON tudum_global_weekly;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Public read tudum" ON tudum_global_weekly
  FOR SELECT USING (true);

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tudum_global_weekly'
ORDER BY ordinal_position;

SELECT 'Table tudum_global_weekly créée ✅' AS status;
