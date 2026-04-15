# CLAUDE.md — Projet Bandi Live Dashboard

> **Lis ce fichier en entier AVANT toute action.** Il contient toutes les instructions nécessaires pour déployer ce projet de A à Z de façon autonome.

---

## 🎯 Mission

Déployer un dashboard web public qui suit en temps réel les performances de la série Netflix **Bandi** sur FlixPatrol, avec mise à jour automatique toutes les 6h, hébergé sur Netlify, avec historique stocké sur Supabase.

**Livrable attendu** : une URL publique Netlify fonctionnelle que l'utilisateur peut partager, avec un cron qui met à jour les données sans intervention humaine.

---

## 👤 Contexte utilisateur

- **Nom** : Allan, développeur freelance basé en Martinique
- **Langue** : répondre TOUJOURS en français
- **Style** : direct, pragmatique, pas de blabla
- **Comptes déjà prêts** : GitHub ✅, Netlify ✅, Vercel ✅
- **Compte à créer** : Supabase ❌ (Allan doit le faire lui-même, voir étape 2)

---

## 📂 Structure actuelle du projet

```
bandi-live/
├── CLAUDE.md                    # ← Ce fichier
├── README.md                    # Doc utilisateur final
├── DEPLOY.md                    # Instructions étape par étape pour Allan
├── package.json                 # À créer
├── netlify.toml                 # À créer
├── .env.example                 # À créer
├── .gitignore                   # À créer
│
├── public/                      # Site statique à déployer
│   ├── index.html               # À créer (fusion de src/index.html + fetch API)
│   ├── assets/                  # Images Bandi (déjà présentes)
│   ├── css/
│   │   └── styles.css           # À copier depuis src/
│   └── js/
│       ├── app.js               # À adapter : remplacer données statiques par fetch Supabase
│       └── data-fallback.js     # Copie de src/data.js en cas d'échec API
│
├── src/                         # Fichiers sources (réf. du POC statique)
│   ├── index.html
│   ├── styles.css
│   ├── data.js
│   └── app.js
│
├── scripts/
│   ├── scraper.js               # À créer : scrape FlixPatrol + push Supabase
│   └── test-scraper.js          # À créer : test local
│
├── supabase/
│   └── schema.sql               # À créer : schéma DB
│
└── .github/
    └── workflows/
        └── scrape.yml           # À créer : cron GitHub Actions 6h
```

---

## 🚀 Workflow de déploiement (étapes dans l'ordre)

### ÉTAPE 0 — Vérifications préliminaires

Vérifie que ces outils CLI sont installés :
```bash
node --version     # >= 18
npm --version
git --version
gh --version       # GitHub CLI
netlify --version  # Netlify CLI
```

Si `gh` ou `netlify` manquent :
```bash
# macOS
brew install gh netlify-cli

# Vérifier les logins
gh auth status
netlify status
```

Si pas connecté : `gh auth login` et `netlify login`.

### ÉTAPE 1 — Créer tous les fichiers manquants

Créer dans l'ordre les fichiers décrits dans la section "Fichiers à créer" ci-dessous.

### ÉTAPE 2 — Demander à Allan de créer Supabase

**STOP et demande à Allan** de faire cette action manuelle (un seul dialogue, pas plus) :

```
Allan, avant que je continue, fais ces 3 choses sur Supabase
(~3 minutes) :

1. Va sur https://supabase.com → "Start your project"
2. Crée un nouveau projet nommé "bandi-dashboard"
   (région "West EU (Ireland)", mot de passe DB : génère un fort et note-le)
3. Une fois le projet créé, va dans :
   - Settings → API → copie-colle ici :
     a) Project URL (https://xxxx.supabase.co)
     b) anon public key (commence par eyJ...)
     c) service_role key (commence par eyJ...) — CELLE-CI EST SECRÈTE

Colle les 3 valeurs dans ta prochaine réponse et je continue.
```

Attendre la réponse d'Allan. **Ne pas continuer sans ces infos.**

### ÉTAPE 3 — Configurer Supabase

Une fois les clés reçues :

1. Créer `.env` local avec les clés (ne PAS commiter)
2. Se connecter à Supabase via CLI OU utiliser l'éditeur SQL web
3. Exécuter `supabase/schema.sql` pour créer les tables
4. Tester la connexion avec `scripts/test-scraper.js`

