# COPYWRITING_AND_TEXT_AUDIT.md

> Audit textuel du dashboard BANDI · commit `1d236b6` → corrections appliquées dans le commit suivant.

## Méthode

- Inspection de tous les libellés visibles dans `public/index.html` (1460 lignes)
- Inspection des chaînes affichées dynamiquement dans `app.js`, `monitoring.js`, `data-fallback.js`, `bandi-reception-sources.js`
- Vérification : orthographe · accents · typographie · accord · cohérence terminologique · formulations affirmatives non sourcées

## Corrections appliquées dans cette passe

### 1. Cohérence orthographique « Allociné » → **« AlloCiné »**

**Pourquoi** : la marque officielle s'écrit **AlloCiné** (camelCase) depuis 2024. Le code mélangeait les deux formes selon les fichiers : `bandi-reception-sources.js` utilise « AlloCiné », `app.js` utilisait « Allociné ». Harmonisation sur la forme officielle pour tous les libellés visibles utilisateur.

| Fichier · ligne | Avant | Après |
|-----------------|-------|-------|
| `app.js:3313` | `Allociné Spectateurs` | `AlloCiné Spectateurs` |
| `app.js:3314` | `Allociné Presse` | `AlloCiné Presse` |
| `app.js:3380` | `Allociné Spectateurs / Presse` | `AlloCiné Spectateurs / Presse` |
| `app.js:3670` | `… + Allociné·0,20 + …` | `… + AlloCiné·0,20 + …` |
| `app.js:3702` | `chip('Allociné', …)` | `chip("AlloCiné", …)` |
| `app.js:3767` | commentaire `Allociné × 2` | `AlloCiné × 2` |
| `app.js:3795` | `name: 'Allociné'` | `name: "AlloCiné"` |
| `app.js:3829` | `name: 'Allociné Actu'` | `name: "AlloCiné Actu"` |
| `app.js:4136` | `RT · Allociné · …` | `RT · AlloCiné · …` |
| `app.js:4178` | `label: 'Allociné Public'` | `label: 'AlloCiné Public'` |
| `app.js:4179` | `label: 'Allociné Presse'` | `label: 'AlloCiné Presse'` |
| `app.js:4200` | commentaire `note spectateurs Allociné` | `note spectateurs AlloCiné` |
| `app.js:4209` | `avis spectateurs Allociné` | `avis spectateurs AlloCiné` |

> Les **clés DB** (`allocine_public`, `allocine_press`) restent en snake_case minuscule — convention SQL.
> Les **noms de variables JS** (`allocinePublic`, `allocinePress`) restent en camelCase — convention code.

### 2. Texte obsolète « mise à jour toutes les 6h »

Le sous-titre du panneau « Notes & avis du public » indiquait `8 sources · mise à jour toutes les 6h`.
Or depuis le 06/05/2026, **tous les scrapers tournent 1×/jour à 00:00 UTC** (cf. CLAUDE.md). Texte obsolète et trompeur.

| Fichier | Avant | Après |
|---------|-------|-------|
| `index.html:487` | `8 sources · mise à jour toutes les 6h` | `8 sources · collecte quotidienne (00:00 UTC)` |

### 3. Texte trop affirmatif « Martinique #1 depuis la sortie »

Sur la carte Martinique de l'onglet Pays : « Où tout a commencé. **#1 depuis la sortie**, dans un pays de 360 000 habitants ».

Le claim « #1 depuis la sortie » suppose une vérification continue qui n'est plus garantie (Bandi sorti du Top 10 mondial ; le statut Martinique a probablement bougé depuis le pic). Reformulation prudente.

| Fichier | Avant | Après |
|---------|-------|-------|
| `index.html:546` | `#1 depuis la sortie, dans un pays de 360 000 habitants.` | `Pays de 360 000 habitants, ancrage natif de la série.` |

### 4. Pluriel dynamique sentiments (commit antérieur `4e97cf5`)

