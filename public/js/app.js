/* ========================================
   BANDI DASHBOARD · APPLICATION (LIVE)
   Charge les données depuis Supabase
   Fallback sur data-fallback.js si échec
   ======================================== */

// ============ UTILS ============
function $(id) { return document.getElementById(id); }

// Convertit un code ISO 3166-1 alpha-2 en emoji drapeau (ex. "MQ" → "🇲🇶")
function codeToFlag(code) {
  if (!code || code.length !== 2) return '🏳️';
  const offset = 0x1F1E6 - 65; // 'A' = 65
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => c.charCodeAt(0) + offset)
  );
}

// Mapping côté client EN → {fr, code} pour enrichir les données live
// (même fichier que scripts/country-mapping.json, intégré en dur pour le frontend statique)
const COUNTRY_FR_MAP = {
  "Martinique":{"fr":"Martinique","code":"MQ"},"Guadeloupe":{"fr":"Guadeloupe","code":"GP"},
  "Bahamas":{"fr":"Bahamas","code":"BS"},"Jamaica":{"fr":"Jamaïque","code":"JM"},
  "Dominican Republic":{"fr":"Rép. Dominicaine","code":"DO"},"Trinidad and Tobago":{"fr":"Trinidad & Tobago","code":"TT"},
  "Cuba":{"fr":"Cuba","code":"CU"},"Reunion":{"fr":"Réunion","code":"RE"},
  "Mauritius":{"fr":"Maurice","code":"MU"},"Maldives":{"fr":"Maldives","code":"MV"},
  "France":{"fr":"France","code":"FR"},"Hungary":{"fr":"Hongrie","code":"HU"},
  "Portugal":{"fr":"Portugal","code":"PT"},"Spain":{"fr":"Espagne","code":"ES"},
  "Belgium":{"fr":"Belgique","code":"BE"},"Switzerland":{"fr":"Suisse","code":"CH"},
  "Netherlands":{"fr":"Pays-Bas","code":"NL"},"Italy":{"fr":"Italie","code":"IT"},
  "Luxembourg":{"fr":"Luxembourg","code":"LU"},"Czech Republic":{"fr":"Rép. Tchèque","code":"CZ"},
  "Slovakia":{"fr":"Slovaquie","code":"SK"},"Romania":{"fr":"Roumanie","code":"RO"},
  "Germany":{"fr":"Allemagne","code":"DE"},"Austria":{"fr":"Autriche","code":"AT"},
  "Poland":{"fr":"Pologne","code":"PL"},"Greece":{"fr":"Grèce","code":"GR"},
  "Sweden":{"fr":"Suède","code":"SE"},"Norway":{"fr":"Norvège","code":"NO"},
  "Denmark":{"fr":"Danemark","code":"DK"},"Finland":{"fr":"Finlande","code":"FI"},
  "Ireland":{"fr":"Irlande","code":"IE"},"United Kingdom":{"fr":"Royaume-Uni","code":"GB"},
  "Croatia":{"fr":"Croatie","code":"HR"},"Bulgaria":{"fr":"Bulgarie","code":"BG"},
  "Iceland":{"fr":"Islande","code":"IS"},"Lithuania":{"fr":"Lituanie","code":"LT"},
  "Latvia":{"fr":"Lettonie","code":"LV"},"Estonia":{"fr":"Estonie","code":"EE"},
  "Slovenia":{"fr":"Slovénie","code":"SI"},"Cyprus":{"fr":"Chypre","code":"CY"},
  "Malta":{"fr":"Malte","code":"MT"},"Serbia":{"fr":"Serbie","code":"RS"},
  "Ukraine":{"fr":"Ukraine","code":"UA"},
  "Panama":{"fr":"Panama","code":"PA"},"Honduras":{"fr":"Honduras","code":"HN"},
  "Costa Rica":{"fr":"Costa Rica","code":"CR"},"Nicaragua":{"fr":"Nicaragua","code":"NI"},
  "Salvador":{"fr":"Salvador","code":"SV"},"Guatemala":{"fr":"Guatemala","code":"GT"},
  "Venezuela":{"fr":"Venezuela","code":"VE"},"Brazil":{"fr":"Brésil","code":"BR"},
  "Argentina":{"fr":"Argentine","code":"AR"},"Chile":{"fr":"Chili","code":"CL"},
  "Colombia":{"fr":"Colombie","code":"CO"},"Uruguay":{"fr":"Uruguay","code":"UY"},
  "Ecuador":{"fr":"Équateur","code":"EC"},"Peru":{"fr":"Pérou","code":"PE"},
  "Paraguay":{"fr":"Paraguay","code":"PY"},"Bolivia":{"fr":"Bolivie","code":"BO"},
  "United States":{"fr":"États-Unis","code":"US"},"Canada":{"fr":"Canada","code":"CA"},
  "Mexico":{"fr":"Mexique","code":"MX"},"New Caledonia":{"fr":"Nouvelle-Calédonie","code":"NC"},
  "Australia":{"fr":"Australie","code":"AU"},"New Zealand":{"fr":"Nouvelle-Zélande","code":"NZ"},
  "Nigeria":{"fr":"Nigeria","code":"NG"},"Kenya":{"fr":"Kenya","code":"KE"},
  "Morocco":{"fr":"Maroc","code":"MA"},"South Africa":{"fr":"Afrique du Sud","code":"ZA"},
  "Egypt":{"fr":"Égypte","code":"EG"},"Japan":{"fr":"Japon","code":"JP"},
  "South Korea":{"fr":"Corée du Sud","code":"KR"},"Taiwan":{"fr":"Taïwan","code":"TW"},
  "Hong Kong":{"fr":"Hong Kong","code":"HK"},"Hong-Kong":{"fr":"Hong Kong","code":"HK"},
  "Singapore":{"fr":"Singapour","code":"SG"},"Malaysia":{"fr":"Malaisie","code":"MY"},
  "Thailand":{"fr":"Thaïlande","code":"TH"},"Philippines":{"fr":"Philippines","code":"PH"},
  "Indonesia":{"fr":"Indonésie","code":"ID"},"Vietnam":{"fr":"Vietnam","code":"VN"},
  "India":{"fr":"Inde","code":"IN"},"Saudi Arabia":{"fr":"Arabie Saoudite","code":"SA"},
  "United Arab Emirates":{"fr":"Émirats Arabes Unis","code":"AE"},
  "Kuwait":{"fr":"Koweït","code":"KW"},"Qatar":{"fr":"Qatar","code":"QA"},
  "Bahrain":{"fr":"Bahreïn","code":"BH"},"Oman":{"fr":"Oman","code":"OM"},
  "Jordan":{"fr":"Jordanie","code":"JO"},"Lebanon":{"fr":"Liban","code":"LB"},
  "Israel":{"fr":"Israël","code":"IL"},"Turkey":{"fr":"Turquie","code":"TR"}
};

function formatDelta(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return (n > 0 ? "+" : "") + n;
}

function trendClass(delta, inverse = false) {
  if (!delta || delta === 0) return "";
  const positive = inverse ? delta < 0 : delta > 0;
  return positive ? "up" : "down";
}

// ============ FETCH SUPABASE ============
async function loadLiveData() {
  const cfg = window.SUPABASE_CONFIG;
  console.log('[BANDI] loadLiveData — config:', cfg ? `url=${cfg.url.slice(0, 40)}…` : 'MANQUANT');
  if (!cfg || cfg.url.includes('PLACEHOLDER')) {
    console.warn('[BANDI] ⚠️ Supabase non configuré — fallback statique utilisé');
    return;
  }

  const headers = {
    'apikey': cfg.anonKey,
    'Authorization': `Bearer ${cfg.anonKey}`
  };

  try {
    // 1. Historique (30 derniers snapshots)
    const snapRes = await fetch(
      `${cfg.url}/rest/v1/bandi_snapshots?order=date.desc&limit=30`,
      { headers, cache: 'no-store' }
    );
    const snapshots = await snapRes.json();

    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      console.warn('⚠️ Pas de snapshots, fallback');
      return;
    }

    const current = snapshots[0];
    const previous = snapshots[1] || current;
    const today = current.date;

    // 2. Pays du jour
    const paysRes = await fetch(
      `${cfg.url}/rest/v1/bandi_country_rankings?date=eq.${today}&order=rang.asc`,
      { headers, cache: 'no-store' }
    );
    const paysData = await paysRes.json();

    // 3. Top 10 monde du jour
    const top10Res = await fetch(
      `${cfg.url}/rest/v1/netflix_tv_top10_world?date=eq.${today}&order=rang.asc`,
      { headers, cache: 'no-store' }
    );
    const top10Data = await top10Res.json();

    // 3b. Historique rang TV Shows de Bandi (pour delta hero cohérent)
    // On filtre la table netflix_tv_top10_world sur les entrées qui contiennent "bandi"
    // → donne [{ date, rang, titre, score }, ...] triés du plus récent au plus ancien.
    let bandiTvHist = [];
    try {
      const bhRes = await fetch(
        `${cfg.url}/rest/v1/netflix_tv_top10_world?titre=ilike.%25bandi%25&order=date.desc&limit=30`,
        { headers, cache: 'no-store' }
      );
      if (bhRes.ok) bandiTvHist = await bhRes.json();
    } catch (_) { /* pas critique */ }

    // 4. Historique par pays (pour calculer trend)
    const paysHistRes = await fetch(
      `${cfg.url}/rest/v1/bandi_country_rankings?order=date.desc&limit=500`,
      { headers, cache: 'no-store' }
    );
    const paysHist = await paysHistRes.json();
    window._paysHistCache = paysHist; // exposé pour initMapTab momentum

    // 5. Tudum officiel — dernière semaine disponible (toutes catégories)
    let tudumData = [];
    try {
      const tudumRes = await fetch(
        `${cfg.url}/rest/v1/tudum_global_weekly?order=week_start.desc%2Crang.asc&limit=40`,
        { headers, cache: 'no-store' }
      );
      if (tudumRes.ok) tudumData = await tudumRes.json();
    } catch (_) { /* table absente ou réseau, pas critique */ }

    // 6. Google Trends (7 derniers jours) — pour Completion Score
    let buzzTrends7d = [];
    try {
      const tRes = await fetch(
        `${cfg.url}/rest/v1/buzz_trends?order=date.desc&limit=7`,
        { headers, cache: 'no-store' }
      );
      if (tRes.ok) buzzTrends7d = await tRes.json();
    } catch (_) { /* table absente, pas critique */ }

    // 7. Buzz social récent (100 derniers posts) — pour Completion Score
    let buzzSocialRecent = [];
    try {
      const sRes = await fetch(
        `${cfg.url}/rest/v1/buzz_social?order=published_at.desc&limit=100`,
        { headers, cache: 'no-store' }
      );
      if (sRes.ok) buzzSocialRecent = await sRes.json();
    } catch (_) { /* table absente, pas critique */ }

    // 8. Notes externes multi-sources — pour Completion Score
    // Table unifiée external_ratings (source, rating, rating_max, rating_norm, votes, reviews_count)
    // Sources : imdb · tmdb · allocine_public · allocine_press · senscritique
    //           · rt_critics · rt_audience · filmaffinity
    // On récupère les 80 dernières lignes (10 par source max) puis on garde la plus récente par source.
    let externalRatings = [];
    try {
      const erRes = await fetch(
        `${cfg.url}/rest/v1/external_ratings?order=date.desc&limit=80`,
        { headers, cache: 'no-store' }
      );
      if (erRes.ok) {
        const arr = await erRes.json();
        if (Array.isArray(arr)) externalRatings = arr;
      }
    } catch (_) { /* table absente, pas critique */ }

    // Réduction : dernière entrée par source
    const latestBySource = {};
    for (const r of externalRatings) {
      if (!latestBySource[r.source]) latestBySource[r.source] = r;
    }

    // 9. Wikipedia pageviews (signal d'intérêt encyclopédique) — pour Completion Score
    // Table wikipedia_pageviews (date, project, article, views)
    // On récupère les 30 derniers jours (tous projets confondus).
    let wikipediaPageviews = [];
    try {
      const wpRes = await fetch(
        `${cfg.url}/rest/v1/wikipedia_pageviews?order=date.desc&limit=60`,
        { headers, cache: 'no-store' }
      );
      if (wpRes.ok) {
        const arr = await wpRes.json();
        if (Array.isArray(arr)) wikipediaPageviews = arr;
      }
    } catch (_) { /* table absente, pas critique */ }

    // 10. Total country-days in top 10 (agrégat monitoring) — COUNT(*) sur bandi_country_rankings
    let joursEnTop10 = 0;
    try {
      const cntRes = await fetch(
        `${cfg.url}/rest/v1/bandi_country_rankings?select=id`,
        { headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0', 'Range-Unit': 'items' }, cache: 'no-store' }
      );
      if (cntRes.ok) {
        const range = cntRes.headers.get('content-range'); // "0-0/12345"
        if (range) joursEnTop10 = parseInt(range.split('/')[1], 10) || 0;
      }
      // Fallback : estimer depuis paysHist déjà chargé
      if (!joursEnTop10 && Array.isArray(paysHist)) joursEnTop10 = paysHist.length;
    } catch (_) { joursEnTop10 = Array.isArray(paysHist) ? paysHist.length : 0; }

    // ── C3 (audit) : resync USA rang depuis données live ────────────────
    // bandi_country_rankings = source de vérité, BANDI.strategique.usaRang
    // n'est plus qu'un fallback offline
    try {
      const usaLive = (paysData || []).find(p =>
        p.code_pays === 'US' || p.pays === 'États-Unis' || p.pays === 'United States'
      );
      if (usaLive?.rang && BANDI.strategique) {
        BANDI.strategique.usaRang = usaLive.rang;
        BANDI.strategique.usaDate = today.slice(8,10) + '/' + today.slice(5,7) + '/' + today.slice(0,4);
      }
    } catch (_) {}

    // 11. Heures de visionnage cumulées Tudum pour Bandi (somme de toutes les semaines)
    let heuresVuesCumul = null;
    try {
      const hcRes = await fetch(
        `${cfg.url}/rest/v1/tudum_global_weekly?titre=ilike.%25bandi%25&select=heures_vues,views_millions`,
        { headers, cache: 'no-store' }
      );
      if (hcRes.ok) {
        const arr = await hcRes.json();
        if (Array.isArray(arr) && arr.length > 0) {
          heuresVuesCumul = arr.reduce((s, r) => s + (parseFloat(r.heures_vues) || 0), 0);
          heuresVuesCumul = Math.round(heuresVuesCumul * 100) / 100;
        }
      }
    } catch (_) { /* table absente, pas critique */ }

    // Construction de l'historique par pays (4 derniers jours)
    const historyByCountry = {};
    const datesDesc = [...new Set(paysHist.map(r => r.date))].sort().reverse().slice(0, 4).reverse();

    paysData.forEach(p => {
      const hist = datesDesc.map(d => {
        const rec = paysHist.find(r => r.date === d && r.pays === p.pays);
        return rec ? rec.rang : null;
      });
      historyByCountry[p.pays] = hist;
    });

    // Enrichissement pays : code ISO → flag emoji + nom FR via COUNTRY_FR_MAP
    const enrichedPays = paysData.map(p => {
      // code_pays stocké en DB par le scraper mis à jour, fallback via mapping client
      const code = p.code_pays || COUNTRY_FR_MAP[p.pays]?.code || '';
      const mapped = COUNTRY_FR_MAP[p.pays];
      const nomFr = mapped?.fr || p.pays; // nom français ou anglais si non trouvé

      const hist = historyByCountry[p.pays] || [null, null, null, p.rang];
      const lastTwo = hist.slice(-2).filter(x => x !== null);
      let trend = 'stable';
      if (lastTwo.length === 2) {
        if (lastTwo[1] < lastTwo[0]) trend = 'up';
        else if (lastTwo[1] > lastTwo[0]) trend = 'down';
      }

      return {
        pays: nomFr,         // nom FR pour l'affichage
        paysEn: p.pays,      // nom EN pour les lookups internes (carte, etc.)
        flag: codeToFlag(code),
        code,
        region: p.region || mapped?.region || 'Autre',
        rang: p.rang,
        entree: '—',
        historique: hist,
        trend
      };
    });

    // Calcul perf pays : rang actuel vs moyenne semaine précédente
    const todayDate = new Date(today);
    const countryPerf = paysData.map(p => {
      const prevRecords = paysHist.filter(r => {
        if (r.pays !== p.pays) return false;
        const diffDays = Math.round((todayDate - new Date(r.date)) / 86400000);
        return diffDays > 0 && diffDays <= 7;
      });
      const prevAvg = prevRecords.length > 0
        ? prevRecords.reduce((s, r) => s + r.rang, 0) / prevRecords.length
        : null;
      const delta = prevAvg !== null ? prevAvg - p.rang : null; // positif = progression
      const enriched = enrichedPays.find(ep => ep.paysEn === p.pays);
      return {
        pays: enriched?.pays || COUNTRY_FR_MAP[p.pays]?.fr || p.pays,
        paysEn: p.pays,
        flag: enriched?.flag || codeToFlag(p.code_pays || COUNTRY_FR_MAP[p.pays]?.code || ''),
        region: p.region || 'Autre',
        rang: p.rang,
        prevAvg: prevAvg !== null ? Math.round(prevAvg * 10) / 10 : null,
        delta,
        historique: historyByCountry[p.pays] || []
      };
    });

    // Historique quotidien Martinique (pour graphique Phase B)
    const martiniqueRanks = paysHist
      .filter(r => r.pays === 'Martinique')
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(r => ({ date: r.date.slice(5).replace('-', '/'), rang: r.rang }));

    // ── Cohérence forcée : recalcul des agrégats à partir de enrichedPays ──
    // bandi_snapshots peut diverger légèrement de bandi_country_rankings (timing
    // entre l'insert du snapshot et l'insert des pays par le scraper). On force
    // la source de vérité unique côté frontend : la liste de pays réelle.
    const enrichedPaysN1 = enrichedPays.filter(p => p.rang === 1).length;
    const enrichedPaysTop10 = enrichedPays.length;
    const enrichedRangMoyen = enrichedPays.length
      ? Math.round((enrichedPays.reduce((s, p) => s + p.rang, 0) / enrichedPays.length) * 10) / 10
      : null;

    // Override BANDI (Object.assign pour muter la const déclarée dans data-fallback.js)
    // ?? préserve les valeurs data-fallback.js si la DB retourne null
    const _prevCur = BANDI.current || {};
    // M1 (audit) : on marque explicitement que les données ne sont plus du fallback
    BANDI._fallback = false;
    Object.assign(BANDI, {
      current: {
        score:     current.score_monde     ?? _prevCur.score     ?? 0,
        rang:      current.rang_monde      ?? _prevCur.rang      ?? 0,
        paysN1:    enrichedPaysN1          ?? _prevCur.paysN1    ?? 0,
        paysTop10: enrichedPaysTop10       ?? _prevCur.paysTop10 ?? 0,
        rangMoyen: enrichedRangMoyen       ?? _prevCur.rangMoyen ?? null
      },
      previous: {
        score: previous.score_monde,
        // Rang TV Shows d'hier (même logique que current : source netflix_tv_top10_world)
        // Fallback vers previous.rang_monde (all-content) si pas trouvé
        rang: (() => {
          const prevDate = previous.date;
          const prevTv = bandiTvHist.find(r => r.date === prevDate);
          return prevTv?.rang ?? previous.rang_monde;
        })(),
        paysN1: previous.pays_n1,
        paysTop10: previous.pays_top10,
        rangMoyen: parseFloat(previous.rang_moyen) || null
      },
      historique: snapshots
        .slice(0, 10)
        .reverse()
        .map(s => ({
          jour: s.date.slice(5).replace('-', '/'),
          label: '',
          score: s.score_monde,
          rang: s.rang_monde,
          paysN1: s.pays_n1,
          paysTop10: s.pays_top10,
          rangMoyen: parseFloat(s.rang_moyen) || null
        })),
      pays: enrichedPays.length > 0 ? enrichedPays : BANDI.pays,
      snapshots30: snapshots,
      countryPerf,
      martiniqueRanks,
      rivals: (() => {
        // ── Source de vérité : FlixPatrol ── netflix_tv_top10_world ──
        // On conserve le `rang` officiel FlixPatrol dans chaque objet pour
        // que renderRivals affiche la position DB (fiable même si trous).
        // Pas de re-tri : FlixPatrol fait autorité sur la position.
        const base = top10Data.length > 0
          ? top10Data.map(t => ({
              rang: t.rang,
              titre: t.titre,
              score: t.score,
              isBandi: t.titre.toLowerCase().includes('bandi')
            }))
          : BANDI.rivals.map((r, i) => ({ rang: i + 1, ...r }));

        if (current.score_monde) {
          const bIdx = base.findIndex(r => r.isBandi);
          if (bIdx !== -1) {
            base[bIdx].score = current.score_monde; // score live, position préservée
          }
        }
        return base;
      })(),
      tudumWeekly: Array.isArray(tudumData) ? tudumData : [],
      // Données pour Completion Score estimé
      buzzTrends7d: Array.isArray(buzzTrends7d) ? buzzTrends7d : [],
      buzzSocialRecent: Array.isArray(buzzSocialRecent) ? buzzSocialRecent : [],
      // Notes externes multi-sources
      externalRatings: latestBySource,
      imdb:           latestBySource.imdb            || null,
      tmdb:           latestBySource.tmdb            || null,
      allocinePublic: latestBySource.allocine_public || null,
      allocinePress:  latestBySource.allocine_press  || null,
      senscritique:   latestBySource.senscritique    || null,
      rtCritics:      latestBySource.rt_critics      || null,
      rtAudience:     latestBySource.rt_audience     || null,
      filmaffinity:   latestBySource.filmaffinity    || null,
      // Wikipedia pageviews
      wikipediaPageviews: Array.isArray(wikipediaPageviews) ? wikipediaPageviews : [],
      // Monitoring — agrégats visionnage
      joursEnTop10,
      heuresVuesCumul
    });

    // ── Hero rang : rang TV Shows officiel FlixPatrol ────────────────────────
    // Source : netflix_tv_top10_world.rang (scrape de /top10/netflix/world/).
    // ATTENTION : snapshot.rang_monde = rang TOUTES catégories (Films+TV mélangés)
    //   → ne JAMAIS l'utiliser pour le hero qui annonce "TV SHOWS NETFLIX".
    //     Il peut afficher #1 quand Bandi est #3 en TV Shows (bug visible pour Allan).
    // Ordre de priorité (strict TV Shows uniquement) :
    //   1. top10Data.find(bandi).rang (TV Shows du jour)
    //   2. bandiTvHist[0].rang (dernière entrée TV Shows connue, même si J-1/J-2)
    //   3. Position dans BANDI.rivals (fallback offline)
    const bandiInTodayTop10 = Array.isArray(top10Data)
      ? top10Data.find(t => t?.titre && t.titre.toLowerCase().includes('bandi'))
      : null;
    const bandiLastTv = Array.isArray(bandiTvHist) && bandiTvHist.length ? bandiTvHist[0] : null;

    if (bandiInTodayTop10 && bandiInTodayTop10.rang) {
      BANDI.current.rang = bandiInTodayTop10.rang;
      console.log(`[BANDI] Rang TV Shows : #${bandiInTodayTop10.rang} (top10 du jour ${today})`);
    } else if (bandiLastTv && bandiLastTv.rang) {
      BANDI.current.rang = bandiLastTv.rang;
      const stale = bandiLastTv.date !== today ? ` ⚠ stale (${bandiLastTv.date})` : '';
      console.log(`[BANDI] Rang TV Shows : #${bandiLastTv.rang} (netflix_tv_top10_world ${bandiLastTv.date})${stale}`);
    } else {
      const bIdx = BANDI.rivals.findIndex(r => r.isBandi);
      if (bIdx !== -1) BANDI.current.rang = bIdx + 1;
      console.warn(`[BANDI] Aucune source TV Shows — fallback rivals #${BANDI.current.rang}. rang_monde brut (all-content) = #${current.rang_monde} NON utilisé (trompeur).`);
    }
    // Exposer la date du snapshot pour l'affichage dynamique (footer, hero)
    BANDI.current.date = today;

    // Badge sources croisées
    renderSourcesBadge();

    console.log('✅ Données live chargées depuis Supabase');
    console.log(`   Date: ${today} | Score: ${current.score_monde} | Rang TV Shows: #${BANDI.current.rang} | rang_monde brut (all-content): #${current.rang_monde}`);

    // Badge "LIVE" vert si connecté
    const liveEl = document.querySelector('.live-text');
    if (liveEl) liveEl.textContent = 'LIVE';
  } catch (err) {
    console.error('❌ Erreur fetch Supabase, fallback :', err);
  }
}