### ÉTAPE 4 — Premier scrape pour peupler la DB

```bash
node scripts/scraper.js
```

Vérifier dans Supabase Table Editor que les données sont bien insérées.

### ÉTAPE 5 — Initialiser Git et pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial: Bandi live dashboard"
gh repo create bandi-dashboard --public --source=. --push
```

### ÉTAPE 6 — Configurer les secrets GitHub

```bash
gh secret set SUPABASE_URL --body "https://xxx.supabase.co"
gh secret set SUPABASE_SERVICE_KEY --body "eyJ..."
```

### ÉTAPE 7 — Déployer sur Netlify

```bash
netlify init              # lier à un nouveau site
netlify env:set SUPABASE_URL "https://xxx.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJ..."
netlify deploy --prod --dir=public
```

Récupérer l'URL finale (du type `bandi-dashboard.netlify.app`).

### ÉTAPE 8 — Déclencher une première exécution du workflow

```bash
gh workflow run scrape.yml
```

Vérifier que ça tourne : `gh run list --workflow=scrape.yml`

### ÉTAPE 9 — Rendre compte à Allan

Lui donner :
- ✅ URL Netlify publique
- ✅ URL repo GitHub
- ✅ URL dashboard Supabase
- ✅ Confirmation que le cron tourne toutes les 6h
- ⚠️ Rappel des limites (scraping FlixPatrol en zone grise)

---

## 📄 Fichiers à créer

### `package.json`

```json
{
  "name": "bandi-live-dashboard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Dashboard temps réel Bandi Netflix",
  "scripts": {
    "scrape": "node scripts/scraper.js",
    "test-scrape": "node scripts/test-scraper.js",
    "dev": "npx serve public",
    "deploy": "netlify deploy --prod --dir=public"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "cheerio": "^1.0.0",
    "dotenv": "^16.4.5"
  }
}
```

### `.gitignore`

```
node_modules/
.env
.env.local
.netlify/
.DS_Store
*.log
dist/
```

### `.env.example`

```
# À copier vers .env et remplir avec les vraies valeurs
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

### `netlify.toml`

```toml
[build]
  publish = "public"
  command = "echo 'Static site, no build'"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"
```

### `supabase/schema.sql`

```sql
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

CREATE POLICY "Public read snapshots" ON bandi_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read countries" ON bandi_country_rankings FOR SELECT USING (true);
CREATE POLICY "Public read top10" ON netflix_tv_top10_world FOR SELECT USING (true);
```

### `scripts/scraper.js`

```javascript
// Scrape FlixPatrol et insère dans Supabase
// Usage : node scripts/scraper.js

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// User-Agent réaliste pour éviter le blocage
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml'
};

// Mapping région par pays (à enrichir si besoin)
const REGIONS = {
  'Martinique': 'Caraïbes', 'Guadeloupe': 'Caraïbes', 'Bahamas': 'Caraïbes',
  'Jamaica': 'Caraïbes', 'Dominican Republic': 'Caraïbes', 'Trinidad and Tobago': 'Caraïbes',
  'Reunion': 'Océan Indien', 'Mauritius': 'Océan Indien',
  'France': 'Europe', 'Hungary': 'Europe', 'Portugal': 'Europe', 'Spain': 'Europe',
  'Belgium': 'Europe', 'Switzerland': 'Europe', 'Netherlands': 'Europe', 'Italy': 'Europe',
  'Luxembourg': 'Europe', 'Czech Republic': 'Europe', 'Slovakia': 'Europe', 'Romania': 'Europe',
  'Panama': 'Amérique Centrale', 'Honduras': 'Amérique Centrale', 'Costa Rica': 'Amérique Centrale',
  'Nicaragua': 'Amérique Centrale', 'Salvador': 'Amérique Centrale',
  'Venezuela': 'Amérique du Sud', 'Brazil': 'Amérique du Sud', 'Argentina': 'Amérique du Sud',
  'Chile': 'Amérique du Sud', 'Colombia': 'Amérique du Sud', 'Uruguay': 'Amérique du Sud',
  'Ecuador': 'Amérique du Sud',
  'United States': 'Amérique du Nord', 'Canada': 'Amérique du Nord',
  'New Caledonia': 'Océanie',
  'Nigeria': 'Afrique', 'Kenya': 'Afrique', 'Morocco': 'Afrique'
};

async function fetchPage(url) {
  console.log(`📡 Fetching ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return await res.text();
}

