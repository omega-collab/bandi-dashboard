-- ================================================================
-- BANDI · Backfill bandi_snapshots (09 → 14 avril 2026)
-- Source : FlixPatrol data-fallback.js (données réelles)
-- Exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase
-- ================================================================

INSERT INTO bandi_snapshots (date, score_monde, rang_monde, pays_n1, pays_top10, rang_moyen)
VALUES
  ('2026-04-09', NULL,  NULL, 0,  0,  NULL),   -- Jour de sortie (pas encore de données FlixPatrol)
  ('2026-04-10', 107,   10,   3,  17, 5.9),    -- J+1
  ('2026-04-11', 170,   8,    7,  28, 5.5),    -- J+2
  ('2026-04-12', 209,   7,    8,  37, 5.4),    -- J+3
  ('2026-04-13', 348,   6,    13, 37, 4.8),    -- J+4 (pic actuel)
  ('2026-04-14', 391,   5,    15, 39, 4.5)     -- J+5 (projection tendance)
ON CONFLICT (date) DO UPDATE SET
  score_monde = EXCLUDED.score_monde,
  rang_monde  = EXCLUDED.rang_monde,
  pays_n1     = EXCLUDED.pays_n1,
  pays_top10  = EXCLUDED.pays_top10,
  rang_moyen  = EXCLUDED.rang_moyen;

-- ================================================================
-- Backfill bandi_country_rankings (données du 13 avril 2026)
-- Reprend le détail pays de data-fallback.js
-- ================================================================

INSERT INTO bandi_country_rankings (date, pays, code_pays, rang, region)
VALUES
  -- Pays #1
  ('2026-04-13', 'Martinique',         'MQ', 1,  'Caraïbes'),
  ('2026-04-13', 'Guadeloupe',         'GP', 1,  'Caraïbes'),
  ('2026-04-13', 'Bahamas',            'BS', 1,  'Caraïbes'),
  ('2026-04-13', 'France',             'FR', 1,  'Europe'),
  ('2026-04-13', 'Reunion',            'RE', 1,  'Océan Indien'),
  ('2026-04-13', 'Jamaica',            'JM', 1,  'Caraïbes'),
  ('2026-04-13', 'Dominican Republic', 'DO', 1,  'Caraïbes'),
  ('2026-04-13', 'Trinidad and Tobago','TT', 1,  'Caraïbes'),
  ('2026-04-13', 'Panama',             'PA', 1,  'Amérique Centrale'),
  ('2026-04-13', 'New Caledonia',      'NC', 1,  'Océanie'),
  ('2026-04-13', 'Hungary',            'HU', 1,  'Europe'),
  ('2026-04-13', 'Honduras',           'HN', 1,  'Amérique Centrale'),
  ('2026-04-13', 'Venezuela',          'VE', 1,  'Amérique du Sud'),
  -- Pays top 10
  ('2026-04-13', 'Nigeria',            'NG', 2,  'Afrique'),
  ('2026-04-13', 'Portugal',           'PT', 3,  'Europe'),
  ('2026-04-13', 'Argentina',          'AR', 4,  'Amérique du Sud'),
  ('2026-04-13', 'Brazil',             'BR', 4,  'Amérique du Sud'),
  ('2026-04-13', 'Mauritius',          'MU', 4,  'Océan Indien'),
  ('2026-04-13', 'Slovakia',           'SK', 5,  'Europe'),
  ('2026-04-13', 'Uruguay',            'UY', 5,  'Amérique du Sud'),
  ('2026-04-13', 'Spain',              'ES', 5,  'Europe'),
  ('2026-04-13', 'Luxembourg',         'LU', 6,  'Europe'),
  ('2026-04-13', 'Costa Rica',         'CR', 6,  'Amérique Centrale'),
  ('2026-04-13', 'Colombia',           'CO', 7,  'Amérique du Sud'),
  ('2026-04-13', 'Kenya',              'KE', 7,  'Afrique'),
  ('2026-04-13', 'Chile',              'CL', 8,  'Amérique du Sud'),
  ('2026-04-13', 'Switzerland',        'CH', 8,  'Europe'),
  ('2026-04-13', 'Morocco',            'MA', 8,  'Afrique'),
  ('2026-04-13', 'Czech Republic',     'CZ', 8,  'Europe'),
  ('2026-04-13', 'Nicaragua',          'NI', 8,  'Amérique Centrale'),
  ('2026-04-13', 'Belgium',            'BE', 9,  'Europe'),
  ('2026-04-13', 'Ecuador',            'EC', 9,  'Amérique du Sud'),
  ('2026-04-13', 'Netherlands',        'NL', 9,  'Europe'),
  ('2026-04-13', 'Romania',            'RO', 9,  'Europe'),
  ('2026-04-13', 'Italy',              'IT', 10, 'Europe'),
  ('2026-04-13', 'Salvador',           'SV', 10, 'Amérique Centrale'),
  ('2026-04-13', 'United States',      'US', 10, 'Amérique du Nord')
ON CONFLICT (date, pays) DO UPDATE SET
  code_pays = EXCLUDED.code_pays,
  rang = EXCLUDED.rang,
  region = EXCLUDED.region;

