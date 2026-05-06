/**
 * Scraper Allociné — Note publique + note presse
 * Source : https://www.allocine.fr/series/ficheserie_gen_cserie=1000000157.html
 * Cibles : table external_ratings
 *   - source = 'allocine_public' (note spectateurs /5)
 *   - source = 'allocine_press'  (note presse /5, si dispo)
 *
 * Stratégie :
 * - Cheerio pour parser le HTML Allociné
 * - Les notes sont dans des blocs .stareval avec attribut style ou data-stars
 * - Le nombre de notants est dans un span adjacent
 *
 * Usage : node scripts/scrape-allocine.js
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const ALLOCINE_ID = process.env.ALLOCINE_SERIE_ID || '1000000157';
const ALLOCINE_URL = `https://www.allocine.fr/series/ficheserie_gen_cserie=${ALLOCINE_ID}.html`;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

import { fetchHtml, closePlaywright } from './_fetch-html.js';

/** Convertit une string FR "3,9" ou "3.9" en Number */
function parseFr(n) {
  if (n == null) return null;
  const s = String(n).replace(',', '.').replace(/[^\d.]/g, '');
  const v = Number(s);
  return isFinite(v) ? v : null;
}

/**
 * Allociné : bloc de notation .rating-item / .stareval-note
 *   <div class="rating-item">
 *     <span class="stareval-note">3,9</span>
 *     <div class="rating-item-content">
 *       <span class="rating-title">Spectateurs</span>
 *       <span class="stareval-review">99 notes</span>
 *     </div>
 *   </div>
 *
 * On cherche deux groupes : "Spectateurs" et "Presse".
 */
function extractAllocineRatings(html) {
  const $ = cheerio.load(html);
  const results = { public: null, press: null };

  // Pattern principal : .rating-item (layout 2024-2026)
  $('.rating-item').each((_, el) => {
    const note = parseFr($(el).find('.stareval-note').first().text().trim());
    const titleTxt = ($(el).find('.rating-title').first().text() || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const reviewTxt = $(el).find('.stareval-review').first().text().trim();
    const reviewNum = parseFr((reviewTxt.match(/\d[\d\s]*/)?.[0] || '').replace(/\s/g, ''));

    if (note == null) return;

    if (/spectateur|public/.test(titleTxt)) {
      results.public = { rating: note, votes: reviewNum, reviews_count: null };
    } else if (/presse|critique/.test(titleTxt)) {
      results.press = { rating: note, votes: null, reviews_count: reviewNum };
    }
  });

  // Fallback : anciens layouts .js-rating-avg avec data-attrs
  if (!results.public) {
    const avg = $('[data-stars-avg]').first().attr('data-stars-avg');
    if (avg) results.public = { rating: parseFr(avg), votes: null, reviews_count: null };
  }

  // Fallback ultime : chercher pattern "3,9" suivi de "Spectateurs" dans le texte brut
  if (!results.public) {
    const m = html.match(/([0-4],\d)\s*[\s\S]{0,80}Spectateurs/);
    if (m) results.public = { rating: parseFr(m[1]), votes: null, reviews_count: null };
  }
  if (!results.press) {
    const m = html.match(/([0-4],\d)\s*[\s\S]{0,80}Presse/);
    if (m) results.press = { rating: parseFr(m[1]), votes: null, reviews_count: null };
  }

  return results;
}

// ─── Upsert ─────────────────────────────────────────────────────────────────
async function upsertRating(source, data, extra = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const ratingMax = 5;
  const ratingNorm = data && data.rating != null ? (data.rating * 10) / ratingMax : null;

  const row = {
    date: today,
    source,
    rating: data?.rating ?? null,
    rating_max: ratingMax,
    rating_norm: ratingNorm != null ? Math.round(ratingNorm * 100) / 100 : null,
    votes: data?.votes ?? null,
    reviews_count: data?.reviews_count ?? null,
    url: ALLOCINE_URL,
    raw: { ...extra, fetched_at: new Date().toISOString() }
  };

  const { error } = await supabase
    .from('external_ratings')
    .upsert(row, { onConflict: 'date,source' });
  if (error) throw error;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎬 Allociné scraper · ' + new Date().toISOString());

  let html;
  try {
    html = await fetchHtml(ALLOCINE_URL);
  } catch (err) {
    console.error('❌ Fetch Allociné KO :', err.message);
    process.exit(1);
  }

  const ratings = extractAllocineRatings(html);
  console.log('   → Spectateurs :', ratings.public);
  console.log('   → Presse     :', ratings.press);

  try {
    if (ratings.public) {
      await upsertRating('allocine_public', ratings.public);
    } else {
      await upsertRating('allocine_public', null, { status: 'no_rating_yet' });
    }
    if (ratings.press) {
      await upsertRating('allocine_press', ratings.press);
    }
    console.log('✅ Allociné scraping OK');
  } catch (err) {
    console.error('❌ Supabase upsert KO :', err.message);
    process.exit(1);
  }
}

main()
  .then(closePlaywright)
  .catch(async err => { console.error('❌ Allociné scraper crash :', err); await closePlaywright(); process.exit(1); });