async function scrapeBandiPage() {
  const html = await fetchPage('https://flixpatrol.com/title/bandi/');
  const $ = cheerio.load(html);

  // Extraire score et rang mondial depuis la section "Yesterday"
  // Structure observée : tableau Netflix | X p. | Y.
  let scoreMonde = null;
  let rangMonde = null;

  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells[0]?.includes('Netflix') && cells[1]?.includes('p.')) {
        if (scoreMonde === null) {
          scoreMonde = parseInt(cells[1].replace(/\D/g, ''), 10);
          rangMonde = parseInt(cells[2].replace(/\D/g, ''), 10);
        }
      }
    });
  });

  // Extraire tableau pays par pays
  const countries = [];
  $('table').each((_, table) => {
    const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
    if (!headers.some(h => h.toLowerCase().includes('country'))) return;

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells.length < 2) return;

      const pays = cells[0];
      // La dernière colonne "Yesterday" contient le rang actuel
      const rangYesterday = cells[cells.length - 1];
      const rangClean = parseInt(rangYesterday.replace(/\D/g, ''), 10);

      if (pays && !isNaN(rangClean) && rangClean > 0 && rangClean <= 10) {
        countries.push({
          pays: pays,
          rang: rangClean,
          region: REGIONS[pays] || 'Autre'
        });
      }
    });
  });

  return { scoreMonde, rangMonde, countries };
}

async function scrapeWorldTop10() {
  // Récupère le Top 10 TV Shows Netflix Monde de la veille
  const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0, 10);
  const url = `https://flixpatrol.com/top10/netflix/world/${yesterday}/`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const shows = [];
  // Chercher la section "TOP TV Shows"
  const tvSection = $('h2:contains("TOP TV Shows")').first();
  if (tvSection.length) {
    const table = tvSection.nextAll('table').first();
    table.find('tr').each((i, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells.length >= 3) {
        const rang = parseInt(cells[0].replace(/\D/g, ''), 10);
        const titre = cells[1].replace(/\s+/g, ' ').trim();
        const score = parseInt(cells[2].replace(/\D/g, ''), 10);
        if (!isNaN(rang) && titre && !isNaN(score)) {
          shows.push({ rang, titre, score });
        }
      }
    });
  }

  return shows;
}

