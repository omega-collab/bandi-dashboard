# Refonte Réception & Impact · BANDI Dashboard

Date : 2026-05-07
Branche : `claude/add-dynamic-hero-updates-WMH4f` (mergée master + main)

## Anciennes sources trouvées

**Stockage** : `public/js/data-fallback.js` → `BANDI.criticReviews.sources` (12 entrées hardcodées) + chiffres agrégés (`total: 12`, `scorePct: 75`, `positifs: 9`, `mitiges: 3`, `negatifs: 0`).

**Présentation** : `public/js/app.js` → `renderCriticReviews()` lisait directement les compteurs hardcodés et la liste de 12 sources, affichait un seul score (75%).

**Tooltip monitoring** : `public/js/monitoring.js` (L.396) répétait `9 positifs / 3 mitigés / 0 négatif` en dur.

Voir détail : `CURRENT_PRESS_SOURCES_AUDIT.md`.

## Nouvelles sources ajoutées (19 au total)

### Presse critique (`include_in_press_score: true`) — 12 sources
| Source | Pays | Sentiment | Note | Fiab. |
|--------|------|-----------|------|-------|
| 20 Minutes | FR | positive | — | A |
| Le Monde | FR | positive | — | A |
| Télérama | FR | **negative** | — | A |
| Les Inrockuptibles | FR | positive | — | A |
| Première | FR | mixed | — | A |
| Le Parisien | FR | positive | 4/5 (80) | A |
| Decider | US | positive | — | A |
| What's on Netflix | UK/US | mixed | — | B |
| K-waves and Beyond | INT | mixed | 3/5 (60) | B |
| Wonder Channel | IT | mixed | 6/10 (60) | B |
| Mundo Deportivo | ES | mixed | — | B |
| Gizmodo en Español | INT | positive | — | B |

### Public (`include_in_public_score: true`) — 2 sources
| Source | Pays | Note | Fiab. |
|--------|------|------|-------|
| AlloCiné Spectateurs | FR | 4,0/5 (80) · 319 notes | A |
| IMDb | INT | 6,5/10 (65) | B |

### Impact médiatique (`include_in_media_impact_score: true`) — 5 sources
| Source | Pays | Sentiment | Fiab. |
|--------|------|-----------|-------|
| RCI Martinique | MQ | positive | A |
| France-Antilles | MQ | positive | A |
| MeriStation / AS | ES | mixed | B |
| Mundo Deportivo | ES | mixed | B (double catégorie) |
| Gizmodo en Español | INT | positive | B (double catégorie) |

### Contrôles (jamais comptés dans aucun score)
- **AlloCiné Presse** : 3,9/5 sur 8 critiques — utilisé comme contrôle global (les 8 critiques presse sous-jacentes sont déjà comptées individuellement).
- **Rotten Tomatoes** : 1 seule critique (Decider) — pas de Tomatometer affiché.

## Sources exclues (par rapport à l'ancienne liste de 12)

| Ancienne source | Raison de l'exclusion |
|-----------------|----------------------|
| NoPopCorn | Hors périmètre nouvelle liste fournie |
| NRJ Antilles | Reclassée en `media_impact` (radio locale, pas critique pro) — non incluse dans la nouvelle liste finalisée |
| Screen Rant | Reclassée en `media_impact` (article news streaming) — non incluse dans la nouvelle liste finalisée |
| SensCritique (presse) | C'est un agrégateur communautaire, pas une critique presse |
| MoviesR.net | Hors périmètre / fiabilité incertaine |
| Fnac Leclaireur | Méta-article qui synthétise d'autres avis |

## Doublons détectés et résolus

- **AlloCiné Presse** ne s'ajoute pas aux 8 critiques presse individuelles : `include_in_press_score: false`, sert de contrôle global uniquement.
- **Rotten Tomatoes** ne double-compte pas Decider (Decider est compté en `press_review`, RT en `aggregator` neutre).
- **Mundo Deportivo** et **Gizmodo Español** apparaissent dans 2 catégories (presse + impact) — c'est volontaire car le user le demande dans la spec ; chaque score les compte une fois dans son périmètre.
- Pas de **Martin Cid ES vs PT** (un seul article, pas dédoublé).

## Scores recalculés

Calcul automatique par `computeReceptionScores()` à chaque chargement ; les chiffres bougent dès qu'on ajoute/retire une source.

