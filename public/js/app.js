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
      { headers }
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
      { headers }
    );
    const paysData = await paysRes.json();

    // 3. Top 10 monde du jour
    const top10Res = await fetch(
      `${cfg.url}/rest/v1/netflix_tv_top10_world?date=eq.${today}&order=rang.asc`,
      { headers }
    );
    const top10Data = await top10Res.json();

    // 4. Historique par pays (pour calculer trend)
    const paysHistRes = await fetch(
      `${cfg.url}/rest/v1/bandi_country_rankings?order=date.desc&limit=500`,
      { headers }
    );
    const paysHist = await paysHistRes.json();
    window._paysHistCache = paysHist; // exposé pour initMapTab momentum

    // 5. Tudum officiel — dernière semaine disponible (toutes catégories)
    let tudumData = [];
    try {
      const tudumRes = await fetch(
        `${cfg.url}/rest/v1/tudum_global_weekly?order=week_start.desc%2Crang.asc&limit=40`,
        { headers }
      );
      if (tudumRes.ok) tudumData = await tudumRes.json();
    } catch (_) { /* table absente ou réseau, pas critique */ }

    // 6. Google Trends (7 derniers jours) — pour Completion Score
    let buzzTrends7d = [];
    try {
      const tRes = await fetch(
        `${cfg.url}/rest/v1/buzz_trends?order=date.desc&limit=7`,
        { headers }
      );
      if (tRes.ok) buzzTrends7d = await tRes.json();
    } catch (_) { /* table absente, pas critique */ }

    // 7. Buzz social récent (100 derniers posts) — pour Completion Score
    let buzzSocialRecent = [];
    try {
      const sRes = await fetch(
        `${cfg.url}/rest/v1/buzz_social?order=published_at.desc&limit=100`,
        { headers }
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
        { headers }
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
        { headers }
      );
      if (wpRes.ok) {
        const arr = await wpRes.json();
        if (Array.isArray(arr)) wikipediaPageviews = arr;
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
    Object.assign(BANDI, {
      current: {
        score: current.score_monde,
        rang: current.rang_monde,
        paysN1: enrichedPaysN1,
        paysTop10: enrichedPaysTop10,
        rangMoyen: enrichedRangMoyen
      },
      previous: {
        score: previous.score_monde,
        rang: previous.rang_monde,
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
      rivals: top10Data.length > 0
        ? top10Data.map(t => ({
            titre: t.titre,
            score: t.score,
            isBandi: t.titre.toLowerCase().includes('bandi')
          }))
        : BANDI.rivals,
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
      wikipediaPageviews: Array.isArray(wikipediaPageviews) ? wikipediaPageviews : []
    });

    // Badge sources croisées
    await renderSourcesBadge(cfg, headers);

    console.log('✅ Données live chargées depuis Supabase');
    console.log(`   Date: ${today} | Score: ${current.score_monde} | Rang: #${current.rang_monde}`);

    // Badge "LIVE" vert si connecté
    const liveEl = document.querySelector('.live-text');
    if (liveEl) liveEl.textContent = 'LIVE';
  } catch (err) {
    console.error('❌ Erreur fetch Supabase, fallback :', err);
  }
}

async function renderSourcesBadge(cfg, headers) {
  try {
    const [fpRes, tdRes] = await Promise.all([
      fetch(`${cfg.url}/rest/v1/bandi_snapshots?order=date.desc&limit=2`, { headers }),
      fetch(`${cfg.url}/rest/v1/bandi_tudum_weekly?order=week.desc&limit=2`, { headers })
    ]);
    const fp = await fpRes.json();
    const td = await tdRes.json();

    const badge = document.getElementById('sourcesBadge');
    if (!badge || !fp?.length || !td?.length) return;

    const fpRang = fp[0]?.rang_monde;
    const tdRang = td[0]?.rank_noneng;
    const fpPrev = fp[1]?.rang_monde;
    const tdPrev = td[1]?.rank_noneng;

    const fpInTop10 = fpRang <= 10;
    const tdInTop10 = tdRang !== null && tdRang <= 10;
    const fpTrend = fpPrev ? Math.sign(fpPrev - fpRang) : 0;
    const tdTrend = (tdPrev && tdRang) ? Math.sign(tdPrev - tdRang) : 0;
    const trendsOpposed = fpTrend !== 0 && tdTrend !== 0 && fpTrend !== tdTrend;

    let status, label, tooltip;
    if (!tdInTop10 || !fpInTop10) {
      status = 'divergent';
      label = '⚠ Divergence';
      tooltip = `FlixPatrol #${fpRang} mondial · Tudum ${tdRang ? '#' + tdRang + ' TV Non-Eng' : 'absent'}`;
    } else if (trendsOpposed) {
      status = 'warning';
      label = '⚡ Vérifier';
      tooltip = `Tendances opposées — FlixPatrol ${fpTrend > 0 ? '↑' : '↓'} / Tudum ${tdTrend > 0 ? '↑' : '↓'}`;
    } else {
      status = 'coherent';
      label = '✓ Croisé';
      tooltip = `FlixPatrol #${fpRang} mondial · Tudum #${tdRang} TV Non-Eng · ${(td[0].weekly_hours_viewed / 1e6).toFixed(1)}M h vues`;
    }

    badge.textContent = label;
    badge.className = `sources-badge ${status}`;
    badge.title = tooltip;
    badge.style.display = '';
  } catch (e) {
    // badge silencieux si erreur
  }
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
    if (target === 'history') renderHistoryTab();
    if (target === 'map')     initMapTab();
    if (target === 'buzz')    initBuzzTab();
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
  rankEl.textContent = "#" + cur.rang;
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

    return `
      <div class="rival-row ${r.isBandi ? 'is-bandi' : ''}">
        <span class="rival-rank">#${i + 1}</span>
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
}

// ============ RIVALS TOGGLE ============
function initRivalsToggle() {
  const stogFlix  = document.getElementById('stogFlix');
  const stogTudum = document.getElementById('stogTudum');
  const viewFlix  = document.getElementById('rivalsViewFlix');
  const viewTudum = document.getElementById('rivalsViewTudum');
  const rivalsSub = document.getElementById('rivalsSub');
  if (!stogFlix || !stogTudum) return;

  stogFlix.addEventListener('click', () => {
    stogFlix.classList.add('active');
    stogTudum.classList.remove('active');
    viewFlix.style.display = '';
    viewTudum.style.display = 'none';
    if (rivalsSub) rivalsSub.textContent = 'Position de Bandi face aux autres séries du classement mondial';
  });

  stogTudum.addEventListener('click', () => {
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

const BUZZ_ICONS = { press: '📰', reddit: '💬', youtube: '🎥', bluesky: '🦋' };
const BUZZ_LABELS = { press: 'Presse', reddit: 'Reddit', youtube: 'YouTube', bluesky: 'Bluesky' };
const SOURCE_COLORS = { local: '#CE1126', national: '#009739', international: '#D4A017' };
const SOURCE_LABELS = { local: 'Local', national: 'National', international: 'International' };
const ENGAGE_ICONS = { reddit: '↑', youtube: '▶', bluesky: '♥', press: '' };

async function loadBuzzData(cfg, headers) {
  const [artRes, socRes, trendsRes] = await Promise.all([
    fetch(`${cfg.url}/rest/v1/buzz_articles?order=published_at.desc&limit=500`, { headers }),
    fetch(`${cfg.url}/rest/v1/buzz_social?order=published_at.desc&limit=500`, { headers }),
    fetch(`${cfg.url}/rest/v1/buzz_trends?order=date.asc&limit=31`, { headers }),
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

  const soc = (Array.isArray(social) ? social : []).map(s => ({
    id: 's' + s.id, itemType: 'social', platform: s.platform,
    sourceType: null,
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
    if (buzzFilters.source   !== 'all' && i.itemType === 'press' && i.sourceType !== buzzFilters.source) return false;
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

function renderBuzzTimeline() {
  const filtered = buzzFiltered();
  const start = buzzPage * BUZZ_PAGE;
  const page  = filtered.slice(start, start + BUZZ_PAGE);
  const total = filtered.length;

  const tl   = $('buzzTimeline');
  const em   = $('buzzEmpty');
  const pg   = $('buzzPagination');

  if (total < 5) {
    if (tl) tl.innerHTML = '';
    if (em) em.style.display = '';
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

    // Filtres
    document.querySelectorAll('.buzz-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter, v = btn.dataset.val;
        buzzFilters[f] = v;
        buzzPage = 0;
        document.querySelectorAll(`.buzz-btn[data-filter="${f}"]`).forEach(b => b.classList.toggle('active', b.dataset.val === v));
        // Masquer filtres source/plateforme selon le type
        const sr = $('buzzSourceRow'), pr = $('buzzPlatformRow');
        if (f === 'type') {
          if (sr) sr.style.display = v === 'social' ? 'none' : '';
          if (pr) pr.style.display = v === 'press'  ? 'none' : '';
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
  if (pctEl) pctEl.textContent = `${auth.pctCasting}%`;
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
// Completion Score (estimation) — modèle pondéré sur 100
//
// Formule :
//   Score = 0.4·S_rank + 0.3·S_engagement + 0.2·S_notes + 0.1·S_search
//
// Chaque signal est normalisé dans [0, 100].
// Si un signal est absent, on retombe sur une valeur neutre (50)
// et on le marque "indisponible" dans le panneau pédagogique.
//
// Sources par signal :
//   S_rank       → bandi_snapshots (FlixPatrol)
//   S_engagement → buzz_social     (Reddit + YouTube + Bluesky)
//   S_notes      → external_ratings (IMDb + Allociné public + Allociné presse)
//   S_search     → buzz_trends     (Google Trends)
// ============================================================
function computeCompletionScore() {
  const out = {
    score: null,
    components: {},
    signalsAvailable: [],
    signalsMissing: [],
    formula: 'Score = 0.4·Stabilité + 0.3·Engagement + 0.2·Notes + 0.1·Recherche'
  };

  // ── S_rank : stabilité du classement FlixPatrol (rang moyen 7 derniers jours)
  // Formule : 100 - (rang_moyen × 10), clampée [0, 100]
  // Rang 1 → 90 · Rang 5 → 50 · Rang ≥ 10 → 0
  let sRank = 50, rankAvail = false, rangMoyen7d = null, rankDaysUsed = 0;
  const hist = Array.isArray(BANDI.historique) ? BANDI.historique : [];
  const rangs = hist.map(h => h.rang).filter(r => typeof r === 'number' && r > 0).slice(-7);
  rankDaysUsed = rangs.length;
  if (rangs.length >= 3) {
    rangMoyen7d = rangs.reduce((s, r) => s + r, 0) / rangs.length;
    sRank = Math.max(0, Math.min(100, Math.round(100 - rangMoyen7d * 10)));
    rankAvail = true;
    out.signalsAvailable.push('Stabilité classement');
  } else {
    out.signalsMissing.push('Stabilité classement');
  }
  out.components.rank = {
    value: sRank,
    weight: 0.4,
    available: rankAvail,
    raw: rangMoyen7d,
    sources: 1,             // FlixPatrol
    sourceList: ['FlixPatrol'],
    dataPoints: rankDaysUsed,
    dataLabel: `${rankDaysUsed} jours pris en compte`
  };

  // ── S_engagement : activité sociale récente (Reddit, YouTube, Bluesky) sur 7j
  // Formule : clamp(log₁₀(totalEngagement + 1) × 20, 0, 100)
  //   0 → 0 · 100 → 40 · 1000 → 60 · 10k → 80 · 100k → 100
  let sEng = 50, engAvail = false, totalEng = 0, recentCount = 0;
  const platformSet = new Set();
  const social = Array.isArray(BANDI.buzzSocialRecent) ? BANDI.buzzSocialRecent : [];
  if (social.length > 0) {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    const recent = social.filter(p => {
      const t = p.published_at ? new Date(p.published_at).getTime() : 0;
      return t >= cutoff;
    });
    recentCount = recent.length;
    totalEng = recent.reduce((s, p) => s + (Number(p.engagement_score) || 0), 0);
    recent.forEach(p => { if (p.platform) platformSet.add(p.platform); });
    sEng = Math.max(0, Math.min(100, Math.round(Math.log10(totalEng + 1) * 20)));
    engAvail = recentCount > 0;
    if (engAvail) out.signalsAvailable.push('Engagement social');
    else out.signalsMissing.push('Engagement social');
  } else {
    out.signalsMissing.push('Engagement social');
  }
  const platformList = [...platformSet];
  out.components.engagement = {
    value: sEng,
    weight: 0.3,
    available: engAvail,
    raw: { count: recentCount, total: totalEng },
    sources: platformList.length || 3,           // 3 plateformes attendues
    sourceList: platformList.length ? platformList : ['Reddit', 'YouTube', 'Bluesky'],
    dataPoints: recentCount,
    dataLabel: `${recentCount} posts · 7 derniers jours`
  };

  // ── S_notes : moyenne pondérée de 8 sources de notes critiques
  // Chaque note est normalisée sur 10 via rating_norm (déjà calculé côté scraper).
  //
  // Poids internes (hiérarchie : audience mondiale > critique presse > communauté) :
  //   IMDb                      0.22  (audience monde, référence industrie)
  //   TMDB                      0.18  (audience monde, API officielle)
  //   Rotten Tomatoes Critics   0.15  (critique presse US agrégée)
  //   Rotten Tomatoes Audience  0.10  (audience US)
  //   Allociné Spectateurs      0.10  (audience FR)
  //   Allociné Presse           0.10  (critique presse FR)
  //   SensCritique              0.10  (communauté francophone)
  //   Filmaffinity              0.05  (communauté hispanophone)
  //   Total                     1.00
  //
  // Les poids sont renormalisés en fonction des sources effectivement disponibles.
  // Score final = moyenne pondérée × 10 (pour passer de /10 à /100).
  let sNotes = 50, notesAvail = false;
  const notesDetail = {
    imdb: null, tmdb: null,
    allocinePublic: null, allocinePress: null,
    senscritique: null,
    rtCritics: null, rtAudience: null,
    filmaffinity: null
  };
  const notesSources = [];
  const notesUsed = [];

  // Helper : ajoute une source si la note est valide
  function addNote(key, src, scaleMax, defaultWeight, label, detailKey, extraFields = {}) {
    if (src && src.rating_norm != null && src.rating_norm > 0) {
      notesDetail[detailKey] = {
        note: Number(src.rating),
        max: Number(src.rating_max || scaleMax),
        norm: Number(src.rating_norm),
        ...extraFields,
        votes: src.votes || null,
        reviews: src.reviews_count || null
      };
      notesUsed.push({ norm: Number(src.rating_norm), weight: defaultWeight, label });
      notesSources.push(label);
      return true;
    }
    return false;
  }

  addNote('imdb',        BANDI.imdb,            10,  0.22, 'IMDb',                    'imdb');
  addNote('tmdb',        BANDI.tmdb,            10,  0.18, 'TMDB',                    'tmdb');
  addNote('rt_critics',  BANDI.rtCritics,       100, 0.15, 'Rotten Tomatoes (presse)', 'rtCritics');
  addNote('rt_audience', BANDI.rtAudience,      100, 0.10, 'Rotten Tomatoes (public)', 'rtAudience');
  addNote('ac_pub',      BANDI.allocinePublic,  5,   0.10, 'Allociné Spectateurs',    'allocinePublic');
  addNote('ac_press',    BANDI.allocinePress,   5,   0.10, 'Allociné Presse',         'allocinePress');
  addNote('sc',          BANDI.senscritique,    10,  0.10, 'SensCritique',            'senscritique');
  addNote('fa',          BANDI.filmaffinity,    10,  0.05, 'Filmaffinity',            'filmaffinity');

  const NOTES_TOTAL_SOURCES = 8; // IMDb · TMDB · RT critics · RT audience · AC public · AC press · SC · FA

  if (notesUsed.length > 0) {
    // Moyenne pondérée — on renormalise les poids par ceux effectivement disponibles
    const totalW = notesUsed.reduce((s, n) => s + n.weight, 0);
    const weightedNorm = notesUsed.reduce((s, n) => s + n.norm * n.weight, 0) / totalW;
    sNotes = Math.max(0, Math.min(100, Math.round(weightedNorm * 10)));
    notesAvail = true;
    out.signalsAvailable.push('Notes critiques');
  } else {
    out.signalsMissing.push('Notes critiques');
  }

  out.components.notes = {
    value: sNotes,
    weight: 0.2,
    available: notesAvail,
    raw: notesDetail,
    sources: notesSources.length || NOTES_TOTAL_SOURCES,
    sourceList: notesSources.length
      ? notesSources
      : ['IMDb', 'TMDB', 'Rotten Tomatoes (presse)', 'Rotten Tomatoes (public)',
         'Allociné Spectateurs', 'Allociné Presse', 'SensCritique', 'Filmaffinity'],
    dataPoints: notesSources.length,
    dataLabel: notesSources.length
      ? `${notesSources.length}/${NOTES_TOTAL_SOURCES} sources actives`
      : `0/${NOTES_TOTAL_SOURCES} sources — en attente`
  };

  // ── S_search : signal d'intérêt (Google Trends + Wikipedia pageviews)
  // Deux sous-composants, pondérés :
  //   Google Trends    0.60 — déjà 0-100 (indice Google)
  //   Wikipedia views  0.40 — log₁₀(views_7j + 1) × 20, clampé [0, 100]
  //     Barème : 0 vue → 0 · 100 → 40 · 1000 → 60 · 10k → 80 · 100k → 100
  // Le score final est la moyenne pondérée des sous-composants disponibles.
  let sSearch = 50, searchAvail = false;
  const searchRaw = { trendsMax: null, trendsDays: 0, wikiViews7d: 0, wikiDays: 0, wikiArticles: [] };
  const searchParts = [];
  const searchSourceList = [];

  // Google Trends
  const trends = Array.isArray(BANDI.buzzTrends7d) ? BANDI.buzzTrends7d : [];
  searchRaw.trendsDays = trends.length;
  if (trends.length > 0) {
    const scores = trends.map(t => Number(t.score) || 0).filter(s => s > 0);
    if (scores.length > 0) {
      searchRaw.trendsMax = Math.max(...scores);
      searchParts.push({ value: searchRaw.trendsMax, weight: 0.6, label: 'Google Trends' });
      searchSourceList.push('Google Trends');
    }
  }

  // Wikipedia pageviews — somme des 7 derniers jours, tous projets confondus
  const wiki = Array.isArray(BANDI.wikipediaPageviews) ? BANDI.wikipediaPageviews : [];
  if (wiki.length > 0) {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const recentWiki = wiki.filter(w => w.date >= cutoff);
    searchRaw.wikiDays = recentWiki.length;
    searchRaw.wikiViews7d = recentWiki.reduce((s, w) => s + (Number(w.views) || 0), 0);
    const articlesSet = new Set();
    recentWiki.forEach(w => articlesSet.add(`${w.project}/${w.article}`));
    searchRaw.wikiArticles = [...articlesSet];
    if (searchRaw.wikiViews7d > 0) {
      const wikiScore = Math.max(0, Math.min(100, Math.round(Math.log10(searchRaw.wikiViews7d + 1) * 20)));
      searchParts.push({ value: wikiScore, weight: 0.4, label: 'Wikipedia' });
      searchSourceList.push('Wikipedia pageviews');
    }
  }

  if (searchParts.length > 0) {
    const tw = searchParts.reduce((s, p) => s + p.weight, 0);
    sSearch = Math.max(0, Math.min(100, Math.round(
      searchParts.reduce((s, p) => s + p.value * p.weight, 0) / tw
    )));
    searchAvail = true;
    out.signalsAvailable.push('Intérêt recherche');
  } else {
    out.signalsMissing.push('Intérêt recherche');
  }

  const SEARCH_TOTAL_SOURCES = 2;
  out.components.search = {
    value: sSearch,
    weight: 0.1,
    available: searchAvail,
    raw: searchRaw,
    sources: searchSourceList.length || SEARCH_TOTAL_SOURCES,
    sourceList: searchSourceList.length ? searchSourceList : ['Google Trends', 'Wikipedia pageviews'],
    dataPoints: searchRaw.trendsDays + searchRaw.wikiDays,
    dataLabel: searchAvail
      ? `${searchRaw.trendsDays > 0 ? `Google pic ${searchRaw.trendsMax}` : ''}${searchRaw.trendsDays > 0 && searchRaw.wikiViews7d > 0 ? ' · ' : ''}${searchRaw.wikiViews7d > 0 ? `Wiki ${searchRaw.wikiViews7d.toLocaleString('fr-FR')} vues 7j` : ''}`
      : 'en attente'
  };

  // ── Score final (somme pondérée)
  out.score = Math.round(
    0.4 * sRank +
    0.3 * sEng +
    0.2 * sNotes +
    0.1 * sSearch
  );

  // Total de sources physiques derrière le calcul
  out.totalSources =
    out.components.rank.sources +
    out.components.engagement.sources +
    out.components.notes.sources +
    out.components.search.sources;
  out.totalActiveSources =
    (out.components.rank.available ? out.components.rank.sources : 0) +
    (out.components.engagement.available ? out.components.engagement.sources : 0) +
    (out.components.notes.available ? out.components.notes.sources : 0) +
    (out.components.search.available ? out.components.search.sources : 0);

  return out;
}

// Formate une ligne d'explication pour le tooltip (version courte)
function formatCompletionTooltip(c) {
  const lines = [];
  lines.push('Formule pondérée sur 100 :');
  lines.push(`• Stabilité du classement (40 %) — ${c.components.rank.value}${c.components.rank.available && c.components.rank.raw != null ? ` (rang moyen 7j : ${c.components.rank.raw.toFixed(1)})` : ' (données insuffisantes)'}`);
  lines.push(`• Engagement social (30 %) — ${c.components.engagement.value}${c.components.engagement.available ? ` (${c.components.engagement.raw.count} posts · 7j)` : ' (estimation neutre)'}`);
  lines.push(`• Notes critiques (20 %) — ${c.components.notes.value}${c.components.notes.available ? ` (${c.components.notes.dataLabel})` : ' (non disponible, valeur neutre)'}`);
  const sr = c.components.search.raw || {};
  const searchSummary = c.components.search.available
    ? ` (${[
        sr.trendsMax != null ? `Google pic ${sr.trendsMax}` : null,
        sr.wikiViews7d ? `Wiki ${sr.wikiViews7d.toLocaleString('fr-FR')} vues 7j` : null
      ].filter(Boolean).join(' · ')})`
    : ' (non disponible)';
  lines.push(`• Intérêt recherche (10 %) — ${c.components.search.value}${searchSummary}`);
  lines.push('');
  lines.push(`Sources actives : ${c.totalActiveSources}/${c.totalSources}. Voir le panneau « Méthode & sources » ci-dessous pour le détail.`);
  return lines.join('\n');
}

function renderForecastS2() {
  const fc = BANDI.strategique?.forecastS2;
  if (!fc) return;

  const prob = fc.probabilite || 85;

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
          valeur: `${compScore.score}/100`,
          seuil: `≥ ${seuil}`,
          ok,
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
        <span class="forecast-ind-icon">${ind.ok ? '✅' : '⚠️'}</span>
        <span class="forecast-ind-label">${ind.label}${helpIcon}</span>
        <span class="forecast-ind-val">${ind.valeur}</span>
        <span class="forecast-ind-seuil">seuil : ${ind.seuil}</span>
      </div>`;
    }).join('');
  }

  // Disclaimer
  const disclaimerEl = document.getElementById('forecastDisclaimer');
  if (disclaimerEl && fc.disclaimer) disclaimerEl.textContent = fc.disclaimer;

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
      label: 'Stabilité du classement',
      icon: '🏆',
      desc: 'Rang moyen de Bandi dans le Top 10 Netflix mondial sur les 7 derniers jours.',
      formula: '100 − (rang moyen × 10)'
    },
    {
      key: 'engagement',
      label: 'Engagement social',
      icon: '💬',
      desc: 'Volume + interactions (likes, commentaires, vues) sur les posts récents parlant de Bandi.',
      formula: 'log₁₀(engagement total + 1) × 20'
    },
    {
      key: 'notes',
      label: 'Notes critiques',
      icon: '⭐',
      desc: 'Moyenne pondérée de 8 sources de notes (presse & audience, toutes ramenées sur /10).',
      formula: '(IMDb·0,22 + TMDB·0,18 + RT presse·0,15 + RT public·0,10 + Allociné pub·0,10 + Allociné presse·0,10 + SensCritique·0,10 + Filmaffinity·0,05) × 10'
    },
    {
      key: 'search',
      label: 'Intérêt recherche',
      icon: '🔍',
      desc: 'Combine Google Trends (0-100) et Wikipedia pageviews 7j — signaux d\'intérêt complémentaires.',
      formula: 'moyenne pondérée (Google Trends · 0,6 + Wikipedia · 0,4)'
    }
  ];

  const weightLabels = { rank: '40 %', engagement: '30 %', notes: '20 %', search: '10 %' };

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
        <p class="cb-sub">4 informations récoltées automatiquement toutes les 6 h,
          combinées pour donner un score de 0 à 100.</p>
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

  // (ancienne version supprimée — remplacée par la version simplifiée ci-dessus)
  return; const _SIGNALS_REF = [
    {
      icon: '🏆',
      title: 'Stabilité du classement',
      weight: '40 %',
      formula: '100 − (rang moyen 7j × 10)',
      explain: 'Plus Bandi reste proche du #1 dans le Top 10 Netflix mondial, plus ce signal est élevé. Calculé sur la moyenne des rangs des 7 derniers jours.',
      feeds: ['FlixPatrol']
    },
    {
      icon: '💬',
      title: 'Engagement social',
      weight: '30 %',
      formula: 'log₁₀(engagement total + 1) × 20',
      explain: 'Somme des interactions (likes, commentaires, vues) sur les posts sociaux récents parlant de Bandi, en échelle logarithmique pour lisser les pics.',
      feeds: ['Reddit', 'YouTube', 'Bluesky']
    },
    {
      icon: '⭐',
      title: 'Notes critiques (8 sources)',
      weight: '20 %',
      formula: '(IMDb·0,22 + TMDB·0,18 + RT presse·0,15 + RT public·0,10 + Allociné public·0,10 + Allociné presse·0,10 + SensCritique·0,10 + Filmaffinity·0,05) × 10',
      explain: 'Moyenne pondérée de 8 plateformes de notation (audience mondiale, critique presse, communautés francophone et hispanophone). Toutes les notes sont ramenées sur /10 avant pondération.',
      feeds: ['IMDb', 'TMDB', 'Rotten Tomatoes (presse)', 'Rotten Tomatoes (public)', 'Allociné Spectateurs', 'Allociné Presse', 'SensCritique', 'Filmaffinity']
    },
    {
      icon: '🔍',
      title: 'Intérêt recherche',
      weight: '10 %',
      formula: 'Google Trends · 0,6 + log₁₀(Wikipedia vues 7j + 1) × 20 · 0,4',
      explain: 'Combine l\'indice Google Trends (pic 7j) et le volume de pages vues sur Wikipedia FR + EN. Signal avancé de la curiosité encyclopédique d\'un public.',
      feeds: ['Google Trends', 'Wikipedia pageviews']
    }
  ];

  const SOURCES = [
    // ── Classements Netflix officiels ou tiers
    { cat: 'Classements', name: 'FlixPatrol',          type: 'Scraping HTML', freq: '6 h',   url: 'https://flixpatrol.com/title/bandi/',              feeds: 'Rang mondial · rang pays · score popularité', status: 'active' },
    { cat: 'Classements', name: 'Netflix Tudum',       type: 'TSV officiel',  freq: 'Hebdo (mardi)', url: 'https://www.netflix.com/tudum/top10',            feeds: 'Heures vues officielles monde', status: 'active' },
    // ── Notes critiques (8 sources)
    { cat: 'Notes',       name: 'IMDb',                type: 'Scraping HTML (JSON-LD)', freq: '6 h', url: 'https://www.imdb.com/title/tt37024175/', feeds: 'Note /10 · nb votes', status: 'active' },
    { cat: 'Notes',       name: 'TMDB',                type: 'API officielle gratuite', freq: '6 h', url: 'https://www.themoviedb.org/tv/269161-bandi', feeds: 'Note /10 · nb votes · popularité', status: 'active' },
    { cat: 'Notes',       name: 'Rotten Tomatoes',     type: 'Scraping HTML', freq: '6 h',   url: 'https://www.rottentomatoes.com/tv/bandi',          feeds: 'Tomatometer (presse) + Audience Score', status: 'active' },
    { cat: 'Notes',       name: 'Allociné',            type: 'Scraping HTML', freq: '6 h',   url: 'https://www.allocine.fr/series/ficheserie_gen_cserie=1000000157.html', feeds: 'Note Spectateurs /5 + Note Presse /5', status: 'active' },
    { cat: 'Notes',       name: 'SensCritique',        type: 'Scraping HTML', freq: '6 h',   url: 'https://www.senscritique.com/serie/bandi/133850632', feeds: 'Note communauté /10', status: 'active' },
    { cat: 'Notes',       name: 'Filmaffinity',        type: 'Scraping HTML', freq: '6 h',   url: 'https://m.filmaffinity.com/us/film923114.html',    feeds: 'Note communauté ES /10', status: 'active' },
    // ── Signaux d'intérêt
    { cat: 'Recherche',   name: 'Google Trends',       type: 'API non officielle', freq: '6 h', url: 'https://trends.google.com/trends/explore?q=Bandi%20Netflix', feeds: 'Indice d\'intérêt 0-100', status: 'active' },
    { cat: 'Recherche',   name: 'Wikipedia pageviews', type: 'API officielle Wikimedia', freq: '6 h', url: 'https://fr.wikipedia.org/wiki/Bandi_(2026)', feeds: 'Pages vues quotidiennes FR + EN', status: 'active' },
    // ── Buzz social
    { cat: 'Buzz social', name: 'Reddit',              type: 'API officielle (JSON)', freq: '6 h', url: 'https://www.reddit.com/search/?q=Bandi%20Netflix', feeds: 'Posts + upvotes + commentaires', status: 'active' },
    { cat: 'Buzz social', name: 'YouTube',             type: 'API Data v3',   freq: '6 h',   url: 'https://www.youtube.com/results?search_query=Bandi+Netflix', feeds: 'Vidéos + vues + likes', status: 'active' },
    { cat: 'Buzz social', name: 'Bluesky',             type: 'API publique',  freq: '6 h',   url: 'https://bsky.app/search?q=Bandi%20Netflix',        feeds: 'Posts + reposts + likes', status: 'active' },
    // ── Presse (articles)
    { cat: 'Presse',      name: 'Google News (4 langues)', type: 'RSS',       freq: '6 h',   url: 'https://news.google.com/search?q=Bandi+Netflix',   feeds: 'Articles FR · EN · ES · PT', status: 'active' },
    { cat: 'Presse',      name: 'GDELT Project',       type: 'API officielle', freq: '6 h',  url: 'https://api.gdeltproject.org/api/v2/doc/doc',      feeds: 'Articles mondiaux géolocalisés', status: 'active' },
    { cat: 'Presse',      name: 'Presse Antilles (10 flux)', type: 'RSS',     freq: '6 h',   url: '#',                                                 feeds: 'France-Antilles · RCI · Zayactu · La 1ère · etc.', status: 'active' },
    { cat: 'Presse',      name: 'Web spécialisé streaming (13 flux)', type: 'RSS', freq: '6 h', url: '#',                                              feeds: 'Le Parisien · Le Monde · Les Inrocks · Télérama · JDG · What\'s on Netflix · etc.', status: 'active' }
  ];

  const signalsHtml = SIGNALS.map(s => `
    <div class="ms-signal">
      <div class="ms-signal-head">
        <span class="ms-signal-icon" aria-hidden="true">${s.icon}</span>
        <span class="ms-signal-title">${s.title}</span>
        <span class="ms-signal-weight">${s.weight}</span>
      </div>
      <p class="ms-signal-explain">${s.explain}</p>
      <div class="ms-signal-formula"><span class="ms-k">Formule</span><code>${s.formula}</code></div>
      <div class="ms-signal-feeds">
        <span class="ms-k">Sources :</span>
        ${s.feeds.map(f => `<span class="ms-feed">${f}</span>`).join('')}
      </div>
    </div>
  `).join('');

  // Regroupement sources par catégorie
  const cats = [...new Set(SOURCES.map(s => s.cat))];
  const sourcesHtml = cats.map(cat => {
    const items = SOURCES.filter(s => s.cat === cat);
    return `
      <div class="ms-cat">
        <h5 class="ms-cat-title">${cat} <span class="ms-cat-count">${items.length}</span></h5>
        <div class="ms-cat-list">
          ${items.map(s => `
            <a class="ms-source ms-source-${s.status}" href="${s.url}" target="_blank" rel="noopener">
              <div class="ms-source-head">
                <span class="ms-source-name">${s.name}</span>
                <span class="ms-source-type">${s.type}</span>
              </div>
              <div class="ms-source-body">
                <span class="ms-source-feeds">${s.feeds}</span>
              </div>
              <div class="ms-source-foot">
                <span class="ms-source-freq">⟳ ${s.freq}</span>
                <span class="ms-source-link">↗</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="ms-header">
      <span class="ms-tag">Méthodologie & sources</span>
      <h3 class="ms-title">Comment ce dashboard est calculé</h3>
      <p class="ms-intro">
        Le dashboard Bandi agrège <strong>17 sources externes</strong> scrappées automatiquement
        toutes les 6 heures. Chaque indicateur est reproductible : vous pouvez cliquer sur
        n'importe quelle source ci-dessous pour voir la donnée brute à sa source.
        Aucune donnée n'est inventée ou extrapolée.
      </p>
    </div>

    <div class="ms-section">
      <h4 class="ms-section-title">1 · Les 4 signaux du Taux de complétion</h4>
      <p class="ms-section-sub">Le Taux de complétion est un score /100 agrégé à partir de 4 signaux pondérés. Voici le détail de chaque signal, sa formule et les sources qui l'alimentent.</p>
      <div class="ms-signals">${signalsHtml}</div>
    </div>

    <div class="ms-section">
      <h4 class="ms-section-title">2 · Les sources externes (17 au total)</h4>
      <p class="ms-section-sub">Toutes les sources sont gratuites et publiques. Fréquence de rafraîchissement précisée pour chacune.</p>
      ${sourcesHtml}
    </div>

    <div class="ms-footer">
      <div class="ms-footer-row">
        <span class="ms-k">Stack technique</span>
        <span>Node.js scrapers → Supabase Postgres → Frontend Vanilla JS · GitHub Actions cron (6h + hebdo Tudum)</span>
      </div>
      <div class="ms-footer-row">
        <span class="ms-k">Licence</span>
        <span>Données publiques agrégées à des fins d'analyse. Dashboard à usage informatif.</span>
      </div>
      <div class="ms-footer-row">
        <span class="ms-k">Dernier rafraîchissement frontend</span>
        <span id="msLastRefresh">${new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
    </div>
  `;
}

// ============ SCROLL HEADER ============
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

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
});
