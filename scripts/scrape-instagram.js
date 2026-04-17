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
 * Sans APIFY_API_TOKEN et sans RSSHub accessible, le script exit 0 proprement
 * avec un message — ne casse jamais le workflow.
 *
 * Mapping buzz_social (colonnes réelles Supabase) :
 *   platform        = 'instagram'
 *   post_id         = shortcode Instagram (unique avec platform)
 *   content         = caption tronquée (280)
 *   url             = https://www.instagram.com/p/{shortcode}/
 *   author_name     = ownerUsername
 *   published_at    = ISO8601
 *   engagement_score = likesCount + commentsCount
 *   thumbnail_url   = displayUrl
 */

import Parser from 'rss-parser';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[instagram] SUPABASE_URL / SUPABASE_SERVICE_KEY manquants');
  process.exit(0);
}

// Cibles : hashtags + comptes à surveiller
const HASHTAGS = ['bandi', 'bandinetflix', 'bandiserie', 'seriebandi', 'bandimartinique'];
const USERS    = ['yoottle', 'netflixfr', 'netflix'];

const RESULTS_PER_TAG  = 40;
const RESULTS_PER_USER = 20;

// Instances RSSHub publiques (fallback)
const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rss.shab.it',
  'https://rsshub.rssforever.com',
];

// ─── Helpers Supabase ─────────────────────────────────────────────────────────
async function upsertSocial(rows) {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/buzz_social?on_conflict=platform,post_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`[instagram] upsert KO (${res.status}): ${txt.slice(0, 300)}`);
    return 0;
  }
  const data = await res.json();
  return data.length;
}

function toRow({ shortcode, caption, owner, ts, likes, comments, thumb }) {
  if (!shortcode) return null;
  const likesNum = Number.isFinite(likes) ? likes : 0;
  const commentsNum = Number.isFinite(comments) ? comments : 0;
  return {
    platform: 'instagram',
    post_id: shortcode,
    content: (caption || '').slice(0, 280),
    url: `https://www.instagram.com/p/${shortcode}/`,
    author_name: owner || null,
    published_at: ts ? new Date(ts).toISOString() : null,
    engagement_score: likesNum + commentsNum,
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Apify ${actorId} ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function scrapeViaApify() {
  console.log('[instagram] → Apify');
  const rows = [];

  // Hashtag scraper (acteur public "apify/instagram-hashtag-scraper")
  try {
    const items = await runApifyActor('apify~instagram-hashtag-scraper', {
      hashtags: HASHTAGS,
      resultsLimit: RESULTS_PER_TAG,
    });
    console.log(`[instagram]   hashtags → ${items.length} posts`);
    for (const it of items) {
      const row = toRow({
        shortcode: it.shortCode || it.shortcode,
        caption: it.caption,
        owner: it.ownerUsername || it.ownerFullName,
        ts: it.timestamp,
        likes: it.likesCount,
        comments: it.commentsCount,
        thumb: it.displayUrl,
      });
      if (row) rows.push(row);
    }
  } catch (e) {
    console.warn('[instagram]   hashtags KO:', e.message);
  }

  // Profile scraper (acteur public "apify/instagram-profile-scraper")
  try {
    const items = await runApifyActor('apify~instagram-profile-scraper', {
      usernames: USERS,
      resultsLimit: RESULTS_PER_USER,
    });
    console.log(`[instagram]   profils → ${items.length} posts`);
    for (const it of items) {
      // format varie légèrement selon l'acteur
      const posts = Array.isArray(it.latestPosts) ? it.latestPosts : [it];
      for (const p of posts) {
        const row = toRow({
          shortcode: p.shortCode || p.shortcode,
          caption: p.caption,
          owner: p.ownerUsername || it.username,
          ts: p.timestamp,
          likes: p.likesCount,
          comments: p.commentsCount,
          thumb: p.displayUrl,
        });
        if (row) rows.push(row);
      }
    }
  } catch (e) {
    console.warn('[instagram]   profils KO:', e.message);
  }

  // Filtre mention "bandi" dans le caption pour les profils génériques
  const filtered = rows.filter(r =>
    /bandi/i.test(r.content || '') || /bandi/i.test(r.author_name || '')
  );
  return dedupe(filtered);
}

// ─── Stratégie 2 : RSSHub (fallback gratuit, best-effort) ─────────────────────
async function scrapeViaRsshub() {
  console.log('[instagram] → RSSHub (fallback)');
  const parser = new Parser({ timeout: 15000 });
  const rows = [];
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
            shortcode: m[1],
            caption: it.contentSnippet || it.title,
            owner: (feed.title || '').replace(/^Instagram - /, ''),
            ts: it.isoDate || it.pubDate,
            likes: 0, comments: 0,
            thumb: (it.enclosure && it.enclosure.url) || null,
          });
          if (row) rows.push(row);
        }
        ok = true;
        break; // instance fonctionne, on passe à la cible suivante
      } catch (e) {
        // instance HS, on essaie la suivante
      }
    }
    if (!ok) console.warn(`[instagram]   RSSHub ${path} → toutes instances KO`);
  }
  // Filtre mention bandi
  const filtered = rows.filter(r => /bandi/i.test(r.content || '') || /bandi/i.test(r.author_name || ''));
  return dedupe(filtered);
}

function dedupe(rows) {
  const map = new Map();
  for (const r of rows) if (r.post_id && !map.has(r.post_id)) map.set(r.post_id, r);
  return [...map.values()];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    let rows = [];
    if (APIFY_API_TOKEN) {
      rows = await scrapeViaApify();
      if (!rows.length) {
        console.log('[instagram] Apify → 0 résultat, fallback RSSHub');
        rows = await scrapeViaRsshub();
      }
    } else {
      console.log('[instagram] APIFY_API_TOKEN absent — fallback RSSHub direct');
      rows = await scrapeViaRsshub();
    }

    if (!rows.length) {
      console.log('[instagram] Aucun post récupéré — exit 0 (non bloquant)');
      return;
    }

    const inserted = await upsertSocial(rows);
    console.log(`[instagram] ✓ ${inserted}/${rows.length} posts upsertés`);
  } catch (e) {
    console.error('[instagram] erreur non bloquante:', e.message);
    process.exit(0);
  }
})();
