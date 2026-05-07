# Audit des sources presse actuelles · BANDI Dashboard

Date : 2026-05-07

## Localisation dans le code

| Fichier | Rôle |
|---------|------|
| `public/js/data-fallback.js` (L.110–164) | **Source de vérité** : objet `BANDI.criticReviews` avec 12 sources et compteurs hardcodés |
| `public/js/app.js` (L.1325–1356) | `renderCriticReviews()` lit `BANDI.criticReviews` et remplit le panel |
| `public/js/monitoring.js` (L.263–396) | Tooltip qui répète `Score agrégé sur 12 critiques presse… 9 positifs / 3 mitigés / 0 négatif.` |
| `public/index.html` (L.1025–1044) | Markup `#criticReviewsPanel` + sous-titre `Agrégation maison · 12 sources documentées · 24/04/2026` |

## Les 12 sources actuelles (état avant refonte)

| # | Source | Pays | Verdict | Note | Catégorie correcte | Action |
|---|--------|------|---------|------|--------------------|--------|
| 1 | Le Parisien | FR | positif | (4/5 = 80) | press_review · A | ✅ Conserver |
| 2 | Le Monde | FR | positif | — | press_review · A | ✅ Conserver |
| 3 | Les Inrockuptibles | FR | positif | — | press_review · A | ✅ Conserver |
| 4 | NoPopCorn | FR | positif | — | press_review · C | ⚠️ Pas dans la nouvelle liste fournie → exclure |
| 5 | NRJ Antilles | MQ | positif | — | media_impact · B | 🔄 Reclasser en impact médiatique (radio locale, pas critique pro) |
| 6 | Decider | US | positif | — | press_review · A | ✅ Conserver |
| 7 | Screen Rant | US | positif | — | media_impact · B | 🔄 Reclasser en impact médiatique (article de news streaming, pas critique) |
| 8 | K-waves and Beyond | INT | positif (en réalité **mixed** 3/5) | (3/5 = 60) | press_review · B | 🔄 Sentiment corrigé en `mixed` |
| 9 | SensCritique (presse) | FR | positif | — | aggregator · A | 🔄 Pas une critique presse — c'est un agrégateur public |
| 10 | What's on Netflix | INT | mitigé | — | press_review · B | ✅ Conserver |
| 11 | MoviesR.net | INT | mitigé | — | press_review · C | ⚠️ Pas dans la nouvelle liste fournie → exclure |
| 12 | Fnac Leclaireur | FR | mitigé | — | media_impact · C | ⚠️ Méta-article qui synthétise d'autres avis → exclure du score presse |

## Doublons / incohérences détectées

- **AlloCiné Presse** était utilisé comme **agrégat** (`notePresseAlloN: 8`) mais les 8 critiques sous-jacentes étaient également comptées individuellement → **double-comptage**. Décision : utiliser AlloCiné Presse uniquement comme **contrôle global** (`include_in_press_score: false`).
- **Télérama** (très négative, Pierre Langlais) **manque totalement** dans la liste actuelle → la stat `0 négatifs` est **fausse**.
- **20 Minutes** et **Première** manquent → la liste presse est sous-représentée.
- **Rotten Tomatoes** était affiché comme Tomatometer alors qu'il n'y a qu'**1 critique** publiée (pas de consensus) → **trompeur**, à exclure du score presse.
- **Sources mondiales** absentes : Wonder Channel (IT), Mundo Deportivo (ES), Gizmodo Español, MeriStation/AS, France-Antilles, RCI Martinique.
- **Sources publiques** (`AlloCiné Spectateurs`, `IMDb`) étaient mélangées avec la presse → mélange critique pro / avis spectateur.

## Incohérences visibles UI à corriger

- `Allociné Presse · 3,9 / 5 (7 critiques)` → doit être **(8 critiques)** _(déjà mis à jour dans le code, mais l'image transmise montrait encore 7 — bug de cache)_
- `Allociné Public · 4,0 / 5 (284 votes)` → doit être **(319 notes)** (était à 313 dans le code, à mettre à jour)
- `12 sources documentées · 75% avis favorables · 9 positifs / 3 mitigés / 0 négatifs` → ces chiffres ne tiennent plus avec la nouvelle base : **à recalculer dynamiquement**.

## Sources à supprimer du score presse (refonte)

| Source | Raison |
|--------|--------|
| NoPopCorn | Hors périmètre de la nouvelle liste fournie |
| NRJ Antilles | Reclassée en `media_impact` (radio locale) |
| Screen Rant | Reclassée en `media_impact` (article news) |
| SensCritique (presse) | Catégorie aggregator (note communautaire) |
| MoviesR.net | Hors périmètre / fiabilité incertaine |
| Fnac Leclaireur | Méta-article qui synthétise d'autres avis |
| AlloCiné Presse | Agrégat — ne doit pas s'ajouter aux 8 critiques individuelles |
| Rotten Tomatoes | 1 seule critique → pas de consensus utilisable |

## Conclusion

L'agrégation actuelle (`12 sources · 75% favorables · 9/3/0`) est **partiellement fausse** : Télérama (très négative) est absente, plusieurs sources sont mal catégorisées (radio, news streaming, méta-articles classés comme « critiques »), et les notes publiques (IMDb, AlloCiné Spectateurs) sont mélangées avec la presse.

→ La refonte sépare strictement **Presse critique** / **Public** / **Impact médiatique**, recalcule les compteurs en runtime à partir d'une liste de sources structurée et ajoute Télérama, 20 Minutes, Première, Wonder Channel, Mundo Deportivo, Gizmodo, MeriStation, RCI Martinique, France-Antilles.
