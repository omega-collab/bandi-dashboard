# ERROR_STATES_AND_FALLBACKS_AUDIT.md

> Audit des états d'erreur, fallbacks, états vides · commit `1d236b6`.

## 1. Stratégie globale

- **Niveau 1 (live)** : fetch Supabase OK → données live.
- **Niveau 2 (fallback statique)** : fetch fail → `BANDI` reste à ses valeurs de `data-fallback.js`. Banner « Données non live » s'affiche via `health-guard.js`.
- **Niveau 3 (auto-heal)** : `health-guard.js` scanne les sections vides et masque ce qui ne peut pas être affiché plutôt que de laisser une UI cassée.

## 2. États gérés correctement

| État | Comportement | Statut |
|------|-------------|--------|
| Supabase OK | Données live | ✅ |
| Supabase KO | Banner + fallback statique | ✅ |
| Buzz vide (DB) | État `buzzEmptyDB` avec message « Veille en cours de constitution » | ✅ |
| Buzz aucun résultat (filtres) | État `buzzEmptyFiltered` + bouton Réinitialiser | ✅ |
| Buzz erreur réseau | État `buzzError` + bouton Réessayer | ✅ |
| Tudum table vide | Fallback `BANDI.cumulTudum.fetchedAt` (commit `e9e2134`) | ✅ |
| RT non listé | Fallback Tomatometer calculé depuis 27 sources | ✅ |
| Pays sortis du Top 10 | Section concurrence masquée + bandeau bilan | ✅ |
| Modale détail pays sans données | Message « Pas assez de données historiques » | ✅ |
| Notes externes scraper en attente | Status `not_listed_yet` / `no_rating_yet` → orange neutre, pas rouge | ✅ |

## 3. États avec corrections récentes

| Bug | Avant | Après | Commit |
|-----|-------|-------|--------|
| `il y a -462 min` (timezone DB futur) | Affichait des minutes négatives | Clamp h ≥ 0 → « à l'instant » | `e9e2134` |
| RT Presse / Public en orange | `monFreshCls(hours)` les classait warn | `cls = 'mon-ok'` forcé pour fallbacks calculés | `e9e2134` |
| Tudum officiel « — » gris | `tudumDate` null = pas de date | Fallback `cumulTudum.fetchedAt` + détail enrichi | `e9e2134` |
| Score 71 rouge ↔ vert | Couleur catégorie vs valeur | Couleur basée sur valeur partout | `1d236b6` |

## 4. Risques restants identifiés

| Risque | Probabilité | Impact | Action |
|--------|-------------|--------|--------|
| GeoJSON externe (`raw.githubusercontent.com`) tombe | Faible | Carte HS | 🔧 Ajouter fallback message gracieux |
| `BANDI.tudumWeekly` vide ET `cumulTudum.fetchedAt` vide | Très faible | Tudum montre « En attente · mardi 15h UTC » | ✅ déjà géré |
| Sources `BANDI_RECEPTION_SOURCES` non chargé (script tag manquant) | Très faible | Panel Réception caché (early return) | ✅ déjà géré |
| Plus de 500 lignes dans `bandi_country_rankings` | Probable à long terme | Limite paysHist tronque l'historique | 🔧 augmenter à 1000 ou paginer |

## 5. Erreurs JS console

- `try/catch` autour de chaque appel render dans DOMContentLoaded → une erreur n'empêche pas les suivants. ✅
- `console.error('[BANDI] xxx:', e)` pattern uniforme. ✅

## 6. Liens morts potentiels

- 8 URLs `bandi-reception-sources.js` avec `notes: "URL à confirmer"` → à vérifier hors-ligne.
- Liens GitHub Actions des scrapers : OK si dépôt public.

## 7. Conclusion

Tous les états critiques sont gérés. Trois corrections récentes (commit `e9e2134`) ont éliminé les anomalies les plus visibles (-462 min, RT orange, Tudum «—»). Une correction couleur (`1d236b6`) a éliminé l'incohérence cross-page sur le score Réception.