function renderSourcesBadge() {
  try {
    const badge = document.getElementById('sourcesBadge');
    if (!badge) return;
    const rang  = BANDI.current?.rang;
    const prev  = BANDI.previous?.rang;
    const score = BANDI.current?.score;
    const date  = BANDI.current?.date || '—';
    if (!rang) return;
    const inTop10 = rang <= 10;
    const trend   = prev ? Math.sign(prev - rang) : 0;
    const arrow   = trend > 0 ? ' ↑' : trend < 0 ? ' ↓' : '';
    badge.textContent  = inTop10 ? `✓ #${rang}${arrow}` : `⚠ #${rang}`;
    badge.className    = `sources-badge ${inTop10 ? 'coherent' : 'warning'}`;
    badge.title        = `FlixPatrol TV Shows · #${rang} · ${score || '—'} pts · ${date}`;
    badge.style.display = '';
  } catch (_) {}
}

// ============ GRAPHIQUE RANG MARTINIQUE ============
let martiniqueChartInstance = null;

function renderMartiniqueChart() {
  const ctx = document.getElementById('martiniqueChart');
  if (!ctx) return;

  const data = (BANDI.martiniqueRanks && BANDI.martiniqueRanks.length > 0)
    ? BANDI.martiniqueRanks
    : BANDI.historique
        .filter(h => h.rang !== null)
        .map(h => ({ date: h.jour, rang: 1 })); // fallback statique : toujours #1

  if (data.length === 0) return;

  if (martiniqueChartInstance) martiniqueChartInstance.destroy();

  martiniqueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        data: data.map(d => d.rang),
        borderColor: '#CE1126',
        backgroundColor: ctx => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(206,17,38,0.2)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(206,17,38,0.35)');
          g.addColorStop(1, 'rgba(206,17,38,0)');
          return g;
        },
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointBackgroundColor: '#CE1126',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0D0D0D',
          borderColor: '#CE1126',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#B5B5B5',
          callbacks: {
            label: c => `🇲🇶 Rang #${c.raw} · ${c.raw === 1 ? '🥇 N°1 !' : ''}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 10 },
          grid: { color: 'rgba(42,42,42,0.5)' }
        },
        y: {
          reverse: true,          // rang 1 = en haut
          min: 1,
          suggestedMax: 5,
          ticks: {
            color: '#8A8A8A',
            font: { family: 'JetBrains Mono', size: 10 },
            stepSize: 1,
            callback: v => `#${v}`
          },
          grid: { color: 'rgba(42,42,42,0.5)' }
        }
      }
    }
  });
}

// ============ TAB NAVIGATION ============
function initTabs() {
  const topTabs = document.querySelectorAll(".tab");
  const bottomTabs = document.querySelectorAll(".bnav-item");
  const panels = document.querySelectorAll(".tab-panel");
  const allTabs = [...topTabs, ...bottomTabs];

  function setActive(target) {
    topTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === target));
    bottomTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === target));
    panels.forEach(p => p.classList.remove("active"));
    const panel = $(`panel-${target}`);
    if (panel) panel.classList.add("active");
    // Remonte en haut au changement d'onglet (UX mobile)
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Vibration tactile si supportée
    if (navigator.vibrate) navigator.vibrate(8);
    // Init lazy des onglets lourds
    if (target === 'history')    renderHistoryTab();
    if (target === 'map')        initMapTab();
    if (target === 'buzz')       initBuzzTab();
    if (target === 'monitoring') initMonitoringTab();
  }

  allTabs.forEach(tab => {
    tab.addEventListener("click", () => setActive(tab.dataset.tab));
  });
}

// ============ HORLOGE LIVE ============
function initLiveClock() {
  const el = $("liveTime");
  function update() {
    const now = new Date();
    el.textContent = now.toLocaleString("fr-FR", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
  update();
  setInterval(update, 1000);
}

// ============ OVERVIEW ============
// Couleur du rang hero selon la valeur
// Retourne le nom de classe CSS applicable à .rank-number
function getRankColor(value) {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 1) return 'rank-red';
  if (v >= 1 && v <= 3) return 'rank-green';
  if (v >= 4 && v <= 5) return 'rank-orange';
  return 'rank-red'; // 6 à 99
}

function renderOverview() {
  const cur = BANDI.current;
  const prev = BANDI.previous;

  const rankEl = $("rankNumber");
  rankEl.textContent = (cur.rang != null && cur.rang > 0) ? `#${cur.rang}` : "#—";
  // Applique la classe de couleur selon la valeur du rang
  rankEl.classList.remove('rank-green', 'rank-orange', 'rank-red');
  rankEl.classList.add(getRankColor(cur.rang));
  const rankDelta = prev.rang - cur.rang;
  const rankDeltaEl = $("rankDelta");
  const rankDeltaValueEl = $("rankDeltaValue");

  if (rankDelta > 0) {
    rankDeltaValueEl.textContent = `+${rankDelta} places`;
    rankDeltaEl.style.background = "rgba(0, 151, 57, 0.15)";
    rankDeltaEl.style.borderColor = "rgba(0, 151, 57, 0.4)";
    rankDeltaEl.style.color = "#009739";
  } else if (rankDelta < 0) {
    rankDeltaValueEl.textContent = `${rankDelta} places`;
    rankDeltaEl.style.background = "rgba(206, 17, 38, 0.15)";
    rankDeltaEl.style.borderColor = "rgba(206, 17, 38, 0.4)";
    rankDeltaEl.style.color = "#CE1126";
    const svg = rankDeltaEl.querySelector("svg");
    if (svg) svg.style.transform = "rotate(180deg)";
  } else {
    rankDeltaValueEl.textContent = "stable";
  }

  $("heroScore").textContent = cur.score ?? "—";
  const scoreDelta = (cur.score ?? 0) - (prev.score ?? 0);
  $("heroScoreDelta").textContent = "(" + formatDelta(scoreDelta) + ")";
  $("heroN1Count").textContent = cur.paysN1 ?? "—";
  $("heroPresence").textContent = cur.paysTop10 ?? "—";

  $("kpiScore").textContent = cur.score ?? "—";
  $("kpiScoreTrend").textContent = formatDelta(scoreDelta) + " vs hier";
  $("kpiScoreTrend").className = "kpi-trend " + trendClass(scoreDelta);

  $("kpiN1").textContent = cur.paysN1 ?? "—";
  const n1Delta = (cur.paysN1 ?? 0) - (prev.paysN1 ?? 0);
  $("kpiN1Trend").textContent = formatDelta(n1Delta) + " vs hier";
  $("kpiN1Trend").className = "kpi-trend " + trendClass(n1Delta);

  $("kpiTop10").textContent = cur.paysTop10 ?? "—";
  const top10Delta = (cur.paysTop10 ?? 0) - (prev.paysTop10 ?? 0);
  $("kpiTop10Trend").textContent = top10Delta === 0 ? "stable" : formatDelta(top10Delta) + " vs hier";
  $("kpiTop10Trend").className = "kpi-trend " + trendClass(top10Delta);

  $("kpiAvg").textContent = cur.rangMoyen ?? "—";
  if (cur.rangMoyen != null && prev.rangMoyen != null) {
    const avgDelta = (cur.rangMoyen - prev.rangMoyen).toFixed(1);
    $("kpiAvgTrend").textContent = formatDelta(avgDelta) + " · plus bas = mieux";
    $("kpiAvgTrend").className = "kpi-trend " + trendClass(parseFloat(avgDelta), true);
  }

  $("tabCountCountries").textContent = BANDI.pays.length;
  // ── Dates dynamiques (footer + hero) ───────────────────────────────
  const fmtDate = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const dateFR = fmtDate(BANDI.current?.date);
  // Heure locale de la dernière synchro (HH:mm) — permet de voir le live pulse.
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeFR = `${hh}:${mm}`;
  if (dateFR) {
    const luEl = $("lastUpdate");
    if (luEl) luEl.textContent = `${dateFR} · ${timeFR}`;
    const heroU = $("heroUpdate");
    if (heroU) heroU.textContent = `${dateFR} · ${timeFR}`;
  }
}

// ============ CHART ============
function renderChart() {
  const ctx = document.getElementById("evolutionChart");
  if (!ctx) return;

  const labels = BANDI.historique.map(h => h.jour);
  const scores = BANDI.historique.map(h => h.score);
  const paysN1 = BANDI.historique.map(h => h.paysN1);

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Score",
          data: scores,
          borderColor: "#CE1126",
          backgroundColor: (context) => {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, "rgba(206, 17, 38, 0.5)");
            gradient.addColorStop(1, "rgba(206, 17, 38, 0)");
            return gradient;
          },
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#CE1126",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y'
        },
        {
          label: "Pays #1",
          data: paysN1,
          borderColor: "#009739",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.3,
          pointBackgroundColor: "#009739",
          pointBorderColor: "#fff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0D0D0D",
          borderColor: "#CE1126",
          borderWidth: 1,
          titleColor: "#fff",
          titleFont: { family: "Inter Tight", weight: "700", size: 13 },
          bodyColor: "#B5B5B5",
          bodyFont: { family: "JetBrains Mono", size: 12 },
          padding: 12,
          cornerRadius: 6,
          callbacks: {
            label: function(ctx) {
              if (ctx.dataset.label === "Score") {
                return ctx.raw === null ? "Score : —" : `Score : ${ctx.raw} pts`;
              }
              return `Pays #1 : ${ctx.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8A8A8A", font: { family: "JetBrains Mono", size: 11 } },
          grid: { color: "rgba(42, 42, 42, 0.5)" }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          ticks: { color: "#8A8A8A", font: { family: "JetBrains Mono", size: 11 } },
          grid: { color: "rgba(42, 42, 42, 0.5)" },
          title: { display: true, text: "Score", color: "#CE1126", font: { family: "Inter Tight", size: 10, weight: "600" } }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          ticks: { color: "#8A8A8A", font: { family: "JetBrains Mono", size: 11 }, stepSize: 2 },
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Pays #1", color: "#009739", font: { family: "Inter Tight", size: 10, weight: "600" } }
        }
      }
    }
  });
}

// ============ COUNTRIES ============
let currentRegionFilter = "Toutes";
let currentSearch = "";

function renderRegionFilters() {
  const regions = ["Toutes", ...new Set(BANDI.pays.map(p => p.region))];
  const container = $("regionFilters");
  container.innerHTML = regions.map(r =>
    `<button class="region-btn ${r === currentRegionFilter ? 'active' : ''}" data-region="${r}">${r}</button>`
  ).join("");
  container.querySelectorAll(".region-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentRegionFilter = btn.dataset.region;
      renderRegionFilters();
      renderCountries();
    });
  });
}

function renderCountries() {
  const filtered = BANDI.pays
    .filter(p => currentRegionFilter === "Toutes" || p.region === currentRegionFilter)
    .filter(p => p.pays.toLowerCase().includes(currentSearch.toLowerCase()))
    .sort((a, b) => a.rang - b.rang);

  $("countriesCount").textContent = filtered.length;
  const list = $("countriesList");

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding: 40px; text-align: center; color: #8A8A8A;">Aucun pays ne correspond.</div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    const regionColor = (window.REGION_COLORS && window.REGION_COLORS[p.region]) || "#8A8A8A";
    const rankClass = p.rang === 1 ? "rank-1" : p.rang <= 3 ? "rank-top" : "rank-other";
    const historyStr = (p.historique || []).map(h => h === null ? "—" : `#${h}`).join(" · ");

    let trendIcon, trendColor;
    if (p.trend === "up") {
      trendIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
      trendColor = "#009739";
    } else if (p.trend === "down") {
      trendIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`;
      trendColor = "#CE1126";
    } else {
      trendIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg>`;
      trendColor = "#8A8A8A";
    }

    return `
      <div class="country-row">
        <span class="country-flag">${p.flag}</span>
        <div class="country-info">
          <div class="country-name-row">
            <span class="country-name">${p.pays}</span>
            <span class="country-region" style="background: ${regionColor}20; color: ${regionColor};">${p.region}</span>
          </div>
          <div class="country-history">
            ${p.entree ? `Entré le ${p.entree} · ` : ''}Historique 4j : ${historyStr}
          </div>
        </div>
        <div class="country-trend" style="background: ${trendColor}15; color: ${trendColor};">${trendIcon}</div>
        <div class="country-rank-badge ${rankClass}">#${p.rang}</div>
      </div>
    `;
  }).join("");
}

