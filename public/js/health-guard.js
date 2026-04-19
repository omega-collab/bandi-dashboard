(function () {
  'use strict';
  // ─────────────────────────────────────────────────────────────────────────
  //  BANDI · HEALTH GUARD
  //  Scanner live du dashboard + auto-correction + alertes visuelles.
  //
  //  Couvre les points de l'audit technique :
  //    C1  Fallback silencieux snapshot statique → alerte "DATA STALE"
  //    C2  Authenticité hard-codée → flag "à vérifier"
  //    C3  USA rang hard-codé → resync depuis BANDI.pays (live)
  //    I6  Completion Score sources manquantes → comptage affiché
  //    I7  Forecast heuristique → disclaimer visuel
  //    +   Cohérence hero rank ↔ rivals top ↔ badge sources
  //    +   Cohérence paysN1 ↔ count(pays rang==1)
  //    +   Fraîcheur données (date snapshot vs today)
  //    +   Détection Supabase KO silencieux
  //
  //  Points d'entrée :
  //    BANDI_HEALTH.scan()            → scan one-shot, retourne { issues, healed }
  //    BANDI_HEALTH.start(intervalMs) → scan périodique + rendu panneau
  //    BANDI_HEALTH.render()          → force le rendu du panneau
  // ─────────────────────────────────────────────────────────────────────────

  const SEVERITY = { critical: 3, important: 2, minor: 1, ok: 0 };
  const DEFAULT_INTERVAL_MS = 30 * 1000;

  // Âge maximum toléré sur le snapshot (cron scraper = 2h, on accepte 4h de marge)
  const MAX_SNAPSHOT_AGE_MS = 4 * 60 * 60 * 1000;

  // Fenêtre de diagnostic
  const state = {
    intervalId: null,
    lastScan:  null,
    issues:    [],     // résultats du dernier scan
    healed:    [],     // corrections appliquées
    open:      false,  // panneau déplié ?
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function ageMs(iso) {
    if (!iso) return Infinity;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return Infinity;
    return Date.now() - d.getTime();
  }

  function issue(severity, code, message, detail, healed = false) {
    return { severity, code, message, detail: detail || '', healed, ts: Date.now() };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CHECKS (un par règle)
  // ─────────────────────────────────────────────────────────────────────────

  function checkSupabaseConfig() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || cfg.url.includes('PLACEHOLDER')) {
      return issue('critical', 'SUPABASE_CFG',
        'Supabase non configuré — fallback statique',
        'SUPABASE_CONFIG absent ou placeholder');
    }
    return null;
  }

  function checkFallbackActive() {
    const B = window.BANDI;
    if (!B || !B.current) {
      return issue('critical', 'BANDI_EMPTY', 'BANDI.current absent');
    }
    // Flag _fallback remis à false par loadLiveData() dès qu'un snapshot
    // Supabase est reçu (M1 audit).
    if (B._fallback === true) {
      return issue('critical', 'FALLBACK_ACTIVE',
        'Données affichées = fallback statique',
        'loadLiveData() n\'a pas abouti — Supabase KO ou tables vides');
    }
    return null;
  }

  function checkDataFreshness() {
    const cur = window.BANDI?.current;
    if (!cur?.date) return null;
    const age = ageMs(cur.date);
    if (age > MAX_SNAPSHOT_AGE_MS) {
      const hours = Math.floor(age / 3600000);
      return issue(hours > 12 ? 'critical' : 'important', 'STALE_SNAPSHOT',
        `Snapshot ${hours}h old — scraper en retard`,
        `Dernière date en DB : ${cur.date}`);
    }
    return null;
  }

  // Hero rank doit correspondre à la position de Bandi dans rivals
  function checkHeroRivalsCoherence() {
    const rang = window.BANDI?.current?.rang;
    const rivals = window.BANDI?.rivals || [];
    if (!rang || !rivals.length) return null;
    const bIdx = rivals.findIndex(r => r.isBandi);
    if (bIdx === -1) return null;
    const rivalsRang = rivals[bIdx].rang ?? (bIdx + 1);
    if (rivalsRang !== rang) {
      return issue('important', 'HERO_RIVALS_MISMATCH',
        `Hero #${rang} ≠ position Bandi rivals (#${rivalsRang})`,
        'Source divergente entre netflix_tv_top10_world et top10Data');
    }
    return null;
  }

  // paysN1 (KPI) doit correspondre au count(pays.rang === 1)
  function checkPaysN1Coherence(autoHeal) {
    const cur = window.BANDI?.current;
    const pays = window.BANDI?.pays || [];
    if (!cur || !pays.length) return null;
    const real = pays.filter(p => p.rang === 1).length;
    if (cur.paysN1 != null && cur.paysN1 !== real) {
      const msg = `KPI paysN1 (${cur.paysN1}) ≠ count(rang==1) (${real})`;
      if (autoHeal) {
        cur.paysN1 = real;
        state.healed.push(issue('important', 'PAYS_N1_MISMATCH', msg, 'Resynchronisé', true));
        return null;
      }
      return issue('important', 'PAYS_N1_MISMATCH', msg);
    }
    return null;
  }

  // paysTop10 doit correspondre au count total de pays présents
  function checkPaysTop10Coherence(autoHeal) {
    const cur = window.BANDI?.current;
    const pays = window.BANDI?.pays || [];
    if (!cur || !pays.length) return null;
    const real = pays.length;
    if (cur.paysTop10 != null && cur.paysTop10 !== real) {
      const msg = `KPI paysTop10 (${cur.paysTop10}) ≠ pays.length (${real})`;
      if (autoHeal) {
        cur.paysTop10 = real;
        state.healed.push(issue('minor', 'PAYS_TOP10_MISMATCH', msg, 'Resynchronisé', true));
        return null;
      }
      return issue('minor', 'PAYS_TOP10_MISMATCH', msg);
    }
    return null;
  }

  // USA — le rang affiché module Breakthrough doit correspondre à bandi_country_rankings
  function checkUsaRankCoherence(autoHeal) {
    const strat = window.BANDI?.strategique;
    const pays = window.BANDI?.pays || [];
    if (!strat) return null;
    const usa = pays.find(p => p.code === 'US' || p.paysEn === 'United States' || p.pays === 'États-Unis');
    if (usa && usa.rang && strat.usaRang !== usa.rang) {
      const msg = `USA module (#${strat.usaRang}) ≠ live bandi_country_rankings (#${usa.rang})`;
      if (autoHeal) {
        strat.usaRang = usa.rang;
        state.healed.push(issue('critical', 'USA_RANK_STALE', msg, 'Resynchronisé depuis DB', true));
        return null;
      }
      return issue('critical', 'USA_RANK_STALE', msg);
    }
    return null;
  }

  // Authenticité = valeur hard-codée, jamais sourcée → à flaguer
  function checkAuthenticiteFlag() {
    const auth = window.BANDI?.strategique?.authenticite;
    if (!auth) return null;
    if (!auth._verified) {
      return issue('important', 'AUTH_UNVERIFIED',
        `Authenticité ${auth.pctCasting}% — non vérifiée`,
        'Valeur hard-codée data-fallback.js, à confirmer par Maui Entertainment');
    }
    return null;
  }

  // Completion Score — nombre de sources manquantes
  function checkCompletionSources() {
    if (typeof window.computeCompletionScore !== 'function') return null;
    try {
      const c = window.computeCompletionScore();
      if (!c) return null;
      const missing = Array.isArray(c.signalsMissing) ? c.signalsMissing.length : 0;
      const total = (c.totalSources || 0);
      const active = (c.totalActiveSources || 0);
      if (missing >= 2 || (total > 0 && active / total < 0.5)) {
        return issue('important', 'COMPLETION_LOW_SOURCES',
          `Completion Score : ${active}/${total} sources actives`,
          missing ? `Manque : ${c.signalsMissing.join(', ')}` : '');
      }
    } catch (_) {}
    return null;
  }

  // Forecast — heuristique non validée → toujours présent comme "info"
  function checkForecastDisclaimer() {
    const fc = window.BANDI?.strategique?.forecastS2;
    if (!fc) return null;
    if (!fc._validated) {
      return issue('minor', 'FORECAST_HEURISTIC',
        `Forecast S2 ${fc.probabilite}% — modèle heuristique`,
        'Formule additive non calibrée sur historique — usage informatif uniquement');
    }
    return null;
  }

  // Monitoring — rang et score doivent correspondre au snapshot le plus récent
  function checkMonitoringRangScore(autoHeal) {
    const cur = window.BANDI?.current;
    const snap0 = (window.BANDI?.snapshots30 || [])[0];
    if (!cur || !snap0) return null;
    const missing = (cur.rang == null || cur.score == null);
    const hasSnap = (snap0.rang_monde != null || snap0.score_monde != null);
    if (missing && hasSnap) {
      const msg = `Monitoring: current.{rang,score} absent alors que snapshots30[0] existe`;
      if (autoHeal) {
        if (cur.rang == null  && snap0.rang_monde  != null) cur.rang  = snap0.rang_monde;
        if (cur.score == null && snap0.score_monde != null) cur.score = snap0.score_monde;
        if (cur.paysN1    == null && snap0.pays_n1    != null) cur.paysN1    = snap0.pays_n1;
        if (cur.paysTop10 == null && snap0.pays_top10 != null) cur.paysTop10 = snap0.pays_top10;
        state.healed.push(issue('important', 'MON_CURRENT_EMPTY', msg, 'Rechargé depuis snapshots30', true));
        return null;
      }
      return issue('important', 'MON_CURRENT_EMPTY', msg);
    }
    return null;
  }

  // Monitoring — si heures cumulées ou jours top10 peuvent être recalculés → heal
  function checkMonitoringAggregates(autoHeal) {
    const B = window.BANDI;
    if (!B) return null;
    let healedAnything = false;

    // heuresVuesCumul recalculable depuis tudumWeekly
    const weekly = Array.isArray(B.tudumWeekly) ? B.tudumWeekly : [];
    if (B.heuresVuesCumul == null && weekly.length) {
      const sum = weekly
        .filter(r => r?.titre && r.titre.toLowerCase().includes('bandi'))
        .reduce((s, r) => s + (parseFloat(r.heures_vues) || 0), 0);
      if (sum > 0) {
        if (autoHeal) {
          B.heuresVuesCumul = Math.round(sum * 100) / 100;
          healedAnything = true;
        }
      }
    }

    // semTop10 recalculable depuis tudumWeekly
    if (B.semTop10 == null && weekly.length) {
      const wks = new Set();
      weekly.forEach(r => {
        if (r?.titre && r.titre.toLowerCase().includes('bandi') && r.week_start) wks.add(r.week_start);
      });
      if (wks.size) {
        if (autoHeal) {
          B.semTop10 = wks.size;
          healedAnything = true;
        }
      }
    }

    if (healedAnything && autoHeal) {
      state.healed.push(issue('minor', 'MON_AGG_RECOMPUTED',
        'Agrégats monitoring recalculés (heures cumul / sem top10)',
        'Depuis tudumWeekly live', true));
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  AUTO-HEAL
  // ─────────────────────────────────────────────────────────────────────────

  function heal() {
    state.healed = [];
    // Ces checks embarquent l'auto-heal quand autoHeal=true
    checkPaysN1Coherence(true);
    checkPaysTop10Coherence(true);
    checkUsaRankCoherence(true);
    checkMonitoringRangScore(true);
    checkMonitoringAggregates(true);

    // Re-render des modules impactés après auto-heal
    if (state.healed.length && typeof window.BANDI_HEALTH_RERENDER === 'function') {
      try { window.BANDI_HEALTH_RERENDER(); } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SCAN — orchestration
  // ─────────────────────────────────────────────────────────────────────────

  function scan() {
    const results = [];
    const pushIfAny = r => { if (r) results.push(r); };

    // 1. Configuration / connectivité
    pushIfAny(checkSupabaseConfig());

    // 2. État des données
    pushIfAny(checkFallbackActive());
    pushIfAny(checkDataFreshness());

    // 3. Cohérence modules (avec auto-heal)
    heal(); // modifie BANDI en place + remplit state.healed
    pushIfAny(checkHeroRivalsCoherence());

    // 4. Qualité modules stratégiques
    pushIfAny(checkAuthenticiteFlag());
    pushIfAny(checkCompletionSources());
    pushIfAny(checkForecastDisclaimer());

    // Tri par sévérité décroissante
    results.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]);
    state.issues   = results;
    state.lastScan = Date.now();

    // Log console détaillé (les users peuvent l'ouvrir)
    if (results.length) {
      console.groupCollapsed(`[BANDI_HEALTH] ${results.length} issue(s) · ${state.healed.length} auto-corrigée(s)`);
      for (const r of results) {
        const icon = r.severity === 'critical' ? '🔴' : r.severity === 'important' ? '🟠' : '🟡';
        console.log(`${icon} [${r.code}] ${r.message}${r.detail ? ' — ' + r.detail : ''}`);
      }
      for (const h of state.healed) {
        console.log(`✅ [HEAL ${h.code}] ${h.message}`);
      }
      console.groupEnd();
    } else {
      console.log('[BANDI_HEALTH] ✓ aucun problème détecté');
    }

    render();
    return { issues: results, healed: state.healed };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER — indicateur + panneau
  // ─────────────────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('hg-css')) return;
    const el = document.createElement('style');
    el.id = 'hg-css';
    el.textContent = `
#hg-indicator {
  position: fixed; bottom: 16px; right: 16px;
  z-index: 9999;
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  background: rgba(15,15,15,0.85);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  backdrop-filter: blur(8px);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: #aaa;
  cursor: pointer; user-select: none;
  transition: transform .2s cubic-bezier(.34,1.56,.64,1), border-color .2s;
}
#hg-indicator:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.25); }
#hg-indicator .hg-dot {
  width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}
#hg-indicator[data-sev="ok"]        { color: #009739; }
#hg-indicator[data-sev="minor"]     { color: #D4A017; }
#hg-indicator[data-sev="important"] { color: #FF6B35; }
#hg-indicator[data-sev="critical"]  { color: #CE1126; animation: hgPulse 1.6s ease-in-out infinite; }
@keyframes hgPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(206,17,38,0.35); }
  50%     { box-shadow: 0 0 0 6px rgba(206,17,38,0); }
}
#hg-indicator .hg-count { color: #ccc; font-family: inherit; }

#hg-panel {
  position: fixed; bottom: 56px; right: 16px;
  z-index: 9998;
  width: 340px; max-width: calc(100vw - 24px);
  max-height: 70vh; overflow-y: auto;
  background: rgba(12,12,12,0.97);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  backdrop-filter: blur(14px);
  padding: 14px;
  font-family: 'JetBrains Mono', monospace;
  color: #ccc;
  display: none;
  animation: hgPanelIn .22s cubic-bezier(.4,0,.2,1);
}
#hg-panel.open { display: block; }
@keyframes hgPanelIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hg-title {
  font-size: 10px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: #888;
  margin-bottom: 8px; display: flex; justify-content: space-between;
}
.hg-title .hg-scan-ts { color: #555; font-weight: 400; }
.hg-item {
  border-left: 2px solid;
  padding: 8px 10px; margin-bottom: 6px;
  background: rgba(255,255,255,0.02);
  border-radius: 0 6px 6px 0;
  font-size: 11px; line-height: 1.45;
}
.hg-item[data-sev="critical"]  { border-color: #CE1126; }
.hg-item[data-sev="important"] { border-color: #FF6B35; }
.hg-item[data-sev="minor"]     { border-color: #D4A017; }
.hg-item[data-sev="healed"]    { border-color: #009739; opacity: 0.75; }
.hg-item-head {
  display: flex; justify-content: space-between; gap: 8px;
  font-weight: 700; color: #ddd; margin-bottom: 2px;
}
.hg-item-code { color: #666; font-size: 9px; letter-spacing: .1em; }
.hg-item-detail { color: #888; font-size: 10px; margin-top: 2px; }
.hg-empty { padding: 14px 10px; text-align: center; color: #555; font-size: 11px; }
.hg-foot {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; font-size: 9px; color: #555;
}
.hg-foot button {
  background: transparent; border: 1px solid rgba(255,255,255,0.15);
  color: #888; font-family: inherit; font-size: 9px;
  letter-spacing: .1em; text-transform: uppercase;
  padding: 4px 8px; border-radius: 4px; cursor: pointer;
  transition: all .15s;
}
.hg-foot button:hover { color: #ddd; border-color: rgba(255,255,255,0.3); }

/* Bannière "data stale" insérée dans #index.html au-dessus du hero */
.hg-stale-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; margin: 0 0 12px;
  background: linear-gradient(90deg, rgba(206,17,38,0.18), rgba(206,17,38,0.06));
  border: 1px solid rgba(206,17,38,0.45);
  border-left: 3px solid #CE1126;
  border-radius: 6px;
  color: #f1c7cc; font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: .04em;
  animation: hgPanelIn .3s ease;
}
.hg-stale-banner strong { color: #ff6b7a; }
.hg-stale-banner .hg-stale-icon { font-size: 14px; }
.hg-stale-banner[hidden] { display: none; }
`;
    document.head.appendChild(el);
  }

  function ensureDOM() {
    injectCSS();
    let ind = document.getElementById('hg-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'hg-indicator';
      ind.setAttribute('role', 'button');
      ind.setAttribute('aria-label', 'Bandi Health Guard — état système');
      ind.innerHTML = `<span class="hg-dot" style="background:currentColor"></span><span class="hg-label">SYS</span><span class="hg-count"></span>`;
      ind.addEventListener('click', toggle);
      document.body.appendChild(ind);
    }
    let panel = document.getElementById('hg-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'hg-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Health Guard — détails');
      document.body.appendChild(panel);
    }
    return { ind, panel };
  }

  function severityTop() {
    if (!state.issues.length) return 'ok';
    return state.issues[0].severity;
  }

  function render() {
    const { ind, panel } = ensureDOM();
    const sev = severityTop();
    ind.dataset.sev = sev;
    const n = state.issues.length;
    const healedN = state.healed.length;
    const countEl = ind.querySelector('.hg-count');
    if (countEl) {
      countEl.textContent = n ? `${n}` : '✓';
    }
    ind.querySelector('.hg-label').textContent = sev === 'ok' ? 'OK' : sev.toUpperCase();

    // Panneau
    const ts = state.lastScan ? new Date(state.lastScan).toLocaleTimeString('fr-FR') : '—';
    const body = [];

    if (!n && !healedN) {
      body.push('<div class="hg-empty">✓ Tous les contrôles passent</div>');
    } else {
      for (const r of state.issues) {
        body.push(`<div class="hg-item" data-sev="${r.severity}">
          <div class="hg-item-head"><span>${r.message}</span><span class="hg-item-code">${r.code}</span></div>
          ${r.detail ? `<div class="hg-item-detail">${r.detail}</div>` : ''}
        </div>`);
      }
      for (const h of state.healed) {
        body.push(`<div class="hg-item" data-sev="healed">
          <div class="hg-item-head"><span>✓ ${h.message}</span><span class="hg-item-code">${h.code}</span></div>
          <div class="hg-item-detail">Auto-corrigé · ${h.detail}</div>
        </div>`);
      }
    }

    panel.innerHTML = `
      <div class="hg-title"><span>Health Guard</span><span class="hg-scan-ts">${ts}</span></div>
      ${body.join('')}
      <div class="hg-foot">
        <span>${n} issue(s) · ${healedN} auto-heal</span>
        <button type="button" id="hg-rescan">Rescan</button>
      </div>`;
    const btn = panel.querySelector('#hg-rescan');
    if (btn) btn.addEventListener('click', () => scan());

    // Bannière "data stale" dans le hero (si elle existe dans le DOM)
    const banner = document.getElementById('hgStaleBanner');
    if (banner) {
      const stale = state.issues.find(r => r.code === 'FALLBACK_ACTIVE' || r.code === 'STALE_SNAPSHOT' || r.code === 'SUPABASE_CFG');
      if (stale) {
        banner.hidden = false;
        const detail = document.getElementById('hgStaleDetail');
        if (detail) {
          detail.textContent = stale.detail || stale.message;
        }
      } else {
        banner.hidden = true;
      }
    }
  }

  function toggle() {
    state.open = !state.open;
    const panel = document.getElementById('hg-panel');
    if (panel) panel.classList.toggle('open', state.open);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  function start(intervalMs = DEFAULT_INTERVAL_MS) {
    stop();
    scan();
    state.intervalId = setInterval(scan, intervalMs);
  }
  function stop() {
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
  }

  window.BANDI_HEALTH = {
    scan, start, stop, render,
    get issues() { return state.issues.slice(); },
    get healed() { return state.healed.slice(); }
  };

  // Auto-démarrage : premier scan 5s après DOMContentLoaded pour laisser loadLiveData()
  // (async, multiples fetch Supabase) se terminer avant que le scan évalue l'état.
  // Un scan trop précoce déclencherait BANDI_EMPTY ou FALLBACK_ACTIVE à tort.
  const FIRST_SCAN_DELAY_MS = 5000;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => start(), FIRST_SCAN_DELAY_MS));
  } else {
    setTimeout(() => start(), FIRST_SCAN_DELAY_MS);
  }

})();
