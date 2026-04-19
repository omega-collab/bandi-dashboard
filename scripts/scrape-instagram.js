/**
 * scrape-instagram.js
 *
 * Scrape Instagram posts (hashtags + profils clés) et les insère dans
 * buzz_social (platform = "instagram").
 *
 * Stratégie en cascade :
 *   1) Apify (acteurs Instagram Hashtag/Profile Scraper) si APIFY_API_TOKEN défini
 *   2) RSSHub instances publiques (gratuit, best-effort) sinon
 *
 * FILTRAGE ULTRA-STRICT :
 *   - hashtag #bandi seul = rejeté (trop générique)
 *   - Signaux négatifs explicites (bandi = appel d'offres IT/ES, contexte indien…)
 *   - Doit satisfaire ≥ 1 signal fort OU (mot "bandi" + contexte série/Martinique)
 *   - Engagement minimum (sauf comptes whitelistés)
 * PURGE au démarrage : supprime de la DB les posts IG qui ne passent plus le filtre.
 */

import Parser from 'rss-parser';

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APIFY_API_TOKEN     = process.env.APIFY_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[instagram] SUPABASE_URL / SUPABASE_SERVICE_KEY manquants');
  process.exit(0);
}

const HASHTAGS = [
  'bandinetflix', 'bandiserie', 'seriebandi', 'bandimartinique',
  'bandinetflixserie', 'bandilaseries', 'bandilaserie',
  'bandisaison1', 'bandis1', 'bandiep1',
  'netflixmartinique', 'martiniquenetflix', 'seriemartinique',
  'mauientertainment',
];

const USERS = [
  'yoottle', 'netflixfr', 'netflixfrance', 'netflix',
  'mauientertainment',
];

const RESULTS_PER_TAG  = 60;
const RESULTS_PER_USER = 40;
const MIN_ENGAGEMENT   = 3;

const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rss.shab.it',
  'https://rsshub.rssforever.com',
];

// ─── Filtre de pertinence ultra-strict ───────────────────────────────────────
function isRelevantBandi(caption = '', author = '') {
  const text = (caption + ' ' + author).toLowerCase();

  // ── Signaux négatifs — à éliminer avant tout ──────────────────────────────
  // "bandi" en italien = appel d'offres / subvention / décret
  // "bandi" en hindi/ourdou = contexte religieux indien
  const NEGATIVE_SIGNALS = [
    'decreto fiscale', 'decreto legge', 'gazzetta ufficiale',
    'bandi dedicati', 'bandi di gara', 'bandi europei', 'bandi regionali',
    'bandi comunali', 'comuni piemontesi', 'bando pubblico',
    'intervento sr', 'smart village', 'alto monferrato',
    'darul uloom', 'nooria', 'dinajpur', 'dastaar', 'aslam warsi',
    'madrasa', 'masjid',
    'euroservis', 'team_euroservis',
  ];
  if (NEGATIVE_SIGNALS.some(s => text.includes(s))) return false;

  // ── Signaux forts — suffisants seuls ──────────────────────────────────────
  const STRONG_SIGNALS = [
    'bandinetflix', 'bandi netflix', 'bandi serie', 'bandi série',
    '#bandiserie', 'bandiserie', '#seriebandi', 'seriebandi',
    '#bandimartinique', 'bandimartinique', '#bandinetflixserie',
    '#bandilaserie', 'bandilaserie',
    'netflix martinique', 'serie martinique', 'série martinique',
    'martinique netflix', 'première série martiniquaise',
    'première série martiniquaise netflix',
    'maui entertainment', 'bandi saison', 'bandi s1', 'bandi s2',
    'bandi ep', 'episode bandi', 'épisode bandi', 'regarder bandi',
    // Équipe création / réalisation
    'jimmy laporal-trésor', 'jimmy laporal', 'mathilde vallet',
    'éric rochant', 'eric rochant', 'capucine rochant',
    // Casting principal (source data-fallback.js)
    'rudgy pajany', 'jonathan zaccaï', 'jonathan zaccai',
    'rémy laquittant', 'remy laquittant', 'djody grimeau',
    'william paul-joseph', 'evan lienafa', 'ambre bozza',
    'souane rosamont', 'steeven mornet', 'lucas pernock',
    'rodney dijon', 'patrick trieste', 'cédric camille', 'cedric camille',
  ];
  if (STRONG_SIGNALS.some(s => text.includes(s))) return true;

  // ── "bandi" + contexte série/Martinique — pertinent ──────────────────────
  if (!/\bbandi\b/.test(text)) return false;

  const CONTEXT_KEYWORDS = [
    'netflix', 'série', 'serie', 'saison', 'episode', 'épisode',
    'martinique', 'martiniquais', 'martiniquaise',
    'antilles', 'antillais', 'caribéen', 'caribbean', 'caraïbe',
    'streaming', 'casting', 'tournage', 'diffusion', 'maui',
    'scénariste', 'réalisateur', 'réalisatrice', 'acteur', 'actrice',
    'créole', 'creole', 'fort-de-france', 'foyal',
  ];
  return CONTEXT_KEYWORDS.some(k => text.includes(k));
}

