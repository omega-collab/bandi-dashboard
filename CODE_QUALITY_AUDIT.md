# CODE_QUALITY_AUDIT.md

> Audit qualité code · commit `1d236b6`.

## 1. Volumétrie

| Fichier | LOC | Risque dette |
|---------|-----|--------------|
| `public/css/styles.css` | 3929 | 🟡 monolithique mais sectionné par commentaires `/* === N. SECTION === */` |
| `public/js/app.js` | 4881 | 🔴 monolithique — candidat à splitter (par onglet) à terme |
| `public/index.html` | 1460 | 🟡 markup verbeux mais lisible |
| `public/js/health-guard.js` | 601 | 🟢 OK |
| `public/js/bandi-reception-sources.js` | 615 | 🟢 OK (tableau de données + 1 const) |
| `public/js/monitoring.js` | 489 | 🟢 OK |
| `public/js/data-fallback.js` | 468 | 🟢 OK |

## 2. Patterns observés

### 2.1 Bons patterns

✅ **`Object.assign(BANDI, {...})`** au lieu de `BANDI = {...}` — préserve la référence du `const` et permet aux modules amont (monitoring, health-guard) de voir les MAJ. Documenté dans CLAUDE.md.
✅ **Try/catch isolé par appel render** dans DOMContentLoaded — une erreur n'empêche pas les suivants.
✅ **`computeReceptionScores()`** centralise le calcul presse/public/impact.
✅ **`syncCriticReviewsFromSources()`** synchronise `BANDI.criticReviews` depuis les 27 sources, évitant les valeurs hardcodées.
✅ **`monTimeAgo()` + `monFreshCls()`** centralisent la logique de fraîcheur.
✅ **Helper `plural()` + `setLabel()`** centralisent les accords français.
✅ **Helper `scoreClass()` + `setScore()`** centralisent la couleur des scores.

### 2.2 Patterns à améliorer

🟡 **Valeurs codées en dur restantes** (faible impact) :
- Pondérations Completion Score dans `app.js` (devraient être centralisées avec celles de Réception).
- Clés Tomatometer fallback : la conversion `/5 → /100` (multiplication par 20) est dupliquée à 2-3 endroits.
- Couleurs (`#22c55e`, `#D4A017`, `#CE1126`) parfois inline au lieu de variables CSS.

🟡 **Doublons légers** :
- Fonctions `monFreshCls` et `gradColor` (monitoring.js) ont une logique proche.
- Mappings région : `REGION_COLORS` dans `app.js` + `regions` dans `country-mapping.json`.

🟡 **Fonctions longues** :
- `loadLiveData()` (~470 lignes) — à splitter en sous-fonctions par table SQL.
- `initMapTab()` (~250 lignes) — à splitter en `initMapBase()` + `bindMapModes()`.

## 3. Imports inutiles / fichiers morts

✅ Pas d'import JS frontend (vanilla, scripts en série).
🟡 `panel-overview` reste dans le DOM mais plus accessible via la nav. **Décision** : conservé pour ne pas casser `renderOverview` qui pourrait être réactivé. Documenté.

## 4. Typage

❌ Pas de TypeScript dans le projet (vanilla JS). C'est un choix assumé pour la simplicité — pas de build step.

## 5. Sécurité

✅ Anonymous key Supabase publique (RLS active sur toutes tables).
✅ Aucun secret côté client (auth désactivée par défaut).
✅ Headers Netlify : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

## 6. Performance

✅ Cache JS/CSS 1h (cache-bust `?v=...` à chaque MAJ).
✅ HTML no-cache (les MAJ sont visibles immédiatement).
✅ Lazy load images (`loading="lazy"` sur `<img>` Buzz).
✅ Lazy render onglets (Buzz, Map, Signals, History) — chargés au clic uniquement.
🟡 Chart.js + Leaflet + plugin zoom chargés sur toutes les pages — pourrait être lazy mais coût petit en pratique.

## 7. Maintenabilité

✅ Cache-bust manuel via `sed` à chaque commit (process documenté).
✅ Build Netlify régénère `version.txt` avec SHA exact.
✅ Documents `.md` versionnés (CLAUDE.md, audits, rapports).
✅ Workflows GitHub Actions clairs et indépendants.

## 8. Recommandations actions futures (non bloquantes)

1. **Splitter `app.js`** en 1 fichier par onglet (`app-overview.js`, `app-buzz.js`, etc.) — chantier 1-2 jours.
2. **Centraliser les pondérations** dans un seul fichier `weights.js` (Réception + Completion + autres).
3. **Tests unitaires** sur `computeReceptionScores()` et `monTimeAgo()` — chantier 1 jour.
4. **Ajouter ESLint** + format check pre-commit.

## 9. Conclusion

✅ Code maintenable, patterns cohérents, bonne séparation des responsabilités malgré l'absence de framework.
🟡 Dette technique légère (monolithique app.js, quelques duplications mineures) — pas bloquant, à gérer quand le projet grossira.
🟢 Sécurité et performance OK pour un dashboard B2B / public.
