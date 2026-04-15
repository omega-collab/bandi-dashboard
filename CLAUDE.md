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
| `buzz_articles` | Articles de presse (Google News, GDELT) | `guid` |
| `buzz_social` | Posts Reddit, Bluesky, YouTube | `platform, post_id` |
| `buzz_trends` | Score Google Trends quotidien | `date` |
| `tudum_global_weekly` | Classement officiel Netflix hebdomadaire | `week_start, categorie, rang` |

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

### 🔜 Phases à venir

**Phase D — Toggle carte [rang] / [volume vues]**
- Boutons de switch sur l'onglet Carte
- Gradient couleur basé sur heures vues (Tudum) vs rang (FlixPatrol)

**Phase E — Buzz (veille automatique)**
- Tables `buzz_articles`, `buzz_social`, `buzz_trends` créées (SQL exécuté)
- Scraper à développer (Google News GDELT + Reddit + YouTube)

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
