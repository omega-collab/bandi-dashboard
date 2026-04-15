# CLAUDE.md — Bandi Live Dashboard · État courant

> **Lis ce fichier AVANT toute action.** Il reflète l'état réel du projet, les décisions prises et les conventions établies.

---

## 👤 Contexte utilisateur

- **Nom** : Allan, développeur freelance basé en Martinique
- **Langue** : répondre TOUJOURS en français
- **Style** : direct, pragmatique, sans blabla inutile
- **Comptes** : GitHub ✅ · Netlify ✅ · Supabase ✅ (déjà configuré et peuplé)

---

## 🎯 Mission actuelle

Dashboard public qui suit en temps réel les performances mondiales de la série Netflix **BANDI**, première série tournée en Martinique. Hébergé sur Netlify, données sur Supabase, mises à jour automatiques via GitHub Actions.

---

## 🏗️ Architecture

```
bandi-live/
├── public/
│   ├── index.html           # SPA multi-onglets (Vue d'ensemble, Pays, Concurrence, Buzz, Série, Historique, Carte)
│   ├── css/styles.css       # Design Netflix Premium Martinique (voir section Design)
│   └── js/
│       ├── app.js           # Logique principale (fetch Supabase + render)
│       ├── data-fallback.js # Données statiques (fallback si Supabase KO)
│       └── config.js        # SUPABASE_CONFIG = { url, anonKey }
│
├── scripts/
│   ├── scraper.js           # Scrape FlixPatrol → Supabase (cron 6h)
│   ├── scrape-tudum.js      # Scrape Netflix Tudum TSV → Supabase (cron mardi 15h UTC)
│   └── country-mapping.json # 92 pays EN → { fr, code ISO 3166-1 alpha-2 }
│
├── supabase/
│   ├── schema.sql           # Tables principales
│   ├── backfill-snapshots.sql  # Backfill historique 09-14/04/2026 (déjà exécuté)
│   ├── buzz-tables.sql      # Tables Buzz (déjà exécutées)
│   └── tudum-tables.sql     # Table Tudum (à exécuter si absente)
│
└── .github/workflows/
    ├── scrape.yml           # Cron toutes les 6h (FlixPatrol)
    └── tudum-scrape.yml     # Cron mardi 15h UTC (Netflix Tudum)
```

---

## 🗄️ Base de données Supabase

**Toutes les tables ont RLS activé — lecture publique, écriture service_role uniquement.**

### Tables existantes et peuplées

