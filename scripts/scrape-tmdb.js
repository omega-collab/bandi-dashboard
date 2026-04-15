/**
 * Scraper TMDB — Note communauté + popularité + votes
 * Source  : https://api.themoviedb.org/3/tv/{id} (API officielle gratuite)
 * Page    : https://www.themoviedb.org/tv/269161-bandi
 * Cibles  : table external_ratings (source = 'tmdb')
 *
 * Stratégie :
 * - API REST officielle gratuite — pas de HTML parsing, très stable
 * - Clé API v3 lue depuis env TMDB_API_KEY (gratuite, à créer sur
 *   https://www.themoviedb.org/settings/api)
 * - Récupère vote_average /10, vote_count et popularity
 *
 * Usage : TMDB_API_KEY=xxx node scripts/scrape-tmdb.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TMDB_ID = process.env.TMDB_TV_ID || '269161';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_URL = `https://api.themoviedb.org/3/tv/${TMDB_ID}?language=fr-FR`;
const PUBLIC_URL = `https://www.themoviedb.org/tv/${TMDB_ID}`;

if (!TMDB_KEY) {
  console.warn('⚠️  TMDB_API_KEY absente — le scraper TMDB est skippé.');
  console.warn('   Crée une clé gratuite sur https://www.themoviedb.org/settings/api');
  console.warn('   puis ajoute-la en secret GitHub: gh secret set TMDB_API_KEY');
  process.exit(0);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('🎬 TMDB scraper · ' + new Date().toISOString());
  console.log(`   tv id : ${TMDB_ID}`);

  let data;
  try {
    const res = await fetch(TMDB_URL, {
      headers: {
        'Authorization': `Bearer ${TMDB_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      // Fallback : certains comptes utilisent api_key en query
      const res2 = await fetch(`${TMDB_URL}&api_key=${TMDB_KEY}`);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      data = await res2.json();
    } else {
      data = await res.json();
    }
  } catch (err) {
    console.error('❌ Fetch TMDB KO :', err.message);
    process.exit(1);
  }

  const rating = Number(data.vote_average);
  const votes = Number(data.vote_count) || 0;
  const popularity = Number(data.popularity) || 0;

  if (!isFinite(rating) || rating === 0) {
    console.warn('⚠️  TMDB : pas encore de note (vote_average = 0).');
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('external_ratings').upsert(
      {
        date: today,
        source: 'tmdb',
        rating: null,
        rating_max: 10,
        rating_norm: null,
        votes,
        reviews_count: null,
        url: PUBLIC_URL,
        raw: {
          status: 'no_rating_yet',
          popularity,
          first_air_date: data.first_air_date,
          name: data.name,
          fetched_at: new Date().toISOString()
        }
      },
      { onConflict: 'date,source' }
    );
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const ratingNorm = rating; // TMDB est déjà sur /10

  console.log(`   → ${rating}/10 · ${votes} votes · popularité ${popularity.toFixed(1)}`);

  const { error } = await supabase.from('external_ratings').upsert(
    {
      date: today,
      source: 'tmdb',
      rating,
      rating_max: 10,
      rating_norm: Math.round(ratingNorm * 100) / 100,
      votes,
      reviews_count: null,
      url: PUBLIC_URL,
      raw: {
        popularity,
        first_air_date: data.first_air_date,
        original_name: data.original_name,
        name: data.name,
        number_of_episodes: data.number_of_episodes,
        number_of_seasons: data.number_of_seasons,
        fetched_at: new Date().toISOString()
      }
    },
    { onConflict: 'date,source' }
  );

  if (error) {
    console.error('❌ Supabase upsert KO :', error.message);
    process.exit(1);
  }

  console.log('✅ TMDB scraping OK');
}

main().catch(err => {
  console.error('❌ TMDB scraper crash :', err);
  process.exit(1);
});
