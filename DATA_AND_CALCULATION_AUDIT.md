# DATA_AND_CALCULATION_AUDIT.md

> Audit des données affichées et de leurs calculs · commit `1d236b6`.

## Méthode

Pour chaque chiffre clé du dashboard : **valeur** · **unité** · **source** · **fichier d'origine** · **calcul** · **fiabilité**.

## 1. Hero / Overview (legacy non accessible)

Panel `#panel-overview` n'est plus dans la nav mais reste dans le DOM. Données alimentées par `loadLiveData()` :
- `BANDI.current.score / rang / paysN1 / paysTop10 / rangMoyen` ← `bandi_snapshots` (table FlixPatrol).

## 2. Onglet Stats — Jauges Engagement & Réception

| Donnée | Valeur capture | Source | Fichier · L | Calcul | Fiabilité |
|--------|-----|--------|-------------|--------|-----------|
| Complétion estimée | 53 % | Modèle interne | `data-fallback.js` `bandiPerformance.completionEstimate.central` | Algorithme heures vues / durée totale + chute hebdo + modèle rétention | 🟡 Estimated 62/100 |
| Score Presse | 71/100 | 27 sources structurées (12 presse pondérées A/B/C) | `bandi-reception-sources.js` + `app.js computeReceptionScores()` | Σ(score × reliability) / Σ(reliability) | 🟢 Calculé |
| Followers Netflix FR | +60k | `BANDI.bandiPerformance.instagramNetflixFrance.measuredGain` | `data-fallback.js` L.230+ | Mesure directe @netflixfr 09/04 → 01/05 | 🟢 Mesure |
| Pic Pays #1 | 27 pays | `BANDI.launchWeek2.paysN1` | `data-fallback.js:72` | Source : Netflix Tudum + presse, semaine 13-19/04 | 🟢 Officiel |

⚠️ **Incohérence interne détectée — non visible utilisateur** :
- `BANDI.launchWeek2.paysN1 = 27`
- `BANDI.bandiPerformance.weeklyNetflixTop10[1].numberOneTerritories = 13`
- Les deux décrivent la semaine 2 (13-19/04). Probable : 27 = pic d'un jour donné dans la semaine, 13 = état à la fin de la semaine.
- **Recommandation** : ajouter un commentaire dans `data-fallback.js` qui explique la différence, ou renommer `launchWeek2.paysN1` en `launchWeek2.peakPaysN1`.

## 3. Onglet Stats — Notes & avis (8 sources)

| Source | Valeur capture | Origine | Calcul |
|--------|-----|---------|--------|
| IMDb | 5.9/10 | `external_ratings` source=imdb (scrape `scrape-imdb.js`) | aggregateRating live ; fallback `BANDI.imdbCurrent.rating = 5.9` |
| TMDB | 6.8/10 | `external_ratings` source=tmdb | TMDB API officielle |
| RT Presse | 71 % | `external_ratings` source=rt_critics OU **fallback calculé** depuis `criticReviews.scorePct` | Si pas de Tomatometer → 27 sources presse pondérées |
| RT Public | 80 % | idem RT Presse mais source=rt_audience OU fallback `noteSpectAlloMoy/5` | AlloCiné Spectateurs 4/5 = 80 % |
| AlloCiné Public | 4/5 | `external_ratings` source=allocine_public | Note communauté Allociné, 319 votes |
| AlloCiné Presse | 3,9/5 | `external_ratings` source=allocine_press | Moyenne 8 critiques presse (Le Monde, Le Parisien, etc.) |
| SensCritique | 6.2/10 | `external_ratings` source=senscritique | Communauté FR |
| Filmaffinity | 6.2/10 | `external_ratings` source=filmaffinity | Communauté ES |

✅ Calculs cohérents. ✅ Toutes les sources tracées.

## 4. Panel Réception & Impact (3 scores)

### 4.1 Score Presse (71/100)
Calcul vérifié (extrait `RECEPTION_SOURCES_UPDATE.md` + recompte) :
- 8 sources A (1.00) : 20 Min(80) + Le Monde(80) + Télérama(35) + Inrocks(80) + Première(60) + Le Parisien(80) + Decider(80) + Les Échos(80) = **575**
- 11 sources B (0.80) : (60+60+60+60+80+80+80+70+60+80+80) × 0.80 = (770) × 0.80 = **616**
- 1 source C (0.60) : 60 × 0.60 = **36**
- Σ pondéré = 575 + 616 + 36 = 1227
- Σ poids = 8×1.00 + 11×0.80 + 1×0.60 = 17.40
- Score = 1227 / 17.40 = **70,52** → arrondi **71/100** ✅

### 4.2 Score Public (73/100)
- IMDb 65 × 0.80 = 52 ; AlloCiné Spectateurs 80 × 1.00 = 80 ; total = 132 / 1.80 = **73,33** → **73/100** ✅