| Avant | Après |
|-------|-------|
| `1 négatifs` (accord faux) | `1 négatif` (singulier sous 2) |
| `1 positifs / 1 mitigés` | `1 positif / 1 mitigé` |
| `1 sources vérifiées` | `1 source vérifiée` |
| `1 agrégateurs` | `1 agrégateur` |
| `1 articles` | `1 article` |

### 5. Sous-titre Réception (commit antérieur `4e97cf5`)

| Avant | Après |
|-------|-------|
| `27 sources structurées · 3 scores séparés …` (avec addition trompeuse 20+2+5=27) | `27 sources documentées · 3 scores séparés (presse · public · impact)` |

### 6. « Notes spectateurs cumulées » → « agrégées » (commit `1d236b6`)

« cumulées » suggère une addition. Le calcul est en réalité une moyenne pondérée. Plus juste : « agrégées ».

## Problèmes textuels détectés mais NON corrigés (recommandations)

| Page · libellé | Problème | Recommandation |
|----------------|----------|----------------|
| Hero overview legacy | Le panel `#panel-overview` n'est plus accessible via la nav mais reste dans le DOM. Plusieurs textes y sont conservés (« Évolution depuis la sortie », « Faits marquants »). | À supprimer ou à dynamiser quand le scope sera remis sur Overview. Hors périmètre actuel. |
| Footer | « Source : FlixPatrol · Netflix Tudum · MAJ … » | Vérifier que la date `MAJ` est bien live (pas hardcodée). Code non vérifié dans cet audit. |
| Onglet Pays | « Trié par rang » | OK mais on pourrait préciser « Trié par rang BANDI dans chaque pays » pour éviter ambiguïté. Mineur. |
| Méthode `IMDb·0,22 + TMDB·0,18 + RT·0,25 + AlloCiné·0,20 + SensCritique·0,10 + Filmaffinity·0,05` | La formule somme à 1.00 ✅ mais la formule est statique alors que les pondérations existent ailleurs en code (`computeReceptionScores`). | Risque de désync future entre la formule affichée et le calcul réel. À centraliser. |
| Plusieurs panels | Certains sous-titres mélangent `·` (point médian U+00B7) et autres séparateurs | Cohérent dans la majorité ✅ |

## Termes techniques exposés au public à surveiller

| Terme | Page | Justifié ? |
|-------|------|------------|
| « CVE » (Cumulative Views Equivalent) | Signaux · encadré pédagogique | ✅ expliqué dans l'encadré |
| « Tudum » | Header, Stats, Signaux | ✅ marque officielle Netflix |
| « FlixPatrol » | Footer, panels | ✅ source identifiée |
| « GDELT » | Stats · scrapers | ⚠️ technique, mais mention courte acceptable pour B2B |
| « RSSHub » | Code uniquement (pas affiché) | ✅ |
| « API » dans textes | absent | ✅ |
| « scraper » | Onglet Stats | ⚠️ technique, mais accepté dans contexte data |

## Fautes typographiques restantes (à valider)

Aucune faute d'orthographe française détectée à ce stade dans les libellés visibles. Les accords pluriels dynamiques sont corrigés. Les espaces avant ponctuation respectent la typographie française (espaces insécables `&nbsp;` non systématiquement utilisés mais pas critique sur ce dashboard mono-langue).

## Fichier modifié dans cette passe

- `public/index.html` (libellés statiques)
- `public/js/app.js` (libellés dynamiques)

## Termes harmonisés (référence pour les futures contributions)

- **AlloCiné** (jamais « Allociné » dans les libellés UI)
- **Tudum** / **Netflix Tudum** (jamais « tudum » sans capitale)
- **FlixPatrol** (jamais « Flixpatrol »)
- **Rotten Tomatoes** (jamais « rotten tomatoes »)
- **SensCritique** (jamais « Senscritique »)
- **Filmaffinity** (jamais « FilmAffinity » dans l'UI ; en interne le scraper utilise `filmaffinity`)
- **IMDb** (jamais « IMDB » ni « Imdb »)
- **TMDB** (jamais « TMDb »)
