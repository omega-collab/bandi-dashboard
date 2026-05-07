# PAGE_BY_PAGE_AUDIT.md

> Audit onglet par onglet du dashboard BANDI (commit `1d236b6`).
> Format : pour chaque problème → `gravité` · `type` · `correction recommandée` · `statut`.

Légende :
- 🔴 critique · 🟡 important · 🟢 mineur
- Statut : ✅ corrigé / 🔧 à corriger / 🔍 à vérifier / 📝 à reformuler / 🚫 à masquer / ❓ à confirmer avec Allan

---

## 1. Onglet **Série** (par défaut, `#panel-series`) — `panel-series` actif au chargement

### 1.1 Fiche série
- **Synopsis (L.844–855)** : reformulé 07/05 (« Plus qu'une série, BANDI représente… »). ✅ OK.
- **Bandi en chiffres** : 11 entrées (sortie, durée, pays #1, etc.). 🔍 vérifier date sortie 09/04/2026, durée 8 ép · 7 h 50.
- **Lancement mondial S1** : 6–12 avril 2026 · #6 · 16,2 M h · 2,1 M vues. Source Tudum officiel. ✅ OK.
- **Semaine 2** : 13–19 avril · #1 · 40,5 M h · 5,2 M vues. ✅ OK.
- **Cumul 3 semaines** : 71,4 M h · 9,2 M vues · #8 S3. ✅ math vérifiée 16,2+40,5+14,7=71,4 et 2,1+5,2+1,9=9,2.

### 1.2 Réception & Impact (refondu 07/05)
- **3 scores séparés** + score global · 27 sources documentées. ✅ refonte effectuée.
- **Couleurs scores** : 🔴 résolu — couleurs basées sur valeur (≥70 vert · 50-69 or · <50 rouge), barre verticale gauche pour catégorie. ✅ commit `1d236b6`.
- **Pluriels** : « 1 négatifs » → « 1 négatif ». ✅ commit `4e97cf5`.
- **Bouton Voir les sources** ouvre modale avec 27 sources détaillées. ✅
- **Méthode pondération** : encart explicatif présent. ✅

### 1.3 Authenticité (masqué)
- `#authenticite-module` : `style="display:none"` — masqué après audit 06/05 car claim non vérifiable publiquement. ✅ OK (réactivable).

### 1.4 Équipe créative + Casting
- 🔍 Vérifier la cohérence des noms (Éric Rochant, Capucine Rochant) : OK source presse Le Monde / Première.

---

## 2. Onglet **Stats** (Monitoring, `#panel-monitoring`)

### 2.1 Jauges Engagement & Réception
- **Complétion estimée 53 %** · or, modèle interne 62/100. ✅ source : signaux S2 saison.
- **Score Presse 71/100** · vert (jauge basée sur valeur). ✅ cohérent avec panel Réception (depuis fix `1d236b6`).
- **Followers Netflix FR +60k** · or, mesure directe @netflixfr 09/04→01/05. 🔍 vérifier dernière mesure (peut être obsolète si > 7j).
- **Pic Pays #1 : 27 pays simultanés** · or, label « Netflix Tudum · S2 ». 🔧 **PROBLÈME** : la valeur affichée provient de `BANDI.bandiPerformance.weeklyNetflixTop10[1].numberOneTerritories` qui est `13`. Le `27` semble venir d'une autre source. 🔍 **À VÉRIFIER source/calcul exact**.

### 2.2 Notes & avis du public (8 sources)
- IMDb 5.9, TMDB 6.8, RT Presse 71 %, RT Public 80 %, AlloCiné Public 4/5, AlloCiné Presse 3,9/5, SensCritique 6.2, Filmaffinity 6.2.
- 🔴 **RT Presse / RT Public en orange** : ✅ corrigé commit `e9e2134` (force vert pour fallback calculé).
- **Sous-titre « 8 sources »** : 🟡 il y a en réalité 8 sources de notes (imdb, tmdb, rt_critics, rt_audience, allocine_public, allocine_press, senscritique, filmaffinity). ✅ cohérent.
- **« mise à jour toutes les 6h »** : 🔧 **OBSOLÈTE** — depuis le 06/05 les scrapers tournent **1×/jour à 00:00 UTC** (cf. CLAUDE.md). 📝 à corriger.

### 2.3 Fraîcheur des données (8 tables)
- **« il y a -462 min »** sur Classements / Pays / Top 10 TV / Notes externes : ✅ corrigé commit `e9e2134` (clamp h à 0 si négatif).
- **Tudum officiel « — »** : ✅ corrigé commit `e9e2134` (fallback `BANDI.cumulTudum.fetchedAt`).
- **« 8 tables · collecte quotidienne »** : ✅ correct.
- 🔍 **Wikipedia 16h orange** : indique que le scraper Wikipedia n'a pas tourné dans les 12h ; cohérent avec cron quotidien.
- 🔍 **Réseaux sociaux 1j orange** : idem.

### 2.4 Scrapers (5 workflows)
- Liste : Classements FlixPatrol · Netflix Tudum officiel · Presse + GDELT · Reddit · YouTube · Bluesky · 8 sources notes + Wikipedia.
- **« Tudum scrape.yml »** apparaît jaune dans capture du 07/05 → cron mardi seulement, normal s'il n'a pas tourné aujourd'hui.
- 🔍 « cliquez pour voir les logs » : vérifier que le lien GitHub Actions fonctionne pour chaque scraper.

---

## 3. Onglet **Pays** (`#panel-countries`)
- Recherche pays + filtres région.
- Liste pays trié par rang.
- 🔍 Vérifier que le filtre région se met à jour si pays sortis du Top 10.
- **Carte Martinique en fond** : « #1 depuis la sortie, dans un pays de 360 000 habitants ».
  - 🔧 **POTENTIEL PROBLÈME** : « #1 depuis la sortie » est-il toujours vrai ? Si la Martinique est descendue à #2 récemment (cf. capture précédente), texte trompeur. 📝 à vérifier dynamiquement.

---

## 4. Onglet **Buzz** (`#panel-buzz`) — refondu plan elegant-wondering-hollerith
- **Skeleton loading** ✅
- **3 états dédiés** : empty filtré · DB vide · erreur. ✅
- **Filtres** : Type / Source / Plateforme / Période. ✅
- **Bouton retry** ✅
- **Lazy load images** ✅
- **Trends Google chart** caché si vide. ✅

🔍 **Vérifier en live** : que le filtre Instagram remonte bien des posts (rétabli 07/05, scraper actif via APIFY_API_TOKEN).
🔍 **Période « Aujourd'hui / 7j / 30j / Tout »** : par défaut « Tout » est actif. À vérifier que les compteurs sur chaque bouton sont cohérents.

---

## 5. Onglet **Signaux** (`#panel-signals`) — refondu 06/05
- Titre simplifié : « Signaux pour une saison 2 ».
- **Disclaimer S2** : « aucune annonce officielle à ce jour ». ✅
- **Fiabilité des chiffres** (anciennement Confidence Index) : 9 items (réduit de 13 à 9 après audit 07/05). ✅
- **Performance semaine par semaine** : tableau Tudum. ✅
- **Combien restent regarder, épisode après épisode ?** : funnel. 🔍 source = modélisation interne, à confirmer dans data.
- **Ce qui joue pour ou contre une saison 2** : Risk Matrix 9 lignes (réduit de 12 à 9 après audit 07/05). ✅
- **Croissance Instagram Netflix France** : +X followers mesurés 09/04→01/05.

---

## 6. Onglet **Historique** (`#panel-history`)
- **Score & Rang 30 derniers jours** : Chart.js bi-axe. ✅
- **Performance par pays** : filtres région · clic sur ligne ouvre modale détail pays. ✅
- **Tous les pays passés dans le Top 10** : panel ajouté 07/05 · 56 pays au total · clic ouvre modale détail. ✅
- **Modale détail pays** : courbe rang · 3 filtres (période · comparaison · échelle) · zoom interactif (molette/pinch). ✅

🔧 **À VÉRIFIER** : « Sorti du Top 10 » sur certains pays alors qu'ils peuvent y être encore (la liste agrège 500 lignes mais si la table avait > 500 lignes la donnée serait incomplète).

---

## 7. Onglet **Carte** (`#panel-map`)
- **4 modes** : Par rang · Par progression · Momentum 7j · **Historique 56 pays** (ajouté 07/05).
- **Filtres mode Historique** : fenêtre (Tout · S1 · S2 · S3 · 7j) + métrique (meilleur rang · durée Top 10).
- **Popup au clic** : présent / sorti / fenêtre, adapté au mode.
- 🔍 **Vérifier** : le GeoJSON externe (`raw.githubusercontent.com/datasets/geo-countries`) est-il toujours dispo ? Sinon → erreur silencieuse.

---

## 8. Onglet **Concurrence** (rivals) — masqué
- ✅ commenté dans top nav et bottom nav (Bandi sorti du Top 10).
- Panel `#panel-rivals` reste dans le DOM (réactivable rapidement si Bandi y revient).

---

## 9. Header (toutes pages)
- **Bloc LIVE** :
  - ✅ Badge classement #rang **retiré du DOM** (commit `181ee85`).
  - **Live time** met à jour chaque seconde.
- **Logo BANDI** + sous-titre « DASHBOARD MONDIAL NETFLIX ». ✅

---

## 10. Footer (toutes pages)
- « Source : FlixPatrol · Netflix Tudum · MAJ DD/MM/YYYY · HH:MM ». 🔍 vérifier que la date affichée vient d'un timestamp live.
- « Made in Martinique 🇲🇶 ». ✅

---

## 11. Modales

### 11.1 Modale détail pays (`#countryModal`)
- Backdrop semi-transparent (45 %, blur 2 px) → laisse voir le dashboard derrière. ✅
- Fermeture : croix · clic backdrop · `Escape`. ✅
- Filtres : période / comparaison (vs rang mondial / vs moyenne région) / échelle. ✅
- Bouton Reset zoom. ✅
- Hint « molette · pincer · glisser ». ✅

### 11.2 Modale "Voir les sources" (`#receptionModal`)
- Liste 27 sources avec : nom, pays, catégorie, fiabilité, sentiment, note, résumé, lien externe.
- Fermeture : croix · clic backdrop · `Escape`. ✅

---

## 12. Synthèse des problèmes ouverts à corriger immédiatement

| # | Page | Problème | Gravité | Action |
|---|------|----------|---------|--------|
| 1 | Stats | « mise à jour toutes les 6h » alors que cron quotidien | 🟡 | 📝 → « mise à jour 1×/jour » |
| 2 | Stats | « Pic Pays #1 : 27 » : valeur peut diverger de `numberOneTerritories=13` | 🟡 | 🔍 vérifier source du `27` |
| 3 | Pays | « Martinique #1 depuis la sortie » texte fixe | 🟡 | 📝 à dynamiser ou reformuler |
| 4 | Footer | Date MAJ : vérifier qu'elle est live | 🟢 | 🔍 vérification |
| 5 | Carte | GeoJSON externe : si fail, fallback message | 🟢 | 🔧 ajouter fallback gracieux |
| 6 | Modale pays | Vérifier comportement quand un pays a < 3 jours d'historique | 🟢 | 🔍 |

## 13. Ce qui est OK et n'a pas besoin de correction

- Splash screen + auth optionnelle (testé fonctionnel).
- Cache-bust + Netlify déploiement (validé via `version.txt` 07/05).
- Refonte Buzz (skeleton, états, retry).
- Refonte Signaux (titres simplifiés, items spéculatifs retirés).
- Modale détail pays + carte historique 56 pays.
- 27 sources presse + sync centrale (commit `eb97473`).
- Fix anomalies Stats (commit `e9e2134`).
- Fix couleurs Réception (commit `1d236b6`).
