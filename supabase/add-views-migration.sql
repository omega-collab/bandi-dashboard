-- =========================================================
-- BANDI · Migration : données visionnage & jours en top 10
-- À exécuter dans l'éditeur SQL Supabase (idempotent)
-- =========================================================

-- ── Table bandi_snapshots : 2 nouvelles colonnes ──────────

-- Nombre de country-days en top 10 capturés depuis la page FlixPatrol
-- (somme de toutes les cellules non-vides dans le tableau pays)
ALTER TABLE bandi_snapshots
  ADD COLUMN IF NOT EXISTS jours_top10_cumul INT;

-- Meilleur rang mondial jamais atteint (mis à jour à chaque scrape)
ALTER TABLE bandi_snapshots
  ADD COLUMN IF NOT EXISTS rang_peak INT;

-- ── Table tudum_global_weekly : colonne views bonus ───────

-- Nombre de foyers (millions) ayant regardé — présent dans le TSV
-- Netflix depuis fin 2024 de façon sporadique (NOT NULL violé si absent →
-- colonne nullable, le scraper n'insère que si la valeur existe)
ALTER TABLE tudum_global_weekly
  ADD COLUMN IF NOT EXISTS views_millions NUMERIC(10,2);

-- ── Index supplémentaire pour les agrégats monitoring ─────

CREATE INDEX IF NOT EXISTS idx_tudum_titre
  ON tudum_global_weekly (titre);

-- ── RLS : pas de changement nécessaire ───────────────────
-- Les nouvelles colonnes héritent des policies existantes
-- (lecture publique, écriture service_role uniquement)

-- ── Vérification ─────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bandi_snapshots'
  AND column_name IN ('jours_top10_cumul', 'rang_peak');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tudum_global_weekly'
  AND column_name = 'views_millions';
