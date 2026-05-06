/**
 * Scraper SensCritique — Note communauté francophone
 * Source : https://www.senscritique.com/serie/bandi/133850632
 * Cible  : table external_ratings (source = 'senscritique')
 *
 * Stratégie :
 * - SensCritique = site Next.js → bloc <script id="__NEXT_DATA__"> contient tout
 * - On parse ce JSON et on cherche les champs rating + stats
 * - Fallback : regex sur le HTML pour chercher "averageRating"
 *
 * Usage : node scripts/scrape-senscritique.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SC_ID = process.env.SENSCRITIQUE_ID || '133850632';
const SC_SLUG = process.env.SENSCRITIQUE_SLUG || 'bandi';
const SC_URL = `https://www.senscritique.com/serie/${SC_SLUG}/${SC_ID}`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

import { fetchHtml, closePlaywright } from './_fetch-html.js';

// Parcourt récursivement un objet JS à la recherche d'une paire rating+count
function findRatingInObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null;
  // Heuristique : on cherche un objet qui contient "average" + "count"
  const avg = obj.average ?? obj.averageRating ?? obj.rating ?? obj.note;
  const count = obj.count ?? obj.ratingCount ?? obj.totalRatings ?? obj.votes;
  if (avg != null && count != null && typeof avg === 'number' && typeof count === 'number' && avg > 0 && avg <= 10) {
    return { rating: avg, votes: count };
  }
  // Chercher "stats" contenant ces champs
  if (obj.stats && typeof obj.stats === 'object') {
    const r = findRatingInObject(obj.stats, depth + 1);
    if (r) return r;
  }
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v && typeof v === 'object') {
      const r = findRatingInObject(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function extractFromNextData(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return findRatingInObject(data);
  } catch (e) {
    console.warn('   __NEXT_DATA__ parse KO :', e.message);
    return null;
  }
}

function extractFromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const obj = JSON.parse(m[1]);
      const candidates = Array.isArray(obj) ? obj : [obj];
      for (const c of candidates) {
        if (c && c.aggregateRating && typeof c.aggregateRating.ratingValue !== 'undefined') {
          const ag = c.aggregateRating;
          return {
            rating: Number(ag.ratingValue),
            votes: ag.ratingCount != null ? Number(ag.ratingCount) : null,
            bestRating: ag.bestRating != null ? Number(ag.bestRating) : 10
          };
        }
      }
    } catch (_) { /* bloc JSON invalide */ }
  }
  return null;
}

function extractFromRegex(html) {
  // Pattern simple : "rating":X.X avec 1 chiffre avant la virgule (0-10)
  const m = html.match(/"average(?:Rating)?"\s*:\s*([\d.]+)[^}]{0,200}?"count"\s*:\s*(\d+)/);
  if (m) return { rating: Number(m[1]), votes: Number(m[2]) };
  return null;
}

async function main() {
  console.log('🎬 SensCritique scraper · ' + new Date().toISOString());

  let html;
  try {
    html = await fetchHtml(SC_URL);
  } catch (err) {
    console.error('❌ Fetch SensCritique KO :', err.message);
    process.exit(1);
  }

  // 1) __NEXT_DATA__ (le plus fiable)
  let data = extractFromNextData(html);
  // 2) JSON-LD schema.org
  if (!data) data = extractFromJsonLd(html);
  // 3) regex brutale
  if (!data) data = extractFromRegex(html);

  const today = new Date().toISOString().slice(0, 10);

  if (!data || !isFinite(data.rating) || data.rating <= 0) {
    console.warn('⚠️  Aucune note SensCritique trouvée — probablement trop récent.');
    await supabase.from('external_ratings').upsert(
      {
        date: today,
        source: 'senscritique',
        rating: null,
        rating_max: 10,
        rating_norm: null,
        votes: null,
        reviews_count: null,
        url: SC_URL,
        raw: { status: 'no_rating_yet', fetched_at: new Date().toISOString() }
      },
      { onConflict: 'date,source' }
    );
    return;
  }

  const bestRating = data.bestRating || 10;
  const ratingNorm = (data.rating * 10) / bestRating;

  console.log(`   → ${data.rating}/${bestRating} · ${data.votes ?? '?'} notes`);

  const { error } = await supabase.from('external_ratings').upsert(
    {
      date: today,
      source: 'senscritique',
      rating: data.rating,
      rating_max: bestRating,
      rating_norm: Math.round(ratingNorm * 100) / 100,
      votes: data.votes,
      reviews_count: null,
      url: SC_URL,
      raw: { fetched_at: new Date().toISOString() }
    },
    { onConflict: 'date,source' }
  );

  if (error) {
    console.error('❌ Supabase upsert KO :', error.message);
    process.exit(1);
  }
  console.log('✅ SensCritique scraping OK');
}

main()
  .then(closePlaywright)
  .catch(async err => { console.error('❌ SensCritique scraper crash :', err); await closePlaywright(); process.exit(1); });
