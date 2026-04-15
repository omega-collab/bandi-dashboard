/* ========================================
   BANDI DASHBOARD · APPLICATION (LIVE)
   Charge les données depuis Supabase
   Fallback sur data-fallback.js si échec
   ======================================== */

// ============ UTILS ============
function $(id) { return document.getElementById(id); }

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
  if (!cfg || cfg.url.includes('PLACEHOLDER')) {
    console.warn('⚠️ Supabase non configuré, utilisation des données de fallback');
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

    // Merge avec la structure BANDI (garde casting, synopsis, flags du fallback)
    const paysFallback = BANDI.pays;
    const enrichedPays = paysData.map(p => {
      const fallback = paysFallback.find(fp =>
        fp.pays === p.pays ||
        fp.pays.toLowerCase() === p.pays.toLowerCase()
      );

      const hist = historyByCountry[p.pays] || [null, null, null, p.rang];
      const lastTwo = hist.slice(-2).filter(x => x !== null);
      let trend = 'stable';
      if (lastTwo.length === 2) {
        if (lastTwo[1] < lastTwo[0]) trend = 'up';
        else if (lastTwo[1] > lastTwo[0]) trend = 'down';
      }

      return {
        pays: p.pays,
        flag: fallback?.flag || '🏳️',
        code: fallback?.code || '',
        region: p.region || fallback?.region || 'Autre',
        rang: p.rang,
        entree: fallback?.entree || '—',
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
      const fb = enrichedPays.find(ep => ep.pays === p.pays);
      return {
        pays: p.pays,
        flag: fb?.flag || '🏳️',
        region: p.region || 'Autre',
        rang: p.rang,
        prevAvg: prevAvg !== null ? Math.round(prevAvg * 10) / 10 : null,
        delta,
        historique: historyByCountry[p.pays] || []
      };
    });

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
      rivals: top10Data.length > 0
        ? top10Data.map(t => ({
            titre: t.titre,
            score: t.score,
            isBandi: t.titre.toLowerCase().includes('bandi')
          }))
        : BANDI.rivals
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
    if (target === 'map') initMapTab();
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

async function initMapTab() {
  if (mapInitialized) return;
  mapInitialized = true;

  const mapEl = document.getElementById('leafletMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Lookup rang par pays (FlixPatrol name → data)
  const rankByCountry = {};
  BANDI.pays.forEach(p => { rankByCountry[p.pays] = p; });

  // Correspondances noms FlixPatrol → noms GeoJSON (property: "name")
  const NAME_MAP = {
    'United States':    'United States of America',
    'Czech Republic':   'Czechia',
    'Salvador':         'El Salvador',
    'Bahamas':          'The Bahamas',
    'Serbia':           'Republic of Serbia',
    'Ivory Coast':      "Côte d'Ivoire",
    'Cape Verde':       'Cabo Verde',
    'Swaziland':        'Eswatini',
    'Macedonia':        'North Macedonia',
    'Bosnia-Herzegovina': 'Bosnia and Herz.',
    'New Caledonia':    'New Caledonia',
  };
  // Reverse : GeoJSON ADMIN → FlixPatrol name
  const reverseMap = {};
  Object.entries(NAME_MAP).forEach(([fp, geo]) => { reverseMap[geo] = fp; });

  function getData(geoName) {
    return rankByCountry[reverseMap[geoName] || geoName] || null;
  }

  function rankColor(rang) {
    if (!rang) return '#1A1A1A';
    if (rang === 1) return '#CE1126';
    if (rang <= 3) return 'rgba(206,17,38,0.75)';
    if (rang <= 5) return 'rgba(206,17,38,0.55)';
    return 'rgba(206,17,38,0.35)';
  }

  // Init Leaflet
  const map = L.map('leafletMap', {
    center: [15, 10], zoom: 2, minZoom: 1, maxZoom: 6,
    zoomControl: true, attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd', maxZoom: 20
  }).addTo(map);

  // Chargement GeoJSON pays
  try {
    const res = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    if (!res.ok) throw new Error('GeoJSON fetch failed');
    const geojson = await res.json();

    L.geoJSON(geojson, {
      style: (feature) => {
        const data = getData(feature.properties.name);
        return {
          fillColor: data ? rankColor(data.rang) : '#1A1A1A',
          fillOpacity: data ? 0.85 : 0.25,
          color: '#2A2A2A',
          weight: 0.8,
          opacity: 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const data = getData(name);
        if (!data) return;

        const histStr = (data.historique || []).map(h => h === null ? '—' : `#${h}`).join(' · ');
        const flag = data.flag || '';

        layer.bindPopup(`
          <div class="map-popup-header">${flag} ${name}</div>
          <div class="map-popup-rank">#${data.rang} mondial</div>
          ${data.entree ? `<div class="map-popup-meta">Entré le ${data.entree}</div>` : ''}
          <div class="map-popup-hist">Historique 4j : ${histStr}</div>
        `, { className: 'bandi-popup', maxWidth: 220 });

        layer.on('mouseover', function() { this.setStyle({ fillOpacity: 1, weight: 1.5 }); });
        layer.on('mouseout',  function() { this.setStyle({ fillOpacity: 0.85, weight: 0.8 }); });
      }
    }).addTo(map);

    // Forcer le redimensionnement (le panel était caché au chargement)
    setTimeout(() => map.invalidateSize(), 100);

  } catch (err) {
    console.error('Erreur carte:', err);
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8A8A8A;">Carte non disponible (erreur réseau)</div>`;
  }
}

// ============ INIT ============
document.addEventListener("DOMContentLoaded", async () => {
  await loadLiveData();
  initTabs();
  initLiveClock();
  renderOverview();
  renderChart();
  renderRegionFilters();
  renderCountries();
  initCountrySearch();
  renderRivals();
  renderSeriesTab();
});
