(function () {
  'use strict';
  // ─────────────────────────────────────────────────────────────────────────
  //  BANDI · MODULE MONITORING · Jauges performance temps réel
  //  Container : #monAnalytics   |   Init : BANDI_MONITORING.renderMonitoringTab()
  // ─────────────────────────────────────────────────────────────────────────

  // ── Géométrie de l'arc SVG (demi-cercle style speedometer) ───────────────
  const R    = 78;
  const CX   = 100;
  const CY   = 110;
  const ARC  = Math.PI * R;   // ≈ 245.04 — longueur totale du demi-arc
  const PATH = `M ${CX - R},${CY} A ${R},${R} 0 0,1 ${CX + R},${CY}`;
  //            "M 22,110 A 78,78 0 0,1 178,110"
  const VB   = '0 0 200 126';
  const DUR  = 1100;           // durée animation ms

  // ── Helpers ───────────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function gradColor(pct) {
    if (pct >= 68) return '#009739';
    if (pct >= 38) return '#D4A017';
    return '#CE1126';
  }

  function rankColor(r) {
    if (!r) return '#333';
    return r <= 3 ? '#009739' : r <= 6 ? '#D4A017' : '#CE1126';
  }

  function dltHtml(val, inv) {
    if (val == null || isNaN(val) || val === 0) return '';
    const up   = inv ? val < 0 : val > 0;
    const sign = val > 0 ? '+' : '';
    return `<span class="${up ? 'mg-up' : 'mg-dn'}">${up ? '▲' : '▼'}&thinsp;${sign}${val}</span>`;
  }

  function fmtHeures(h) {
    if (h == null) return '—';
    if (h >= 1000) return `${(h / 1000).toFixed(1)}B`;
    if (h >= 1)    return `${h.toFixed(1)}M`;
    return `${Math.round(h * 1000)}K`;
  }

  // ── Animation arc (CSS transition sur stroke-dashoffset — plus fiable que RAF) ──

  function animArc(main, glow, pct) {
    const full   = ARC.toFixed(2);
    const target = (ARC * (1 - clamp(pct, 0, 100) / 100)).toFixed(2);
    const els    = [main, glow].filter(Boolean);

    // Réinitialise offset sans transition pour garantir l'état de départ
    els.forEach(el => {
      el.style.transition    = 'none';
      el.style.strokeDashoffset = full;
    });

    // Double RAF : le navigateur peint l'état initial AVANT la transition
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach(el => {
        el.style.transition       = `stroke-dashoffset ${DUR}ms cubic-bezier(0.4,0,0.2,1)`;
        el.style.strokeDashoffset = target;
      });
    }));
  }

  // ── Build une carte jauge ──────────────────────────────────────────────────

  function card(g) {
    const full = ARC.toFixed(2);
    // stroke-dashoffset initial = ARC (arc invisible) — animArc l'anime vers la cible
    // stroke-dasharray = "ARC ARC" : un seul trait couvrant tout l'arc
    const da = `${full} ${full}`;
    // Taille du texte selon longueur de la valeur affichée
    const fs = g.display.length > 6 ? 18
             : g.display.length > 4 ? 22
             : g.display.length > 3 ? 28
             : g.display.length > 2 ? 32 : 36;
    return `<div class="mg-card" title="${g.tooltip || ''}">
  <div class="mg-lbl">${g.label}</div>
  <svg viewBox="${VB}" class="mg-svg" aria-hidden="true">
    <!-- Arc fond -->
    <path d="${PATH}" fill="none" stroke="#1a1a1a" stroke-width="14" stroke-linecap="round"/>
    <!-- Arc lueur (wide, faible opacité) -->
    <path d="${PATH}" fill="none" stroke="${g.color}" stroke-width="28"
          stroke-linecap="round" stroke-dasharray="${da}" stroke-dashoffset="${full}" opacity="0.13"
          id="glow-${g.id}"/>
    <!-- Arc rempli (animé via CSS transition sur stroke-dashoffset) -->
    <path d="${PATH}" fill="none" stroke="${g.color}" stroke-width="12"
          stroke-linecap="round" stroke-dasharray="${da}" stroke-dashoffset="${full}"
          id="arc-${g.id}"/>
    <!-- Valeur centrale -->
    <text x="100" y="79" text-anchor="middle" class="mg-val" font-size="${fs}">${g.display}</text>
    <!-- Unité -->
    <text x="100" y="99" text-anchor="middle" class="mg-unit">${g.unit}</text>
    <!-- Min / Max -->
    <text x="20"  y="120" text-anchor="middle" class="mg-mm">${g.minL}</text>
    <text x="180" y="120" text-anchor="middle" class="mg-mm">${g.maxL}</text>
  </svg>
  <div class="mg-foot">
    <span class="mg-dlt">${g.delta || ''}</span>
    <span class="mg-src">${g.src}</span>
  </div>
</div>`;
  }

  function section(title, gauges) {
    return `<div class="mg-section">
  <div class="mg-sec-title">${title}</div>
  <div class="mg-grid">${gauges.map(card).join('')}</div>
</div>`;
  }

  // ── CSS injecté une seule fois ──────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('bm-css')) return;
    const el = document.createElement('style');
    el.id = 'bm-css';
    el.textContent = `
/* ── Wrapper ── */
#monAnalytics {
  animation: mgIn .38s cubic-bezier(.4,0,.2,1);
  margin-bottom: 4px;
}
@keyframes mgIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Topbar ── */
.mg-topbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.mg-topbar-title {
  font-size: 10px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: #666;
  font-family: 'JetBrains Mono', monospace;
}
.mg-topbar-sub { font-size: 10px; color: #444; font-family: 'JetBrains Mono', monospace; }

/* ── Section ── */
.mg-section { margin-bottom: 22px; }
.mg-sec-title {
  font-size: 9px; font-weight: 700; letter-spacing: .15em;
  text-transform: uppercase; color: #555;
  font-family: 'JetBrains Mono', monospace;
  padding-bottom: 12px;
  display: flex; align-items: center; gap: 10px;
}
.mg-sec-title::after {
  content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.05);
}

/* ── Grille responsive ── */
.mg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 800px)  { .mg-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
@media (max-width: 440px)  { .mg-grid { grid-template-columns: repeat(2, 1fr); gap: 8px;  } }

/* ── Carte ── */
.mg-card {
  background: #111;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px;
  padding: 14px 10px 10px;
  display: flex; flex-direction: column; align-items: center;
  transition: border-color .2s, transform .25s cubic-bezier(.34,1.56,.64,1);
  cursor: default;
  position: relative;
}
.mg-card:hover {
  border-color: rgba(255,255,255,.18);
  transform: translateY(-3px);
}

/* ── Textes ── */
.mg-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: .11em;
  text-transform: uppercase; color: #555;
  margin-bottom: 2px; text-align: center;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.35;
}
.mg-svg  { width: 100%; height: auto; display: block; }
.mg-val  { font-family: 'Anton', sans-serif; fill: #ffffff; }
.mg-unit {
  font-size: 8px; fill: #383838;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase; letter-spacing: .06em;
}
.mg-mm   { font-size: 7px; fill: #272727; font-family: 'JetBrains Mono', monospace; }

/* ── Footer delta + source ── */
.mg-foot {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; margin-top: 4px; padding: 0 2px; min-height: 16px;
}
.mg-dlt  { font-size: 11px; font-weight: 700; min-width: 38px; }
.mg-src  { font-size: 8px; color: #333; font-family: 'JetBrains Mono', monospace; text-align: right; max-width: 90px; }
.mg-up   { color: #009739; }
.mg-dn   { color: #CE1126; }

/* ── Séparateur bas ── */
.mg-sep  { height: 1px; background: rgba(255,255,255,.05); margin: 24px 0 20px; }

/* ── Ligne données textuelles (toujours visible au-dessus des jauges) ── */
.mg-dataline {
  display: flex; gap: 20px; flex-wrap: wrap;
  padding: 10px 14px; margin-bottom: 18px; border-radius: 8px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #555;
}
.mg-dataline strong { color: #ccc; font-weight: 700; }
    `;
    document.head.appendChild(el);
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────

  function renderMonitoringTab() {
    const container = document.getElementById('monAnalytics');
    if (!container) { console.error('[BANDI_MONITORING] #monAnalytics introuvable dans le DOM'); return; }
    injectCSS();

    try {
    // ── Lecture des données depuis BANDI (enrichi par initMonitoringTab dans app.js) ──
    const B    = window.BANDI    || {};
    const cur  = B.current       || {};
    const hist = B.historique    || [];

    // Trouver la ligne Bandi dans Tudum (pas juste [0] qui est la série #1 du top)
    const allTudum  = B.tudumWeekly || [];
    const bandiTudum = allTudum.find(r =>
      r.titre && r.titre.toLowerCase().includes('bandi')
    ) || null;
    const t0 = bandiTudum || {}; // fallback vide si Bandi absent cette semaine

    // ── Fallback en cascade : snapshot30 si current vide ──────────────
    const snap0 = (B.snapshots30 || [])[0] || {};

    // Valeurs live avec fallback robuste
    const rang      = cur.rang    || snap0.rang_monde  || 0;
    const score     = cur.score   || snap0.score_monde || 0;
    const paysN1    = cur.paysN1    ?? snap0.pays_n1   ?? null;
    const paysTop10 = cur.paysTop10 ?? snap0.pays_top10 ?? null;
    const heuresSem   = t0.heures_vues      != null ? parseFloat(t0.heures_vues)    : null;
    const vuesSem     = t0.views_millions   != null ? parseFloat(t0.views_millions) : null;

    // ── DONNÉES OFFICIELLES NETFLIX (BANDI.bandiPerformance) ─────────────
    // Ces valeurs sont alimentées depuis le prompt analytique 06/05/2026 et
    // remplacent les jauges anciennement inactives (completionScore, buzzScore,
    // heuresVuesCumul, joursEnTop10) qui restaient à "—" en permanence.
    const bp = B.bandiPerformance || {};
    const bpTotals = bp.totalsPublicTop10 || {};
    const bpComp = bp.completionEstimate || {};
    const bpCrit = B.criticReviews || {};
    const bpIg = bp.instagramNetflixFrance || {};
    const bpWeek2 = (bp.weeklyNetflixTop10 || []).find(w => w.weekNumber === 2) || {};

    const heuresCumul = bpTotals.hoursViewed != null ? bpTotals.hoursViewed / 1_000_000 : null;
    const vuesCumul   = bpTotals.viewsCVE    != null ? bpTotals.viewsCVE / 1_000_000    : null;
    const peakHeures  = bpWeek2.hoursViewed  != null ? bpWeek2.hoursViewed / 1_000_000  : null;
    const completion  = bpComp.central                ?? null;
    const semTop10    = (bp.weeklyNetflixTop10 || []).length || (B.cumulTudum?.semainesTop10 ?? null);
    // Source de vérité : score presse calculé depuis BANDI_RECEPTION_SOURCES
    // (recalculé par computeReceptionScores). Fallback sur l'ancien scorePct
    // tant que le panneau Réception n'a pas été initialisé.
    const recScores  = window.BANDI_RECEPTION_SCORES || (typeof computeReceptionScores === 'function' ? computeReceptionScores() : null);
    const presseFav  = recScores?.press?.value ?? bpCrit.scorePct ?? null;
    const igGain      = bpIg.measuredGain             ?? null;
    const igGainK     = igGain != null ? Math.round(igGain / 1000) : null;

    // Debug — visible dans la console du navigateur
    console.log('[MONITORING] FlixPatrol →', { rang, score, paysN1, paysTop10 });
    console.log('[MONITORING] Tudum Bandi →', bandiTudum ? `${bandiTudum.titre} rang#${bandiTudum.rang} ${heuresSem}M h` : 'absent');
    console.log('[MONITORING] Données officielles →', { completion, presseFav, igGain, heuresCumul, vuesCumul, peakHeures, semTop10 });

    // Deltas J vs J-1 depuis l'historique (safe si valeurs null)
    const prev   = hist.length >= 2 ? hist[hist.length - 2] : null;
    const prevRang  = prev?.rang   ?? prev?.rang_monde  ?? null;
    const prevScore = prev?.score  ?? prev?.score_monde ?? null;
    const dRang  = (prevRang  != null && rang)      ? (prevRang  - rang)           : null;
    const dScore = (prevScore != null && score)     ? (score - prevScore)           : null;
    const dPN1   = (prev && paysN1   != null)       ? (paysN1   - (prev.paysN1   ?? prev.pays_n1   ?? 0)) : null;
    const dPT10  = (prev && paysTop10 != null)      ? (paysTop10 - (prev.paysTop10 ?? prev.pays_top10 ?? 0)) : null;

    // Pcts pour le remplissage de l'arc (0-100)
    const pctRang  = rang        ? clamp(Math.round((11 - rang) / 10 * 100), 0, 100) : 0;
    const pctScore = score       ? clamp(Math.round(score / 1200 * 100),     0, 100) : 0;
    const pctPN1   = paysN1   != null ? clamp(Math.round(paysN1   / 20 * 100),  0, 100) : 0;
    const pctPT10  = paysTop10!= null ? clamp(Math.round(paysTop10 / 50 * 100), 0, 100) : 0;
    const pctComp  = completion!= null ? clamp(Math.round(completion),           0, 100) : 0;
    const pctSem   = semTop10 != null ? clamp(Math.round(semTop10 / 12 * 100),  0, 100) : 0;
    const pctHsem  = heuresSem  != null ? clamp(Math.round(heuresSem / 30 * 100),   0, 100) : 0;
    const pctHcum  = heuresCumul != null ? clamp(Math.round(heuresCumul / 100 * 100), 0, 100) : 0;
    const pctVuesCumul = vuesCumul != null ? clamp(Math.round(vuesCumul / 15 * 100), 0, 100) : 0;
    const pctPeak  = peakHeures != null ? clamp(Math.round(peakHeures / 50 * 100), 0, 100) : 0;
    const pctVues  = vuesSem    != null ? clamp(Math.round(vuesSem / 20 * 100),     0, 100) : 0;
    const pctPresseFav = presseFav != null ? clamp(Math.round(presseFav), 0, 100) : 0;
    const pctIg    = igGain != null ? clamp(Math.round(igGain / 100_000 * 100), 0, 100) : 0;

    // ── SECTION 1 : Classement FlixPatrol ─────────────────────────────────
    const s1 = [
      {
        id: 'rang',      label: 'Rang Mondial',
        display: rang ? `#${rang}` : '—',  unit: 'TV SHOWS · MONDE',
        pct: pctRang,    color: rankColor(rang),
        delta: dltHtml(dRang, false),
        src: 'FlixPatrol',  minL: '#10', maxL: '#1',
        tooltip: 'Position dans le Top 10 TV Shows Netflix mondial (FlixPatrol)'
      },
      {
        id: 'score',     label: 'Score Popularité',
        display: score ? score.toString() : '—',  unit: 'POINTS',
        pct: pctScore,   color: gradColor(pctScore),
        delta: dltHtml(dScore, false),
        src: 'FlixPatrol',  minL: '0', maxL: '1 200',
        tooltip: 'Score de popularité FlixPatrol (agrégation des classements pays)'
      },
      {
        id: 'pn1',       label: 'Pays N°1',
        display: paysN1 != null ? paysN1.toString() : '—',  unit: 'PAYS DOMINÉS',
        pct: pctPN1,     color: (paysN1 || 0) >= 10 ? '#009739' : (paysN1 || 0) >= 5 ? '#D4A017' : '#CE1126',
        delta: dltHtml(dPN1, false),
        src: 'FlixPatrol',  minL: '0', maxL: '20',
        tooltip: 'Nombre de pays où Bandi est classé #1 aujourd\'hui'
      },
      {
        id: 'presence',  label: 'Présence Mondiale',
        display: paysTop10 != null ? paysTop10.toString() : '—',  unit: 'PAYS TOP 10',
        pct: pctPT10,    color: (paysTop10 || 0) >= 20 ? '#009739' : (paysTop10 || 0) >= 10 ? '#D4A017' : '#CE1126',
        delta: dltHtml(dPT10, false),
        src: 'FlixPatrol',  minL: '0', maxL: '50',
        tooltip: 'Nombre de pays avec Bandi dans le top 10 aujourd\'hui'
      }
    ];

    // ── SECTION 2 : Performance Netflix officielle (cumul Tudum) ─────────
    // Données fixes alimentées par BANDI.bandiPerformance — 100 % factuelles
    // (Tudum/whatsonnetflix.com), avec leur indice de fiabilité visible.
    const s2 = [];
    s2.push({
      id: 'htot',      label: 'Heures cumul Top 10',
      display: heuresCumul != null ? `${heuresCumul.toFixed(1).replace('.', ',')}M` : '—',  unit: 'HEURES VUES',
      pct: pctHcum,    color: gradColor(pctHcum),
      delta: '',
      src: 'Netflix Tudum · 3 sem.',  minL: '0', maxL: '100M',
      tooltip: 'Heures de visionnage cumulées sur les 3 semaines au Top 10 mondial Netflix (06/04 → 26/04). Source officielle Netflix Tudum.'
    });
    s2.push({
      id: 'vcumul',    label: 'Vues CVE cumul',
      display: vuesCumul != null ? `${vuesCumul.toFixed(1).replace('.', ',')}M` : '—',  unit: 'VUES ÉQUIVALENTES',
      pct: pctVuesCumul, color: gradColor(pctVuesCumul),
      delta: '',
      src: 'Netflix Tudum · 3 sem.',  minL: '0', maxL: '15M',
      tooltip: 'Cumul Vues CVE = Heures vues / Durée totale saison. Méthodologie officielle Netflix.'
    });
    s2.push({
      id: 'peak',      label: 'Pic Semaine 2',
      display: peakHeures != null ? `${peakHeures.toFixed(1).replace('.', ',')}M` : '—',  unit: 'HEURES · 13–19/04',
      pct: pctPeak,    color: gradColor(pctPeak),
      delta: '',
      src: 'Netflix Tudum',  minL: '0', maxL: '50M',
      tooltip: 'Meilleure semaine : 40,5 M heures vues, +150 % vs S1. Bandi #1 mondial non-anglophone.'
    });
    s2.push({
      id: 'semaines',  label: 'Semaines Top 10',
      display: semTop10 ? semTop10.toString() : '—',  unit: 'SEMAINES',
      pct: pctSem,     color: (semTop10 || 0) >= 6 ? '#009739' : (semTop10 || 0) >= 3 ? '#D4A017' : '#CE1126',
      delta: '',
      src: 'Netflix Tudum',  minL: '0', maxL: '12',
      tooltip: 'Semaines cumulées dans le classement officiel Netflix Top 10.'
    });

    // ── SECTION 3 : Engagement & Réception ────────────────────────────────
    // Remplace les anciennes jauges inactives (buzzScore, ratAvg, joursTop10)
    // par des données réellement alimentées via le prompt analytique 06/05.
    const s3 = [];
    s3.push({
      id: 'completion', label: 'Complétion estimée',
      display: completion != null ? `${completion}%` : '—',  unit: 'ESTIMATED',
      pct: pctComp,    color: gradColor(pctComp),
      delta: '',
      src: 'Modèle interne · 62/100',  minL: '0%', maxL: '100%',
      tooltip: 'Estimation : heures vues / durée totale + chute hebdo. Netflix ne publie pas le taux réel. Reliability 62/100.'
    });
    const pressN = recScores?.press?.count ?? null;
    const pressCounts = recScores?.press?.counts ?? null;
    const pressTooltip = pressCounts
      ? `Score presse calculé sur ${pressN} sources structurées (Le Monde, Le Parisien, Télérama, Les Inrocks, Première, 20 Minutes, Decider, What's on Netflix, K-waves, Wonder Channel, Mundo Deportivo, Gizmodo Español). ${pressCounts.positive} positifs / ${pressCounts.mixed} mitigés / ${pressCounts.negative} négatifs. Pondéré par fiabilité A/B/C.`
      : 'Score presse en attente de calcul.';
    s3.push({
      id: 'pressefav', label: 'Score presse',
      display: presseFav != null ? `${presseFav}/100` : '—',
      unit: pressN ? `${pressN} SOURCES` : 'PRESSE',
      pct: pctPresseFav, color: gradColor(pctPresseFav),
      delta: '',
      src: 'Agrégation pondérée',  minL: '0', maxL: '100',
      tooltip: pressTooltip
    });
    s3.push({
      id: 'iggain',    label: 'Followers Netflix FR',
      display: igGainK != null ? `+${igGainK}k` : '—',  unit: '@NETFLIXFR · 09/04→01/05',
      pct: pctIg,      color: gradColor(pctIg),
      delta: '',
      src: 'Mesure directe',  minL: '0', maxL: '+100k',
      tooltip: igGain != null
        ? `Gain mesuré sur le compte officiel @netflixfr pendant la fenêtre BANDI : +${igGain.toLocaleString('fr-FR')} followers. Attribution directe à BANDI non prouvable (Weak Signal 30/100).`
        : 'Gain Instagram Netflix France pendant la fenêtre BANDI.'
    });
    // Vues semaine (Tudum) si dispo, sinon Pays #1 historique (Tudum S2 = 13)
    if (vuesSem != null) {
      s3.push({
        id: 'vues',    label: 'Vues / Semaine',
        display: fmtHeures(vuesSem),  unit: 'M FOYERS',
        pct: pctVues,  color: gradColor(pctVues),
        delta: '',
        src: 'Netflix Tudum',  minL: '0', maxL: '20M',
        tooltip: 'Vues de la semaine en cours (Tudum)'
      });
    } else {
      // Pic pays #1 simultanément (cohérent avec le récit Netflix officiel)
      const peakN1 = (B.launchWeek2?.paysN1) || 13;
      s3.push({
        id: 'peakN1', label: 'Pic Pays #1',
        display: `${peakN1}`,  unit: 'PAYS SIMULTANÉS',
        pct: clamp(Math.round(peakN1 / 30 * 100), 0, 100),
        color: '#E4B84D',
        delta: '',
        src: 'Netflix Tudum · S2',  minL: '0', maxL: '30',
        tooltip: 'Pic atteint en semaine 2 : 13 pays où BANDI était simultanément #1 sur Netflix.'
      });
    }

    // ── Render HTML ───────────────────────────────────────────────────────
    const allGauges = [...s1, ...s2, ...s3];

    // Ligne de données textuelles — toujours visible, confirme l'arrivée des données
    const dataLine = rang || score ? `
      <div class="mg-dataline">
        <span>Rang&nbsp;<strong>#${rang || '—'}</strong></span>
        <span>Score&nbsp;<strong>${score || '—'}&thinsp;pts</strong></span>
        <span>#1&nbsp;<strong>${paysN1 ?? '—'}&thinsp;pays</strong></span>
        <span>Top10&nbsp;<strong>${paysTop10 ?? '—'}&thinsp;pays</strong></span>
        ${semTop10 ? `<span>Tudum&nbsp;<strong>${semTop10} sem.</strong></span>` : ''}
      </div>` : '';

    container.innerHTML = `
      <div class="mg-topbar">
        <span class="mg-topbar-title">Performance en temps réel</span>
        <span class="mg-topbar-sub">↻ mise à jour automatique · 6h</span>
      </div>
      ${dataLine}
      ${section('Classement FlixPatrol (live)', s1)}
      ${section('Performance Netflix officielle (cumul Tudum)', s2)}
      ${section('Engagement &amp; Réception', s3)}
      <div class="mg-sep"></div>
    `;

    // ── Lancer les animations après le prochain paint ─────────────────────
    requestAnimationFrame(() => {
      allGauges.forEach(g => {
        const arc  = document.getElementById(`arc-${g.id}`);
        const glow = document.getElementById(`glow-${g.id}`);
        if (arc) animArc(arc, glow, g.pct);
      });
    });

    } catch (err) {
      // Crash visible dans le DOM — ne reste jamais silencieux
      console.error('[BANDI_MONITORING] renderMonitoringTab crash →', err);
      container.innerHTML = `<div style="padding:16px;color:#CE1126;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid #CE112633;border-radius:8px">⚠️ Erreur rendu jauges : ${err.message}</div>`;
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  window.BANDI_MONITORING = {
    renderMonitoringTab,
    initMonitoringTab: renderMonitoringTab   // alias de compatibilité
  };

})();