function initCountrySearch() {
  $("searchCountry").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderCountries();
  });
}

// ============ RIVALS ============
function renderRivals() {
  const max = Math.max(...BANDI.rivals.map(r => r.score));
  const bandiScore = BANDI.current.score;
  const list = $("rivalsList");

  list.innerHTML = BANDI.rivals.map((r, i) => {
    const pct = (r.score / max) * 100;
    const gap = r.isBandi ? 0 : r.score - bandiScore;
    const gapClass = gap > 0 ? "positive" : "negative";
    const gapText = gap === 0 ? "" : (gap > 0 ? `+${gap}` : `${gap}`);
    const displayRank = r.rang ?? (i + 1);

    return `
      <div class="rival-row ${r.isBandi ? 'is-bandi' : ''}">
        <span class="rival-rank">#${displayRank}</span>
        <div>
          <div class="rival-title-row">
            <div>
              <span class="rival-name">${r.titre}</span>
              ${r.isBandi ? '<span class="rival-badge">BANDI</span>' : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${gapText ? `<span class="rival-gap ${gapClass}">${gapText}</span>` : ''}
              <span class="rival-score">${r.score}</span>
            </div>
          </div>
          <div class="rival-bar"><div class="rival-bar-fill" style="width: ${pct}%;"></div></div>
        </div>
        <span></span>
      </div>
    `;
  }).join("");
  // ── Mise à jour texte insight (dynamique) — basé sur rang officiel FlixPatrol
  const insightEl = document.getElementById("rivalsInsight");
  if (insightEl && BANDI.rivals.length > 0) {
    const bandiIdx = BANDI.rivals.findIndex(r => r.isBandi);
    if (bandiIdx >= 0) {
      const bandi = BANDI.rivals[bandiIdx];
      const bandiRank = bandi.rang ?? (bandiIdx + 1);
      const prevR = bandiIdx > 0 ? BANDI.rivals[bandiIdx - 1] : null;
      const nextR = BANDI.rivals[bandiIdx + 1] || null;
      const bScore = bandi.score;
      let txt = bandiRank === 1
        ? `Bandi est <strong>#1 mondial TV Shows</strong>`
        : `Bandi se classe <strong>#${bandiRank} mondial TV Shows</strong>`;
      if (prevR) {
        const prevRank = prevR.rang ?? bandiIdx;
        txt += `, à <strong>${Math.abs(bScore - prevR.score)} pts</strong> de ${prevR.titre} (#${prevRank})`;
      }
      if (nextR) {
        const nextRank = nextR.rang ?? (bandiIdx + 2);
        txt += ` ${prevR ? 'et' : ','} <strong>${Math.abs(bScore - nextR.score)} pts</strong> devant ${nextR.titre} (#${nextRank})`;
      }
      const scoreDiff = (BANDI.current?.score ?? 0) - (BANDI.previous?.score ?? 0);
      if (scoreDiff !== 0 && (BANDI.previous?.score ?? 0) > 0) {
        const pct = Math.round((scoreDiff / BANDI.previous.score) * 100);
        txt += `. Progression quotidienne ${pct > 0 ? '+' : ''}${pct}% vs hier.`;
      }
      insightEl.innerHTML = txt;
    }
  }
}

// ============ RIVALS TOGGLE ============
function initRivalsToggle() {
  const stogFlix  = document.getElementById('stogFlix');
  const stogTudum = document.getElementById('stogTudum');
  const viewFlix  = document.getElementById('rivalsViewFlix');
  const viewTudum = document.getElementById('rivalsViewTudum');
  const rivalsSub = document.getElementById('rivalsSub');
  const tudumHint = document.getElementById('tudumHint');
  if (!stogFlix || !stogTudum) return;

  // ── État Tudum : disponible uniquement si week data présente ───────
  const tudumAvailable = Array.isArray(BANDI.tudumWeekly) && BANDI.tudumWeekly.length > 0;
  if (!tudumAvailable) {
    stogTudum.classList.add('stoggle-pending');
    stogTudum.setAttribute('aria-disabled', 'true');
    if (tudumHint) tudumHint.textContent = 'mardi';
  } else {
    stogTudum.classList.remove('stoggle-pending');
    stogTudum.removeAttribute('aria-disabled');
    if (tudumHint) tudumHint.textContent = '✓';
  }

  // Par défaut : toujours FlixPatrol (seule source fiable avant mardi)
  stogFlix.classList.add('active');
  stogTudum.classList.remove('active');

  stogFlix.addEventListener('click', () => {
    stogFlix.classList.add('active');
    stogTudum.classList.remove('active');
    viewFlix.style.display = '';
    viewTudum.style.display = 'none';
    if (rivalsSub) rivalsSub.textContent = 'Position de Bandi face aux autres séries du classement mondial · source FlixPatrol';
  });

  stogTudum.addEventListener('click', (e) => {
    if (stogTudum.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      if (rivalsSub) rivalsSub.textContent = 'Données Tudum indisponibles pour l\'instant — publication Netflix chaque mardi';
      return;
    }
    stogTudum.classList.add('active');
    stogFlix.classList.remove('active');
    viewFlix.style.display = 'none';
    viewTudum.style.display = '';
    if (rivalsSub) rivalsSub.textContent = 'Heures de visionnage officielles Netflix · Mise à jour chaque mardi';
    renderRivalsTudum();
  });
}

// ============ RIVALS TUDUM ============
let rivalsTudumRendered = false;

function renderRivalsTudum() {
  if (rivalsTudumRendered) return;
  rivalsTudumRendered = true;

  const list      = document.getElementById('rivalsTudumList');
  const weekBadge = document.getElementById('tudumWeekBadge');
  if (!list) return;

  const data = BANDI.tudumWeekly || [];
  if (data.length === 0) {
    list.innerHTML = '<div class="tudum-empty">Données Tudum non disponibles. Le scraper s\'exécute chaque mardi.</div>';
    return;
  }

  const latestWeek = data[0].week_start;
  const weekRows   = data.filter(r => r.week_start === latestWeek);

  if (weekBadge) {
    const d1 = new Date(latestWeek);
    const d2 = new Date(latestWeek);
    d2.setUTCDate(d2.getUTCDate() + 6);
    const fmt = d => `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    weekBadge.textContent = `semaine ${fmt(d1)} → ${fmt(d2)}`;
  }

  const tvEn = weekRows.filter(r => r.categorie === 'tv_english').sort((a,b) => a.rang - b.rang);
  if (tvEn.length === 0) {
    list.innerHTML = '<div class="tudum-empty">Données TV English non disponibles pour cette semaine.</div>';
    return;
  }

  const maxH = Math.max(...tvEn.map(r => parseFloat(r.heures_vues) || 0));

  list.innerHTML = tvEn.map(r => {
    const h       = parseFloat(r.heures_vues) || 0;
    const pct     = maxH > 0 ? (h / maxH) * 100 : 0;
    const isBandi = r.titre.toLowerCase().includes('bandi');
    const heuresStr = h > 0 ? `${h.toFixed(1)}M h` : '—';

    return `<div class="rival-row ${isBandi ? 'is-bandi' : ''}">
      <span class="rival-rank">#${r.rang}</span>
      <div>
        <div class="rival-title-row">
          <div>
            <span class="rival-name">${r.titre}</span>
            ${r.saison ? `<span class="rival-saison"> · ${r.saison}</span>` : ''}
            ${isBandi ? '<span class="rival-badge">BANDI</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${r.semaines_top10 > 1 ? `<span class="rival-weeks">${r.semaines_top10} sem.</span>` : ''}
            <span class="rival-score">${heuresStr}</span>
          </div>
        </div>
        <div class="rival-bar"><div class="rival-bar-fill" style="width:${pct.toFixed(1)}%;"></div></div>
      </div>
      <span></span>
    </div>`;
  }).join('');
}

// ============ TUDUM MINI (Overview) ============
function renderTudumMini() {
  const panel = document.getElementById('tudumPanel');
  const list  = document.getElementById('tudumMiniList');
  if (!panel || !list) return;

  const data = BANDI.tudumWeekly || [];
  if (!data.length) return; // panel reste hidden

  const latestWeek = data[0].week_start;
  const tvEn = data
    .filter(r => r.week_start === latestWeek && r.categorie === 'tv_english')
    .sort((a, b) => a.rang - b.rang)
    .slice(0, 5);

  if (!tvEn.length) return;
  panel.style.display = '';

  const maxH = Math.max(...tvEn.map(r => parseFloat(r.heures_vues) || 0));

  list.innerHTML = tvEn.map(r => {
    const h       = parseFloat(r.heures_vues) || 0;
    const pct     = maxH > 0 ? Math.round((h / maxH) * 100) : 0;
    const isBandi = r.titre.toLowerCase().includes('bandi');
    return `<div class="tudum-mini-row${isBandi ? ' is-bandi' : ''}">
      <span class="tudum-mini-rank">${r.rang}</span>
      <span class="tudum-mini-title">${r.titre}</span>
      <div class="tudum-mini-bar-wrap">
        <div class="tudum-mini-bar" style="width:${pct}%;background:${isBandi?'var(--rouge)':'var(--dim)'};"></div>
      </div>
      <span class="tudum-mini-hours">${h > 0 ? h.toFixed(1)+'M' : '—'}</span>
    </div>`;
  }).join('');
}

// ============ SERIES ============
function renderSeriesTab() {
  $("castTags").innerHTML = BANDI.casting.map(a => `<span class="cast-tag">${a}</span>`).join("");
}

// ============ HISTORIQUE 30J ============
let historyChartInstance = null;
let historyTabRendered = false;
let historyRegionFilter = 'Toutes';

function renderHistoryTab() {
  if (historyTabRendered) return;
  historyTabRendered = true;

  const s30 = BANDI.snapshots30;
  if (!s30 || s30.length === 0) {
    const panel = $('panel-history');
    if (panel) panel.innerHTML = '<div style="padding:40px;text-align:center;color:#8A8A8A;">Données indisponibles.</div>';
    return;
  }

  // Bannière si < 20 jours
  const banner = $('historyBanner');
  const daysCount = $('historyDaysCount');
  if (banner && daysCount) {
    daysCount.textContent = s30.length;
    banner.style.display = s30.length < 20 ? '' : 'none';
  }

  // Chart.js — score + rang inversé
  const ctx = document.getElementById('historyChart');
  if (ctx) {
    if (historyChartInstance) { historyChartInstance.destroy(); historyChartInstance = null; }
    const sorted = [...s30].reverse(); // chronologique
    const labels = sorted.map(s => s.date.slice(5).replace('-', '/'));
    const scores = sorted.map(s => s.score_monde);
    const ranks  = sorted.map(s => s.rang_monde);

    historyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Score',
            data: scores,
            borderColor: '#CE1126',
            backgroundColor: (context) => {
              const { chart } = context;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return null;
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, 'rgba(206,17,38,0.4)');
              g.addColorStop(1, 'rgba(206,17,38,0)');
              return g;
            },
            fill: true, tension: 0.35, borderWidth: 2.5,
            pointBackgroundColor: '#CE1126', pointBorderColor: '#fff',
            pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Rang mondial',
            data: ranks,
            borderColor: '#009739',
            backgroundColor: 'transparent',
            borderWidth: 2, borderDash: [5, 5], tension: 0.3,
            pointBackgroundColor: '#009739', pointBorderColor: '#fff',
            pointBorderWidth: 1.5, pointRadius: 3, pointHoverRadius: 5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0D0D0D', borderColor: '#CE1126', borderWidth: 1,
            titleColor: '#fff', titleFont: { family: 'Inter Tight', weight: '700', size: 13 },
            bodyColor: '#B5B5B5', bodyFont: { family: 'JetBrains Mono', size: 12 },
            padding: 12, cornerRadius: 6,
            callbacks: {
              label: (c) => c.dataset.label === 'Score'
                ? `Score : ${c.raw ?? '—'} pts`
                : `Rang mondial : #${c.raw ?? '—'}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 11 }, maxTicksLimit: 15 },
            grid: { color: 'rgba(42,42,42,0.5)' }
          },
          y: {
            position: 'left', beginAtZero: true,
            ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(42,42,42,0.5)' },
            title: { display: true, text: 'Score', color: '#CE1126', font: { family: 'Inter Tight', size: 10, weight: '600' } }
          },
          y1: {
            position: 'right', reverse: true, min: 1,
            ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 11 }, stepSize: 1 },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Rang ↑', color: '#009739', font: { family: 'Inter Tight', size: 10, weight: '600' } }
          }
        }
      }
    });
  }

  renderCountryPerfTable();
}

