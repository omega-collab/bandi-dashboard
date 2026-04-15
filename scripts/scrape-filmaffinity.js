/**
 * Scraper Filmaffinity — Note communauté hispanophone
 * Source : https://m.filmaffinity.com/us/film923114.html
 * Cible  : table external_ratings (source = 'filmaffinity')
 *
 * Stratégie :
 * - Filmaffinity utilise schema.org JSON-LD (AggregateRating) — cible principale
 * - Fallback : <div id="movie-rat-avg" itemprop="ratingValue">X,X</div>
 * - Note /10
 *
 * Note : la version mobile (m.filmaffinity.com) est plus stable et rarement modifiée.
 *
 * Usage : node scripts/scrape-filmaffinity.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const FA_ID = process.env.FILMAFFINITY_ID || '923114';
const FA_URL = `https://m.filmaffinity.com/us/film${FA_ID}.html`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache'
};

async function fetchHtml(url) {
  console.log(`📡 GET ${url}`);
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return await res.text();
}

function parseLocaleNumber(s) {
  if (!s) return null;
  const n = Number(String(s).replace(',', '.').replace(/[^\d.]/g, ''));
  return isFinite(n) ? n : null;
}

function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const obj = JSON.parse(m[1]);
      const list = Array.isArray(obj) ? obj : [obj];
      for (const c of list) {
        if (c?.aggregateRating?.ratingValue != null) {
          return {
            rating: Number(c.aggregateRating.ratingValue),
            votes: c.aggregateRating.ratingCount != null ? Number(c.aggregateRating.ratingCount) : null,
            bestRating: c.aggregateRating.bestRating != null ? Number(c.aggregateRating.bestRating) : 10
          };
        }
      }
    } catch (_) { /* bloc invalide */ }
  }
  return null;
}

function extractFallback(html) {
  // Balise <div id="movie-rat-avg" itemprop="ratingValue">7,3</div>
  const m1 = html.match(/id="movie-rat-avg"[^>]*>([^<]+)</);
  if (m1) {
    const r = parseLocaleNumber(m1[1]);
    if (r) {
      // Chercher le nombre de votes associé
      const m2 = html.match(/ratingCount"?\s*[>:]\s*"?(\d+)/);
      return { rating: r, votes: m2 ? Number(m2[1]) : null, bestRating: 10 };
    }
  }
  return null;
}

async function main() {
  console.log('🎬 Filmaffinity scraper · ' + new Date().toISOString());
  console.log(`   film id : ${FA_ID}`);

  let html;
  try {
    html = await fetchHtml(FA_URL);
  } catch (err) {
    console.error('❌ Fetch Filmaffinity KO :', err.message);
    process.exit(1);
  }

  let data = extractJsonLd(html) || extractFallback(html);
  const today = new Date().toISOString().slice(0, 10);

  if (!data || !isFinite(data.rating) || data.rating <= 0) {
    console.warn('⚠️  Aucune note Filmaffinity trouvée — probablement trop récent.');
    await supabase.from('external_ratings').upsert(
      {
        date: today,
        source: 'filmaffinity',
        rating: null,
        rating_max: 10,
        rating_norm: null,
        votes: null,
        reviews_count: null,
        url: FA_URL,
        raw: { status: 'no_rating_yet', fetched_at: new Date().toISOString() }
      },
      { onConflict: 'date,source' }
    );
    return;
  }

  const bestRating = data.bestRating || 10;
  const ratingNorm = (data.rating * 10) / bestRating;

  console.log(`   → ${data.rating}/${bestRating} · ${data.votes ?? '?'} votes`);

  const { error } = await supabase.from('external_ratings').upsert(
    {
      date: today,
      source: 'filmaffinity',
      rating: data.rating,
      rating_max: bestRating,
      rating_norm: Math.round(ratingNorm * 100) / 100,
      votes: data.votes,
      reviews_count: null,
      url: FA_URL,
      raw: { fetched_at: new Date().toISOString() }
    },
    { onConflict: 'date,source' }
  );

  if (error) {
    console.error('❌ Supabase upsert KO :', error.message);
    process.exit(1);
  }

  console.log('✅ Filmaffinity scraping OK');
}

main().catch(err => {
  console.error('❌ Filmaffinity scraper crash :', err);
  process.exit(1);
});