-- ================================================================
-- Backfill netflix_tv_top10_world (13 avril 2026)
-- Source : data-fallback.js
-- ================================================================

INSERT INTO netflix_tv_top10_world (date, rang, titre, score)
VALUES
  ('2026-04-13', 1,  'Trust Me: The False Prophet', 631),
  ('2026-04-13', 2,  'XO, Kitty',                   509),
  ('2026-04-13', 3,  'Bloodhounds',                  506),
  ('2026-04-13', 4,  'Salish & Jordan Matter',       484),
  ('2026-04-13', 5,  'The Cleaning Lady',             386),
  ('2026-04-13', 6,  'Bandi',                         348),
  ('2026-04-13', 7,  'Detective Hole',                215),
  ('2026-04-13', 8,  'Big Mistakes',                  180),
  ('2026-04-13', 9,  'Something Very Bad...',          153),
  ('2026-04-13', 10, 'Beauty in Black',               136)
ON CONFLICT (date, rang) DO NOTHING;

-- ================================================================
-- Migration : ajouter code_pays sur les lignes existantes sans code
-- (pour les scrapes déjà effectués avant la mise à jour du scraper)
-- ================================================================

UPDATE bandi_country_rankings SET code_pays = 'MQ' WHERE pays = 'Martinique'         AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'GP' WHERE pays = 'Guadeloupe'         AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'BS' WHERE pays = 'Bahamas'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'JM' WHERE pays = 'Jamaica'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'DO' WHERE pays = 'Dominican Republic' AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'TT' WHERE pays = 'Trinidad and Tobago'AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CU' WHERE pays = 'Cuba'               AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'RE' WHERE pays = 'Reunion'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'MU' WHERE pays = 'Mauritius'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'FR' WHERE pays = 'France'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'HU' WHERE pays = 'Hungary'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'PT' WHERE pays = 'Portugal'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'ES' WHERE pays = 'Spain'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'BE' WHERE pays = 'Belgium'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CH' WHERE pays = 'Switzerland'        AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NL' WHERE pays = 'Netherlands'        AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'IT' WHERE pays = 'Italy'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'LU' WHERE pays = 'Luxembourg'         AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CZ' WHERE pays = 'Czech Republic'     AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'SK' WHERE pays = 'Slovakia'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'RO' WHERE pays = 'Romania'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'DE' WHERE pays = 'Germany'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'AT' WHERE pays = 'Austria'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'PL' WHERE pays = 'Poland'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'GR' WHERE pays = 'Greece'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'SE' WHERE pays = 'Sweden'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NO' WHERE pays = 'Norway'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'DK' WHERE pays = 'Denmark'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'FI' WHERE pays = 'Finland'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'IE' WHERE pays = 'Ireland'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'GB' WHERE pays = 'United Kingdom'     AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'HR' WHERE pays = 'Croatia'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'BG' WHERE pays = 'Bulgaria'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'RS' WHERE pays = 'Serbia'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'UA' WHERE pays = 'Ukraine'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'PA' WHERE pays = 'Panama'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'HN' WHERE pays = 'Honduras'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CR' WHERE pays = 'Costa Rica'         AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NI' WHERE pays = 'Nicaragua'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'SV' WHERE pays = 'Salvador'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'GT' WHERE pays = 'Guatemala'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'VE' WHERE pays = 'Venezuela'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'BR' WHERE pays = 'Brazil'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'AR' WHERE pays = 'Argentina'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CL' WHERE pays = 'Chile'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CO' WHERE pays = 'Colombia'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'UY' WHERE pays = 'Uruguay'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'EC' WHERE pays = 'Ecuador'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'PE' WHERE pays = 'Peru'               AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'US' WHERE pays = 'United States'      AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'CA' WHERE pays = 'Canada'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'MX' WHERE pays = 'Mexico'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NC' WHERE pays = 'New Caledonia'      AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'AU' WHERE pays = 'Australia'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NZ' WHERE pays = 'New Zealand'        AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'NG' WHERE pays = 'Nigeria'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'KE' WHERE pays = 'Kenya'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'MA' WHERE pays = 'Morocco'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'ZA' WHERE pays = 'South Africa'       AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'EG' WHERE pays = 'Egypt'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'JP' WHERE pays = 'Japan'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'KR' WHERE pays = 'South Korea'        AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'TW' WHERE pays = 'Taiwan'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'HK' WHERE pays IN ('Hong Kong', 'Hong-Kong') AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'SG' WHERE pays = 'Singapore'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'MY' WHERE pays = 'Malaysia'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'TH' WHERE pays = 'Thailand'           AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'PH' WHERE pays = 'Philippines'        AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'ID' WHERE pays = 'Indonesia'          AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'VN' WHERE pays = 'Vietnam'            AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'IN' WHERE pays = 'India'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'SA' WHERE pays = 'Saudi Arabia'       AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'AE' WHERE pays = 'United Arab Emirates' AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'KW' WHERE pays = 'Kuwait'             AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'QA' WHERE pays = 'Qatar'              AND code_pays IS NULL;
UPDATE bandi_country_rankings SET code_pays = 'TR' WHERE pays = 'Turkey'             AND code_pays IS NULL;

SELECT 'Backfill terminé ✅' AS status,
       COUNT(*) AS total_snapshots
FROM bandi_snapshots;
