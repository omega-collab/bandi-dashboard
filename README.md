# 🎬 Bandi Live Dashboard

Dashboard de suivi temps réel de la série Netflix **Bandi**, identité visuelle Martinique (drapeau rouge-vert-noir).

**📖 Pour déployer** → lire [DEPLOY.md](./DEPLOY.md)
**🤖 Pour Claude Code** → il lira automatiquement [CLAUDE.md](./CLAUDE.md)

## Stack

- **Frontend** : HTML/CSS/JS vanilla, Chart.js, fonts Anton + Inter Tight
- **Backend** : Supabase (PostgreSQL + REST API)
- **Scraper** : Node.js + Cheerio (cible FlixPatrol)
- **Cron** : GitHub Actions toutes les 6h
- **Hébergement** : Netlify
- **Coût** : 0 € en utilisation normale

## Architecture

```
┌──────────────────────────────────────────────────┐
│  GitHub Actions (cron 6h)                        │
│  └─ scripts/scraper.js                           │
│     └─ Scrape flixpatrol.com/title/bandi/        │
└────────────────┬─────────────────────────────────┘
                 │ upsert
                 ▼
┌──────────────────────────────────────────────────┐
│  Supabase (PostgreSQL)                           │
│  ├─ bandi_snapshots         (1 ligne/jour)       │
│  ├─ bandi_country_rankings  (37 lignes/jour)     │
│  └─ netflix_tv_top10_world  (10 lignes/jour)     │
└────────────────┬─────────────────────────────────┘
                 │ REST API (anon key, RLS)
                 ▼
┌──────────────────────────────────────────────────┐
│  Netlify (CDN statique)                          │
│  └─ public/index.html                            │
│     └─ public/js/app.js fetch au chargement      │
└──────────────────────────────────────────────────┘
```

## Structure

```
bandi-live/
├── CLAUDE.md                # Instructions auto-déploiement
├── DEPLOY.md                # Guide utilisateur
├── README.md                # Ce fichier
├── package.json
├── netlify.toml
├── .env.example
├── .gitignore
│
├── public/                  # Site déployé
│   ├── index.html
│   ├── assets/              # Visuels Bandi
│   ├── css/styles.css
│   └── js/
│       ├── config.js        # Clés Supabase (publiques)
│       ├── data-fallback.js # Données par défaut
│       └── app.js           # Fetch Supabase + render
│
├── scripts/
│   ├── scraper.js           # Scrape FlixPatrol → Supabase
│   └── test-scraper.js      # Vérif connexion
│
├── supabase/
│   └── schema.sql           # Schéma DB
│
└── .github/workflows/
    └── scrape.yml           # Cron 6h
```

## Limites

- Scraping FlixPatrol : zone grise légale. OK pour usage interne, commercial → API Premium payante.
- Le HTML FlixPatrol peut changer : scraper à maintenir.
- Free tier Supabase : 500 MB DB, largement suffisant (~1 KB/jour stocké).

## Palette

- Rouge `#CE1126` · Vert `#009739` · Noir `#0A0A0A` (drapeau Martinique officiel 02/02/2023)
- Or `#D4A017` (accent lumière caribéenne)

Made in Martinique 🇲🇶
