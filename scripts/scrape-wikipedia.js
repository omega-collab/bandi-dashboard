/**
 * Scraper Wikipedia pageviews — Signal d'intérêt encyclopédique
 * Source : API officielle Wikimedia (gratuite, sans clé)
 *   https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{project}/all-access/all-agents/{article}/daily/{start}/{end}
 *
 * Cible  : table wikipedia_pageviews
 *   - project = 'fr.wikipedia'
 *   - article = 'Bandi_(2026)' (nom d'article avec underscores, URL-safe)
 *
 * Stratégie :
 * - On fetch les 7 derniers jours (1 call par projet)
 * - On upsert une ligne par jour
 * - Articles multi-projets : FR + EN par défaut, on peut en ajouter facilement
 *
 * Usage : node scripts/scrape-wikipedia.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Liste des articles à suivre (project + titre normalisé)
const ARTICLES = [
  { project: 'fr.wikipedia', article: 'Bandi_(série_télévisée)' },
  { project: 'fr.wikipedia', article: 'Bandi_(2026)' },
  { project: 'en.wikipedia', article: 'Bandi_(TV_series)' }
];

const HEADERS = {
  'User-Agent': 'bandi-dashboard/1.0 (contact: allan@bandi-dashboard)',
  'Accept': 'application/json'
};

function fmtDate(d) {
  // API exige YYYYMMDD
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchPageviews(project, article) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmtDate(start)}/${fmtDate(end)}`;
  console.log(`📡 GET ${project}/${article}`);

  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) {
    console.log(`   ℹ️  Article absent sur ${project}`);
    return [];
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}

async function main() {
  console.log('🎬 Wikipedia pageviews scraper · ' + new Date().toISOString());

  const rows = [];

  for (const { project, article } of ARTICLES) {
    try {
      const items = await fetchPageviews(project, article);
      for (const it of items) {
        // it.timestamp format : "2026041500" → "2026-04-15"
        const ts = it.timestamp;
        if (!ts || ts.length < 8) continue;
        const date = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
        rows.push({
          date,
          project,
          article,
          views: Number(it.views) || 0
        });
      }
    } catch (err) {
      console.warn(`   ⚠️  ${project}/${article} KO :`, err.message);
    }
  }

  if (rows.length === 0) {
    console.warn('⚠️  Aucune donnée Wikipedia récupérée (article peut-être encore absent).');
    return;
  }

  console.log(`   → ${rows.length} lignes à upsert`);
  const { error } = await supabase
    .from('wikipedia_pageviews')
    .upsert(rows, { onConflict: 'date,project,article' });

  if (error) {
    console.error('❌ Supabase upsert KO :', error.message);
    process.exit(1);
  }

  // Résumé : total 7j par article
  const summary = {};
  rows.forEach(r => {
    const key = `${r.project}/${r.article}`;
    summary[key] = (summary[key] || 0) + r.views;
  });
  Object.entries(summary).forEach(([k, v]) => console.log(`   · ${k} : ${v.toLocaleString('fr-FR')} vues 7j`));

  console.log('✅ Wikipedia pageviews OK');
}

main().catch(err => {
  console.error('❌ Wikipedia scraper crash :', err);
  process.exit(1);
});