// ─── Helpers Supabase ─────────────────────────────────────────────────────────
const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function upsertSocial(rows) {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/buzz_social?on_conflict=platform,post_id`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.warn(`[instagram] upsert KO (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return 0;
  }
  return (await res.json()).length;
}

// ─── Purge des posts stale en DB ─────────────────────────────────────────────
// Récupère tous les posts instagram de buzz_social, applique le filtre strict,
// et supprime ceux qui ne passent plus (hors-sujet, ou anciens non filtrés).
async function cleanupStaleInstagram() {
  console.log('[instagram] ── Purge posts stale ──────────────────────────────');
  try {
    // Fetch all IG posts (pagination PostgREST : limite 1000)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/buzz_social?platform=eq.instagram&select=post_id,content,author_name&limit=1000`,
      { headers: SB_HEADERS }
    );
    if (!res.ok) { console.warn('[instagram] purge fetch KO'); return 0; }
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      console.log('[instagram] Aucun post instagram en DB → purge inutile');
      return 0;
    }

    const staleIds = posts
      .filter(p => !isRelevantBandi(p.content || '', p.author_name || ''))
      .map(p => p.post_id);

    if (!staleIds.length) {
      console.log(`[instagram] ${posts.length} posts vérifiés — aucun stale`);
      return 0;
    }

    console.log(`[instagram] ${staleIds.length}/${posts.length} posts hors-sujet → suppression`);

    // DELETE par batch de 50 (éviter URL trop longue)
    let deleted = 0;
    const BATCH = 50;
    for (let i = 0; i < staleIds.length; i += BATCH) {
      const ids = staleIds.slice(i, i + BATCH).map(id => `"${id}"`).join(',');
      const del = await fetch(
        `${SUPABASE_URL}/rest/v1/buzz_social?platform=eq.instagram&post_id=in.(${ids})`,
        { method: 'DELETE', headers: { ...SB_HEADERS, Prefer: 'return=minimal' } }
      );
      if (del.ok) deleted += staleIds.slice(i, i + BATCH).length;
      else console.warn(`[instagram] delete batch KO (${del.status}): ${(await del.text()).slice(0, 200)}`);
    }
    console.log(`[instagram] ✓ ${deleted} posts stale supprimés`);
    return deleted;
  } catch (e) {
    console.warn('[instagram] purge erreur (non bloquante):', e.message);
    return 0;
  }
}

function toRow({ shortcode, caption, owner, ts, likes, comments, thumb }) {
  if (!shortcode) return null;
  return {
    platform: 'instagram',
    post_id: shortcode,
    content: (caption || '').slice(0, 280),
    url: `https://www.instagram.com/p/${shortcode}/`,
    author_name: owner || null,
    published_at: ts ? new Date(ts).toISOString() : null,
    engagement_score: (Number.isFinite(likes) ? likes : 0) + (Number.isFinite(comments) ? comments : 0),
    thumbnail_url: thumb || null,
  };
}

