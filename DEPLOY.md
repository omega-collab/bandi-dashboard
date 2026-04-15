# 🚀 Déploiement Bandi Live Dashboard

> Guide pour Allan. Temps total estimé : **15 minutes** (dont 10 min à attendre).

## Prérequis

- [x] Compte GitHub
- [x] Compte Netlify
- [ ] Compte Supabase (à créer, étape 1)
- [ ] CLI installés : `node`, `git`, `gh`, `netlify`

Si une CLI manque, sur macOS :
```bash
brew install node git gh netlify-cli
```

## Procédure

### 1. Créer un projet Supabase (3 min)

1. Aller sur https://supabase.com → "Start your project"
2. Créer un compte si pas déjà fait
3. "New Project" :
   - **Name** : `bandi-dashboard`
   - **Database password** : générer un fort (copie-colle le dans un gestionnaire de mot de passe)
   - **Region** : `West EU (Ireland)` — meilleure latence depuis la Martinique
   - **Plan** : Free
4. Attendre ~2 min que le projet soit provisionné
5. Aller dans **Settings** → **API** et noter :
   - **Project URL** (format `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key 🚨 SECRÈTE, ne la partage jamais

### 2. Lancer Claude Code

Dans un terminal, dans le dossier `bandi-live/` :

```bash
cd bandi-live
claude
```

Puis taper simplement :

```
go
```

Claude Code va lire `CLAUDE.md` et te demander tes 3 clés Supabase. Colle-les, et il s'occupe de tout le reste automatiquement :

1. Installe les dépendances npm
2. Crée les tables Supabase
3. Lance un premier scrape pour peupler la DB
4. Crée le repo GitHub
5. Configure les secrets GitHub (pour le cron)
6. Déploie sur Netlify
7. Déclenche le workflow une première fois
8. Te donne les URLs finales

### 3. Vérifier le résultat

Une fois fini, Claude Code te donnera :
- 🌐 URL Netlify publique (à partager au collègue)
- 📦 Repo GitHub
- 🗄️ Dashboard Supabase

Ouvre l'URL Netlify → le dashboard doit afficher les vraies données live.

### 4. Vérifier le cron (optionnel)

Dans GitHub → ton repo → onglet **Actions** :
- Le workflow "Scrape FlixPatrol Bandi" doit être listé
- Il tournera automatiquement toutes les 6h
- Tu peux le lancer manuellement avec le bouton "Run workflow"

## Ce qui tourne automatiquement après

```
Toutes les 6h (UTC) :
  ├─ GitHub Actions déclenche le cron
  ├─ scripts/scraper.js scrape FlixPatrol
  ├─ Insère les nouvelles données dans Supabase
  └─ Le dashboard Netlify fetch automatiquement
     les dernières données au chargement
```

**Coût total : 0 €** (tant que tu restes dans les free tiers, ce qui est largement suffisant).

## En cas de pépin

### Le scraper ne trouve plus les données
→ FlixPatrol a peut-être changé son HTML. Vérifier les logs GitHub Actions et ajuster les sélecteurs CSS dans `scripts/scraper.js`.

### Quota GitHub Actions dépassé
→ Impossible avec 4 runs/jour (usage ~60 min/mois sur 2000 gratuits).

### Le dashboard ne charge pas les données
→ Ouvrir la console navigateur. Vérifier que `public/js/config.js` a bien les vraies clés Supabase.

### Données obsolètes
→ Forcer un scrape manuel : `gh workflow run scrape.yml` depuis ton terminal.

## Maintenance

Une fois par mois, check rapide :
- [ ] GitHub Actions : le workflow passe-t-il toujours ?
- [ ] Supabase : quota DB (free = 500 MB, on utilise ~1 KB/jour)
- [ ] Netlify : quota bandwidth (free = 100 GB/mois)

---

Made in Martinique 🇲🇶
