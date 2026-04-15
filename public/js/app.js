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
    // 1. Historique (7 derniers snapshots)
    const snapRes = await fetch(
      `${cfg.url}/rest/v1/bandi_snapshots?order=date.desc&limit=14`,
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

    // Override BANDI
    window.BANDI = {
      ...BANDI,
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
      rivals: top10Data.length > 0
        ? top10Data.map(t => ({
            titre: t.titre,
            score: t.score,
            isBandi: t.titre.toLowerCase().includes('bandi')
          }))
        : BANDI.rivals
    };

    console.log('✅ Données live chargées depuis Supabase');
    console.log(`   Date: ${today} | Score: ${current.score_monde} | Rang: #${current.rang_monde}`);

    // Badge "LIVE" vert si connecté
    const liveEl = document.querySelector('.live-text');
    if (liveEl) liveEl.textContent = 'LIVE';
  } catch (err) {
    console.error('❌ Erreur fetch Supabase, fallback :', err);
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