function renderCountryPerfTable() {
  const perf = BANDI.countryPerf;
  const filterContainer = $('historyRegionFilters');
  const list = $('countryPerfList');
  if (!perf || perf.length === 0) {
    if (list) list.innerHTML = '<div style="padding:32px;text-align:center;color:#8A8A8A;">Données pays indisponibles.</div>';
    return;
  }

  // Filtres région
  const regions = ['Toutes', ...new Set(perf.map(p => p.region).filter(Boolean))];
  if (filterContainer) {
    filterContainer.innerHTML = regions.map(r =>
      `<button class="region-btn ${r === historyRegionFilter ? 'active' : ''}" data-region="${r}">${r}</button>`
    ).join('');
    filterContainer.querySelectorAll('.region-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        historyRegionFilter = btn.dataset.region;
        renderCountryPerfTable();
      });
    });
  }

  const filtered = perf
    .filter(p => historyRegionFilter === 'Toutes' || p.region === historyRegionFilter)
    .sort((a, b) => a.rang - b.rang);

  if (!list) return;
  list.innerHTML = filtered.map(p => {
    const delta = p.delta;
    let deltaHtml;
    if (delta === null) {
      deltaHtml = `<span class="perf-delta new">Nouveau</span>`;
    } else if (delta > 0.4) {
      deltaHtml = `<span class="perf-delta up">+${delta.toFixed(1)} ↑</span>`;
    } else if (delta < -0.4) {
      deltaHtml = `<span class="perf-delta down">${delta.toFixed(1)} ↓</span>`;
    } else {
      deltaHtml = `<span class="perf-delta stable">≈ stable</span>`;
    }

    const prevStr = p.prevAvg !== null ? `#${p.prevAvg} moy S-1` : '—';
    const regionColor = (window.REGION_COLORS && window.REGION_COLORS[p.region]) || '#8A8A8A';

    return `
      <div class="country-perf-row">
        <span class="country-flag" style="font-size:22px;">${p.flag}</span>
        <div class="country-perf-info">
          <span class="country-name">${p.pays}</span>
          <span class="country-region" style="font-size:10px;background:${regionColor}20;color:${regionColor};padding:1px 6px;border-radius:4px;display:inline-block;margin-top:2px;">${p.region}</span>
        </div>
        <div class="country-perf-stats">
          <span class="perf-prev" style="opacity:0.55;font-size:11px;">${prevStr}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.35"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          <span class="perf-current">#${p.rang}</span>
          ${deltaHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ============ CARTE LEAFLET ============
let mapInitialized = false;
let mapMode = 'rang';        // 'rang' | 'progression'
let geojsonLayer = null;
let leafletMap = null;

async function initMapTab() {
  if (mapInitialized) return;
  mapInitialized = true;

  const mapEl = document.getElementById('leafletMap');
  if (!mapEl || typeof L === 'undefined') return;

  // ── Lookup données par pays ──────────────────────────────────
  // rankByCountry : paysEn → { rang, pays, flag, historique }
  const rankByCountry  = {};
  const deltaByCountry = {};
  BANDI.pays.forEach(p => { rankByCountry[p.paysEn || p.pays] = p; });
  (BANDI.countryPerf || []).forEach(p => { deltaByCountry[p.paysEn || p.pays] = p.delta; });

  // Correspondances noms FlixPatrol (EN) → noms GeoJSON
  const NAME_MAP = {
    'United States':      'United States of America',
    'Czech Republic':     'Czechia',
    'Salvador':           'El Salvador',
    'Bahamas':            'The Bahamas',
    'Serbia':             'Republic of Serbia',
    'Ivory Coast':        "Côte d'Ivoire",
    'Cape Verde':         'Cabo Verde',
    'Swaziland':          'Eswatini',
    'Macedonia':          'North Macedonia',
    'Bosnia-Herzegovina': 'Bosnia and Herz.',
    'New Caledonia':      'New Caledonia',
  };
  const reverseMap = {};
  Object.entries(NAME_MAP).forEach(([fp, geo]) => { reverseMap[geo] = fp; });

  function getCountryData(geoName) {
    return rankByCountry[reverseMap[geoName] || geoName] || null;
  }
  function getCountryDelta(geoName) {
    const key = reverseMap[geoName] || geoName;
    return deltaByCountry[key] ?? null;
  }

  // ── Fonctions couleur ────────────────────────────────────────
  function rankColor(rang) {
    if (!rang) return '#1A1A1A';
    if (rang === 1) return '#CE1126';
    if (rang <= 3)  return 'rgba(206,17,38,0.75)';
    if (rang <= 5)  return 'rgba(206,17,38,0.55)';
    return 'rgba(206,17,38,0.35)';
  }

  // delta > 0 = monte dans le classement (meilleur)
  function perfColor(delta) {
    if (delta === null) return '#2A2A2A'; // Présent mais pas de historique
    if (delta >= 3)     return '#009739'; // Forte progression verte
    if (delta >= 1)     return 'rgba(0,151,57,0.65)';
    if (delta > -1)     return 'rgba(200,200,200,0.35)'; // Stable
    if (delta >= -2)    return 'rgba(206,17,38,0.55)';
    return '#CE1126'; // Fort recul
  }

  // ── Légende dynamique ────────────────────────────────────────
  const legends = {
    rang: `
      <span class="legend-item"><span class="legend-dot" style="background:#CE1126;"></span>#1</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(206,17,38,0.75);"></span>#2–3</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(206,17,38,0.55);"></span>#4–5</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(206,17,38,0.35);"></span>#6–10</span>
      <span class="legend-item"><span class="legend-dot" style="background:#1E1E1E; border:1px solid #444;"></span>Absent</span>`,
    progression: `
      <span class="legend-item"><span class="legend-dot" style="background:#009739;"></span>↑ +3 rangs</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(0,151,57,0.65);"></span>↑ +1–2</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(200,200,200,0.35);"></span>Stable</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(206,17,38,0.55);"></span>↓ -1–2</span>
      <span class="legend-item"><span class="legend-dot" style="background:#CE1126;"></span>↓ Fort recul</span>`,
    momentum: `
      <span class="legend-item"><span class="legend-dot" style="background:#009739;"></span>+5 rangs 7j</span>
      <span class="legend-item"><span class="legend-dot" style="background:#4CAF50;"></span>+2–4</span>
      <span class="legend-item"><span class="legend-dot" style="background:#8BC34A;"></span>+1</span>
      <span class="legend-item"><span class="legend-dot" style="background:#555;"></span>Stable</span>
      <span class="legend-item"><span class="legend-dot" style="background:#FF9800;"></span>↓ léger</span>
      <span class="legend-item"><span class="legend-dot" style="background:#CE1126;"></span>↓ fort</span>`
  };

  function updateLegend(mode) {
    const leg = document.getElementById('mapLegend');
    if (leg) leg.innerHTML = legends[mode] || legends.rang;
    const sub = document.getElementById('mapSub');
    if (sub) sub.textContent =
      mode === 'rang'        ? 'Carte choroplèthe · Cliquer sur un pays pour les détails' :
      mode === 'progression' ? 'Progression vs semaine précédente · Vert = monte · Rouge = recule' :
                               'Momentum 7 jours · Variation de rang sur 7 jours glissants';
  }

  // ── Init Leaflet ─────────────────────────────────────────────
  leafletMap = L.map('leafletMap', {
    center: [15, 10], zoom: 2, minZoom: 1, maxZoom: 6,
    zoomControl: true, attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd', maxZoom: 20
  }).addTo(leafletMap);

  // ── GeoJSON ──────────────────────────────────────────────────
  try {
    const res = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    if (!res.ok) throw new Error('GeoJSON fetch failed');
    const geojson = await res.json();

    geojsonLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const data  = getCountryData(feature.properties.name);
        const delta = getCountryDelta(feature.properties.name);
        return {
          fillColor: data
            ? (mapMode === 'rang' ? rankColor(data.rang) : perfColor(delta))
            : '#1A1A1A',
          fillOpacity: data ? 0.85 : 0.2,
          color: '#2A2A2A', weight: 0.8, opacity: 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const name  = feature.properties.name;
        const data  = getCountryData(name);
        if (!data) return;

        const histStr = (data.historique || []).map(h => h === null ? '—' : `#${h}`).join(' · ');
        const delta   = getCountryDelta(name);
        const deltaStr = delta === null ? '—'
          : (delta > 0 ? `<span style="color:#009739">↑ +${delta.toFixed(1)}</span>`
          : delta < 0  ? `<span style="color:#CE1126">↓ ${delta.toFixed(1)}</span>`
          : '<span style="color:#888">Stable</span>');

        layer.bindPopup(`
          <div class="map-popup-header">${data.flag || ''} ${data.pays || name}</div>
          <div class="map-popup-rank">#${data.rang} aujourd'hui</div>
          <div class="map-popup-hist">7j : ${deltaStr} · 4j : ${histStr}</div>
        `, { className: 'bandi-popup', maxWidth: 240 });

        layer.on('mouseover', function() { this.setStyle({ fillOpacity: 1, weight: 1.5 }); });
        layer.on('mouseout',  function() { this.setStyle({ fillOpacity: 0.85, weight: 0.8 }); });
      }
    }).addTo(leafletMap);

    setTimeout(() => leafletMap.invalidateSize(), 100);

  } catch (err) {
    console.error('Erreur carte:', err);
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8A8A8A;">Carte non disponible (erreur réseau)</div>`;
  }

  // ── Toggle mode ──────────────────────────────────────────────
  document.getElementById('mtogRang')?.addEventListener('click', () => {
    mapMode = 'rang';
    document.getElementById('mtogRang')?.classList.add('active');
    document.getElementById('mtogPerf')?.classList.remove('active');
    document.getElementById('mtogMomentum')?.classList.remove('active');
    updateLegend('rang');
    if (geojsonLayer) {
      geojsonLayer.setStyle(feature => {
        const data = getCountryData(feature.properties.name);
        return { fillColor: data ? rankColor(data.rang) : '#1A1A1A', fillOpacity: data ? 0.85 : 0.2 };
      });
    }
  });

  document.getElementById('mtogPerf')?.addEventListener('click', () => {
    mapMode = 'progression';
    document.getElementById('mtogPerf')?.classList.add('active');
    document.getElementById('mtogRang')?.classList.remove('active');
    document.getElementById('mtogMomentum')?.classList.remove('active');
    updateLegend('progression');
    if (geojsonLayer) {
      geojsonLayer.setStyle(feature => {
        const data  = getCountryData(feature.properties.name);
        const delta = getCountryDelta(feature.properties.name);
        return { fillColor: data ? perfColor(delta) : '#1A1A1A', fillOpacity: data ? 0.85 : 0.2 };
      });
    }
  });

  // ── Mode Momentum 7j ────────────────────────────────────────
  function getMomentumData() {
    const momentum = {};
    const cache = window._paysHistCache || [];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Pour chaque pays présent aujourd'hui, cherche son rang il y a ~7j
    const sevenDaysAgo = {};
    cache
      .filter(p => p.date <= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(p => { if (!sevenDaysAgo[p.pays]) sevenDaysAgo[p.pays] = p.rang; });

    BANDI.pays.forEach(p => {
      const paysKey = p.paysEn || p.pays;
      const oldRang = sevenDaysAgo[paysKey];
      momentum[paysKey] = oldRang != null ? oldRang - p.rang : 0; // positif = amélioration
    });
    return momentum;
  }

  function getMomentumColor(delta) {
    if (delta == null) return '#2A2A2A';
    if (delta >= 5)  return '#009739';
    if (delta >= 2)  return '#4CAF50';
    if (delta >= 1)  return '#8BC34A';
    if (delta === 0) return '#555555';
    if (delta >= -2) return '#FF9800';
    return '#CE1126';
  }

  document.getElementById('mtogMomentum')?.addEventListener('click', () => {
    mapMode = 'momentum';
    document.getElementById('mtogMomentum')?.classList.add('active');
    document.getElementById('mtogRang')?.classList.remove('active');
    document.getElementById('mtogPerf')?.classList.remove('active');
    updateLegend('momentum');
    const momentumData = getMomentumData();
    if (geojsonLayer) {
      geojsonLayer.setStyle(feature => {
        const name   = feature.properties.name;
        const fpKey  = reverseMap[name] || name;
        const data   = getCountryData(name);
        const delta  = momentumData[fpKey] ?? null;
        return {
          fillColor: data ? getMomentumColor(delta) : '#1A1A1A',
          fillOpacity: data ? 0.85 : 0.2
        };
      });
    }
  });
}

// ============ BUZZ ============
let buzzLoaded = false;
let buzzPage = 0;
const BUZZ_PAGE = 50;
const buzzFilters = { type: 'all', source: 'all', platform: 'all', period: 'all' };
let buzzAllItems = [];
let buzzTrendsChartInstance = null;

function timeAgo(date) {
  if (!date) return '—';
  const m = Math.floor((Date.now() - date.getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function fmtEngagement(n, platform) {
  if (n === null || n === undefined || n === 0) return '';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

const BUZZ_ICONS = { press: '📰', reddit: '💬', youtube: '🎥', bluesky: '🦋', instagram: '📸' };
const BUZZ_LABELS = { press: 'Presse', reddit: 'Reddit', youtube: 'YouTube', bluesky: 'Bluesky', instagram: 'Instagram' };
const SOURCE_COLORS = { local: '#CE1126', national: '#009739', international: '#D4A017' };
const SOURCE_LABELS = { local: 'Local', national: 'National', international: 'International' };
const ENGAGE_ICONS = { reddit: '↑', youtube: '▶', bluesky: '♥', instagram: '♥', press: '' };

// Filtre pertinence Instagram côté client (filet de sécurité vs posts stale en DB)
function igIsRelevant(content = '', author = '') {
  const t = (content + ' ' + author).toLowerCase();
  const NEG = [
    'decreto fiscale', 'decreto legge', 'gazzetta ufficiale',
    'bandi dedicati', 'bandi di gara', 'bandi europei', 'bandi regionali',
    'bandi comunali', 'comuni piemontesi', 'bando pubblico',
    'intervento sr', 'smart village', 'darul uloom', 'nooria',
    'dinajpur', 'dastaar', 'aslam warsi', 'euroservis',
  ];
  if (NEG.some(s => t.includes(s))) return false;
  const STRONG = [
    'bandinetflix', 'bandi netflix', 'bandiserie', 'seriebandi',
    'bandimartinique', 'bandinetflixserie', 'netflix martinique',
    'serie martinique', 'série martinique', 'première série martiniquaise',
    'maui entertainment',
  ];
  if (STRONG.some(s => t.includes(s))) return true;
  if (!/\bbandi\b/.test(t)) return false;
  return ['netflix', 'série', 'serie', 'martinique', 'streaming', 'episode', 'saison'].some(k => t.includes(k));
}

// Classifie un post social (Reddit/YouTube/Bluesky/Instagram) en local/national/international
// par heuristique sur author_name + content. Utilisé par loadBuzzData() pour
// uniformiser le filtre Source entre presse et réseaux.
const SOCIAL_LOCAL_RE = /(martiniqu|guadeloup|guyan|antill|caraib|\bmq\b|\bgp\b|\bgf\b|kreyol|créole|creole|madinina|gwada|\bkarib)/i;
const SOCIAL_NATIONAL_RE = /(\bfrance\b|\bfr\b|paris|konbini|brut|allocin|premier|journaldugeek|numerama|ecranlarge|\bfrench\b|francais|français)/i;
function classifySocialSource(s) {
  const blob = `${s.author_name || ''} ${s.content || ''}`;
  if (SOCIAL_LOCAL_RE.test(blob))    return 'local';
  if (SOCIAL_NATIONAL_RE.test(blob)) return 'national';
  return 'international';
}

async function loadBuzzData(cfg, headers) {
  const [artRes, socRes, trendsRes] = await Promise.all([
    fetch(`${cfg.url}/rest/v1/buzz_articles?order=published_at.desc&limit=500`, { headers, cache: 'no-store' }),
    fetch(`${cfg.url}/rest/v1/buzz_social?order=published_at.desc&limit=500`, { headers, cache: 'no-store' }),
    fetch(`${cfg.url}/rest/v1/buzz_trends?order=date.asc&limit=31`, { headers, cache: 'no-store' }),
  ]);
  const articles = await artRes.json();
  const social   = await socRes.json();
  const trends   = await trendsRes.json();

  const press = (Array.isArray(articles) ? articles : []).map(a => ({
    id: 'p' + a.id, itemType: 'press', platform: 'press',
    sourceType: a.source_type || 'international',
    url: a.url, title: a.title || '(sans titre)',
    excerpt: a.description, source: a.source_name || '',
    publishedAt: a.published_at ? new Date(a.published_at) : null,
    thumbnail: a.image_url || null, engagement: null,
  }));

  const soc = (Array.isArray(social) ? social : [])
    // Filtre client-side : rejette les posts Instagram hors-sujet encore en DB
    .filter(s => s.platform !== 'instagram' || igIsRelevant(s.content || '', s.author_name || ''))
    .map(s => ({
      id: 's' + s.id, itemType: 'social', platform: s.platform,
      sourceType: classifySocialSource(s),
      url: s.url, title: s.content || '(sans contenu)',
      excerpt: null, source: s.author_name || '',
      publishedAt: s.published_at ? new Date(s.published_at) : null,
      thumbnail: s.thumbnail_url || null, engagement: s.engagement_score,
    }));

  buzzAllItems = [...press, ...soc]
    .filter(i => i.publishedAt && !isNaN(i.publishedAt.getTime()))
    .sort((a, b) => b.publishedAt - a.publishedAt);

  // Render trends chart if data
  const trendsData = Array.isArray(trends) ? trends : [];
  if (trendsData.length > 0) renderBuzzTrendsChart(trendsData);

  return { pressCount: press.length, socialCount: soc.length };
}

function buzzFiltered() {
  const now = Date.now();
  return buzzAllItems.filter(i => {
    if (buzzFilters.type === 'press'  && i.itemType !== 'press')  return false;
    if (buzzFilters.type === 'social' && i.itemType !== 'social') return false;
    // Source (local/national/international) : s'applique maintenant à presse ET social
    if (buzzFilters.source !== 'all' && i.sourceType !== buzzFilters.source) return false;
    if (buzzFilters.platform !== 'all' && i.itemType === 'social' && i.platform !== buzzFilters.platform) return false;
    if (buzzFilters.period   !== 'all') {
      const days = parseInt(buzzFilters.period);
      if ((now - i.publishedAt.getTime()) > days * 86400000) return false;
    }
    return true;
  });
}

function renderBuzzCard(item) {
  const icon  = BUZZ_ICONS[item.platform]  || '📄';
  const label = BUZZ_LABELS[item.platform] || item.platform;
  const time  = timeAgo(item.publishedAt);
  const eng   = fmtEngagement(item.engagement, item.platform);
  const engIcon = ENGAGE_ICONS[item.platform] || '';

  const srcBadge = item.sourceType && SOURCE_COLORS[item.sourceType]
    ? `<span class="buzz-source-badge" style="color:${SOURCE_COLORS[item.sourceType]};background:${SOURCE_COLORS[item.sourceType]}18;border-color:${SOURCE_COLORS[item.sourceType]}35">${SOURCE_LABELS[item.sourceType]}</span>`
    : '';

  const thumb = item.thumbnail
    ? `<div class="buzz-card-thumb" style="background-image:url('${item.thumbnail}')"></div>`
    : '';

  const title   = (item.title   || '').slice(0, 160) + ((item.title || '').length > 160 ? '…' : '');
  const excerpt = item.excerpt ? (item.excerpt.slice(0, 120) + (item.excerpt.length > 120 ? '…' : '')) : '';

  const engHtml = eng
    ? `<span class="buzz-engagement">${engIcon} ${eng}</span>`
    : '';

  return `<a class="buzz-card${item.thumbnail ? ' has-thumb' : ''}" href="${item.url}" target="_blank" rel="noopener noreferrer">
    ${thumb}
    <div class="buzz-card-body">
      <div class="buzz-card-badges">
        <span class="buzz-type-badge">${icon} ${label}</span>
        ${srcBadge}
      </div>
      <div class="buzz-card-title">${title}</div>
      ${excerpt ? `<div class="buzz-card-excerpt">${excerpt}</div>` : ''}
      <div class="buzz-card-meta">
        <span>${item.source}</span>
        <span class="buzz-sep">·</span>
        <span>${time}</span>
        ${engHtml}
      </div>
    </div>
  </a>`;
}

// Calcule les quantités par filtre — pour afficher "(N)" sur chaque bouton.
// Les compteurs respectent la période sélectionnée (utile : on veut voir
// "Local (3)" sur 7j, pas "Local (250)" total) mais ignorent la dimension
// en cours de comptage pour indiquer l'impact potentiel d'un clic.
function computeBuzzFilterCounts() {
  const now = Date.now();
  const days = buzzFilters.period === 'all' ? null : parseInt(buzzFilters.period);
  const inPeriod = i => !days || (now - i.publishedAt.getTime()) <= days * 86400000;
  const base = buzzAllItems.filter(inPeriod);

  // Pour chaque bouton, on compte les items correspondant si on cliquait dessus
  // (en ignorant les dimensions hors-type). La période est toujours appliquée.
  const counts = {
    type: {
      all:    base.length,
      press:  base.filter(i => i.itemType === 'press').length,
      social: base.filter(i => i.itemType === 'social').length,
    },
    source: {
      all:           base.length,
      local:         base.filter(i => i.sourceType === 'local').length,
      national:      base.filter(i => i.sourceType === 'national').length,
      international: base.filter(i => i.sourceType === 'international').length,
    },
    platform: {
      all:       base.filter(i => i.itemType === 'social').length,
      reddit:    base.filter(i => i.platform === 'reddit').length,
      youtube:   base.filter(i => i.platform === 'youtube').length,
      bluesky:   base.filter(i => i.platform === 'bluesky').length,
      instagram: base.filter(i => i.platform === 'instagram').length,
    },
    period: {
      '1':   buzzAllItems.filter(i => (now - i.publishedAt.getTime()) <=  1 * 86400000).length,
      '7':   buzzAllItems.filter(i => (now - i.publishedAt.getTime()) <=  7 * 86400000).length,
      '30':  buzzAllItems.filter(i => (now - i.publishedAt.getTime()) <= 30 * 86400000).length,
      'all': buzzAllItems.length,
    }
  };
  return counts;
}

// Met à jour les badges "(N)" sur chaque bouton de filtre Buzz.
function renderBuzzFilterCounts() {
  const counts = computeBuzzFilterCounts();
  document.querySelectorAll('.buzz-btn[data-filter]').forEach(btn => {
    const f = btn.dataset.filter;
    const v = btn.dataset.val;
    const n = counts[f]?.[v];
    if (n === undefined) return;
    // On retire l'ancien badge avant d'ajouter le nouveau
    btn.querySelectorAll('.buzz-btn-count').forEach(e => e.remove());
    const badge = document.createElement('span');
    badge.className = 'buzz-btn-count';
    badge.textContent = n > 999 ? `${Math.round(n/100)/10}k` : n;
    if (n === 0) btn.classList.add('buzz-btn-empty');
    else btn.classList.remove('buzz-btn-empty');
    btn.appendChild(badge);
  });
}

function renderBuzzTimeline() {
  const filtered = buzzFiltered();
  const start = buzzPage * BUZZ_PAGE;
  const page  = filtered.slice(start, start + BUZZ_PAGE);
  const total = filtered.length;

  const tl   = $('buzzTimeline');
  const em   = $('buzzEmpty');
  const pg   = $('buzzPagination');

  // Compteur résultats — toujours visible (même 0) pour transparence
  const ct = $('buzzResultCount');
  if (ct) ct.textContent = `${total} résultat${total > 1 ? 's' : ''}`;

  // Compteurs par filtre (Local (12) / National (45) / …)
  try { renderBuzzFilterCounts(); } catch (_) {}

  // Aucun résultat — message explicite (audit : seuil arbitraire <5 supprimé)
  if (total === 0) {
    if (tl) tl.innerHTML = '';
    if (em) {
      em.style.display = '';
      em.innerHTML = `
        <p>Aucun résultat avec ces filtres.</p>
        <p style="font-size:11px;opacity:.6;margin-top:6px;">
          Essaie de combiner différemment ou utilise <button type="button" id="buzzReset" class="buzz-btn" style="display:inline-block;margin-left:4px;">Réinitialiser</button>
        </p>`;
      const rb = document.getElementById('buzzReset');
      if (rb) rb.addEventListener('click', resetBuzzFilters);
    }
    if (pg) pg.style.display = 'none';
    return;
  }
  if (em) em.style.display = 'none';
  if (tl) tl.innerHTML = page.map(renderBuzzCard).join('');

  const totalPages = Math.ceil(total / BUZZ_PAGE);
  if (pg) pg.style.display = totalPages > 1 ? '' : 'none';
  const pi = $('buzzPageInfo');
  if (pi) pi.textContent = `Page ${buzzPage + 1} / ${totalPages} · ${total} résultats`;
  const prevBtn = $('buzzPrev');
  const nextBtn = $('buzzNext');
  if (prevBtn) prevBtn.disabled = buzzPage === 0;
  if (nextBtn) nextBtn.disabled = buzzPage >= totalPages - 1;
}

// Reset complet des filtres Buzz (utilisé par le bouton vide + bouton dédié)
function resetBuzzFilters() {
  buzzFilters.type = 'all';
  buzzFilters.source = 'all';
  buzzFilters.platform = 'all';
  buzzFilters.period = 'all';
  buzzPage = 0;
  document.querySelectorAll('.buzz-btn[data-filter]').forEach(b => {
    b.classList.toggle('active', b.dataset.val === 'all');
    b.disabled = false;
    b.classList.remove('disabled');
  });
  const sr = $('buzzSourceRow'), pr = $('buzzPlatformRow');
  if (sr) { sr.style.display = ''; sr.style.opacity = ''; sr.style.pointerEvents = ''; }
  if (pr) { pr.style.display = ''; pr.style.opacity = ''; pr.style.pointerEvents = ''; }
  renderBuzzTimeline();
}

function renderBuzzTrendsChart(trendsData) {
  const panel = $('buzzTrendsPanel');
  if (panel) panel.style.display = '';
  const ctx = document.getElementById('buzzTrendsChart');
  if (!ctx) return;
  if (buzzTrendsChartInstance) { buzzTrendsChartInstance.destroy(); }

  buzzTrendsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendsData.map(t => (t.date || '').slice(5).replace('-', '/')),
      datasets: [{
        data: trendsData.map(t => t.interest_score),
        borderColor: '#CE1126',
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return null;
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(206,17,38,0.3)');
          g.addColorStop(1, 'rgba(206,17,38,0)');
          return g;
        },
        fill: true, tension: 0.4, borderWidth: 2,
        pointRadius: 2, pointHoverRadius: 5,
        pointBackgroundColor: '#CE1126', pointBorderColor: '#fff', pointBorderWidth: 1,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0D0D0D', borderColor: '#CE1126', borderWidth: 1,
          titleColor: '#fff', bodyColor: '#B5B5B5',
          callbacks: { label: c => `Intérêt : ${c.raw}/100` }
        }
      },
      scales: {
        x: { ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 10 }, grid: { color: 'rgba(42,42,42,0.5)' } },
        y: { min: 0, max: 100, ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(42,42,42,0.5)' } }
      }
    }
  });
}