Avec les pondérations actuelles :
- **Score Presse Critique** ≈ **68/100** (12 sources · 6 positifs · 5 mitigés · 1 négatif)
- **Score Public** ≈ **73/100** (2 agrégateurs : IMDb 6,5/10 et AlloCiné 4/5)
- **Score Impact Médiatique** ≈ **73/100** (5 articles à forte portée)
- **Score Global** = 0,50 × 68 + 0,30 × 73 + 0,20 × 73 ≈ **70/100**

Les chiffres exacts s'actualisent en runtime — les valeurs ci-dessus sont indicatives.

## Limites restantes

1. **Notes presse manquantes** : 9 sources sur 12 n'ont pas de `numeric_rating` direct (seuls Le Parisien 4/5, K-waves 3/5, Wonder Channel 6/10 en ont) → on retombe sur la conversion sentiment → score (positive = 80, mixed = 60, negative = 35). Le score presse est donc un peu lissé, mais reste représentatif.
2. **20 Minutes** : critique reprise par AlloCiné (pas d'URL directe trouvée). À revérifier si le journal publie sa propre critique en ligne.
3. **Sources espagnoles** (Mundo Deportivo, Gizmodo, MeriStation) ont fiabilité B uniquement — pas de tabloid presse cinéma de référence ES.
4. **IMDb** est passé à 6,5/10 dans la nouvelle liste fournie, alors que le scraper IMDb live remontait 5,9/10. Il faudra que la valeur live (quand le scraper tourne) prenne le dessus — pour l'instant la nouvelle liste fait foi.
5. **Rotten Tomatoes** : 1 seule critique (pas de Tomatometer). Si à terme il y en a 5+, mettre `include_in_press_score: true` ou créer une entrée RT distincte par critique.

## Sources à vérifier manuellement

- **Decider URL exacte** (`decider.com/2026/04/09/bandi-netflix-review/`) : à valider, lien parfois redirigé.
- **Le Monde URL** (article du 10/04 par Audrey Fournier) : confirmer le slug exact.
- **Première URL** (`Eric-Rochant-embrasse-la-vie-de-Bandi-en-Martinique--critique`) : confirmer.
- **MeriStation/AS** : vérifier si la critique est sur le site MeriStation principal ou sur AS.com.
- **Gizmodo Español** : confirmer auteur Thomas Handley et date de publication.

## Tests effectués

- ✅ `node --check public/js/app.js` — OK
- ✅ `node --check public/js/data-fallback.js` — OK
- ✅ `node --check public/js/bandi-reception-sources.js` — OK
- ✅ Pas de chiffre `12 sources documentées`, `75%`, `9 positifs`, `3 mitigés`, `0 négatif` codé en dur dans les fichiers de présentation (`app.js`, `monitoring.js`).
- ✅ AlloCiné Presse : `include_in_press_score: false` → pas de double-comptage.
- ✅ Rotten Tomatoes : sentiment `neutral`, pas affiché comme Tomatometer (3 flags include à `false`).
- ✅ Ajout d'une source met automatiquement à jour les 3 scores (le calcul est runtime).
- ✅ Mobile : grille 3 colonnes → 1 colonne sous 720px, modale "Voir les sources" responsive.

## Fichiers modifiés / créés

- ✨ `CURRENT_PRESS_SOURCES_AUDIT.md` (nouveau) — audit étape 1
- ✨ `RECEPTION_SOURCES_UPDATE.md` (nouveau, ce document) — rapport final
- ✨ `public/js/bandi-reception-sources.js` (nouveau) — 19 sources structurées + pondérations
- 🔧 `public/index.html` — refonte panel `#criticReviewsPanel` + ajout modale `#receptionModal` + load du nouveau script
- 🔧 `public/js/app.js` — `computeReceptionScores()`, `renderCriticReviews()` refondue, `renderReceptionSourcesList()`, `initReceptionModal()`
- 🔧 `public/js/data-fallback.js` — `noteSpectAlloN: 313 → 319`, `noteSpectAlloCritN: 88 → 90`
- 🔧 `public/js/monitoring.js` — tooltip jauge presse calculé depuis `BANDI_RECEPTION_SCORES`
- 🔧 `public/css/styles.css` — section 29 ajoutée (cartes 3 scores + modale sources)
