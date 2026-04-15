/**
 * Scraper IMDb — Note publique + nombre de votes
 * Source : https://www.imdb.com/title/tt37024175/
 * Cible  : table external_ratings (source = 'imdb')
 *
 * Stratégie : IMDb expose les ratings dans un bloc <script type="application/ld+json">
 * (JSON-LD, schema.org/TVSeries → aggregateRating). Pas de Cheerio nécessaire,
 * simple regex sur le HTML est plus robuste et moins dépendant de la structure DOM.
 *
 * Usage : node scripts/scrape-imdb.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const IMDB_ID = process.env.IMDB_TITLE_ID || 'tt37024175';
const IMDB_URL = `https://www.imdb.com/title/${IMDB_ID}/`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache'
};

// ─── Fetch + parse ────────────────────────────────────────────────────────────
async function fetchHtml(url) {
  console.log(`📡 GET ${url}`);
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return await res.text();
}

/**
 * Cherche le bloc JSON-LD principal d'une page IMDb et extrait aggregateRating.
 * IMDb colle parfois plusieurs blocs JSON-LD — on itère jusqu'à trouver celui
 * qui contient aggregateRating.
 */
function extractAggregateRating(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const obj = JSON.parse(m[1]);
      // Peut être un objet unique ou un tableau
      const candidates = Array.isArray(obj) ? obj : [obj];
      for (const c of candidates) {
        if (c && c.aggregateRating && typeof c.aggregateRating.ratingValue !== 'undefined') {
          const ag = c.aggregateRating;
          return {
            rating: Number(ag.ratingValue),
            votes: ag.ratingCount != null ? Number(ag.ratingCount) : null,
            bestRating: ag.bestRating != null ? Number(ag.bestRating) : 10,
            worstRating: ag.worstRating != null ? Number(ag.worstRating) : 1,
            name: c.name || null,
            type: c['@type'] || null
          };
        }
      }
    } catch (_) { /* bloc JSON invalide, on continue */ }
  }
  return null;
}

/**
 * Fallback : parse la meta-tag "imdb:rating" ou la balise data-testid.
 * IMDb change régulièrement son DOM — ceci n'est qu'une ceinture de sécurité.
 */
function extractFallbackFromMeta(html) {
  // Pattern 1 : "ratingCount":12345,"ratingValue":7.8
  const m1 = html.match(/"ratingValue"\s*:\s*([\d.]+)[^}]*?"ratingCount"\s*:\s*(\d+)/);
  if (m1) return { rating: Number(m1[1]), votes: Number(m1[2]) };
  // Pattern 2 : "ratingCount":12345,"ratingValue":7.8 (ordre inverse)
  const m2 = html.match(/"ratingCount"\s*:\s*(\d+)[^}]*?"ratingValue"\s*:\s*([\d.]+)/);
  if (m2) return { rating: Number(m2[2]), votes: Number(m2[1]) };
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎬 IMDb scraper · ' + new Date().toISOString());
  console.log(`   titre IMDb : ${IMDB_ID}`);

  let html;
  try {
    html = await fetchHtml(IMDB_URL);
  } catch (err) {
    console.error('❌ Fetch IMDb KO :', err.message);
    process.exit(1);
  }

  let agg = extractAggregateRating(html);
  if (!agg) {
    console.warn('⚠️  Pas de bloc JSON-LD aggregateRating, tentative fallback meta…');
    const fb = extractFallbackFromMeta(html);
    if (fb) agg = { rating: fb.rating, votes: fb.votes, bestRating: 10, worstRating: 1, name: null, type: null };
  }

  if (!agg || !isFinite(agg.rating)) {
    console.warn('⚠️  Aucune note trouvée sur la page IMDb — série probablement trop récente ou 0 vote.');
    console.warn('   On insère quand même une ligne "en attente" pour tracer le run.');
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('external_ratings').upsert(
      {
        date: today,
        source: 'imdb',
        rating: null,
        rating_max: 10,
        rating_norm: null,
        votes: null,
        reviews_count: null,
        url: IMDB_URL,
        raw: { status: 'no_rating_yet', fetched_at: new Date().toISOString() }
      },
      { onConflict: 'date,source' }
    );
    console.log('ℹ️  Ligne "no_rating_yet" insérée.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const ratingNorm = agg.bestRating > 0 ? (agg.rating * 10) / agg.bestRating : agg.rating;

  console.log(`   → ${agg.rating}/${agg.bestRating} · ${agg.votes ?? '?'} votes`);

  const { error } = await supabase.from('external_ratings').upsert(
    {
      date: today,
      source: 'imdb',
      rating: agg.rating,
      rating_max: agg.bestRating,
      rating_norm: Math.round(ratingNorm * 100) / 100,
      votes: agg.votes,
      reviews_count: null,
      url: IMDB_URL,
      raw: {
        name: agg.name,
        type: agg.type,
        fetched_at: new Date().toISOString()
      }
    },
    { onConflict: 'date,source' }
  );

  if (error) {
    console.error('❌ Supabase upsert KO :', error.message);
    process.exit(1);
  }

  console.log('✅ IMDb scraping OK');
}

main().catch(err => {
  console.error('❌ IMDb scraper crash :', err);
  process.exit(1);
});
