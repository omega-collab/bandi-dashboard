# PROJECT_STRUCTURE_AUDIT.md

> Cartographie complète du projet **bandi-dashboard** au commit `1d236b6` (07/05/2026).
> Périmètre audité : tout ce qui est versionné dans `public/`, `scripts/`, `.github/workflows/`, `supabase/`, `rapports/` + fichiers racine.

## 0. Vue d'ensemble

- **Type** : SPA statique vanilla JS (pas de framework, pas de build, pas de TypeScript)
- **Hébergement** : Netlify (publish = `public/`)
- **Backend** : Supabase Postgres (RLS, lecture publique, écriture service_role)
- **Scrapers** : 5 workflows GitHub Actions (cron quotidien 00:00 UTC)
- **Branches actives** : `master`, `main`, `claude/add-dynamic-hero-updates-WMH4f` (toutes synchronisées)
- **Total LOC frontend** : ~12 500 lignes (HTML 1460 · CSS 3929 · JS 6900)

## 1. Fichiers HTML / pages servies

| Fichier | Rôle | Données affichées | Criticité |
|---------|------|--------------------|-----------|
| `public/index.html` | Application principale (SPA multi-onglets) | Toutes les sections : Série · Stats · Pays · Buzz · Signaux · Historique · Carte | **🔴 critique** |
| `public/login.html` | Page de connexion (auth optionnelle, désactivée par défaut via `AUTH_ENABLED=false` dans `auth.js`) | Form login | 🟡 important |
| `public/diag.html` | Page de diagnostic interne | Cache-bust effectif, présence DOM, valeurs `BANDI`, erreurs JS | 🟢 outil interne |

## 2. Fichiers CSS

| Fichier | Rôle | Sections | Criticité |
|---------|------|----------|-----------|
| `public/css/styles.css` | Design system unique (3929 lignes, 28+ sections numérotées) | Variables, typographie, header, hero, cartes KPI, panels, onglets, animations, responsive, modales, modules B2B | 🔴 critique |

## 3. JavaScript frontend

| Fichier | LOC | Rôle | Dépendances | Criticité |
|---------|-----|------|-------------|-----------|
| `public/js/app.js` | 4881 | Cœur applicatif : load Supabase + render tous onglets | `data-fallback.js`, `bandi-reception-sources.js`, `config.js`, Chart.js, Leaflet | 🔴 critique |
| `public/js/data-fallback.js` | 468 | Données de secours statiques (`BANDI` global, mutable via Object.assign) | aucune | 🔴 critique (UX si Supabase KO) |
| `public/js/bandi-reception-sources.js` | 615 | 27 sources presse/public/impact + pondérations | aucune | 🟡 important |
| `public/js/monitoring.js` | 489 | Jauges live · scrapers status · fraîcheur tables | `data-fallback.js`, `app.js` (utilise `BANDI`) | 🟡 important |
| `public/js/health-guard.js` | 601 | Surveillance santé DOM + auto-heal silencieux | `app.js` | 🟢 confort |
| `public/js/auth.js` | (50) | Auth Supabase optionnelle (désactivée par défaut) | aucune | 🟢 inactif |
| `public/js/config.js` | 12 | `SUPABASE_CONFIG` (URL + anonKey publique) | aucune | 🔴 critique |

## 4. Scripts (scrapers + utilitaires)

