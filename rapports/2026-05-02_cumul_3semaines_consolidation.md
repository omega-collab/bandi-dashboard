---
date: 2026-05-02
source: Netflix Tudum + What's on Netflix + Allociné
type: rapport-cumul
periode: 06/04 – 26/04/2026 (3 semaines complètes)
sujet: Bilan 3 semaines Bandi + consolidation notes
statut: integre-dashboard
---

# Bandi · Bilan 3 semaines Top 10 mondial

## Cumul Tudum officiel + What's on Netflix

| Métrique | Valeur |
|---|---|
| Semaines au Top 10 mondial (non-English) | **3** (S1 → S3) |
| Vues complètes cumulées | **9,2 M** |
| Heures visionnées cumulées | **71,4 M** |
| Pic atteint | #1 (semaine 2) |

## Détail par semaine

| Semaine | Période | Rang non-EN | Vues (M) | Heures (M) | Notes |
|---|---|---|---|---|---|
| S1 | 06–12/04/2026 | #6 → pic #2 | 2,1 | 16,2 | partielle (sortie 09/04 jeudi) |
| S2 | 13–19/04/2026 | **#1** | **5,2** | ~40,5 (+150% vs S1) | confirmation mondiale |
| S3 | 20–26/04/2026 | ≈ #5 | ~1,9 (calculé) | ~14,7 (calculé) | détrôné par *Sold Out on You* (KR, 4,7M) |

## Calcul S3 (par soustraction du cumul officiel)
- 9,2 M total − 2,1 (S1) − 5,2 (S2) = **1,9 M vues S3**
- 71,4 M total − 16,2 − 40,5 = **14,7 M heures S3**
- Chute heures : -64 % entre S2 et S3 (normal après #1, équivalent à *Beef S2* qui a perdu 60% S2 vs S1)

## Notes externes — état mai 2026

| Source | Note | Notes |
|---|---|---|
| **IMDb** | **6,2 / 10** | Note série consolidée (avant 5,9, voir Screen Rant) |
| **TMDB** | 6,72 / 10 | Stable |
| **Allociné Presse** | **3,9 / 5** | base élargie : **7 critiques** (vs 3 au 19/04) |
| **Allociné Public** | **4,0 / 5** | **284 votes** + 83 critiques rédigées |
| **SensCritique** | 6,1 / 10 | Stable |
| **Filmaffinity** | 6,3 / 10 | Stable |
| **RT Presse** | – | Toujours 1 critique (Decider) |
| **RT Public** | – | Pas encore actif (Tomatometer absent) |

## Polémique signalée
- *Scène du chien* : Netflix a dû s'expliquer (PureBreak)
- Question récurrente "Bandi est-elle surcotée?" (Fnac Leclaireur)

## Renouvellement saison 2
- **Pas confirmé** par Netflix au 02/05/2026
- Éric Rochant : "tout dépendra de l'audience" / "on s'y prépare"
- Source : The Review Geek, NetflixJunkie, OurCultureMag

## Intégration dashboard

- `data-fallback.js` :
  - Nouveau `cumulTudum` (3 semaines, 71.4M h, 9.2M vues, semaine3 estimée)
  - Nouveau `imdbCurrent: { rating: 6.2, max: 10 }` — fallback série consolidé
  - `criticReviews` enrichi : `notePresseAlloN: 7`, `noteSpectAlloMoy: 4.0`, `noteSpectAlloN: 284`
- `index.html` :
  - Nouveau panel `#cumulTudumPanel` (4 stat-cards : 3 sem · 9,2M · 71,4M · ≈ #5)
  - `criticReviews` row : split Allociné Presse + Public avec n votes
- `app.js` :
  - `renderSeriesTab()` alimente `cumulTudumPanel`
  - `renderMonRatings()` 2 niveaux fallback IMDb (série puis épisodes)
  - `renderCriticReviews()` lit `noteSpectAlloMoy` + counts
- Cache-bust : `20260424c` → `20260502a`

## À surveiller (cron auto)

- Tudum semaine 4 (27/04–03/05) : sortie attendue mardi 05/05 → cron 2h pull auto
- IMDb : quand le scraper (toutes les 6h) remontera la note 6.2 live, le fallback s'effacera
- RT : si à terme RT publie un Tomatometer, le scraper multi-slug le verra (PR #8)