| Table | Contenu | Clé unique |
|-------|---------|------------|
| `bandi_snapshots` | 1 snapshot/jour (score, rang, pays N1, top10, rang moyen) | `date` |
| `bandi_country_rankings` | Rang par pays par jour + `code_pays` (ISO) | `date, pays` |
| `netflix_tv_top10_world` | Top 10 TV Shows Netflix mondial par jour | `date, rang` |
| `buzz_articles` | Articles de presse (Google News, GDELT, presse spécialisée) | `guid` |
| `buzz_social` | Posts Reddit, Bluesky, YouTube | `platform, post_id` |
| `buzz_trends` | Score Google Trends quotidien | `date` |
| `tudum_global_weekly` | Classement officiel Netflix hebdomadaire | `week_start, categorie, rang` |
| `external_ratings` | **Notes multi-sources unifiées** (8 sources) | `date, source` |
| `wikipedia_pageviews` | **Pageviews Wikipedia FR + EN** (signal d'intérêt) | `date, project, article` |

### `external_ratings` — sources supportées
| source | Échelle native | Source | Script |
|--------|---------------|--------|--------|
| `imdb`            | /10  | IMDb aggregateRating                  | `scrape-imdb.js` |
| `tmdb`            | /10  | TMDB vote_average (API officielle)    | `scrape-tmdb.js` |
| `allocine_public` | /5   | Allociné Spectateurs                  | `scrape-allocine.js` |
| `allocine_press`  | /5   | Allociné Presse                       | `scrape-allocine.js` |
| `senscritique`    | /10  | SensCritique communauté FR            | `scrape-senscritique.js` |
| `rt_critics`      | /100 | Rotten Tomatoes Tomatometer           | `scrape-rottentomatoes.js` |
| `rt_audience`     | /100 | Rotten Tomatoes Audience Score        | `scrape-rottentomatoes.js` |
| `filmaffinity`    | /10  | Filmaffinity communauté ES            | `scrape-filmaffinity.js` |

Toutes les notes sont aussi stockées dans `rating_norm` (normalisé /10) pour comparaison cross-source.

### Colonnes importantes
- `bandi_country_rankings.code_pays` : ISO 3166-1 alpha-2 (ex. `"MQ"`, `"FR"`) — utilisé par `codeToFlag()` côté frontend
- `tudum_global_weekly.categorie` : `'tv_english'` | `'tv_non_english'` | `'film_english'` | `'film_non_english'`
- `tudum_global_weekly.heures_vues` : millions d'heures vues (NUMERIC 12,2)

---

## 🎨 Design System — Netflix Premium Martinique

Le fichier `public/css/styles.css` est une refonte complète inspirée Netflix, aux couleurs du drapeau martiniquais.

### Variables CSS clés
```css
--rouge: #CE1126      /* Drapeau Martinique, rouge Netflix */
--vert:  #009739      /* Drapeau Martinique */
--gold:  #E4B84D      /* Accent chaud */
--bg:    #0F0F0F      /* Fond Netflix */
--surface / --surface-2 / --surface-3  /* Cartes, panels, hover */
--font-display: 'Anton'       /* Grands titres */
--font-body:    'Inter Tight' /* Texte courant */
--font-mono:    'JetBrains Mono' /* Données, scores */
--ease: cubic-bezier(0.4,0,0.2,1)
--ease-spring: cubic-bezier(0.34,1.56,0.64,1)
```

### Éléments clés du design
- **Hero** : plein-écran (margin-left: -24px), 3 gradients superposés (gauche→droite, bas vignette, radial rouge), animation `rankReveal`
- **Badge "N NETFLIX ORIGINAL · MARTINIQUE"** : dans `.hero-origin-badge`, avec `.nx-logo` (carré rouge N), `.nx-original-text`, `.nx-mq` (vert mono)
- **Header** : glassmorphism, classe `.scrolled` ajoutée via scroll listener quand scrollY > 20px
- **KPI cards** : accent stripe horizontal haut, ligne glow gauche, hover `translateY(-3px) scale(1.01)`
- **Rivals** : style Netflix Top 10 avec grands numéros `font-family: Anton`, barre de progression
- **Animations** : `panelIn`, `liveRing`, `navIn`, `rankReveal`

---

## ⚙️ Logique app.js — Conventions

### Pattern critique : mutation de la constante BANDI
`BANDI` est déclarée `const` dans `data-fallback.js`. Pour l'override avec les données live :
```javascript
Object.assign(BANDI, { current: {...}, pays: [...], rivals: [...], tudumWeekly: [...], ... });
```
**Ne jamais réécrire `window.BANDI = {...}` — utiliser toujours `Object.assign`.**

### codeToFlag(code)
Convertit un code ISO 3166-1 alpha-2 en emoji drapeau :
```javascript
function codeToFlag(code) {
  if (!code || code.length !== 2) return '🏳️';
  const offset = 0x1F1E6 - 65;
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => c.charCodeAt(0) + offset));
}
```

### COUNTRY_FR_MAP
Objet inline dans `app.js` (92 entrées) : `"Jamaica" → { fr: "Jamaïque", code: "JM" }`.
Utilisé pour enrichir les données pays (nom FR + flag emoji) côté frontend, sans dépendance au JSON serveur.

### DOMContentLoaded — isolation des erreurs
Chaque appel de render est isolé dans `try/catch` pour qu'une erreur n'empêche pas les suivants :
```javascript
document.addEventListener("DOMContentLoaded", async () => {
  try { await loadLiveData(); } catch (e) { console.error('[BANDI] loadLiveData:', e); }
  try { initTabs(); }           catch (e) { ... }
  // ... etc.
  try { renderTudumMini(); }    catch (e) { ... }
  try { renderRivals(); }       catch (e) { ... }
  try { initRivalsToggle(); }   catch (e) { ... }
});
```

### loadLiveData() — ordre des fetches
1. `bandi_snapshots` (30 derniers)
2. `bandi_country_rankings` du jour
3. `netflix_tv_top10_world` du jour
4. `bandi_country_rankings` historique (500 lignes, pour trends)
5. `tudum_global_weekly` (40 dernières lignes)

---

## 📊 Onglets & fonctions render

| Onglet | Fonction principale | Notes |
|--------|---------------------|-------|
| Vue d'ensemble | `renderOverview()` | KPIs, hero rank |
| Vue d'ensemble | `renderChart()` | Chart.js score + rang |
| Vue d'ensemble | `renderMartiniqueChart()` | Chart.js rang Martinique, axe Y inversé (`reverse: true, min: 1`) |
| Vue d'ensemble | `renderTudumMini()` | Top 5 Tudum officiel, caché si data absente |
| Pays | `renderCountries()` + `renderRegionFilters()` | Filtres région + recherche |
| Concurrence | `renderRivals()` | FlixPatrol Top 10 (scores quotidiens) |
| Concurrence | `renderRivalsTudum()` | Tudum Top 10 (heures vues), lazy (au clic toggle) |
| Buzz | `initBuzzTab()` | Lazy load au clic onglet Buzz |
| Série | `renderSeriesTab()` | Casting + synopsis statiques |
| Historique | `renderHistoryTab()` | Chart.js 30 jours, lazy |
| Carte | `initMapTab()` | Leaflet choroplèthe, lazy |

---

## 🔄 Scrapers

### FlixPatrol (`scripts/scraper.js`)
- **Fréquence** : toutes les 6h (GitHub Actions `.github/workflows/scrape.yml`)
- **Sources** : `flixpatrol.com/title/bandi/` + `flixpatrol.com/top10/netflix/world/{date}/`
- **Fix TV Shows** : utilise une stratégie de traversal par siblings pour trouver la table TV Shows (évite de remonter trop haut dans le DOM et récupérer les Films)
- **code_pays** : stocké depuis `scripts/country-mapping.json` lors de l'INSERT

### Netflix Tudum (`scripts/scrape-tudum.js`)
- **Fréquence** : chaque mardi 15h UTC (GitHub Actions `tudum-scrape.yml`)
- **Source** : TSV officiel `https://www.netflix.com/tudum/top10/data/week-{YYYY-MM-DD}.tsv`
- **La date dans l'URL** = dimanche de fin de semaine couverte
- **Idempotent** : vérifie si la semaine existe déjà avant de scraper
- **Catégories** : `tv_english`, `tv_non_english`, `film_english`, `film_non_english`

### Notes externes (`ratings-scrape.yml`) — 7 scripts
Toutes les 6h (cron `'15 */6 * * *'`), workflow unique qui enchaîne :
1. `scrape-imdb.js` — IMDb aggregateRating (JSON-LD)
2. `scrape-tmdb.js` — TMDB API officielle (nécessite secret **`TMDB_API_KEY`**)
3. `scrape-senscritique.js` — parse `__NEXT_DATA__`
4. `scrape-filmaffinity.js` — parse JSON-LD + fallback DOM
5. `scrape-allocine.js` — Cheerio sur `.rating-item`
6. `scrape-rottentomatoes.js` — `<score-board>` + `__NEXT_DATA__`
7. `scrape-wikipedia.js` — API Wikimedia REST (pageviews FR + EN)

Chaque étape est en `continue-on-error: true` : un échec isolé ne bloque pas les suivantes.

### Clé TMDB
TMDB nécessite une clé API v3 (gratuite) — créer sur https://www.themoviedb.org/settings/api puis :
```bash
gh secret set TMDB_API_KEY --body "VOTRE_CLE"
```
Sans cette clé, le script `scrape-tmdb.js` sort proprement avec un message warning et le workflow continue.

---

## 🚀 Phases du projet

### ✅ Phases complétées

**Phase A — Corrections critiques**
- A.1 : Isolation des erreurs dans DOMContentLoaded (try/catch par appel)
- A.2 : Backfill historique Supabase 2026-04-09 → 2026-04-14 (exécuté)
- A.3 : Fix scrapeWorldTop10() — traversal siblings pour TV Shows (plus Films)
- A.4 : code_pays stocké en DB + codeToFlag() + COUNTRY_FR_MAP frontend

**Phase B — Graphique Martinique**
- Graphique rang Martinique jour par jour (Chart.js, axe Y inversé)
- Badge `#1 DEPUIS LA SORTIE`

**Phase C — Tudum officiel**
- Table `tudum_global_weekly` (SQL créé, à exécuter dans Supabase)
- Scraper `scripts/scrape-tudum.js`
- Workflow GitHub Actions mardi 15h UTC
- Toggle [FlixPatrol] / [Tudum officiel] sur l'onglet Concurrence
- Mini-panel Tudum dans l'onglet Vue d'ensemble (caché si data absente)

**Phase Design — Netflix Premium Martinique**
- Refonte complète `public/css/styles.css`
- Badge `.hero-origin-badge` "N NETFLIX ORIGINAL · MARTINIQUE"
- Scroll listener pour `.header.scrolled`

**Phase D — Buzz (veille automatique)**
- Tables `buzz_articles`, `buzz_social`, `buzz_trends` créées (SQL exécuté)
- `scripts/scrape-press.js` : 4 sources Google News + 10 flux presse antillaise + GDELT
- `scripts/scrape-social.js` : Reddit, YouTube, Bluesky (workflow cron 6h)
- Onglet Buzz : filtres type/source/plateforme/période, lazy load, pagination

**Phase E — Modules B2B (version finale)**
- `data-fallback.js` : champ `strategique` (USA #8, authenticité 91%, forecast S2 85%)
- `index.html` : bento-strategic (USA + auth mini + forecast mini), zones-module, forecast-detail, authenticite-module (panel-series), toggle carte 3 modes
- `app.js` : renderBreakthroughUSA, renderAuthenticiteMini, renderAuthenticite, renderZonesDomination, renderForecastS2, mode Momentum carte (window._paysHistCache)
- `styles.css` : ~250 lignes — bento grid, modules USA/auth/forecast/zones
- FILM_MARKERS enrichi (mudborn, tu yaa main), purge DB rivaux films

**Phase F — Completion Score + Méthodologie multi-sources**
- 5 nouveaux scrapers : TMDB · SensCritique · Rotten Tomatoes · Filmaffinity · Wikipedia
- Table `external_ratings` étendue à 8 sources + nouvelle table `wikipedia_pageviews`
- 13 nouveaux flux RSS presse spécialisée (Le Parisien, Le Monde, Les Inrocks, JDG, What's on Netflix, etc.)
- `computeCompletionScore()` refondu :
  - `S_notes` : moyenne pondérée 8 sources (IMDb 0.22, TMDB 0.18, RT×2 0.25, Allociné×2 0.20, SensCritique 0.10, Filmaffinity 0.05)
  - `S_search` : Google Trends (0.6) + Wikipedia pageviews (0.4)
- `renderCompletionBreakdown()` : chips par source dans le panneau
- **`renderMethodologySources()`** : nouveau panneau pédagogique complet listant les 17 sources avec type, fréquence, rôle dans le calcul. ID DOM : `#methodologieSources`, placé après `#forecastDetail`.

### 🔜 Phases à venir

Aucune phase critique restante. Améliorations possibles :
- Fetch USA rang live depuis Supabase (actuellement hardcodé dans `strategique.usaRang`)
- Valider authenticité 91% avec Maui Entertainment / équipe production
- Page de présentation B2B dédiée (PDF export ou route `/b2b`)

---

## ⚠️ Points d'attention

1. **Ne jamais commiter `.env`** — secrets via GitHub Secrets uniquement
2. **FlixPatrol = zone grise légale** — usage interne/démo OK
3. **TSV Tudum** publié le mardi ~14h UTC — le scraper tourne à 15h pour être sûr
4. **Si FlixPatrol change son HTML** → le scraper cassera → vérifier une fois/mois
5. **Supabase free tier** : 500 MB, ~1 KB/jour, largement suffisant
6. **Le toggle Tudum sur Concurrence** est lazy : `renderRivalsTudum()` ne s'exécute qu'au premier clic sur le bouton Tudum
7. **Le panel Tudum dans Vue d'ensemble** est caché par défaut (`display:none`) et s'affiche uniquement si `BANDI.tudumWeekly` contient des données

---

## 🔑 SQL à exécuter si tables manquantes

### Tudum (Phase C)
Exécuter `supabase/tudum-tables.sql` dans l'éditeur SQL Supabase.

### Buzz (Phase E)
Exécuter `supabase/buzz-tables.sql` dans l'éditeur SQL Supabase (déjà fait selon Allan).

### External ratings + Wikipedia (Phase F)
Exécuter `supabase/external-ratings-tables.sql` dans l'éditeur SQL Supabase.
Ce fichier est idempotent (`CREATE TABLE IF NOT EXISTS`), on peut le re-exécuter sans risque.
Contient :
- `external_ratings` (les 8 sources de notes)
- `wikipedia_pageviews` (pageviews FR + EN)
- Les RLS + policies + index