| Fichier | Cron | Source scrapée | Table cible | Criticité |
|---------|------|----------------|-------------|-----------|
| `scripts/scraper.js` | 00:00 UTC daily (`scrape.yml`) | flixpatrol.com (TV Top 10 monde + pays) | `bandi_snapshots` · `bandi_country_rankings` · `netflix_tv_top10_world` | 🔴 critique |
| `scripts/scrape-tudum.js` | 00:00 UTC daily (`tudum-scrape.yml`) | netflix.com/tudum/top10 (TSV) | `tudum_global_weekly` | 🔴 critique |
| `scripts/scrape-press.js` | 00:00 UTC daily (`buzz-scrape.yml`) | 23 flux RSS + GDELT | `buzz_articles` | 🟡 important |
| `scripts/scrape-social.js` | 00:00 UTC daily (`buzz-social-scrape.yml`) | Reddit, YouTube, Bluesky | `buzz_social` · `buzz_trends` | 🟡 important |
| `scripts/scrape-instagram.js` | 00:00 UTC daily (`buzz-social-scrape.yml`) | Apify (Instagram), fallback RSSHub | `buzz_social` (platform=instagram) | 🟡 important |
| `scripts/scrape-imdb.js` | 00:00 UTC daily (`ratings-scrape.yml`) | IMDb aggregateRating | `external_ratings` (source=imdb) | 🟡 important |
| `scripts/scrape-tmdb.js` | idem | TMDB API officielle | `external_ratings` (source=tmdb) | 🟡 important |
| `scripts/scrape-allocine.js` | idem | AlloCiné Spectateurs + Presse | `external_ratings` (allocine_public/press) | 🟡 important |
| `scripts/scrape-senscritique.js` | idem | SensCritique communauté FR | `external_ratings` (senscritique) | 🟡 important |
| `scripts/scrape-rottentomatoes.js` | idem | Rotten Tomatoes (`<score-board>`) | `external_ratings` (rt_critics/audience) | 🟡 important |
| `scripts/scrape-filmaffinity.js` | idem | Filmaffinity ES | `external_ratings` (filmaffinity) | 🟡 important |
| `scripts/scrape-wikipedia.js` | idem | Wikimedia REST (pageviews FR + EN) | `wikipedia_pageviews` | 🟢 confort |
| `scripts/_fetch-html.js` | — | Module commun fetch + Playwright fallback Cloudflare | utilisé par tous les scrapers HTML | 🔴 critique |
| `scripts/build-version.sh` | build Netlify | Génère `public/version.txt` | — | 🟢 outil |
| `scripts/test-scraper.js` | manuel | Test local FlixPatrol | — | 🟢 dev |
| `scripts/country-mapping.json` | — | 92 pays EN → { fr, code ISO } | utilisé par `scraper.js` | 🟡 important |
| `scripts/sources-map.json` | — | Mapping flux RSS presse | utilisé par `scrape-press.js` | 🟡 important |
| `.github/scripts/run-scraper.sh` | — | Wrapper logs + exit codes pour tous scrapers | — | 🟢 outil |

## 5. Workflows GitHub Actions

| Workflow | Trigger | Jobs | Criticité |
|----------|---------|------|-----------|
| `scrape.yml` | cron 00:00 UTC | scraper FlixPatrol | 🔴 critique |
| `tudum-scrape.yml` | cron 00:00 UTC | scrape-tudum | 🔴 critique |
| `buzz-scrape.yml` | cron 00:00 UTC | scrape-press | 🟡 important |
| `buzz-social-scrape.yml` | cron 00:00 UTC | scrape-social + scrape-instagram | 🟡 important |
| `ratings-scrape.yml` | cron 00:00 UTC | 7 scrapers de notes | 🟡 important |
| `bootstrap-scrapers.yml` | push master | force tous les scrapers | 🟢 confort |
| `ping-actions.yml` | push | diagnostic Actions | 🟢 outil |
| `auto-merge-claude.yml` | PR Claude | auto-merge (⚠️ buggé selon CLAUDE.md L.70) | 🟢 inactif (workaround : push direct master+main) |

## 6. Base de données Supabase (RLS activé sur toutes)

| Table | Clé unique | Source | Criticité |
|-------|-----------|--------|-----------|
| `bandi_snapshots` | `date` | scraper FlixPatrol | 🔴 |
| `bandi_country_rankings` | `date, pays` | scraper FlixPatrol | 🔴 |
| `netflix_tv_top10_world` | `date, rang` | scraper FlixPatrol | 🟡 |
| `tudum_global_weekly` | `week_start, categorie, rang` | scrape-tudum | 🔴 |
| `external_ratings` | `date, source` | 7 scrapers de notes | 🟡 |
| `wikipedia_pageviews` | `date, project, article` | scrape-wikipedia | 🟢 |
| `buzz_articles` | `url` (UNIQUE) | scrape-press | 🟡 |
| `buzz_social` | `platform, post_id` | scrape-social + scrape-instagram | 🟡 |
| `buzz_trends` | `date` | scrape-social (Google Trends) | 🟢 |

## 7. SQL versionné (`supabase/`)

| Fichier | Statut | Rôle |
|---------|--------|------|
| `schema.sql` | référence | Tables principales bandi_* |
| `backfill-snapshots.sql` | exécuté ✅ | Backfill historique 09-14/04/2026 |
| `tudum-tables.sql` | exécuté ✅ | `tudum_global_weekly` |
| `buzz-tables.sql` | exécuté ✅ (idempotent + ALTER renames) | `buzz_articles`, `buzz_social`, `buzz_trends` |
| `external-ratings-tables.sql` | exécuté ✅ | `external_ratings` + `wikipedia_pageviews` |
| `add-views-migration.sql` | exécuté ✅ | Colonnes vues |
| `buzz-migration.sql` | référence | Migrations buzz |

