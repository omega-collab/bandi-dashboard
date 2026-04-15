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

    // 5. Tudum officiel — dernière semaine disponible (toutes catégories)
    let tudumData = [];
    try {
      const tudumRes = await fetch(
        `${cfg.url}/rest/v1/tudum_global_weekly?order=week_start.desc%2Crang.asc&limit=40`,
        { headers }
      );
      if (tudumRes.ok) tudumData = await tudumRes.json();
    } catch (_) { /* table absente ou réseau, pas critique */ }

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

    // Override BANDI (Object.assign pour muter la const déclarée dans data-fallback.js)
    Object.assign(BANDI, {
      current: {
        score: current.score_monde,
        rang: current.rang_monde,
        paysN1: current.pays_n1,
        paysTop10: current.pays_top10,
        rangMoyen: parseFloat(current.rang_moyen) || null
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
      tudumWeekly: Array.isArray(tudumData) ? tudumData : []
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
function renderOverview() {
  const cur = BANDI.current;
  const prev = BANDI.previous;

  $("rankNumber").textContent = "#" + cur.rang;
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
      <span class="legend-item"><span class="legend-dot" style="background:#CE1126;"></span>↓ Fort recul</span>`
  };

  function updateLegend(mode) {
    const leg = document.getElementById('mapLegend');
    if (leg) leg.innerHTML = legends[mode];
    const sub = document.getElementById('mapSub');
    if (sub) sub.textContent = mode === 'rang'
      ? 'Carte choroplèthe · Cliquer sur un pays pour les détails'
      : 'Progression vs semaine précédente · Vert = monte · Rouge = recule';
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
    updateLegend('progression');
    if (geojsonLayer) {
      geojsonLayer.setStyle(feature => {
        const data  = getCountryData(feature.properties.name);
        const delta = getCountryDelta(feature.properties.name);
        return { fillColor: data ? perfColor(delta) : '#1A1A1A', fillOpacity: data ? 0.85 : 0.2 };
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
});
