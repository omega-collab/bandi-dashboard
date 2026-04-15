// ===============================
// BANDI MONITORING MODULE (ISOLÉ)
// Rendu dans : #monAnalytics
// Init via : BANDI_MONITORING.renderMonitoringTab()
// ===============================

(function () {

  const BANDI_MONITORING = {}

  // ─── UTILS ───────────────────────────────────────────

  function normalize(value, max) {
    if (!value || isNaN(value)) return 0
    return Math.min((value / max) * 100, 100)
  }

  function variance(arr) {
    if (!arr || arr.length === 0) return 0
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length
  }

  function coherenceLabel(score) {
    if (score >= 75) return "Signaux fortement alignés"
    if (score >= 50) return "Signaux modérément alignés"
    return "Signaux divergents"
  }

  function confidenceLabel(score) {
    if (score > 80) return "Données très fiables"
    if (score > 60) return "Données globalement fiables"
    return "Données à interpréter avec prudence"
  }

  function confidenceColor(score) {
    if (score > 80) return "#2ecc71"
    if (score > 60) return "#f39c12"
    return "#e74c3c"
  }

  // ─── 1. CONSISTENCY ENGINE ───────────────────────────

  BANDI_MONITORING.computeConsistencyEngine = function (data) {
    const flix    = normalize(data.flixpatrolScore, 1000)
    const tudum   = normalize(data.tudumHours, 50)
    const buzz    = normalize(data.buzzScore, 100)
    const ratings = normalize(data.ratingsScore, 10)

    const values = [flix, tudum, buzz, ratings]
    const v = variance(values)
    const score = Math.max(0, Math.round(100 - v))

    return {
      coherenceScore: score,
      variance: Math.round(v),
      normalized: {
        flixpatrol: Math.round(flix),
        tudum:      Math.round(tudum),
        buzz:       Math.round(buzz),
        ratings:    Math.round(ratings)
      },
      label: coherenceLabel(score)
    }
  }

  // ─── 2. CONFIDENCE INDEX ─────────────────────────────

  BANDI_MONITORING.computeConfidenceIndex = function (consistency) {
    const sourcesPresent =
      (consistency.normalized.flixpatrol > 0 ? 1 : 0) +
      (consistency.normalized.tudum       > 0 ? 1 : 0) +
      (consistency.normalized.buzz        > 0 ? 1 : 0) +
      (consistency.normalized.ratings     > 0 ? 1 : 0)

    const availabilityScore = (sourcesPresent / 4) * 100
    const confidenceScore   = Math.round(
      consistency.coherenceScore * 0.7 + availabilityScore * 0.3
    )

    return {
      confidenceScore,
      label: confidenceLabel(confidenceScore),
      sourcesPresent
    }
  }

  // ─── 3. CONSISTENCY TIMELINE ─────────────────────────

  BANDI_MONITORING.computeConsistencyTimeline = function (history) {
    if (!history || history.length < 2) return []

    return history.slice(-14).map((snap, i, arr) => {
      const prev  = i > 0 ? arr[i - 1] : null
      const delta = prev ? Math.abs((prev.rang_moyen || 0) - (snap.rang_moyen || 0)) : 0
      const coherence = Math.max(0, Math.min(100, Math.round(100 - delta * 10)))

      return {
        date: snap.date || `J-${arr.length - i}`,
        coherence
      }
    })
  }

  // ─── STYLE (injecté une seule fois) ──────────────────

  function injectMonitoringStyles() {
    if (document.getElementById("bandi-monitoring-styles")) return

    const style = document.createElement("style")
    style.id = "bandi-monitoring-styles"
    style.textContent = `
      #monAnalytics {
        padding-bottom: 4px;
        animation: fadeInMon 0.35s ease;
      }
      @keyframes fadeInMon {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Section header */
      .mon-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #888;
        margin: 28px 0 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mon-section-title::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(255,255,255,0.07);
      }
      .mon-section-title:first-child { margin-top: 0; }

      /* KPI row */
      .mon-kpi-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      @media (max-width: 600px) {
        .mon-kpi-row { grid-template-columns: 1fr; }
      }

      /* KPI card */
      .mon-kpi-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 20px;
        position: relative;
      }
      .mon-kpi-card .mon-kpi-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #888;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mon-kpi-card .mon-kpi-score {
        font-size: 42px;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 4px;
        font-family: 'Anton', sans-serif;
      }
      .mon-kpi-card .mon-kpi-sublabel {
        font-size: 12px;
        color: #aaa;
        margin-bottom: 10px;
      }
      .mon-kpi-card .mon-tooltip-pill {
        display: inline-block;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 10px;
        color: #999;
        line-height: 1.5;
      }

      /* Source bars */
      .mon-source-bars {
        margin-top: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mon-bar-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 11px;
      }
      .mon-bar-name {
        width: 78px;
        color: #bbb;
        flex-shrink: 0;
        font-size: 11px;
      }
      .mon-bar-track {
        flex: 1;
        height: 5px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        overflow: hidden;
      }
      .mon-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.8s cubic-bezier(.4,0,.2,1);
      }
      .mon-bar-val {
        width: 30px;
        text-align: right;
        color: #888;
        font-size: 10px;
      }

      /* Source dominance card */
      .mon-dominance-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mon-dominance-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
      }
      .mon-badge {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 2px 7px;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .mon-badge.primary   { background: rgba(206,17,38,0.25); color: #CE1126; border: 1px solid rgba(206,17,38,0.4); }
      .mon-badge.secondary { background: rgba(255,255,255,0.07); color: #aaa; border: 1px solid rgba(255,255,255,0.12); }
      .mon-source-note {
        font-size: 11px;
        color: #777;
        line-height: 1.6;
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }

      /* Chart zone */
      .mon-chart-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 20px;
      }
      .mon-chart-card canvas { max-height: 160px; }
      .mon-chart-note {
        font-size: 10px;
        color: #666;
        margin-top: 10px;
        text-align: center;
      }

      /* Variance badge */
      .mon-variance-info {
        font-size: 10px;
        color: #777;
        margin-top: 6px;
      }
    `
    document.head.appendChild(style)
  }

  // ─── 4. RENDER ────────────────────────────────────────

  BANDI_MONITORING.renderMonitoringTab = function () {
    // ⚠️ Rendu dans #monAnalytics (sous-div du panel-monitoring)
    const container = document.getElementById("monAnalytics")
    if (!container) return

    injectMonitoringStyles()

    // Lecture des données depuis window.BANDI (read-only)
    // Les champs buzz, ratings, history et score_monde sont préparés
    // par initMonitoringTab() dans app.js avant cet appel.
    const data = {
      flixpatrolScore: (window.BANDI && window.BANDI.current && window.BANDI.current.score_monde)                      || 0,
      tudumHours:      (window.BANDI && window.BANDI.tudumWeekly && window.BANDI.tudumWeekly[0] && window.BANDI.tudumWeekly[0].heures_vues) || 0,
      buzzScore:       (window.BANDI && window.BANDI.buzz && window.BANDI.buzz.score)                                  || 0,
      ratingsScore:    (window.BANDI && window.BANDI.ratings && window.BANDI.ratings.average)                          || 0
    }

    const history = (window.BANDI && window.BANDI.history) || []

    const consistency = BANDI_MONITORING.computeConsistencyEngine(data)
    const confidence  = BANDI_MONITORING.computeConfidenceIndex(consistency)
    const timeline    = BANDI_MONITORING.computeConsistencyTimeline(history)

    const scoreColor = confidenceColor(consistency.coherenceScore)
    const confColor  = confidenceColor(confidence.confidenceScore)

    const sourceConfig = [
      { key: "flixpatrol", label: "FlixPatrol", color: "#CE1126" },
      { key: "tudum",      label: "Tudum",      color: "#e87c1e" },
      { key: "buzz",       label: "Buzz",        color: "#3498db" },
      { key: "ratings",    label: "Critiques",   color: "#9b59b6" }
    ]

    const barsHTML = sourceConfig.map(src => {
      const val = consistency.normalized[src.key]
      return `
        <div class="mon-bar-row">
          <span class="mon-bar-name">${src.label}</span>
          <div class="mon-bar-track">
            <div class="mon-bar-fill" style="width:${val}%; background:${src.color};"></div>
          </div>
          <span class="mon-bar-val">${val}%</span>
        </div>`
    }).join("")

    // Rang live pour la section source dominance
    const rangLive = (window.BANDI && window.BANDI.current && window.BANDI.current.rang) || '—'

    container.innerHTML = `

      <!-- SECTION 1 : COHÉRENCE -->
      <p class="mon-section-title">Cohérence des sources</p>
      <div class="mon-kpi-row">

        <div class="mon-kpi-card">
          <div class="mon-kpi-label">Score de cohérence</div>
          <div class="mon-kpi-score" style="color:${scoreColor}">${consistency.coherenceScore}%</div>
          <div class="mon-kpi-sublabel">${consistency.label}</div>
          <div class="mon-variance-info">Variance inter-sources : ${consistency.variance}</div>
          <span class="mon-tooltip-pill">Mesure si toutes les sources racontent la même tendance</span>
          <div class="mon-source-bars">${barsHTML}</div>
        </div>

        <!-- SECTION 2 : CONFIANCE -->
        <div class="mon-kpi-card">
          <div class="mon-kpi-label">Indice de confiance</div>
          <div class="mon-kpi-score" style="color:${confColor}">${confidence.confidenceScore}%</div>
          <div class="mon-kpi-sublabel">${confidence.label}</div>
          <div class="mon-variance-info">${confidence.sourcesPresent}/4 sources actives</div>
          <span class="mon-tooltip-pill">Indique la fiabilité globale des données affichées</span>
          <div class="mon-source-bars">
            <div class="mon-bar-row">
              <span class="mon-bar-name">Cohérence</span>
              <div class="mon-bar-track">
                <div class="mon-bar-fill" style="width:${consistency.coherenceScore}%; background:#CE1126;"></div>
              </div>
              <span class="mon-bar-val">${consistency.coherenceScore}%</span>
            </div>
            <div class="mon-bar-row">
              <span class="mon-bar-name">Couverture</span>
              <div class="mon-bar-track">
                <div class="mon-bar-fill" style="width:${Math.round((confidence.sourcesPresent / 4) * 100)}%; background:#3498db;"></div>
              </div>
              <span class="mon-bar-val">${Math.round((confidence.sourcesPresent / 4) * 100)}%</span>
            </div>
          </div>
        </div>

      </div>

      <!-- SECTION 3 : TIMELINE -->
      <p class="mon-section-title">Timeline de cohérence</p>
      <div class="mon-chart-card">
        ${timeline.length < 2
          ? `<p style="color:#666;font-size:12px;text-align:center;padding:20px 0;">Historique insuffisant — au moins 2 snapshots requis.</p>`
          : `<canvas id="monConsistencyChart"></canvas>`
        }
        <div class="mon-chart-note">Évolution de l'alignement des données dans le temps (14 derniers jours)</div>
      </div>

      <!-- SECTION 4 : SOURCE DOMINANCE -->
      <p class="mon-section-title">Hiérarchie des sources</p>
      <div class="mon-dominance-card">
        <div class="mon-dominance-row">
          <span class="mon-badge primary">Principale</span>
          <span>FlixPatrol — Top TV Shows mondial</span>
        </div>
        <div class="mon-dominance-row">
          <span class="mon-badge secondary">Secondaire</span>
          <span>Netflix Tudum — Heures de visionnage officielles</span>
        </div>
        <div class="mon-source-note">
          Classement basé sur FlixPatrol (Top TV Shows mondial). Position actuelle : <strong style="color:#fff">#${rangLive}</strong>.<br>
          Les autres sources (Buzz, Critiques) alimentent le Taux de complétion — elles ne modifient pas le rang affiché.
        </div>
      </div>
    `

    // Chart.js — lazy, uniquement si timeline dispo
    if (timeline.length >= 2) {
      setTimeout(() => {
        const ctx = document.getElementById("monConsistencyChart")
        if (!ctx || typeof Chart === "undefined") return

        if (ctx._chartInstance) ctx._chartInstance.destroy()

        ctx._chartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: timeline.map(t => t.date),
            datasets: [{
              label: "Cohérence",
              data: timeline.map(t => t.coherence),
              borderColor: "#CE1126",
              backgroundColor: "rgba(206,17,38,0.08)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#CE1126",
              tension: 0.35,
              fill: true
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                min: 0, max: 100,
                ticks: { color: "#666", font: { size: 10 }, callback: v => v + "%" },
                grid: { color: "rgba(255,255,255,0.05)" }
              },
              x: {
                ticks: { color: "#666", font: { size: 10 }, maxRotation: 45 },
                grid: { display: false }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => ` Cohérence : ${c.parsed.y}%` } }
            }
          }
        })
      }, 120)
    }
  }

  // ─── INIT (appelé depuis app.js) ─────────────────────

  BANDI_MONITORING.initMonitoringTab = function () {
    BANDI_MONITORING.renderMonitoringTab()
  }

  // ─── EXPORT ──────────────────────────────────────────

  window.BANDI_MONITORING = BANDI_MONITORING

  // injectTab() disponible mais non auto-appelée :
  // la navigation est gérée par app.js / initTabs()
  BANDI_MONITORING.injectTab = function () { /* géré par app.js */ }

})()