## 8. Documentation `.md`

| Fichier | Rôle |
|---------|------|
| `README.md` | Documentation publique |
| `CLAUDE.md` | Instructions agents IA + état projet (369 lignes) |
| `DEPLOY.md` | Procédure déploiement |
| `CURRENT_PRESS_SOURCES_AUDIT.md` | Audit étape 1 refonte Réception (créé 07/05) |
| `RECEPTION_SOURCES_UPDATE.md` | Rapport refonte Réception (créé 07/05) |
| `rapports/README.md` | Index rapports analyse |
| `rapports/2026-04-19_gemini_bandi.md` | Rapport Gemini analytique |
| `rapports/2026-04-24_tudum_semaine2.md` | Rapport Tudum semaine 2 |
| `rapports/2026-05-02_cumul_3semaines_consolidation.md` | Cumul 3 semaines |

## 9. Configuration

| Fichier | Rôle |
|---------|------|
| `netlify.toml` | Build (`bash scripts/build-version.sh`) + headers cache (no-cache HTML, 1h JS/CSS) + redirect `/` → `/index.html` |
| `package.json` | Dépendances scrapers (Playwright, Cheerio, @supabase/supabase-js, rss-parser…) |
| `.claude/launch.json` | Config Claude Code |

## 10. Dépendances cartographiques

```
                    ┌────────────────┐
                    │  GitHub Actions│  (cron 00:00 UTC)
                    └────────┬───────┘
                             │ écrit (service_role)
                             ▼
                    ┌────────────────┐
                    │   Supabase DB  │  (9 tables, RLS public read)
                    └────────┬───────┘
                             │ lecture publique (anonKey)
                             ▼
   ┌─────────────────────────────────────────────────────┐
   │                  index.html                         │
   │  ┌──────────┐ ┌──────────────┐ ┌──────────────┐    │
   │  │ app.js   │ │ monitoring.js│ │ health-guard │    │
   │  └────┬─────┘ └──────┬───────┘ └──────────────┘    │
   │       │              │                              │
   │       ▼              ▼                              │
   │  ┌──────────┐  ┌──────────────────┐                 │
   │  │ data-    │  │ bandi-reception- │                 │
   │  │ fallback │  │ sources.js (27)  │                 │
   │  └──────────┘  └──────────────────┘                 │
   └─────────────────────────────────────────────────────┘
```

## 11. Points de criticité immédiats

1. **`public/js/app.js` (4881 lignes)** — fichier monolithique, difficile à maintenir. Pas urgent mais risque dette technique.
2. **`data-fallback.js` mutable** — patron `Object.assign(BANDI, …)` documenté dans CLAUDE.md ; cohérent mais fragile.
3. **`config.js` contient l'anonKey Supabase** — c'est par design (clé publique RLS), pas un risque sécurité tant que RLS reste actif.
4. **Auth désactivée** par défaut (`window.AUTH_ENABLED = false`) — page publique ; cohérent avec mission B2B.
5. **5 cron sur le même horaire 00:00 UTC** — pic de charge GitHub Actions / Supabase chaque jour. Pas critique mais pourrait être étalé.

## 12. Périmètre de l'audit suivant

- **PAGE_BY_PAGE_AUDIT.md** : 7 onglets visibles (Série, Stats, Pays, Buzz, Signaux, Historique, Carte) + modales (détail pays, sources réception)
- **COPYWRITING_AND_TEXT_AUDIT.md** : ~250 textes statiques dans `index.html` + libellés dynamiques dans `app.js`
- **DATA_AND_CALCULATION_AUDIT.md** : ~40 valeurs calculées (scores, agrégats, %, deltas)
- **SOURCE_TRACEABILITY_AUDIT.md** : 27 sources presse + 8 sources notes + 9 tables DB
- **ERROR_STATES_AND_FALLBACKS_AUDIT.md** : ~15 états vides/erreur dans le markup
- **UX_READABILITY_AUDIT.md** : navigation, hiérarchie, responsive, contrastes
- **CODE_QUALITY_AUDIT.md** : duplication, valeurs hardcodées, fonctions mortes