// ─── Stratégie 1 : Apify ──────────────────────────────────────────────────────
async function runApifyActor(actorId, input) {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}&timeout=180`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function scrapeViaApify() {
  console.log('[instagram] → Apify');
  const rows = [];

  try {
    const items = await runApifyActor('apify~instagram-hashtag-scraper', {
      hashtags: HASHTAGS, resultsLimit: RESULTS_PER_TAG,
    });
    console.log(`[instagram]   hashtags bruts → ${items.length} posts`);
    for (const it of items) {
      const row = toRow({ shortcode: it.shortCode || it.shortcode, caption: it.caption,
        owner: it.ownerUsername || it.ownerFullName, ts: it.timestamp,
        likes: it.likesCount, comments: it.commentsCount, thumb: it.displayUrl });
      if (row) rows.push(row);
    }
  } catch (e) { console.warn('[instagram]   hashtags KO:', e.message); }

  try {
    const items = await runApifyActor('apify~instagram-profile-scraper', {
      usernames: USERS, resultsLimit: RESULTS_PER_USER,
    });
    console.log(`[instagram]   profils bruts → ${items.length} posts`);
    for (const it of items) {
      const posts = Array.isArray(it.latestPosts) ? it.latestPosts : [it];
      for (const p of posts) {
        const row = toRow({ shortcode: p.shortCode || p.shortcode, caption: p.caption,
          owner: p.ownerUsername || it.username, ts: p.timestamp,
          likes: p.likesCount, comments: p.commentsCount, thumb: p.displayUrl });
        if (row) rows.push(row);
      }
    }
  } catch (e) { console.warn('[instagram]   profils KO:', e.message); }

  return filterAndDedupe(rows);
}

// ─── Stratégie 2 : RSSHub ─────────────────────────────────────────────────────
async function scrapeViaRsshub() {
  console.log('[instagram] → RSSHub (fallback)');
  const parser = new Parser({ timeout: 15000 });
  const rows   = [];
  const targets = [
    ...HASHTAGS.map(t => `/instagram/tag/${t}`),
    ...USERS.map(u => `/instagram/user/${u}`),
  ];

  for (const path of targets) {
    let ok = false;
    for (const base of RSSHUB_INSTANCES) {
      try {
        const feed = await parser.parseURL(`${base}${path}`);
        for (const it of feed.items || []) {
          const m = (it.link || '').match(/\/p\/([A-Za-z0-9_-]+)/);
          if (!m) continue;
          const row = toRow({
            shortcode: m[1], caption: it.contentSnippet || it.title,
            owner: (feed.title || '').replace(/^Instagram - /, ''),
            ts: it.isoDate || it.pubDate, likes: 0, comments: 0,
            thumb: (it.enclosure && it.enclosure.url) || null,
          });
          if (row) rows.push(row);
        }
        ok = true;
        break;
      } catch (_) {}
    }
    if (!ok) console.warn(`[instagram]   RSSHub ${path} → toutes instances KO`);
  }
  return filterAndDedupe(rows);
}

// ─── Filtre + déduplication ───────────────────────────────────────────────────
function filterAndDedupe(rows) {
  const before = rows.length;
  const WHITELIST = new Set([
    'yoottle', 'netflixfr', 'netflixfrance', 'netflix', 'mauientertainment',
  ]);
  const filtered = rows.filter(r => {
    if (!isRelevantBandi(r.content || '', r.author_name || '')) return false;
    if (WHITELIST.has((r.author_name || '').toLowerCase())) return true;
    if (r.engagement_score < MIN_ENGAGEMENT) return false;
    return true;
  });
  console.log(`[instagram]   filtre pertinence : ${before} → ${filtered.length} posts retenus`);
  const map = new Map();
  for (const r of filtered) if (r.post_id && !map.has(r.post_id)) map.set(r.post_id, r);
  return [...map.values()];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // Purge d'abord les posts stale en DB
    await cleanupStaleInstagram();

    let rows = [];
    if (APIFY_API_TOKEN) {
      rows = await scrapeViaApify();
      if (!rows.length) {
        console.log('[instagram] Apify → 0 résultat après filtre, fallback RSSHub');
        rows = await scrapeViaRsshub();
      }
    } else {
      console.log('[instagram] APIFY_API_TOKEN absent — fallback RSSHub');
      rows = await scrapeViaRsshub();
    }

    if (!rows.length) {
      console.log('[instagram] Aucun post retenu — exit 0 (non bloquant)');
      return;
    }

    const inserted = await upsertSocial(rows);
    console.log(`[instagram] ✓ ${inserted}/${rows.length} posts upsertés`);
  } catch (e) {
    console.error('[instagram] erreur non bloquante:', e.message);
    process.exit(0);
  }
})();