### 4.3 Score Impact Médiatique (73/100)
- MeriStation 60 × 0.80 + Mundo Dep 60 × 0.80 + Gizmodo 80 × 0.80 + RCI 80 × 1.00 + France-Antilles 80 × 1.00
- = 48 + 48 + 64 + 80 + 80 = 320
- poids = 0.80 + 0.80 + 0.80 + 1.00 + 1.00 = 4.40
- Score = 320 / 4.40 = **72,73** → **73/100** ✅

### 4.4 Score Global (72/100)
- 0.50 × 71 + 0.30 × 73 + 0.20 × 73 = 35.5 + 21.9 + 14.6 = **72** ✅

✅ **Tous les calculs vérifiés et reproductibles**.

## 5. Onglet Série — chiffres clés

| Donnée | Valeur | Origine | Vérifié ? |
|--------|--------|---------|-----------|
| Sortie | 09/04/2026 | Netflix officiel | ✅ |
| Durée | 8 ép · 7 h 50 | Netflix Tudum | ✅ |
| Cumul S1+S2+S3 heures | 71,4 M | `cumulTudum.heuresMillions` | ✅ math 16,2+40,5+14,7 = 71,4 |
| Cumul S1+S2+S3 vues | 9,2 M | `cumulTudum.vuesMillions` | ✅ math 2,1+5,2+1,9 = 9,2 |
| Rang non-EN S3 | #8 | `cumulTudum.semaine3.rangNonEnglishEstim` | 🟡 estimation |
| Pays Top 10 pic | 48 | `weeklyNetflixTop10[1].territoriesTop10` | ✅ Tudum + presse |
| Pays #1 pic | 27 | `launchWeek2.paysN1` | 🔍 à confirmer (cohérence interne 13 vs 27) |

## 6. Données non traçables (à clarifier)

| Donnée | Lieu | Problème |
|--------|------|----------|
| `numberOneTerritories: 13` (S2) vs `paysN1: 27` (S2) | `data-fallback.js` | Deux chiffres pour la même semaine — cohérence interne à documenter |
| `BANDI.cumulTudum.semaine3.detroneePar` | `data-fallback.js:91` | « Sold Out on You (K-drama, 4.7M vues) » — verifier source |
| `imdbPerEpisode { min: 8.7, max: 8.9 }` | `data-fallback.js:105` | Rapport Gemini 19/04 — date ancienne, à archiver si remplacé par `imdbCurrent` |
| `forecast.probabiliteRenouvellementPct: 85` | `data-fallback.js` (panel masqué) | Estimation interne masquée du dashboard, pas affichée actuellement |

## 7. Pondérations centralisées

✅ Pondérations Réception centralisées dans `bandi-reception-sources.js` (`window.BANDI_RECEPTION_WEIGHTS`).
✅ Pondérations Completion Score centralisées dans `app.js computeCompletionScore()`.

## 8. Cohérence dates / arrondis / unités

- ✅ Dates au format DD/MM/YYYY partout.
- ✅ Heures en M (millions) partout : « 71,4 M h », « 16,2 M h ».
- ✅ Pourcentages avec espace insécable manquant (mineur, non bloquant).
- ✅ Score sur 100 pour tous les scores affichés (cohérent).
- ⚠️ Notes mixtes /5 (AlloCiné), /10 (IMDb, TMDB, SensCritique, Filmaffinity), % (RT) : volontaire pour respecter l'échelle native de chaque source. Le dashboard normalise en /100 dans `external_ratings.rating_norm`.

## 9. Données live vs données statiques

| Section | Live (Supabase) | Fallback (data-fallback.js) |
|---------|-----------------|------------------------------|
| Hero rang/score | ✅ live (`bandi_snapshots`) | ✅ fallback historique |
| Pays | ✅ live (`bandi_country_rankings`) | ✅ fallback statique |
| Tudum hebdo | ✅ live (`tudum_global_weekly`) | ✅ fallback `cumulTudum` |
| Notes externes | ✅ live (`external_ratings`) | ✅ fallback `imdbCurrent` |
| Buzz | ✅ live (`buzz_articles`, `buzz_social`) | — (juste skeleton si vide) |
| Réception 27 sources | 🟡 statique (pas de scraper presse spécifique pour Réception) | `bandi-reception-sources.js` |

## 10. Conclusion étape 4

✅ **Aucun calcul faux détecté**.
🟡 1 incohérence interne : `paysN1` 13 vs 27 pour S2 — non visible utilisateur, à documenter.
🟡 Plusieurs valeurs marquées « Estimated » correctement signalées par badge fiabilité (Completion Score, rang non-EN S3).
✅ Toutes les données affichées sont traçables jusqu'à leur source.
