# SOURCE_TRACEABILITY_AUDIT.md

> Traçabilité des sources affichées · commit `1d236b6`.

## Méthode

Pour chaque donnée affichée → où vient-elle ? Quelle fiabilité ?

## Échelle de fiabilité (rappel `bandi-reception-sources.js`)

- **A** : source officielle ou primaire (1.00)
- **B** : média reconnu / source secondaire fiable (0.80)
- **C** : agrégateur ou source indirecte (0.60)
- **D** : source faible / non vérifiée (0.35)
- **E** : aucune source ou inutilisable (0)

## 1. Sources institutionnelles utilisées par le dashboard

| Source | Fiab. | Type | Utilisé pour | Tracée |
|--------|-------|------|--------------|--------|
| **Netflix Tudum** | A | Officiel primaire | Top 10 mondial · heures vues · cumul | ✅ scrape-tudum + résumé statique |
| **FlixPatrol** | B | Secondaire | Rangs par pays quotidiens (Netflix ne publie pas) | ✅ scraper.js |
| **IMDb** | B | Public | Note communautaire 5.9/10 | ✅ scrape-imdb |
| **TMDB** | B | Public | Note communautaire 6.8/10 | ✅ scrape-tmdb (API officielle) |
| **AlloCiné Spectateurs** | A | Public FR | 4/5, 319 votes | ✅ scrape-allocine |
| **AlloCiné Presse** | A | Agrégat presse FR | 3,9/5 sur 8 critiques | ✅ scrape-allocine |
| **SensCritique** | B | Public FR | 6.2/10 | ✅ scrape-senscritique |
| **Filmaffinity** | B | Public ES | 6.2/10 | ✅ scrape-filmaffinity |
| **Rotten Tomatoes** | B | Agrégat US | 1 critique seule (pas de Tomatometer affichable) | ✅ scrape-rottentomatoes |
| **Wikipedia REST** | A | Officiel | Pageviews FR + EN (signal d'intérêt) | ✅ scrape-wikipedia |

## 2. Sources presse documentées (27 dans `bandi-reception-sources.js`)

Le détail est dans `RECEPTION_SOURCES_UPDATE.md`. Récap :

- **Presse critique (20 sources)** : 12 originales + 8 ajoutées 07/05.
- **Public (2 sources)** : IMDb + AlloCiné Spectateurs.
- **Impact médiatique (5 sources)** : RCI Martinique, France-Antilles, MeriStation, Mundo Deportivo, Gizmodo Español.
- **Contrôle non comptés (2 sources)** : AlloCiné Presse, Rotten Tomatoes.

🟡 **Limites identifiées** :
- **8 sources presse** ont des URLs marquées « à confirmer » dans le champ `notes` (Les Échos, Télé 7 Jours, Téléstar, Taxidrivers, Mix de Séries, Flixlândia, Sala de Cinema, Martin Cid). Ces ajouts sont basés sur la liste Allan sans vérification web possible côté agent.
- **Sala de Cinema** : marquée fiabilité **C** (0.60) car article reprend des chiffres RT/IMDb non recoupés.
- **Martin Cid** : une seule entrée — version PT et ES sont la même traduction, pas dédoublées.

## 3. Sources non sourcées affichées

✅ Aucune valeur affichée n'est sans source identifiable au moment de l'audit.

## 4. Liens externes potentiellement cassés

| URL | Statut |
|-----|--------|
| `raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson` | 🔍 dépendance externe carte — vérifier disponibilité régulière |
| URLs articles presse dans `bandi-reception-sources.js` | 🔍 8 sources avec `notes: "URL à confirmer"` |
| `https://www.imdb.com/title/tt37024175/` | ✅ vérifié dans CLAUDE.md |
| URLs scrapers (FlixPatrol, AlloCiné, etc.) | ✅ utilisées par scrapers, errors loggés en CI |

## 5. Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Si FlixPatrol change son HTML | Scraper casse silencieusement | Workflow `continue-on-error: true` + alerte fraîcheur > 7j |
| Si Cloudflare bloque les scrapers | Rangs pays absents | ✅ Fallback Playwright en place (`_fetch-html.js`) |
| Si Supabase tombe | Dashboard en mode fallback statique | ✅ `data-fallback.js` couvre tout · banner « Données non live » via `health-guard.js` |
| Si APIFY_API_TOKEN expire (Instagram) | Posts IG non scrapés | Fallback RSSHub gratuit ; warn si silence > 7j |

## 6. Recommandations actions

1. **Documenter dans CLAUDE.md** la différence `numberOneTerritories: 13` vs `paysN1: 27` (S2).
2. **Vérifier manuellement** les 8 URLs presse marquées « à confirmer » dans `bandi-reception-sources.js`.
3. **Ajouter un test** qui ping les URLs sources critiques 1×/semaine (en option).
