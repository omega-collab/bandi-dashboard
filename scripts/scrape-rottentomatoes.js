/**
 * Scraper Rotten Tomatoes — Tomatometer (presse) + Audience score
 * Source : https://www.rottentomatoes.com/tv/bandi
 * Cibles : table external_ratings
 *   - source = 'rt_critics'   (tomatometer presse /100)
 *   - source = 'rt_audience'  (audience score public /100)
 *
 * Stratégie :
 * - RT utilise Next.js → bloc <script id="__NEXT_DATA__">
 * - Fallback : balises <score-board> avec attributs tomatometerscore / audiencescore
 * - Fallback ultime : regex sur le HTML
 *
 * Usage : node scripts/scrape-rottentomatoes.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const RT_SLUG = process.env.RT_TV_SLUG || 'bandi';
const RT_URL = `https://www.rottentomatoes.com/tv/${RT_SLUG}`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8',
  'Cache-Control': 'no-cache'
};

async function fetchHtml(url) {
  console.log(`📡 GET ${url}`);
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return await res.text();
}

// Extrait via l'attribut HTML <score-board tomatometerscore="85" audiencescore="92" ...>
function extractScoreBoard(html) {
  const sb = html.match(/<score-board[^>]*>/i);
  if (!sb) return null;
  const tag = sb[0];
  const tom = tag.match(/tomatometerscore="(\d+)"/);
  const aud = tag.match(/audiencescore="(\d+)"/);
  const tomState = tag.match(/tomatometerstate="([^"]+)"/);
  const audState = tag.match(/audiencestate="([^"]+)"/);
  const res = {};
  if (tom) res.critics = { rating: Number(tom[1]), state: tomState?.[1] || null };
  if (aud) res.audience = { rating: Number(aud[1]), state: audState?.[1] || null };
  return Object.keys(res).length ? res : null;
}

// Extrait depuis __NEXT_DATA__
function extractFromNextData(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    // Parcours récursif cherche "tomatometerScore" et "audienceScore"
    const out = {};
    function walk(o, depth = 0) {
      if (!o || typeof o !== 'object' || depth > 10) return;
      if (o.tomatometerScore && typeof o.tomatometerScore === 'object') {
        const v = Number(o.tomatometerScore.score ?? o.tomatometerScore.value);
        if (isFinite(v) && v > 0) out.critics = { rating: v, reviewCount: Number(o.tomatometerScore.reviewCount) || null };
      }
      if (o.audienceScore && typeof o.audienceScore === 'object') {
        const v = Number(o.audienceScore.score ?? o.audienceScore.value);
        if (isFinite(v) && v > 0) out.audience = { rating: v, reviewCount: Number(o.audienceScore.reviewCount) || null };
      }
      for (const k of Object.keys(o)) {
        if (o[k] && typeof o[k] === 'object') walk(o[k], depth + 1);
      }
    }
    walk(data);
    return Object.keys(out).length ? out : null;
  } catch (e) {
    return null;
  }
}

function extractRegex(html) {
  const out = {};
  const tm = html.match(/"tomatometerScore"[^}]*?"score"\s*:\s*(\d+)/i);
  if (tm) out.critics = { rating: Number(tm[1]) };
  const au = html.match(/"audienceScore"[^}]*?"score"\s*:\s*(\d+)/i);
  if (au) out.audience = { rating: Number(au[1]) };
  return Object.keys(out).length ? out : null;
}

async function upsertRt(source, data) {
  const today = new Date().toISOString().slice(0, 10);
  const row = {
    date: today,
    source,
    rating: data?.rating ?? null,
    rating_max: 100,
    rating_norm: data?.rating != null ? Math.round((data.rating / 10) * 100) / 100 : null,
    votes: null,
    reviews_count: data?.reviewCount ?? null,
    url: RT_URL,
    raw: { state: data?.state || null, fetched_at: new Date().toISOString() }
  };
  const { error } = await supabase.from('external_ratings').upsert(row, { onConflict: 'date,source' });
  if (error) throw error;
}

async function main() {
  console.log('🎬 Rotten Tomatoes scraper · ' + new Date().toISOString());

  let html;
  try {
    html = await fetchHtml(RT_URL);
  } catch (err) {
    console.error('❌ Fetch RT KO :', err.message);
    // Tentative Canada (certains titres non US y sont référencés)
    try {
      const altUrl = `https://www.rottentomatoes.com/tv/${RT_SLUG}/s01`;
      console.log(`   → retry ${altUrl}`);
      html = await fetchHtml(altUrl);
    } catch (_) {
      process.exit(1);
    }
  }

  // 1) score-board (le plus simple et stable quand dispo)
  let data = extractScoreBoard(html);
  // 2) __NEXT_DATA__
  if (!data) data = extractFromNextData(html);
  // 3) regex
  if (!data) data = extractRegex(html);

  const today = new Date().toISOString().slice(0, 10);

  if (!data) {
    console.warn('⚠️  Aucun score RT trouvé — page probablement en "Coming soon".');
    // Trace un "no_rating_yet" quand même
    await supabase.from('external_ratings').upsert(
      {
        date: today,
        source: 'rt_critics',
        rating: null,
        rating_max: 100,
        rating_norm: null,
        votes: null,
        reviews_count: null,
        url: RT_URL,
        raw: { status: 'no_rating_yet', fetched_at: new Date().toISOString() }
      },
      { onConflict: 'date,source' }
    );
    return;
  }

  if (data.critics) {
    console.log(`   → Critics (tomatometer) : ${data.critics.rating}%`);
    await upsertRt('rt_critics', data.critics);
  }
  if (data.audience) {
    console.log(`   → Audience             : ${data.audience.rating}%`);
    await upsertRt('rt_audience', data.audience);
  }

  console.log('✅ Rotten Tomatoes scraping OK');
}

main().catch(err => {
  console.error('❌ RT scraper crash :', err);
  process.exit(1);
});
