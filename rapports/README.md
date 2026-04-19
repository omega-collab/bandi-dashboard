# Rapports — Bandi Live Dashboard

Archive chronologique des rapports externes (Gemini, ChatGPT, agences, etc.)
produits autour de la série **Bandi**.

## Convention de nommage

```
YYYY-MM-DD_<source>_<sujet>.md
```

Exemples :
- `2026-04-19_gemini_bandi.md`
- `2026-05-02_chatgpt_buzz-mediatique.md`
- `2026-05-15_agence_panorama-international.md`

## Structure d'un rapport

Chaque fichier commence par un en-tête YAML minimal pour faciliter le tri :

```yaml
---
date: 2026-04-19
source: Gemini
periode: "2026-04-09 → 2026-04-19"
sujet: "Performance Netflix Bandi"
---
```

Suivi du contenu brut du rapport en Markdown.

## Usage

- Les rapports servent de **mémoire externe** : Claude (ou tout autre lecteur)
  peut s'y référer pour intégrer de nouvelles données dans le dashboard.
- Les informations utiles validées sont reportées dans `public/js/data-fallback.js`
  (champs `synopsis`, `scenaristes`, `launchWeek`, `peakNonEnglish`, `imdbPerEpisode`,
  `viralHashtag`, `dominationsPays`, etc.).
- Les rapports ne sont **pas** servis par Netlify — ils restent locaux au repo
  pour traçabilité interne.