async function main() {
  console.log('🎬 Bandi Scraper · ' + new Date().toISOString());

  try {
    const { scoreMonde, rangMonde, countries } = await scrapeBandiPage();
    const top10 = await scrapeWorldTop10();

    const today = new Date().toISOString().slice(0, 10);
    const paysN1 = countries.filter(c => c.rang === 1).length;
    const rangMoyen = countries.length > 0
      ? (countries.reduce((s, c) => s + c.rang, 0) / countries.length).toFixed(1)
      : null;

    console.log(`📊 Score: ${scoreMonde} | Rang: ${rangMonde} | Pays #1: ${paysN1} | Top 10: ${countries.length}`);

    // Insert snapshot
    const { error: e1 } = await supabase.from('bandi_snapshots').upsert({
      date: today,
      score_monde: scoreMonde,
      rang_monde: rangMonde,
      pays_n1: paysN1,
      pays_top10: countries.length,
      rang_moyen: rangMoyen
    }, { onConflict: 'date' });
    if (e1) throw e1;

    // Insert pays
    if (countries.length > 0) {
      const rows = countries.map(c => ({
        date: today,
        pays: c.pays,
        rang: c.rang,
        region: c.region
      }));
      const { error: e2 } = await supabase.from('bandi_country_rankings').upsert(rows, { onConflict: 'date,pays' });
      if (e2) throw e2;
    }

    // Insert top 10
    if (top10.length > 0) {
      const rows = top10.map(s => ({
        date: today,
        rang: s.rang,
        titre: s.titre,
        score: s.score
      }));
      const { error: e3 } = await supabase.from('netflix_tv_top10_world').upsert(rows, { onConflict: 'date,rang' });
      if (e3) throw e3;
    }

    console.log('✅ Scraping OK');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

main();
```

### `scripts/test-scraper.js`

```javascript
// Test de connexion Supabase + scrape sans écriture
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  console.log('🧪 Test connexion Supabase...');
  const { data, error } = await supabase.from('bandi_snapshots').select('*').limit(1);
  if (error) {
    console.error('❌ Échec:', error.message);
    process.exit(1);
  }
  console.log('✅ Connexion OK');
  console.log('📋 Data:', data);
}

test();
```

### `.github/workflows/scrape.yml`

```yaml
name: Scrape FlixPatrol Bandi

on:
  schedule:
    # Toutes les 6 heures (UTC)
    - cron: '0 */6 * * *'
  workflow_dispatch:  # Permet déclenchement manuel

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install deps
        run: npm ci || npm install

      - name: Run scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: node scripts/scraper.js
```

### `public/index.html`

Copier **exactement** le contenu de `src/index.html` MAIS :
- Remplacer le chemin `assets/` par `assets/` (déjà bon)
- Remplacer `css/styles.css` par `css/styles.css`
- Remplacer `js/data.js` par `js/data-fallback.js` (fallback)
- Remplacer `js/app.js` par `js/app.js` (adapté ci-dessous)

### `public/js/app.js`

Réécriture du `src/app.js` pour **fetch depuis Supabase** au chargement :

```javascript
// Au lieu de lire BANDI statique, charger depuis Supabase
// Fallback sur BANDI si API échoue

const SUPABASE_URL = 'PLACEHOLDER_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'PLACEHOLDER_ANON_KEY';

// Ces valeurs doivent être injectées au build OU via une petite fonction Netlify
// Alternative simple : hardcoder directement l'URL publique (l'anon key est faite pour ça)

async function loadLiveData() {
  try {
    // Dernier snapshot
    const snapRes = await fetch(`${SUPABASE_URL}/rest/v1/bandi_snapshots?order=date.desc&limit=7`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const snapshots = await snapRes.json();

    if (!snapshots || snapshots.length === 0) throw new Error('No data');

    const today = snapshots[0].date;
    const current = snapshots[0];
    const previous = snapshots[1] || current;

    // Pays du jour
    const paysRes = await fetch(`${SUPABASE_URL}/rest/v1/bandi_country_rankings?date=eq.${today}&order=rang.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const pays = await paysRes.json();

    // Top 10 monde
    const top10Res = await fetch(`${SUPABASE_URL}/rest/v1/netflix_tv_top10_world?date=eq.${today}&order=rang.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const top10 = await top10Res.json();

    // Remplacer BANDI par les données live
    window.BANDI = {
      ...BANDI,  // Garde la structure statique (casting, synopsis, etc.)
      current: {
        score: current.score_monde,
        rang: current.rang_monde,
        paysN1: current.pays_n1,
        paysTop10: current.pays_top10,
        rangMoyen: current.rang_moyen
      },
      previous: {
        score: previous.score_monde,
        rang: previous.rang_monde,
        paysN1: previous.pays_n1,
        paysTop10: previous.pays_top10,
        rangMoyen: previous.rang_moyen
      },
      historique: snapshots.reverse().map(s => ({
        jour: s.date.slice(5).replace('-', '/'),
        label: '',
        score: s.score_monde,
        rang: s.rang_monde,
        paysN1: s.pays_n1,
        paysTop10: s.pays_top10,
        rangMoyen: s.rang_moyen
      })),
      pays: pays.length > 0 ? pays.map(p => ({
        ...BANDI.pays.find(bp => bp.pays === p.pays || bp.pays.toLowerCase() === p.pays.toLowerCase()) || {},
        pays: p.pays,
        rang: p.rang,
        region: p.region,
        flag: (BANDI.pays.find(bp => bp.pays === p.pays)?.flag) || '🏳️'
      })) : BANDI.pays,
      rivals: top10.length > 0
        ? top10.map(t => ({
            titre: t.titre,
            score: t.score,
            isBandi: t.titre.toLowerCase().includes('bandi')
          }))
        : BANDI.rivals
    };
  } catch (err) {
    console.warn('⚠️ Fallback sur données statiques', err);
    // BANDI reste celui du data-fallback.js
  }
}

// Reste du code : copier INTÉGRALEMENT le contenu de src/app.js
// [... utils, initTabs, initLiveClock, renderOverview, renderChart, etc. ...]

// MODIFIER uniquement le DOMContentLoaded final :
document.addEventListener('DOMContentLoaded', async () => {
  await loadLiveData();  // ← Charger données live AVANT render
  initTabs();
  initLiveClock();
  renderOverview();
  renderChart();
  renderRegionFilters();
  renderCountries();
  initCountrySearch();
  renderRivals();
  renderSeriesTab();
});
```

**Important pour l'injection des clés Supabase dans public/js/app.js** :

Option simple : créer `public/js/config.js` avec les valeurs en clair (c'est l'anon key, c'est fait pour être publique) :

```javascript
window.SUPABASE_CONFIG = {
  url: 'https://xxx.supabase.co',
  anonKey: 'eyJ...'
};
```

Et l'inclure AVANT app.js dans le HTML. Puis dans app.js, lire `window.SUPABASE_CONFIG.url`.

Ce fichier config.js est à générer dynamiquement après avoir reçu les clés Supabase d'Allan.

---

## ⚠️ Choses IMPORTANTES à savoir

1. **User-Agent réaliste obligatoire** dans le scraper, sinon FlixPatrol bloque
2. **Les URLs d'images** dans `public/index.html` doivent être `assets/...` (relatif)
3. **Ne jamais commiter le `.env`** (déjà dans .gitignore)
4. **Scraping FlixPatrol = zone grise légale** : usage interne/démo OK, commercial nécessite l'API payante
5. **Si le HTML change sur FlixPatrol**, le scraper cassera — ajouter une alerte email Supabase Edge Function plus tard
6. **Quota Supabase free** : 500 MB, largement suffisant pour ce projet (~1 KB/jour)
7. **Quota GitHub Actions free** : 2000 min/mois, on utilise ~30 sec × 4/jour × 30j = 60 min/mois

---

## 🧪 Tests à faire avant de rendre à Allan

- [ ] `node scripts/test-scraper.js` → ✅ connexion Supabase
- [ ] `node scripts/scraper.js` → ✅ insertion données
- [ ] Ouvrir `public/index.html` localement → charge les données Supabase
- [ ] URL Netlify accessible → ✅
- [ ] `gh workflow run scrape.yml` → ✅ s'exécute
- [ ] Attendre 5 min puis vérifier Supabase Table Editor : nouvelles lignes présentes

---

## 📞 Que rendre à Allan à la fin

Message final type :

```
✅ Déploiement terminé

🌐 Dashboard public :
https://bandi-dashboard.netlify.app

📦 Code source :
https://github.com/[user]/bandi-dashboard

🗄️ Base de données :
https://supabase.com/dashboard/project/[id]

⏰ Mise à jour automatique :
Toutes les 6h (00h, 06h, 12h, 18h UTC)
→ Prochaine exécution dans X minutes

📊 État actuel :
- Bandi est #X mondial
- Y pays #1
- Z pays dans le top 10

Pour partager à ton collègue : copie simplement l'URL Netlify.
Le dashboard tourne seul indéfiniment.

⚠️ À savoir :
- Si FlixPatrol change son HTML, le scraper peut casser
  → je te recommande de checker une fois par mois
- Quota GitHub Actions : ~60 min/mois utilisées (sur 2000 gratuit)
- Pour un usage commercial, passer sur l'API FlixPatrol payante
```

---

## 🎯 Résumé de ce que tu dois faire

1. Créer tous les fichiers listés dans "Fichiers à créer"
2. Demander à Allan les clés Supabase (une seule fois, message clair)
3. Installer deps, tester localement
4. Push GitHub, configurer secrets
5. Déployer Netlify avec variables d'env
6. Déclencher workflow
7. Vérifier que tout tourne
8. Rendre compte à Allan avec l'URL finale

**Ne pas poser de questions supplémentaires à Allan au-delà des clés Supabase.**
**Procéder de façon autonome sur tout le reste.**

Allez, au travail. 🔥
