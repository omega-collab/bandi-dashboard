/**
 * seed-instagram-manual.js
 *
 * Insère manuellement dans buzz_social les posts Instagram que Allan a
 * remontés depuis ses captures (vague mai 2026 que le scraper Apify n'a
 * pas captée). Idempotent via post_id stable.
 *
 * Lance via :
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/seed-instagram-manual.js
 *
 * Pour ajouter un nouveau post manuellement : éditer MANUAL_POSTS ci-dessous
 * et relancer (ou push pour trigger bootstrap-scrapers.yml).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[seed-ig] SUPABASE_URL / SUPABASE_SERVICE_KEY manquants');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Liste des posts manuels (vague mai 2026) ────────────────────────────────
// Source : captures Allan 07/05/2026.
// Les engagement_score / comment_count sont les valeurs visibles sur les
// captures (likes affichés). Les URLs pointent vers le profil auteur (les
// permaliens directs n'étaient pas dispos sur les captures).
const MANUAL_POSTS = [
  {
    platform: 'instagram',
    post_id: 'manual_temalguemassistindo_2026-05-06',
    url: 'https://www.instagram.com/temalguemassistindo/',
    author_name: 'temalguemassistindo',
    content: 'Bandi, em alta na Netflix, é uma série que acompanha uma história marcada por família. Série sobre dez irmãos que precisam sobreviver ao tráfico é a mais assistida da Netflix atualmente.',
    engagement_score: 109000,
    comment_count: 1659,
    thumbnail_url: null,
    subreddit: null,
    published_at: '2026-05-06T10:00:00Z'
  },
  {
    platform: 'instagram',
    post_id: 'manual_billboardfr_evilp_2026-05-06',
    url: 'https://www.instagram.com/billboardfr/',
    author_name: 'billboardfr × evilp.darkside',
    content: 'Les streams d\'Evil P multipliés par 4 grâce à la série « Bandi ». Effet streaming après l\'apparition du rappeur dans la production Netflix.',
    engagement_score: 10200,
    comment_count: 178,
    thumbnail_url: null,
    subreddit: null,
    published_at: '2026-05-06T11:00:00Z'
  },
  {
    platform: 'instagram',
    post_id: 'manual_sneakerslanders_2026-05-06',
    url: 'https://www.instagram.com/sneakerslanders/',
    author_name: 'sneakerslanders',
    content: 'Quelques détails sur la Air Force 1 custom pour @evilp.darkside aka Sherkhan dans la série Bandi.',
    engagement_score: 65,
    comment_count: 3,
    thumbnail_url: null,
    subreddit: null,
    published_at: '2026-05-06T12:00:00Z'
  },
  {
    platform: 'instagram',
    post_id: 'manual_booska_p_evilp_2026-05-06',
    url: 'https://www.instagram.com/booska_p/',
    author_name: 'booska_p × evilp.darkside',
    content: '🔥 🇲🇶 La série Netflix "Bandi", très attendue. C\'est le plus grand projet cinéma — interview exclusive Booska-P × Evil P.',
    engagement_score: 89200,
    comment_count: 1141,
    thumbnail_url: null,
    subreddit: null,
    published_at: '2026-05-06T13:00:00Z'
  },
  {
    platform: 'instagram',
    post_id: 'manual_le_enz_mwb_2026-05-06',
    url: 'https://www.instagram.com/le_enz.mwb/',
    author_name: 'le_enz.mwb',
    content: 'Doublure cascadeur dans la série Bandi 🎬 🎞 @netflixfr — coulisses tournage Martinique.',
    engagement_score: 6013,
    comment_count: 65,
    thumbnail_url: null,
    subreddit: null,
    published_at: '2026-05-06T14:00:00Z'
  }
];

async function main() {
  console.log(`[seed-ig] Upsert ${MANUAL_POSTS.length} posts Instagram manuels…`);
  const rows = MANUAL_POSTS.map(p => ({
    ...p,
    fetched_at: new Date().toISOString()
  }));
  const { data, error } = await supabase
    .from('buzz_social')
    .upsert(rows, { onConflict: 'platform,post_id' })
    .select('post_id');
  if (error) {
    console.error('[seed-ig] erreur upsert:', error.message);
    process.exit(0);
  }
  console.log(`[seed-ig] ✓ ${data?.length || 0} posts upsertés (${MANUAL_POSTS.map(p => p.author_name).join(', ')})`);
}

main().catch(e => {
  console.error('[seed-ig] erreur non bloquante:', e.message);
  process.exit(0);
});
