# UX_READABILITY_AUDIT.md

> Audit UX et lisibilité · commit `1d236b6`.

## 1. Hiérarchie visuelle

✅ **Header sticky** avec logo + sous-titre + bloc LIVE (toujours visible).
✅ **Bottom nav** mobile fixe avec 7 onglets actifs.
✅ **Top nav** desktop horizontale (même nav que bottom).
✅ Onglet par défaut : **Série** (passé d'Overview à Série en mai 2026 — choix éditorial assumé).

## 2. Cohérence couleurs

| Sémantique | Couleur | Cohérent ? |
|------------|---------|------------|
| Drapeau Martinique rouge / Netflix rouge | `--rouge: #CE1126` | ✅ |
| Drapeau Martinique vert / OK | `--vert: #009739` | ✅ |
| Or / accent / warning | `--gold: #E4B84D` | ✅ |
| Score ≥ 70 (bon) | vert #22c55e | ✅ depuis fix `1d236b6` |
| Score 50-69 (moyen) | or | ✅ |
| Score < 50 (faible) | rouge | ✅ |
| Catégorie presse Réception | rouge (barre verticale gauche uniquement) | ✅ depuis fix `1d236b6` |
| Catégorie public Réception | vert (barre verticale gauche) | ✅ |
| Catégorie impact Réception | or (barre verticale gauche) | ✅ |

✅ **Plus d'incohérence couleur de score cross-page** (résolu).

## 3. Cohérence badges

- **Badges fiabilité** (Official, Verified, Calculated, Estimated, Weak Signal, Not Public) : couleurs cohérentes par catégorie · 6 niveaux.
- **Badges sentiment** (Positif vert · Mitigé or · Négatif rouge · Neutre gris) : cohérents.
- **Badges status pays** (Aujourd'hui : #X vert · Sorti gris) : cohérents.

## 4. Responsive

- **Mobile (< 720 px)** :
  - Modale détail pays : 86vh max, marges latérales · ✅
  - Modale sources Réception : idem · ✅
  - Cartes 3 scores Réception : passent en 1 colonne sous 720 px · ✅
  - Bottom nav fixe avec icônes + labels · ✅
  - Filtres Buzz empilés · ✅
  - Cartes pays empilées · ✅
  - Hero rang taille adaptée · ✅
- **Desktop** :
  - Layout fluide jusqu'à ~1400 px · ✅
  - Au-delà : centré avec marges · ✅

## 5. Lisibilité textes

✅ Police Inter Tight pour le corps · Anton pour grands titres · JetBrains Mono pour données.
✅ Contraste texte/fond suffisant (texte blanc sur fond #0F0F0F).
✅ Tailles de police hiérarchisées (28px hero · 22-26px h2 · 14-16px texte).
🟡 Espaces fines insécables avant `?!:;` non systématiques mais non bloquant en français contexte web.

## 6. Surcharge informationnelle

🟡 **Onglet Stats** : 4 jauges + 8 notes + 8 tables fraîcheur + 5 scrapers = beaucoup d'info en une page. Acceptable en B2B technique mais pourrait fatiguer un visiteur lambda.
🟡 **Onglet Signaux** : 6 panels + tableaux. Long scroll mobile. À surveiller.

✅ Autres onglets : densité acceptable.

## 7. Accessibilité (basique)

✅ `aria-label` présents sur les boutons icônes et nav.
✅ `role="dialog"` sur les modales.
✅ `tabindex="0"` + `role="button"` sur les lignes cliquables (perf-row, hist-all-row).
✅ `aria-pressed` sur les boutons toggle filtres.
🟡 Pas de skip link · pas de mode haute contraste explicite. Acceptable pour MVP B2B.

## 8. Recommandations UX (non bloquantes)

1. Onglet Stats : envisager un toggle « Vue compacte / Vue détaillée » pour réduire le scroll mobile.
2. Confirmer le scroll-to-top sur changement d'onglet (à tester en live).
3. Modale détail pays : ajouter un raccourci clavier (← →) pour passer au pays suivant/précédent dans la liste.

Ces 3 points sont des **améliorations**, pas des correctifs nécessaires.