async function initBuzzTab() {
  if (buzzLoaded) { renderBuzzTimeline(); return; }
  buzzLoaded = true;

  const loading = $('buzzLoading');
  if (loading) loading.style.display = '';

  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || cfg.url.includes('PLACEHOLDER')) {
    if (loading) loading.style.display = 'none';
    const em = $('buzzEmpty'); if (em) em.style.display = '';
    return;
  }

  const headers = { 'apikey': cfg.anonKey, 'Authorization': `Bearer ${cfg.anonKey}` };

  try {
    const { pressCount, socialCount } = await loadBuzzData(cfg, headers);

    // Stats header
    const stats = $('buzzStats');
    if (stats) stats.innerHTML = `<span><strong>${pressCount}</strong> articles</span><span style="opacity:0.4">·</span><span><strong>${socialCount}</strong> posts</span>`;

    if (loading) loading.style.display = 'none';
    renderBuzzTimeline();

    // Filtres avec auto-exclusivité (Source ⇒ Presse, Plateforme ⇒ Social)
    document.querySelectorAll('.buzz-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter, v = btn.dataset.val;
        buzzFilters[f] = v;
        buzzPage = 0;

        // Auto-promotion du type selon la dimension cliquée
        // - Cliquer une Source spécifique impose type=press (sinon le filtre serait ignoré)
        // - Cliquer une Plateforme spécifique impose type=social
        // - Inverse : si on revient à "all" sur source/plateforme, on ne touche pas au type
        if (f === 'source' && v !== 'all' && buzzFilters.type !== 'press') {
          buzzFilters.type = 'press';
          buzzFilters.platform = 'all';
        }
        if (f === 'platform' && v !== 'all' && buzzFilters.type !== 'social') {
          buzzFilters.type = 'social';
          buzzFilters.source = 'all';
        }

        // Sync visuel des boutons actifs (toutes dimensions, car on a pu modifier type)
        document.querySelectorAll('.buzz-btn[data-filter]').forEach(b => {
          b.classList.toggle('active', buzzFilters[b.dataset.filter] === b.dataset.val);
        });

        // Masquer/désactiver les lignes de filtres incompatibles avec le type
        const sr = $('buzzSourceRow'), pr = $('buzzPlatformRow');
        const t = buzzFilters.type;
        if (sr) {
          sr.style.opacity = t === 'social' ? '0.35' : '';
          sr.style.pointerEvents = t === 'social' ? 'none' : '';
        }
        if (pr) {
          pr.style.opacity = t === 'press' ? '0.35' : '';
          pr.style.pointerEvents = t === 'press' ? 'none' : '';
        }

        renderBuzzTimeline();
      });
    });

    // Pagination
    $('buzzPrev')?.addEventListener('click', () => { buzzPage--; renderBuzzTimeline(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('buzzNext')?.addEventListener('click', () => { buzzPage++; renderBuzzTimeline(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  } catch (err) {
    console.error('Buzz load error:', err);
    if (loading) loading.style.display = 'none';
    const em = $('buzzEmpty'); if (em) em.style.display = '';
  }
}

// ============ MODULES B2B ============

const ZONE_LABELS = {
  'MQ': 'ancrage natif',         'GP': 'Caraïbes francophones',
  'FR': 'marché clé EU',         'RE': 'outre-mer Océan Indien',
  'BS': 'Caraïbes anglophones',  'HU': 'signal Europe centrale',
  'JM': 'Caraïbes anglophone',   'PA': 'Amérique Centrale',
  'HN': 'Amérique Centrale',     'VE': 'Amérique du Sud',
  'TT': 'Caraïbes',              'DO': 'Caraïbes hispanophone',
  'NC': 'Océanie',               'NG': 'Afrique',
  'US': 'marché clé US'
};

// ── Breakthrough USA ──────────────────────────────────────────
function renderBreakthroughUSA() {
  const strat = BANDI.strategique;
  if (!strat) return;

  // Cherche le rang live depuis BANDI.pays si disponible
  const usaPays = BANDI.pays.find(p => p.code === 'US' || p.paysEn === 'United States' || p.pays === 'États-Unis');
  const rang = usaPays?.rang || strat.usaRang || 7;

  const rankEl = document.getElementById('usaRankDisplay');
  if (rankEl) rankEl.textContent = `#${rang}`;

  const noteEl = document.getElementById('usaNote');
  if (noteEl && strat.usaNote) noteEl.textContent = strat.usaNote;

  const dateEl = document.getElementById('usaDate');
  if (dateEl && strat.usaDate) dateEl.textContent = strat.usaDate;
}

// ── Authenticité mini (bento) ──────────────────────────────────
function renderAuthenticiteMini() {
  const auth = BANDI.strategique?.authenticite;
  if (!auth) return;

  const pct = (auth.pctCasting || 91) / 100;
  const circ = 2 * Math.PI * 24; // 150.8

  const gaugeEl = document.getElementById('authGaugeMini');
  if (gaugeEl) {
    gaugeEl.style.strokeDasharray  = circ.toFixed(1);
    gaugeEl.style.strokeDashoffset = circ.toFixed(1); // part de 0

    // Animation différée pour laisser le CSS transitionner
    requestAnimationFrame(() => {
      setTimeout(() => {
        gaugeEl.style.strokeDashoffset = (circ * (1 - pct)).toFixed(1);
      }, 200);
    });
  }

  const pctEl = document.getElementById('authPctMini');
  if (pctEl) {
    // C2 (audit) : flag visuel "non vérifié" tant que _verified !== true
    const tag = auth._verified ? '' : ' <sup class="auth-unverified" title="Estimation interne — à confirmer par la production">●</sup>';
    pctEl.innerHTML = `${auth.pctCasting}%${tag}`;
  }
}

// ── Authenticité complète (panel-series) ──────────────────────
function renderAuthenticite() {
  const auth = BANDI.strategique?.authenticite;
  if (!auth) return;

  const pct   = (auth.pctCasting || 91) / 100;
  const circ  = 2 * Math.PI * 50; // 314.16

  const gaugeEl = document.getElementById('authGaugeMain');
  if (gaugeEl) {
    gaugeEl.style.strokeDasharray  = circ.toFixed(2);
    gaugeEl.style.strokeDashoffset = circ.toFixed(2);

    // IntersectionObserver pour lancer l'animation au scroll
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            gaugeEl.style.strokeDashoffset = (circ * (1 - pct)).toFixed(2);
          }, 100);
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    const module = document.getElementById('authenticiteModule');
    if (module) observer.observe(module);
  }
}

// ── Zones de domination ────────────────────────────────────────
function renderZonesDomination() {
  const listEl  = document.getElementById('zonesList');
  const countEl = document.getElementById('zonesCount');
  if (!listEl) return;

  // Pays #1 triés : Martinique/Guadeloupe en tête, puis par région
  const n1 = BANDI.pays.filter(p => p.rang === 1);

  const PRIORITY = ['MQ', 'GP', 'FR', 'RE', 'BS', 'JM', 'TT', 'DO'];
  n1.sort((a, b) => {
    const ai = PRIORITY.indexOf(a.code);
    const bi = PRIORITY.indexOf(b.code);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return  1;
    return (a.pays || '').localeCompare(b.pays || '');
  });

  if (countEl) countEl.textContent = `Bandi est #1 dans ${n1.length} pays`;

  listEl.innerHTML = n1.map(p => {
    const code  = p.code || '';
    const label = ZONE_LABELS[code] || p.region || '';
    return `<div class="zone-item">
      <span class="zone-flag">${p.flag || '🏳️'}</span>
      <span class="zone-name">${p.pays}</span>
      ${label ? `<span class="zone-label">${label}</span>` : ''}
    </div>`;
  }).join('');
}

// ── Forecast S2 ───────────────────────────────────────────────
// ============================================================
// Completion Score v2 — popularité live dominante
//   40 % POPULARITÉ LIVE  (rang mondial + pays #1 + pays top 10)
//   25 % ENGAGEMENT        (Tudum heures ou proxy jours/pays)
//   20 % BUZZ              (Trends + Wikipedia + presse + social)
//   15 % QUALITÉ           (moyenne pondérée 8 sources notes)
// ============================================================
function computeCompletionScore() {
  const out = {
    score: null,
    components: {},
    signalsAvailable: [],
    signalsMissing: [],
    formula: 'Score = 0,40·Popularité + 0,25·Engagement + 0,20·Buzz + 0,15·Qualité'
  };

  // ── Lecture des données ───────────────────────────────────────────────
  const hist        = Array.isArray(BANDI.historique)        ? BANDI.historique        : [];
  const paysArr     = Array.isArray(BANDI.pays)              ? BANDI.pays              : [];
  const social      = Array.isArray(BANDI.buzzSocialRecent)  ? BANDI.buzzSocialRecent  : [];
  const trends      = Array.isArray(BANDI.buzzTrends7d)      ? BANDI.buzzTrends7d      : [];
  const wiki        = Array.isArray(BANDI.wikipediaPageviews)? BANDI.wikipediaPageviews: [];
  const rangsHist   = hist.map(h => h.rang).filter(r => typeof r === 'number' && r > 0);
  const rangMonde   = BANDI.current?.rang   ?? null;
  const paysN1      = BANDI.current?.paysN1  ?? paysArr.filter(p => p.rang === 1).length;
  const paysTop10   = BANDI.current?.paysTop10 ?? paysArr.filter(p => p.rang > 0 && p.rang <= 10).length;
  const heuresCumul = typeof BANDI.heuresVuesCumul === 'number' ? BANDI.heuresVuesCumul : 0;
  const joursTop10  = typeof BANDI.joursEnTop10    === 'number' ? BANDI.joursEnTop10    : hist.length;
  const rankPic     = rangsHist.length ? Math.min(...rangsHist) : null;
  const SERIE_DUREE_H = 8;

  // ─────────────────────────────────────────────────────────────────────
  // 1. POPULARITÉ LIVE (40 %)
  //    Rang mondial (45 %) + pays N°1 (35 %) + pays top 10 (20 %)
  // ─────────────────────────────────────────────────────────────────────
  const normRangMonde = rangMonde ? Math.max(0, Math.round(100 - (rangMonde - 1) * 6)) : 0;
  const normPaysN1    = Math.min(100, Math.round(paysN1   / 15 * 100));
  const normTop10     = Math.min(100, Math.round(paysTop10 / 50 * 100));
  const popularityScore = Math.round(0.45 * normRangMonde + 0.35 * normPaysN1 + 0.20 * normTop10);
  const popAvail = rangMonde != null || paysN1 > 0 || paysTop10 > 0;
  if (popAvail) out.signalsAvailable.push('Popularité live');
  else          out.signalsMissing.push('Popularité live');

  // ─────────────────────────────────────────────────────────────────────
  // 2. ENGAGEMENT (25 %)
  //    Tudum heures → équivalent-viewers ; sinon proxy jours×pays
  // ─────────────────────────────────────────────────────────────────────
  const equivViewersMil  = heuresCumul > 0 ? heuresCumul / SERIE_DUREE_H : 0;
  const MAX_VIEWERS_M = 15;
  const engTudumAvail = heuresCumul > 0;

  // Décroissance (bonus/pénalité sur engagement)
  let decayFactor = 1.0, decayLabel = 'Neutre', rankDropRate = null;
  if (rangsHist.length >= 2) {
    const rI = rangsHist[0], rF = rangsHist[rangsHist.length - 1];
    rankDropRate = (rF - rI) / Math.max(rI, 1);
    const days = rangsHist.length;
    if (rankDropRate > 1.0 && days < 7)                   { decayFactor = 0.85; decayLabel = 'Chute rapide'; }
    else if (days >= 14 && Math.abs(rankDropRate) <= 0.3) { decayFactor = 1.10; decayLabel = `Stable ${days}j`; }
    else if (rankDropRate < -0.2)                          { decayFactor = 1.05; decayLabel = 'En progression'; }
  }

  let engagementScore = 0;
  if (engTudumAvail) {
    engagementScore = Math.min(100, Math.round(equivViewersMil / MAX_VIEWERS_M * 100));
    out.signalsAvailable.push('Engagement (Tudum)');
  } else if (joursTop10 > 0 || paysTop10 > 0) {
    const nJ = Math.min(100, Math.round(joursTop10 / 60 * 100));
    const nP = Math.min(100, Math.round(paysTop10 / 50 * 100));
    engagementScore = Math.round(0.60 * nJ + 0.40 * nP);
    out.signalsAvailable.push('Engagement (proxy)');
  } else {
    out.signalsMissing.push('Engagement');
  }
  engagementScore = Math.min(100, Math.round(engagementScore * decayFactor));

  // ─────────────────────────────────────────────────────────────────────
  // 3. BUZZ (20 %) — Trends + Wikipedia + Presse + Social
  // ─────────────────────────────────────────────────────────────────────
  const cutoff7 = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);

  let trendsMax = null, trendsScore = 0;
  if (trends.length) {
    const vals = trends.map(t => Number(t.score) || Number(t.interest_score) || 0).filter(v => v > 0);
    if (vals.length) { trendsMax = Math.max(...vals); trendsScore = trendsMax; }
  }

  const wiki7 = wiki.filter(w => w.date >= cutoff7);
  const wikiViews7d = wiki7.reduce((s, w) => s + (Number(w.views) || 0), 0);
  const wikiScore = wikiViews7d > 0 ? Math.min(100, Math.round(Math.log10(wikiViews7d + 1) * 20)) : 0;

  const pressCount30d = typeof BANDI.pressCount30d === 'number' ? BANDI.pressCount30d : 0;
  const pressScore    = Math.min(100, pressCount30d);

  const social7 = social.filter(p => p.published_at && p.published_at.slice(0, 10) >= cutoff7);
  const socialCount7d  = social7.length;
  const socialEngTotal = social7.reduce((s, p) => s + (Number(p.engagement_score) || 0), 0);
  const socialScore    = Math.min(100, Math.round(socialCount7d / 50 * 70 + Math.log10(socialEngTotal + 1) * 6));

  const buzzParts = [];
  if (trendsScore > 0)  buzzParts.push({ val: trendsScore, w: 0.30, lbl: 'Google Trends' });
  if (wikiScore > 0)    buzzParts.push({ val: wikiScore,   w: 0.25, lbl: 'Wikipedia' });
  if (pressScore > 0)   buzzParts.push({ val: pressScore,  w: 0.25, lbl: 'Presse 30j' });
  if (socialScore > 0)  buzzParts.push({ val: socialScore, w: 0.20, lbl: 'Social 7j' });

  let buzzScoreFinal = 0;
  const buzzAvail = buzzParts.length > 0;
  if (buzzAvail) {
    const tw = buzzParts.reduce((s, p) => s + p.w, 0);
    buzzScoreFinal = Math.round(buzzParts.reduce((s, p) => s + p.val * p.w, 0) / tw);
    out.signalsAvailable.push('Buzz');
  } else {
    out.signalsMissing.push('Buzz');
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. QUALITÉ — notes 8 sources (15 %)
  // ─────────────────────────────────────────────────────────────────────
  const notesDetail = {
    imdb: null, tmdb: null, allocinePublic: null, allocinePress: null,
    senscritique: null, rtCritics: null, rtAudience: null, filmaffinity: null
  };
  const notesSources = [], notesUsed = [];
  function addNote(src, weight, label, key) {
    if (src && src.rating_norm != null && src.rating_norm > 0) {
      notesDetail[key] = {
        note: Number(src.rating), max: Number(src.rating_max || 10),
        norm: Number(src.rating_norm), votes: src.votes || null, reviews: src.reviews_count || null
      };
      notesUsed.push({ norm: Number(src.rating_norm), weight, label });
      notesSources.push(label);
    }
  }
  addNote(BANDI.imdb,           0.22, 'IMDb',                     'imdb');
  addNote(BANDI.tmdb,           0.18, 'TMDB',                     'tmdb');
  addNote(BANDI.rtCritics,      0.15, 'Rotten Tomatoes (presse)', 'rtCritics');
  addNote(BANDI.rtAudience,     0.10, 'Rotten Tomatoes (public)', 'rtAudience');
  addNote(BANDI.allocinePublic, 0.10, 'Allociné Spectateurs',     'allocinePublic');
  addNote(BANDI.allocinePress,  0.10, 'Allociné Presse',          'allocinePress');
  addNote(BANDI.senscritique,   0.10, 'SensCritique',             'senscritique');
  addNote(BANDI.filmaffinity,   0.05, 'Filmaffinity',             'filmaffinity');

  const NOTES_TOTAL = 8;
  let qualityScore = 50;
  const qualityAvail = notesUsed.length > 0;
  if (qualityAvail) {
    const tw = notesUsed.reduce((s, n) => s + n.weight, 0);
    qualityScore = Math.round(Math.max(0, Math.min(100,
      notesUsed.reduce((s, n) => s + n.norm * n.weight, 0) / tw * 10
    )));
    out.signalsAvailable.push('Qualité');
  } else {
    out.signalsMissing.push('Qualité');
  }

  // ─────────────────────────────────────────────────────────────────────
  // SCORE FINAL — poids normalisés si signal manquant
  // ─────────────────────────────────────────────────────────────────────
  const engAvail = engTudumAvail || joursTop10 > 0 || paysTop10 > 0;
  const parts = [
    { val: popularityScore, w: 0.40, ok: popAvail  },
    { val: engagementScore, w: 0.25, ok: engAvail  },
    { val: buzzScoreFinal,  w: 0.20, ok: buzzAvail },
    { val: qualityScore,    w: 0.15, ok: qualityAvail }
  ];
  const active = parts.filter(p => p.ok);
  let finalScore = 0;
  if (active.length) {
    const totW = active.reduce((s, p) => s + p.w, 0);
    finalScore = Math.round(active.reduce((s, p) => s + p.val * p.w, 0) / totW);
  }
  out.score = Math.max(0, Math.min(100, finalScore));

  // ─── Composants (keys préservées : rank/engagement/notes/search) ─────
  out.components.rank = {
    value: popularityScore, weight: 0.40, available: popAvail,
    raw: { rangMonde, paysN1, paysTop10, rankPic, normRangMonde, normPaysN1, normTop10 },
    sources: 3,
    sourceList: ['FlixPatrol rang mondial', 'FlixPatrol pays #1', 'FlixPatrol pays top 10'],
    dataPoints: (rangMonde != null ? 1 : 0) + (paysN1 > 0 ? 1 : 0) + (paysTop10 > 0 ? 1 : 0),
    dataLabel: popAvail
      ? `#${rangMonde ?? '—'} mondial · ${paysN1} pays N°1 · ${paysTop10} pays top 10`
      : 'données pays en attente'
  };
  out.components.engagement = {
    value: engagementScore, weight: 0.25, available: engAvail,
    raw: { equivViewersMil: Math.round(equivViewersMil * 100) / 100,
           decayFactor, decayLabel, rankDropRate: rankDropRate != null ? Math.round(rankDropRate * 100) / 100 : null,
           joursTop10, paysTop10, count: 0, total: 0 },
    sources: 2,
    sourceList: engTudumAvail
      ? ['Netflix Tudum (heures vues)', 'FlixPatrol (décroissance)']
      : ['FlixPatrol (jours top 10)', 'FlixPatrol (couverture pays)'],
    dataPoints: (engTudumAvail ? 1 : 0) + (rangsHist.length >= 2 ? 1 : 0),
    dataLabel: engTudumAvail
      ? `${equivViewersMil.toFixed(1)}M spectateurs complets · ${decayLabel}`
      : engAvail ? `${joursTop10}j top 10 · ${paysTop10} pays · ${decayLabel}` : 'en attente'
  };
  out.components.notes = {
    value: qualityScore, weight: 0.15, available: qualityAvail,
    raw: notesDetail,
    sources: notesSources.length || NOTES_TOTAL,
    sourceList: notesSources.length ? notesSources
      : ['IMDb', 'TMDB', 'Rotten Tomatoes (presse)', 'Rotten Tomatoes (public)',
         'Allociné Spectateurs', 'Allociné Presse', 'SensCritique', 'Filmaffinity'],
    dataPoints: notesSources.length,
    dataLabel: notesSources.length ? `${notesSources.length}/${NOTES_TOTAL} sources actives` : `0/${NOTES_TOTAL} — en attente`
  };
  out.components.search = {
    value: buzzScoreFinal, weight: 0.20, available: buzzAvail,
    raw: { trendsMax, wikiViews7d, pressCount30d, socialCount7d, socialEngTotal,
           trendsScore, wikiScore, pressScore, socialScore,
           trendsDays: trends.length, wikiDays: wiki7.length, wikiArticles: [] },
    sources: 4,
    sourceList: ['Google Trends', 'Wikipedia pageviews', 'Presse (25+ RSS)', 'Social (Reddit+YT+Bsky+IG)'],
    dataPoints: buzzParts.length,
    dataLabel: buzzAvail
      ? [
          trendsMax != null   ? `Trends pic ${trendsMax}` : null,
          wikiViews7d > 0     ? `Wiki ${wikiViews7d.toLocaleString('fr-FR')} vues/7j` : null,
          pressCount30d > 0   ? `${pressCount30d} articles/30j` : null,
          socialCount7d > 0   ? `${socialCount7d} posts/7j` : null
        ].filter(Boolean).join(' · ')
      : 'en attente'
  };

  const allComps = Object.values(out.components);
  out.totalSources       = allComps.reduce((s, c) => s + c.sources, 0);
  out.totalActiveSources = allComps.reduce((s, c) => c.available ? s + c.sources : s, 0);

  return out;
}

function formatCompletionTooltip(c) {
  const lines = [];
  const e  = c.components.engagement.raw || {};
  const r  = c.components.rank.raw       || {};
  const sr = c.components.search.raw     || {};

  lines.push(`Score de complétion : ${c.score}%`);
  lines.push('');
  lines.push(`🏆 Popularité live (40 %) → ${c.components.rank.value}%`);
  lines.push(`   #${r.rangMonde ?? '—'} mondial · ${r.paysN1 ?? 0} pays N°1 · ${r.paysTop10 ?? 0} pays top 10`);
  lines.push('');
  lines.push(`📺 Engagement (25 %) → ${c.components.engagement.value}%`);
  if (e.equivViewersMil > 0) {
    lines.push(`   ${e.equivViewersMil.toFixed(1)}M spectateurs complets (Tudum) · ${e.decayLabel ?? 'Neutre'}`);
  } else {
    lines.push(`   ${e.joursTop10 ?? 0}j en top 10 · ${e.paysTop10 ?? 0} pays · ${e.decayLabel ?? 'Neutre'}`);
  }
  lines.push('');
  lines.push(`📣 Buzz (20 %) → ${c.components.search.value}%`);
  lines.push(`   ${c.components.search.dataLabel || 'en attente'}`);
  lines.push('');
  lines.push(`⭐ Qualité (15 %) → ${c.components.notes.value}%`);
  lines.push(`   ${c.components.notes.dataLabel}`);
  lines.push('');
  lines.push(`Méthode v2 : Popularité (40 %) + Engagement (25 %) + Buzz (20 %) + Qualité (15 %)`);
  lines.push(`${c.totalActiveSources} source${c.totalActiveSources > 1 ? 's' : ''} active${c.totalActiveSources > 1 ? 's' : ''} sur ${c.totalSources}`);
  return lines.join('\n');
}

// Forecast S2 dynamique
// Base 30 (taux renouvellement Netflix séries non-anglophones)
// + bonus structurels calculés depuis les données live
function computeForecastS2() {
  const c         = computeCompletionScore();
  const rangMonde = BANDI.current?.rang ?? null;
  const paysN1    = BANDI.current?.paysN1 ?? 0;
  const paysTop10 = BANDI.current?.paysTop10 ?? 0;
  const hist      = Array.isArray(BANDI.historique) ? BANDI.historique : [];
  const rangsH    = hist.map(h => h.rang).filter(r => typeof r === 'number' && r > 0);
  const usaPays   = (Array.isArray(BANDI.pays) ? BANDI.pays : [])
    .find(p => p.code === 'US' || p.pays === 'États-Unis' || p.pays === 'United States');
  const usaRang   = usaPays?.rang ?? BANDI.strategique?.usaRang ?? null;

  let prob = 30;
  const bonuses = [];

  if (rangMonde === 1) {
    prob += 15;
    bonuses.push({ label: '#1 mondial atteint', pts: '+15', ok: true });
  } else if (rangMonde != null && rangMonde <= 5) {
    prob += 10;
    bonuses.push({ label: `Top 5 mondial (#${rangMonde})`, pts: '+10', ok: true });
  } else {
    bonuses.push({ label: 'Rang mondial', pts: '+0', ok: false });
  }

  if (usaRang != null && usaRang <= 10) {
    prob += 12;
    bonuses.push({ label: `Top 10 USA (#${usaRang})`, pts: '+12', ok: true });
  } else {
    bonuses.push({ label: 'Top 10 USA', pts: '+0', ok: usaRang != null && usaRang <= 10 });
  }

  if (paysN1 >= 10) {
    prob += 10;
    bonuses.push({ label: `${paysN1} pays N°1`, pts: '+10', ok: true });
  } else if (paysN1 >= 5) {
    prob += 5;
    bonuses.push({ label: `${paysN1} pays N°1`, pts: '+5', ok: true });
  } else {
    bonuses.push({ label: 'Pays N°1 (seuil ≥10)', pts: '+0', ok: false });
  }

  const joursStable = rangsH.length;
  if (joursStable >= 14 && (rangMonde ?? 99) <= 5) {
    prob += 8;
    bonuses.push({ label: `Stabilité ${joursStable}j en top 5`, pts: '+8', ok: true });
  } else if (joursStable >= 7) {
    prob += 4;
    bonuses.push({ label: `${joursStable}j en top 10`, pts: '+4', ok: true });
  } else {
    bonuses.push({ label: 'Stabilité (seuil ≥7j)', pts: '+0', ok: false });
  }

  if (c.score >= 75) {
    prob += 10;
    bonuses.push({ label: `Complétion ${c.score}% ≥75`, pts: '+10', ok: true });
  } else if (c.score >= 50) {
    prob += 5;
    bonuses.push({ label: `Complétion ${c.score}%`, pts: '+5', ok: true });
  } else {
    bonuses.push({ label: `Complétion ${c.score}% (seuil ≥75)`, pts: '+0', ok: false });
  }

  if (paysTop10 >= 30) {
    prob += 5;
    bonuses.push({ label: `${paysTop10} pays top 10`, pts: '+5', ok: true });
  } else {
    bonuses.push({ label: 'Couverture top 10 (seuil ≥30)', pts: '+0', ok: false });
  }

  return { prob: Math.min(95, Math.max(20, prob)), bonuses, completion: c };
}

function renderForecastS2() {
  const fc = BANDI.strategique?.forecastS2;
  if (!fc) return;

  // Calcul dynamique — remplace la constante 85
  const forecast = computeForecastS2();
  const prob = forecast.prob;

  // Bento mini bar
  const miniBar = document.getElementById('forecastBar');
  if (miniBar) {
    requestAnimationFrame(() => {
      setTimeout(() => { miniBar.style.width = `${prob}%`; }, 300);
    });
  }
  const pctEl = document.getElementById('forecastPct');
  if (pctEl) pctEl.textContent = `${prob}%`;

  // Forecast détaillé — barre principale (via CSS custom property pour ::after)
  const mainBarEl = document.getElementById('forecastMainBar');
  if (mainBarEl) {
    requestAnimationFrame(() => {
      setTimeout(() => { mainBarEl.style.setProperty('--bar-width', `${prob}%`); }, 400);
    });
  }

  // Indicateurs — remplace le 1er indicateur (Taux de complétion) par le score calculé
  // et le 2e (Top 10 USA) par le rang live depuis bandi_country_rankings
  const indEl = document.getElementById('forecastIndicators');
  if (indEl && fc.indicateurs) {
    // Calcul du Completion Score estimé
    const compScore = computeCompletionScore();
    const seuil = 70;
    const ok = compScore.score >= seuil;
    const tooltipText = formatCompletionTooltip(compScore);

    // Rang USA live (même source que le module Breakthrough USA pour cohérence)
    const usaPaysLive = BANDI.pays.find(p =>
      p.code === 'US' || p.pays === 'États-Unis' || p.pays === 'United States'
    );
    const usaRangLive = usaPaysLive?.rang || BANDI.strategique?.usaRang || null;

    // Nombre de pays #1 live (même source que zones-module + KPI pour cohérence)
    const paysN1Live = BANDI.current?.paysN1 ?? BANDI.pays.filter(p => p.rang === 1).length;

    // Construction du tableau d'indicateurs : on remplace les 3 premiers pour cohérence
    const indicateurs = fc.indicateurs.map((ind, idx) => {
      if (idx === 0) {
        return {
          label: 'Taux de complétion estimé',
          valeur: `${compScore.score}%`,
          seuil: `≥ ${seuil}%`,
          ok,
          icon: '📈',
          tooltip: tooltipText,
          hasTooltip: true
        };
      }
      if (idx === 1 && usaRangLive != null) {
        return {
          label: 'Top 10 USA atteint',
          valeur: `#${usaRangLive}`,
          seuil: '~3%',
          ok: usaRangLive <= 10
        };
      }
      if (idx === 2 && paysN1Live != null) {
        return {
          label: `#1 dans ${paysN1Live} pays`,
          valeur: `${paysN1Live}`,
          seuil: '≥ 10',
          ok: paysN1Live >= 10
        };
      }
      return ind;
    });

    indEl.innerHTML = indicateurs.map(ind => {
      const tooltipAttrs = ind.hasTooltip
        ? ` data-tooltip="${ind.tooltip.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}" tabindex="0"`
        : '';
      const helpIcon = ind.hasTooltip
        ? '<span class="forecast-ind-help" aria-hidden="true">ⓘ</span>'
        : '';
      return `
      <div class="forecast-ind-row${ind.hasTooltip ? ' has-tooltip' : ''}"${tooltipAttrs}>
        <span class="forecast-ind-icon">${ind.icon ?? (ind.ok ? '✅' : '⚠️')}</span>
        <span class="forecast-ind-label">${ind.label}${helpIcon}</span>
        <span class="forecast-ind-val">${ind.valeur}</span>
        <span class="forecast-ind-seuil">seuil : ${ind.seuil}</span>
      </div>`;
    }).join('');
  }

  // Disclaimer — préfixe "heuristique non validée" tant que _validated !== true (I7 audit)
  const disclaimerEl = document.getElementById('forecastDisclaimer');
  if (disclaimerEl && fc.disclaimer) {
    const prefix = fc._validated ? '' : '⚠ Modèle heuristique non calibré · ';
    disclaimerEl.textContent = `${prefix}${fc.disclaimer}`;
  }

  // Panneau pédagogique « Méthode & sources »
  try { renderCompletionBreakdown(); } catch (e) { console.error('[BANDI] renderCompletionBreakdown:', e); }
}

// ============================================================
// Panneau pédagogique "Méthode & sources" du Completion Score
// Affiche chaque signal avec :
//   - son poids dans la formule
//   - son score normalisé (0-100)
//   - le nombre de sources derrière
//   - les sources nommées
//   - l'état (actif / en attente)
// ============================================================
function renderCompletionBreakdown() {
  const root = document.getElementById('completionBreakdown');
  if (!root) return;

  const c = computeCompletionScore();
  const pct = c.score;
  const active = c.totalActiveSources;
  const total = c.totalSources;
  const ratio = total ? Math.round((active / total) * 100) : 0;

  // Détail par signal
  const rows = [
    {
      key: 'rank',
      label: 'Popularité live',
      icon: '🏆',
      desc: 'Rang mondial actuel + nombre de pays où Bandi est N°1 + nombre de pays dans le top 10 — les 3 signaux de popularité temps réel.',
      formula: '45 %·rang mondial + 35 %·pays N°1 + 20 %·pays top 10'
    },
    {
      key: 'engagement',
      label: 'Engagement audience',
      icon: '📺',
      desc: 'Heures de visionnage Tudum converties en spectateurs complets estimés (si dispo) ; sinon proxy jours en top 10 × couverture pays.',
      formula: 'Tudum : heures ÷ 8h × cap(15M) ; Proxy : 60 %·jours + 40 %·pays'
    },
    {
      key: 'notes',
      label: 'Qualité perçue',
      icon: '⭐',
      desc: 'Moyenne pondérée de 8 sources de notes (presse & audience, toutes ramenées sur /10).',
      formula: 'IMDb·0,22 + TMDB·0,18 + RT·0,25 + Allociné·0,20 + SensCritique·0,10 + Filmaffinity·0,05'
    },
    {
      key: 'search',
      label: 'Buzz & intérêt en ligne',
      icon: '📣',
      desc: 'Google Trends + Wikipedia pageviews + volume presse (30j, 25+ flux RSS) + activité sociale (Reddit, YouTube, Bluesky, Instagram, 7j).',
      formula: 'Trends·0,30 + Wikipedia·0,25 + Presse·0,25 + Social·0,20'
    }
  ];

  const weightLabels = { rank: '40 %', engagement: '25 %', notes: '15 %', search: '20 %' };

  const rowsHtml = rows.map(r => {
    const comp = c.components[r.key];
    const isOk = comp.available;
    const stateClass = isOk ? 'is-active' : 'is-pending';
    const stateLabel = isOk ? '✓ Actif' : '⏳ En attente de données';
    const barWidth = Math.max(0, Math.min(100, comp.value));

    // Données réelles : notes par source
    let detailExtra = '';
    if (r.key === 'notes' && isOk && comp.raw) {
      const parts = [];
      const n = comp.raw;
      const chip = (label, obj) => {
        if (!obj) return;
        parts.push(`<span class="cb-chip"><strong>${label}</strong> ${obj.note}/${obj.max}</span>`);
      };
      chip('IMDb', n.imdb);
      chip('TMDB', n.tmdb);
      chip('RT', n.rtCritics);
      chip('Allociné', n.allocinePublic);
      chip('SensCritique', n.senscritique);
      chip('Filmaffinity', n.filmaffinity);
      if (parts.length) detailExtra = `<div class="cb-chips">${parts.join('')}</div>`;
    }
    if (r.key === 'search' && isOk && comp.raw) {
      const parts = [];
      if (comp.raw.trendsMax != null) {
        parts.push(`<span class="cb-chip"><strong>Google</strong> pic ${comp.raw.trendsMax}/100</span>`);
      }
      if (comp.raw.wikiViews7d > 0) {
        parts.push(`<span class="cb-chip"><strong>Wikipedia</strong> ${comp.raw.wikiViews7d.toLocaleString('fr-FR')} vues (7j)</span>`);
      }
      if (parts.length) detailExtra = `<div class="cb-chips">${parts.join('')}</div>`;
    }

    return `
      <div class="cb-row ${stateClass}">
        <div class="cb-row-head">
          <span class="cb-icon" aria-hidden="true">${r.icon}</span>
          <span class="cb-label">${r.label}</span>
          <span class="cb-weight">${weightLabels[r.key]}</span>
          <span class="cb-state">${stateLabel}</span>
        </div>
        <p class="cb-desc">${r.desc}</p>
        <div class="cb-bar-wrap">
          <div class="cb-bar"><div class="cb-bar-fill" style="width:${barWidth}%"></div></div>
          <span class="cb-bar-val">${comp.value}<span class="cb-bar-max">%</span></span>
        </div>
        ${detailExtra}
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="cb-head">
      <div class="cb-head-left">
        <span class="cb-tag">Score en direct</span>
        <h4 class="cb-title">Comment ce score est calculé</h4>
        <p class="cb-sub">4 signaux récoltés automatiquement (rang toutes les 2h · buzz toutes les 30min),
          combinés pour donner un score de 0 à 100.</p>
      </div>
      <div class="cb-head-right">
        <div class="cb-score">${pct}<span class="cb-score-max">%</span></div>
        <div class="cb-score-label">Score global</div>
        <div class="cb-sources-ratio">
          <span class="cb-sources-num">${active}/${total}</span>
          <span class="cb-sources-lbl">sources actives</span>
        </div>
        <div class="cb-ratio-bar"><div class="cb-ratio-fill" style="width:${ratio}%"></div></div>
      </div>
    </div>
    <div class="cb-rows">${rowsHtml}</div>
    <p class="cb-footer">
      Mis à jour toutes les <strong>6 h</strong> · données publiques récoltées automatiquement ·
      <a href="#methodologieSources" class="cb-more">Voir toutes les sources ↓</a>
    </p>
  `;
}

// ============================================================
// RENDER — Section Méthodologie & Sources (panneau pédagogique)
// Affiche :
//   1. Intro : comment le dashboard agrège ses données
//   2. 4 signaux du Completion Score avec leur calcul détaillé
//   3. Liste exhaustive des 12+ sources externes (FlixPatrol · Tudum · IMDb · TMDB
//      · Allociné × 2 · SensCritique · Rotten Tomatoes × 2 · Filmaffinity · Wikipedia
//      · Google Trends · Reddit · YouTube · Bluesky · presse RSS) avec :
//      - icône + nom + type (API / scraping / RSS)
//      - lien direct vers la page source Bandi
//      - fréquence de mise à jour
//      - à quoi elle sert (quel signal elle alimente)
// ============================================================
function renderMethodologySources() {
  const root = document.getElementById('methodologieSources');
  if (!root) return;

  const SOURCE_GROUPS = [
    {
      icon: '🏆',
      label: 'Classements Netflix',
      desc: 'Où Bandi se classe dans le monde chaque jour',
      sources: [
        { name: 'FlixPatrol',     url: 'https://flixpatrol.com/title/bandi/' },
        { name: 'Netflix Tudum',  url: 'https://www.netflix.com/tudum/top10' },
      ]
    },
    {
      icon: '⭐',
      label: 'Notes du public',
      desc: 'Ce que les spectateurs et les critiques pensent de la série',
      sources: [
        { name: 'IMDb',            url: 'https://www.imdb.com/title/tt37024175/' },
        { name: 'TMDB',            url: 'https://www.themoviedb.org/tv/269161-bandi' },
        { name: 'Allociné',        url: 'https://www.allocine.fr/series/ficheserie_gen_cserie=1000000157.html' },
        { name: 'SensCritique',    url: 'https://www.senscritique.com/serie/bandi/133850632' },
        { name: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/tv/bandi' },
        { name: 'Filmaffinity',    url: 'https://m.filmaffinity.com/us/film923114.html' },
      ]
    },
    {
      icon: '💬',
      label: 'Ce qu\'en dit Internet',
      desc: 'Posts, discussions et vidéos sur les réseaux',
      sources: [
        { name: 'Reddit',    url: 'https://www.reddit.com/search/?q=Bandi%20Netflix' },
        { name: 'YouTube',   url: 'https://www.youtube.com/results?search_query=Bandi+Netflix' },
        { name: 'Bluesky',   url: 'https://bsky.app/search?q=Bandi%20Netflix' },
      ]
    },
    {
      icon: '🔍',
      label: 'Intérêt en ligne',
      desc: 'Combien de gens cherchent Bandi sur Google et Wikipedia',
      sources: [
        { name: 'Google Trends', url: 'https://trends.google.com/trends/explore?q=Bandi%20Netflix' },
        { name: 'Wikipedia FR',  url: 'https://fr.wikipedia.org/wiki/Bandi_(2026)' },
      ]
    },
    {
      icon: '📰',
      label: 'Presse & médias',
      desc: 'Articles publiés en France, aux Antilles et dans le monde',
      sources: [
        { name: 'Google News',     url: 'https://news.google.com/search?q=Bandi+Netflix' },
        { name: 'France-Antilles', url: 'https://www.france-antilles.fr' },
        { name: 'RCI',             url: 'https://www.rci.fm' },
        { name: 'Le Monde',        url: 'https://www.lemonde.fr' },
        { name: 'Allociné Actu',   url: 'https://www.allocine.fr' },
        { name: '+ 13 autres flux', url: '#' },
      ]
    },
  ];

  const groupsHtml = SOURCE_GROUPS.map(g => `
    <div class="ms-simple-group">
      <div class="ms-simple-group-head">
        <span class="ms-simple-icon">${g.icon}</span>
        <div>
          <div class="ms-simple-label">${g.label}</div>
          <div class="ms-simple-desc">${g.desc}</div>
        </div>
      </div>
      <div class="ms-simple-srcs">
        ${g.sources.map(s => s.url === '#'
          ? `<span class="ms-simple-src ms-simple-src-more">${s.name}</span>`
          : `<a class="ms-simple-src" href="${s.url}" target="_blank" rel="noopener">${s.name} ↗</a>`
        ).join('')}
      </div>
    </div>
  `).join('');

  root.innerHTML = `
    <div class="ms-header">
      <span class="ms-tag">Transparence</span>
      <h3 class="ms-title">D'où viennent ces chiffres ?</h3>
      <p class="ms-intro">
        Tout ce que vous voyez sur ce dashboard est récupéré automatiquement
        toutes les <strong>6 heures</strong> sur des sites publics.
        Cliquez sur n'importe quelle source pour vérifier vous-même.
      </p>
    </div>
    <div class="ms-simple-grid">${groupsHtml}</div>
    <div class="ms-footer">
      <div class="ms-footer-row">
        <span class="ms-k">Mise à jour</span>
        <span>Automatique toutes les 6h · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
      <div class="ms-footer-row">
        <span class="ms-k">Total</span>
        <span>17 sources publiques · aucune donnée payante ou inventée</span>
      </div>
    </div>
  `;
}

// ============================================================
// MONITORING TAB
// Fraîcheur des données · Notes externes · Scrapers GitHub Actions
// ============================================================
let monitoringLoaded = false;

function initMonitoringTab() {
  if (monitoringLoaded) return;
  monitoringLoaded = true;

  // ── Adaptateur données pour BANDI_MONITORING ──────────────
  // Le module monitoring.js lit des champs spécifiques sur BANDI
  // On les DÉRIVE à partir des données live — jamais de fallback hardcodé
  // (les valeurs demo sont dans data-fallback.js et visibles via BANDI._fallback)
  try {
    if (BANDI.current) {
      // Alias score_monde ↔ score pour monitoring.js
      if (BANDI.current.score_monde == null && BANDI.current.score != null) {
        BANDI.current.score_monde = BANDI.current.score;
      }
      if (BANDI.current.score == null && BANDI.current.score_monde != null) {
        BANDI.current.score = BANDI.current.score_monde;
      }
      // Dérive paysN1 / paysTop10 depuis bandi_country_rankings live si manquant
      const pays = Array.isArray(BANDI.pays) ? BANDI.pays : [];
      if (BANDI.current.paysN1 == null && pays.length) {
        BANDI.current.paysN1 = pays.filter(p => p.rang === 1).length;
      }
      if (BANDI.current.paysTop10 == null && pays.length) {
        BANDI.current.paysTop10 = pays.length;
      }
    }
    // history : timeline pour les deltas J / J-1
    if (!BANDI.history || BANDI.history.length === 0) {
      BANDI.history = (BANDI.historique || []).map(h => ({
        date: h.jour,
        score_monde:  h.score,
        rang_monde:   h.rang,
        pays_n1:      h.paysN1,
        pays_top10:   h.paysTop10
      }));
    }
    // buzz : score de la dernière journée dans buzzTrends7d
    if (!BANDI.buzz) {
      const lastBuzz = (BANDI.buzzTrends7d || []).slice(-1)[0];
      BANDI.buzz = { score: lastBuzz?.score ?? null };
    }
    // ratings : moyenne normalisée des notes externes
    if (!BANDI.ratings) {
      const norms = Object.values(BANDI.externalRatings ?? {})
        .map(r => r?.rating_norm)
        .filter(v => v != null && !isNaN(v));
      BANDI.ratings = {
        average: norms.length
          ? +(norms.reduce((s, v) => s + v, 0) / norms.length).toFixed(1)
          : null
      };
    }
    // completion score (score interne multi-sources)
    if (BANDI.completionScore == null) {
      try {
        const cs = computeCompletionScore();
        BANDI.completionScore = (cs && cs.score != null) ? cs.score : null;
      } catch (_) { BANDI.completionScore = null; }
    }
    // semaines_top10 dérivé du nombre réel de semaines où Bandi est listé
    if (BANDI.semTop10 == null) {
      const wks = new Set();
      (BANDI.tudumWeekly || []).forEach(r => {
        if (r?.titre && r.titre.toLowerCase().includes('bandi') && r.week_start) {
          wks.add(r.week_start);
        }
      });
      BANDI.semTop10 = wks.size || null;
    }
  } catch (e) {
    console.warn('[monitoring] adaptateur données:', e);
  }

  // Debug — visible dans la console du navigateur (F12)
  console.log('[MON] current →', JSON.stringify(BANDI.current));
  console.log('[MON] BANDI_MONITORING défini →', !!window.BANDI_MONITORING);
  console.log('[MON] snapshots30 →', BANDI.snapshots30?.length, 'entrées');
  console.log('[MON] tudumWeekly →', BANDI.tudumWeekly?.length, 'entrées');

  // ── Module analytique (jauges speedometer) ────────────────
  if (window.BANDI_MONITORING) {
    try {
      BANDI_MONITORING.renderMonitoringTab();
    } catch (e) {
      console.error('[BANDI_MONITORING] CRASH →', e);
      const c = document.getElementById('monAnalytics');
      if (c) c.innerHTML = `<div style="padding:16px;color:#CE1126;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid #CE112644;border-radius:8px;margin-bottom:16px">⚠️ Erreur rendu jauges : ${e.message}<br><small style="color:#555">Voir console F12 pour les détails</small></div>`;
    }
  } else {
    console.error('[MON] window.BANDI_MONITORING non défini — monitoring.js n\'a pas chargé');
    const c = document.getElementById('monAnalytics');
    if (c) c.innerHTML = `<div style="padding:16px;color:#D4A017;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid #D4A01744;border-radius:8px;margin-bottom:16px">⚠️ Module monitoring non chargé — rechargez la page ou vérifiez la console F12</div>`;
  }

  // ── Sections opérationnelles ──────────────────────────────
  const btn = document.getElementById('monRefreshBtn');
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      btn.classList.add('mon-spin');
      try {
        await loadLiveData();
        monitoringLoaded = false;
        initMonitoringTab();
        if (typeof window.BANDI_HEALTH?.scan === 'function') window.BANDI_HEALTH.scan();
      } catch (e) {
        console.warn('[monitoring] refresh KO:', e);
      } finally {
        setTimeout(() => btn.classList.remove('mon-spin'), 600);
      }
    });
  }
  renderMonScrapers();
  renderMonRatings();
  loadMonFreshness();
}

// ── Helpers fraîcheur ──────────────────────────────────────
function monTimeAgo(dateStr) {
  if (!dateStr) return { label: '—', hours: Infinity };
  const d = new Date(String(dateStr).includes('T') ? dateStr : dateStr + 'T12:00:00Z');
  const h = (Date.now() - d.getTime()) / 3600000;
  if (h < 1)  return { label: `il y a ${Math.round(h * 60)} min`, hours: h };
  if (h < 24) return { label: `il y a ${Math.round(h)}h`, hours: h };
  return { label: `il y a ${Math.round(h / 24)}j`, hours: h };
}
function monFreshCls(h, weekly = false) {
  if (!isFinite(h)) return 'mon-stale';
  if (weekly)  return h < 192 ? 'mon-ok' : h < 240 ? 'mon-warn' : 'mon-stale';
  return h < 8 ? 'mon-ok' : h < 36 ? 'mon-warn' : 'mon-stale';
}
function monFmtDate(str) {
  if (!str) return '—';
  return new Date(String(str).includes('T') ? str : str + 'T12:00:00Z')
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Fraîcheur des 8 tables ─────────────────────────────────
async function loadMonFreshness() {
  const cfg = window.SUPABASE_CONFIG;
  const live = cfg && !cfg.url.includes('PLACEHOLDER');

  // Bannière connexion
  const dot   = document.getElementById('monConnDot');
  const label = document.getElementById('monConnLabel');
  const time  = document.getElementById('monConnTime');
  if (dot)   { dot.className = 'mon-conn-dot ' + (live ? 'mon-ok' : 'mon-warn'); }
  if (label) label.textContent = live ? 'Supabase connecté · données live' : 'Mode fallback statique · données de démonstration';
  if (time)  time.textContent  = `Chargé le ${new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;

  // Dates déjà disponibles depuis loadLiveData()
  const snapDate    = BANDI.snapshots30?.[0]?.date;
  const tudumDate   = BANDI.tudumWeekly?.[0]?.week_start;
  const ratingsDate = Object.values(BANDI.externalRatings ?? {}).find(r => r?.date)?.date;

  // Fetch buzz + wiki (non chargés par loadLiveData)
  let buzzArtDate = null, buzzSocDate = null, wikiDate = null;
  let buzzArtCount = '—', buzzSocCount = '—';

  if (live) {
    const h = { 'apikey': cfg.anonKey, 'Authorization': `Bearer ${cfg.anonKey}` };
    const hc = { ...h, 'Prefer': 'count=exact', 'Range': '0-0' };
    const [artR, socR, wkR, artC, socC] = await Promise.allSettled([
      fetch(`${cfg.url}/rest/v1/buzz_articles?order=date_pub.desc&limit=1&select=date_pub`, { headers: h }),
      fetch(`${cfg.url}/rest/v1/buzz_social?order=date_pub.desc&limit=1&select=date_pub`,   { headers: h }),
      fetch(`${cfg.url}/rest/v1/wikipedia_pageviews?order=date.desc&limit=1&select=date`,   { headers: h }),
      fetch(`${cfg.url}/rest/v1/buzz_articles?select=id`, { headers: hc }),
      fetch(`${cfg.url}/rest/v1/buzz_social?select=id`,   { headers: hc }),
    ]);
    const pj = async r => (r.status === 'fulfilled' && r.value.ok) ? r.value.json() : null;
    const [artD, socD, wkD] = await Promise.all([pj(artR), pj(socR), pj(wkR)]);
    buzzArtDate  = artD?.[0]?.date_pub;
    buzzSocDate  = socD?.[0]?.date_pub;
    wikiDate     = wkD?.[0]?.date;
    if (artC.status === 'fulfilled') buzzArtCount = parseInt(artC.value.headers.get('content-range')?.split('/')[1]) || '—';
    if (socC.status === 'fulfilled') buzzSocCount = parseInt(socC.value.headers.get('content-range')?.split('/')[1]) || '—';
  }

  // Partage des dates avec renderMonScrapers (calcul statuts en temps réel)
  BANDI._freshness = {
    snap: BANDI.snapshots30?.[0]?.date,
    tudum: BANDI.tudumWeekly?.[0]?.week_start,
    ratings: Object.values(BANDI.externalRatings ?? {}).find(r => r?.date)?.date,
    buzzArt: buzzArtDate,
    buzzSoc: buzzSocDate,
    wiki: wikiDate
  };
  // Re-render scrapers avec les dates désormais disponibles (loadMonFreshness
  // étant async, renderMonScrapers a déjà tourné une première fois sans ces dates)
  try { renderMonScrapers(); } catch (_) {}

  const CARDS = [
    {
      icon: '📊', label: 'Classements',       sub: 'FlixPatrol · Monde',
      date: snapDate, weekly: false,
      detail: `Score ${BANDI.current?.score ?? '—'} pts · Rang mondial #${BANDI.current?.rang ?? '—'}`
    },
    {
      icon: '🌍', label: 'Pays',              sub: `${BANDI.pays?.length ?? '—'} pays actifs`,
      date: snapDate, weekly: false,
      detail: `#1 dans ${BANDI.current?.paysN1 ?? '—'} pays · ${BANDI.current?.paysTop10 ?? '—'} top 10`
    },
    {
      icon: '📺', label: 'Top 10 TV Shows',   sub: 'Netflix Monde',
      date: snapDate, weekly: false,
      detail: `${BANDI.rivals?.length ?? '—'} titres scrappés · Bandi #${BANDI.current?.rang ?? '—'}`
    },
    {
      icon: '✅', label: 'Tudum officiel',    sub: 'Netflix hebdo',
      date: tudumDate, weekly: true,
      detail: tudumDate
        ? `Semaine du ${monFmtDate(tudumDate)}`
        : 'En attente · mardi 15h UTC'
    },
    {
      icon: '📰', label: 'Presse & médias',   sub: `${buzzArtCount} articles`,
      date: buzzArtDate, weekly: false,
      detail: '23 flux RSS · Google News · GDELT'
    },
    {
      icon: '💬', label: 'Réseaux sociaux',   sub: `${buzzSocCount} posts`,
      date: buzzSocDate, weekly: false,
      detail: 'Reddit · YouTube · Bluesky'
    },
    {
      icon: '⭐', label: 'Notes externes',    sub: '8 sources',
      date: ratingsDate, weekly: false,
      detail: 'IMDb · TMDB · RT · Allociné · SensCritique · Filmaffinity'
    },
    {
      icon: '📖', label: 'Wikipedia',         sub: 'Pageviews FR + EN',
      date: wikiDate, weekly: false,
      detail: (() => {
        const v = (BANDI.wikipediaPageviews ?? []).slice(-7).reduce((s, r) => s + (r.views || 0), 0);
        return v ? `${v.toLocaleString('fr-FR')} vues sur 7j` : 'Aucune donnée récente';
      })()
    },
  ];

  const grid = document.getElementById('monGrid');
  if (!grid) return;
  // Rendu compact : une ligne par source, pas de grande carte
  grid.innerHTML = CARDS.map(c => {
    const { label: age, hours } = monTimeAgo(c.date);
    const cls = monFreshCls(hours, c.weekly);
    const dotCls = cls === 'mon-ok' ? '#009739' : cls === 'mon-warn' ? '#D4A017' : '#555';
    return `
      <div class="mon-fresh-row">
        <span class="mon-fresh-icon">${c.icon}</span>
        <span class="mon-fresh-label">${c.label}</span>
        <span class="mon-fresh-sub">${c.sub}</span>
        <span class="mon-fresh-detail">${c.detail}</span>
        <span class="mon-fresh-age" style="color:${dotCls}">${age}</span>
        <span class="mon-fresh-dot" style="background:${dotCls}"></span>
      </div>`;
  }).join('');
}

// ── Notes par source ───────────────────────────────────────
function renderMonRatings() {
  const root = document.getElementById('monRatings');
  if (!root) return;
  const R = BANDI.externalRatings ?? {};

  const SOURCES = [
    { key: 'imdb',            label: 'IMDb',            max: 10,  unit: '/10', color: '#F5C518' },
    { key: 'tmdb',            label: 'TMDB',            max: 10,  unit: '/10', color: '#01B4E4' },
    { key: 'rt_critics',      label: 'RT Presse',       max: 100, unit: '%',   color: '#FA320A' },
    { key: 'rt_audience',     label: 'RT Public',       max: 100, unit: '%',   color: '#FA320A' },
    { key: 'allocine_public', label: 'Allociné Public', max: 5,   unit: '/5',  color: '#FECC00' },
    { key: 'allocine_press',  label: 'Allociné Presse', max: 5,   unit: '/5',  color: '#FECC00' },
    { key: 'senscritique',    label: 'SensCritique',    max: 10,  unit: '/10', color: '#FFAD00' },
    { key: 'filmaffinity',    label: 'Filmaffinity',    max: 10,  unit: '/10', color: '#C0392B' },
  ];

  const rows = SOURCES.map(src => {
    const r = R[src.key];
    // La table external_ratings utilise la colonne "rating" (pas "note")
    const val = r?.rating ?? r?.note ?? null;
    const has = val != null;
    const pct = has ? Math.round((val / src.max) * 100) : 0;
    const { label: age, hours } = monTimeAgo(r?.date);
    const cls = has ? monFreshCls(hours) : 'mon-stale';
    const votes = r?.votes          ? `${Number(r.votes).toLocaleString('fr-FR')} votes`
                : r?.reviews_count  ? `${r.reviews_count} critiques`
                : r?.reviews        ? `${r.reviews} critiques` : '';
    return `
      <div class="mon-rating-row">
        <div class="mon-rating-dot ${cls}"></div>
        <span class="mon-rating-name">${src.label}</span>
        <span class="mon-rating-val ${has ? '' : 'mon-no-data'}">${has ? val + src.unit : '—'}</span>
        <div class="mon-rating-bar-wrap">
          <div class="mon-rating-bar" style="width:${pct}%;background:${src.color}33;border-right:2px solid ${src.color}99;"></div>
        </div>
        <span class="mon-rating-pct">${has ? pct + '%' : ''}</span>
        <span class="mon-rating-age ${cls}">${has ? age : 'En attente'}</span>
        <span class="mon-rating-votes">${votes}</span>
      </div>`;
  }).join('');

  root.innerHTML = rows || '<p class="mon-empty">Notes non disponibles · scraper en attente de données</p>';
}

// ── Scrapers GitHub Actions ────────────────────────────────
// Les statuts "Actif / Retard / Hors-ligne" sont calculés depuis la fraîcheur
// réelle des données écrites en DB (pas un status UI statique).
function renderMonScrapers() {
  const root = document.getElementById('monScrapers');
  if (!root) return;

  // Dates les plus récentes disponibles côté frontend
  const snapDate    = BANDI.snapshots30?.[0]?.date;
  const tudumDate   = BANDI.tudumWeekly?.[0]?.week_start;
  const ratingsDate = Object.values(BANDI.externalRatings ?? {}).find(r => r?.date)?.date;
  const buzzArtDate = BANDI._freshness?.buzzArt ?? null;
  const buzzSocDate = BANDI._freshness?.buzzSoc ?? null;

  // Statut calculé : âge data → {cls, badge}
  const status = (date, weekly = false) => {
    if (!date) return { cls: 'mon-stale', badge: 'Hors-ligne' };
    const { hours } = monTimeAgo(date);
    const cls = monFreshCls(hours, weekly);
    const badge = cls === 'mon-ok' ? 'Actif' : cls === 'mon-warn' ? 'Retard' : 'Hors-ligne';
    return { cls, badge };
  };

  const WF = [
    { name: 'scrape.yml',             label: 'Classements FlixPatrol',      freq: 'Toutes les 6h',  icon: '📊', st: status(snapDate),          url: 'https://github.com/omega-collab/bandi-dashboard/actions/workflows/scrape.yml' },
    { name: 'tudum-scrape.yml',       label: 'Netflix Tudum officiel',      freq: 'Mardi 15h UTC',  icon: '✅', st: status(tudumDate, true),   url: 'https://github.com/omega-collab/bandi-dashboard/actions/workflows/tudum-scrape.yml' },
    { name: 'buzz-scrape.yml',        label: 'Presse + GDELT (23 flux)',    freq: 'Toutes les 6h',  icon: '📰', st: status(buzzArtDate),       url: 'https://github.com/omega-collab/bandi-dashboard/actions/workflows/buzz-scrape.yml' },
    { name: 'buzz-social-scrape.yml', label: 'Reddit · YouTube · Bluesky', freq: 'Toutes les 6h',  icon: '💬', st: status(buzzSocDate),       url: 'https://github.com/omega-collab/bandi-dashboard/actions/workflows/buzz-social-scrape.yml' },
    { name: 'ratings-scrape.yml',     label: '8 sources notes + Wikipedia', freq: 'Toutes les 6h', icon: '⭐', st: status(ratingsDate),       url: 'https://github.com/omega-collab/bandi-dashboard/actions/workflows/ratings-scrape.yml' },
  ];

  root.innerHTML = WF.map(w => `
    <a class="mon-scraper-row" href="${w.url}" target="_blank" rel="noopener">
      <span class="mon-scraper-icon">${w.icon}</span>
      <div class="mon-scraper-info">
        <span class="mon-scraper-name">${w.name}</span>
        <span class="mon-scraper-label">${w.label}</span>
      </div>
      <span class="mon-scraper-freq">↻ ${w.freq}</span>
      <div class="mon-scraper-status ${w.st.cls}">
        <div class="mon-card-dot ${w.st.cls}"></div>${w.st.badge}
      </div>
    </a>`).join('');
}

// ============ SCROLL HEADER ============
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ============ HEALTH GUARD — hooks globaux ============
// Expose les fonctions de calcul pour que health-guard.js puisse les scanner.
window.computeCompletionScore = computeCompletionScore;
window.computeForecastS2      = computeForecastS2;
// Hook déclenché par health-guard après auto-heal (paysN1/paysTop10/USA rang
// + agrégats monitoring). Re-render uniquement les modules visibles pour éviter
// les crashs côté panels lazy (Buzz, Map, Historique).
window.BANDI_HEALTH_RERENDER = function () {
  try { renderOverview(); }        catch (_) {}
  try { renderSourcesBadge(); }    catch (_) {}
  try { renderBreakthroughUSA(); } catch (_) {}
  try { renderForecastS2(); }      catch (_) {}
  try { renderZonesDomination(); } catch (_) {}
  // Monitoring : rerender uniquement si l'onglet est déjà initialisé et visible.
  try {
    const panel = document.getElementById('panel-monitoring');
    if (monitoringLoaded && panel && panel.classList.contains('active')) {
      if (window.BANDI_MONITORING) BANDI_MONITORING.renderMonitoringTab();
      renderMonScrapers();
      renderMonRatings();
    }
  } catch (_) {}
};

// ============ INIT ============
document.addEventListener("DOMContentLoaded", async () => {
  // Chaque call isolé pour qu'une erreur n'empêche pas les suivants
  try { await loadLiveData(); } catch (e) { console.error('[BANDI] loadLiveData:', e); }
  try { initTabs(); }          catch (e) { console.error('[BANDI] initTabs:', e); }
  try { initLiveClock(); }     catch (e) { console.error('[BANDI] initLiveClock:', e); }
  try { renderOverview(); }    catch (e) { console.error('[BANDI] renderOverview:', e); }
  try { renderChart(); }       catch (e) { console.error('[BANDI] renderChart:', e); }
  try { renderRegionFilters(); }  catch (e) { console.error('[BANDI] renderRegionFilters:', e); }
  try { renderCountries(); }   catch (e) { console.error('[BANDI] renderCountries:', e); }
  try { initCountrySearch(); } catch (e) { console.error('[BANDI] initCountrySearch:', e); }
  try { renderMartiniqueChart(); } catch (e) { console.error('[BANDI] renderMartiniqueChart:', e); }
  try { renderTudumMini(); }       catch (e) { console.error('[BANDI] renderTudumMini:', e); }
  try { renderRivals(); }          catch (e) { console.error('[BANDI] renderRivals:', e); }
  try { initRivalsToggle(); }      catch (e) { console.error('[BANDI] initRivalsToggle:', e); }
  try { renderSeriesTab(); }       catch (e) { console.error('[BANDI] renderSeriesTab:', e); }
  try { renderBreakthroughUSA(); } catch (e) { console.error('[BANDI] renderBreakthroughUSA:', e); }
  try { renderAuthenticiteMini(); }catch (e) { console.error('[BANDI] renderAuthenticiteMini:', e); }
  try { renderAuthenticite(); }    catch (e) { console.error('[BANDI] renderAuthenticite:', e); }
  try { renderZonesDomination(); } catch (e) { console.error('[BANDI] renderZonesDomination:', e); }
  try { renderForecastS2(); }      catch (e) { console.error('[BANDI] renderForecastS2:', e); }
  try { renderMethodologySources(); } catch (e) { console.error('[BANDI] renderMethodologySources:', e); }

  // Déclencher le scan health-guard dès que tout le rendu initial est terminé
  // (évite les faux positifs BANDI_EMPTY qui survenaient si le scan précédait loadLiveData)
  try {
    if (typeof window.BANDI_HEALTH?.scan === 'function') window.BANDI_HEALTH.scan();
  } catch (_) {}

  // ── Auto-refresh hero (live FlixPatrol) ──────────────────────────────
  // Le scraper FlixPatrol tourne toutes les 2h côté GitHub Actions. On
  // resynchronise le dashboard toutes les 5 min pour que le hero et les
  // modules dépendants (Forecast, USA, Zones, Concurrence) reflètent le
  // snapshot le plus récent sans recharger la page.
  const HERO_REFRESH_MS = 5 * 60 * 1000;
  setInterval(async () => {
    if (document.hidden) return; // économie batterie mobile
    try {
      await loadLiveData();
      try { renderOverview(); }        catch (e) { console.error('[BANDI] refresh renderOverview:', e); }
      try { renderSourcesBadge(); }    catch (e) { console.error('[BANDI] refresh renderSourcesBadge:', e); }
      try { renderRivals(); }          catch (e) { console.error('[BANDI] refresh renderRivals:', e); }
      try { renderBreakthroughUSA(); } catch (e) { console.error('[BANDI] refresh renderBreakthroughUSA:', e); }
      try { renderZonesDomination(); } catch (e) { console.error('[BANDI] refresh renderZonesDomination:', e); }
      try { renderForecastS2(); }      catch (e) { console.error('[BANDI] refresh renderForecastS2:', e); }
      try { renderAuthenticiteMini(); }catch (e) { console.error('[BANDI] refresh renderAuthenticiteMini:', e); }
      // Monitoring : rerender si l'onglet est actif pour voir live les deltas
      try {
        const panel = document.getElementById('panel-monitoring');
        if (monitoringLoaded && panel && panel.classList.contains('active')) {
          if (window.BANDI_MONITORING) BANDI_MONITORING.renderMonitoringTab();
          loadMonFreshness();
        }
      } catch (_) {}
      console.log('[BANDI] 🔄 hero resynchronisé');
    } catch (e) {
      console.warn('[BANDI] refresh KO (non bloquant):', e.message);
    }
  }, HERO_REFRESH_MS);

  // Resync immédiate au retour sur l'onglet (onglet mis en arrière-plan)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    loadLiveData().then(() => {
      try { renderOverview(); } catch (_) {}
      try { renderRivals(); } catch (_) {}
      try { renderForecastS2(); } catch (_) {}
    }).catch(() => {});
  });
});
