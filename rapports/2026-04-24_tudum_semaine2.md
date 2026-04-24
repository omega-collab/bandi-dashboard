---
date: 2026-04-24
source: Netflix Tudum · Top 10 officiel
type: rapport-officiel
periode: 13–19/04/2026 (semaine 2)
sujet: Performance hebdomadaire Bandi
statut: integre-dashboard
url: https://www.netflix.com/tudum/articles/top-10-april-13-2026
---

# Netflix Tudum — Semaine 2 Bandi (13–19/04/2026)

## Chiffres officiels

| Métrique | Valeur | Source |
|---|---|---|
| Rang TV Non-English | **#1** | Tudum top-10-april-13-2026 |
| Vues complètes | **5,2 M** | Tudum |
| Croissance heures vues vs S1 | **+150 %** | Tudum |
| Pays #1 Netflix | **27** | Tudum |
| Pays Top 10 | **57** (= S1) | Tudum |
| Rang Netflix mondial (toutes cat.) | **#2** | Tudum |

## Comparaison S1 → S2

| Métrique | Semaine 1 (06–12/04) | Semaine 2 (13–19/04) | Delta |
|---|---|---|---|
| Rang TV Non-English | #6 (entrée) → #2 (pic) | **#1** | +5 places entrée → #1 |
| Vues | 2,1 M (4 jours) | **5,2 M** (7 jours) | +148 % brut |
| Heures vues (M) | 16,2 | ~40,5 estimé | **+150 %** |
| Pays Top 10 | 57 | 57 | = |

## Contexte presse autour de la sortie S2

- *Screen Rant* : "Netflix's gritty new 8-part crime series is taking over streaming worldwide"
- *Netflix and Chiffres* (FR) : "BEEF se vautre et Bandi bondit"
- *Business Upturn* : discussion S2 renewal prématurée (signal fort d'anticipation)

## Intégration dashboard

- `public/js/data-fallback.js` : nouveau champ `launchWeek2` avec tous les chiffres
- `public/index.html` : panel `#launchWeek2Panel` dans l'onglet Fiche série (4 stat-cards : #1, 5.2M, +150%, 27 pays N°1)
- `public/js/app.js` : `renderSeriesTab()` alimente les cards à partir de `BANDI.launchWeek2`
- `public/css/styles.css` : classe `.stat-card--accent` (gradient or/rouge/vert) pour la card #1

## À surveiller semaine 3 (20–26/04/2026)

- Maintien en #1 vs débarquement de nouvelles séries EN (surtout "Roommates", "Beef S2")
- Chute prévue ~30-40 % naturelle, voir si Bandi résiste
- TSV Netflix publié mardi 28/04 — le scraper `scrape-tudum.js` le pullera automatiquement (cron 2h maintenant que le workflow appelle le bon fichier — fix f37a388)
