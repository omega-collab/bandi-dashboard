/**
 * Scraper social Bandi — Phase 4
 * Sources : Reddit (public) + YouTube (clé optionnelle) + Bluesky (public) + Google Trends
 * Usage   : node scripts/scrape-social.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const UA = 'bandi-dashboard/1.0 by omega-collab';

function truncate(str, n = 600) {
  if (!str) return null;
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(typeof str === 'number' ? str * 1000 : str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── 1. Reddit ────────────────────────────────────────────────────────────────
const REDDIT_SEARCHES = [
  'https://www.reddit.com/search.json?q=Bandi+Netflix&sort=new&limit=100',
  'https://www.reddit.com/r/netflix/search.json?q=Bandi&sort=new&restrict_sr=1&limit=50',
  'https://www.reddit.com/r/television/search.json?q=Bandi+Netflix&sort=new&restrict_sr=1&limit=50',
  'https://www.reddit.com/r/martinique/search.json?q=Bandi&sort=new&restrict_sr=1&limit=50',
  'https://www.reddit.com/r/france/search.json?q=Bandi+Netflix&sort=new&restrict_sr=1&limit=50',
];

async function fetchReddit() {
  const posts = [];
  for (const url of REDDIT_SEARCHES) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = data?.data?.children || [];
      console.log(`  Reddit ${new URL(url).pathname}: ${items.length} posts`);
      for (const { data: p } of items) {
        if (!p.id) continue;
        posts.push({
          platform: 'reddit',
          post_id: p.id,
          url: `https://reddit.com${p.permalink}`,
          author_name: p.author || '[deleted]',
          content: truncate(p.title + (p.selftext ? '\n' + p.selftext : '')),
          engagement_score: p.score || 0,
          published_at: parseDate(p.created_utc),
          thumbnail_url: p.thumbnail?.startsWith('http') ? p.thumbnail : null,
        });
      }
    } catch (err) {
      console.warn(`  ⚠️ Reddit ${url.slice(0, 60)}... échoué : ${err.message}`);
    }
  }
  return posts;
}

// ─── 2. YouTube ───────────────────────────────────────────────────────────────
// Stratégie : API officielle si YOUTUBE_API_KEY présent, sinon fallback Invidious
// (API publique open-source — aucune clé nécessaire).

const INVIDIOUS_INSTANCES = [
  'https://invidious.io',
  'https://y.com.sb',
  'https://iv.datura.network',
  'https://invidious.nerdvpn.de',
];
const YT_QUERIES = ['Bandi Netflix', 'Bandi série Netflix', 'Bandi serie Netflix'];

async function fetchYouTubeAPI(key) {
  const posts = [];
  for (const q of YT_QUERIES) {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=date&maxResults=50&key=${key}`;
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      const items = data.items || [];
      console.log(`  YouTube API "${q}": ${items.length} vidéos`);

      const ids = items.map(i => i.id.videoId).filter(Boolean).join(',');
      let statsMap = {};
      if (ids) {
        try {
          const sr = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${key}`, { signal: AbortSignal.timeout(10000) });
          const sd = await sr.json();
          (sd.items || []).forEach(v => { statsMap[v.id] = v.statistics; });
        } catch { /* stats optionnelles */ }
      }

      for (const item of items) {
        const vid = item.id.videoId;
        if (!vid) continue;
        const stats = statsMap[vid] || {};
        posts.push({
          platform: 'youtube', post_id: vid,
          url: `https://www.youtube.com/watch?v=${vid}`,
          author_name: item.snippet?.channelTitle || null,
          content: truncate(item.snippet?.title + (item.snippet?.description ? '\n' + item.snippet.description : '')),
          engagement_score: parseInt(stats.viewCount || 0),
          published_at: parseDate(item.snippet?.publishedAt),
          thumbnail_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
        });
      }
    } catch (err) { console.warn(`  ⚠️ YouTube API "${q}" : ${err.message}`); }
  }
  return posts;
}

async function fetchYouTubeInvidious() {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent('Bandi Netflix')}&type=video&sort_by=upload_date&page=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) continue;
      console.log(`  YouTube (Invidious ${base}): ${items.length} vidéos`);
      return items.slice(0, 30).map(v => ({
        platform: 'youtube', post_id: v.videoId,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        author_name: v.author || null,
        content: truncate((v.title || '') + (v.description ? '\n' + v.description : '')),
        engagement_score: v.viewCount || 0,
        published_at: parseDate(v.published ? v.published * 1000 : null),
        thumbnail_url: v.videoThumbnails?.[0]?.url || null,
      }));
    } catch (_) {}
  }
  console.log('  YouTube Invidious: toutes instances KO — skip');
  return [];
}

async function fetchYouTube() {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) return fetchYouTubeAPI(key);
  console.log('  YouTube : clé absente → fallback Invidious (sans clé)');
  return fetchYouTubeInvidious();
}

// ─── 3. Bluesky ───────────────────────────────────────────────────────────────
async function fetchBluesky() {
  const posts = [];
  try {
    const url = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=Bandi+Netflix&limit=100';
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.posts || [];
    console.log(`  Bluesky: ${items.length} posts`);

    for (const post of items) {
      const uri = post.uri || '';
      const did = post.author?.did || '';
      const rkey = uri.split('/').pop() || '';
      const handle = post.author?.handle || did;
      const postUrl = handle && rkey
        ? `https://bsky.app/profile/${handle}/post/${rkey}`
        : null;
      if (!postUrl) continue;

      posts.push({
        platform: 'bluesky',
        post_id: uri,
        url: postUrl,
        author_name: post.author?.displayName || handle,
        content: truncate(post.record?.text || ''),
        engagement_score: (post.likeCount || 0) + (post.repostCount || 0),
        published_at: parseDate(post.record?.createdAt || post.indexedAt),
        thumbnail_url: post.embed?.images?.[0]?.thumb || null,
      });
    }
  } catch (err) {
    console.warn(`  ⚠️ Bluesky échoué : ${err.message}`);
  }
  return posts;
}

// ─── 4. Google Trends ────────────────────────────────────────────────────────
async function fetchTrends() {
  try {
    // Import dynamique pour éviter crash si module absent
    const { default: googleTrends } = await import('google-trends-api');
    console.log('  Google Trends: fetch...');

    const result = await googleTrends.interestOverTime({
      keyword: 'Bandi Netflix',
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(),
    });

    const parsed = JSON.parse(result);
    const timelineData = parsed?.default?.timelineData || [];
    console.log(`  Google Trends: ${timelineData.length} points`);

    const rows = timelineData.map(pt => ({
      date: new Date(pt.time * 1000).toISOString().slice(0, 10),
      country_code: 'WW',
      interest_score: pt.value?.[0] ?? 0,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('buzz_trends')
        .upsert(rows, { onConflict: 'date,country_code', ignoreDuplicates: false });
      if (error) console.warn(`  ⚠️ Trends upsert : ${error.message}`);
      else console.log(`  ✅ ${rows.length} points Trends upsertés`);
    }
  } catch (err) {
    console.warn(`  ⚠️ Google Trends échoué (skip) : ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📱 Scrape social Bandi · ${new Date().toISOString()}`);
  console.log('━'.repeat(50));

  const [redditPosts, youtubePosts, bskyPosts] = await Promise.all([
    fetchReddit(),
    fetchYouTube(),
    fetchBluesky(),
  ]);

  await fetchTrends();

  const all = [...redditPosts, ...youtubePosts, ...bskyPosts];
  console.log(`\n📊 Total brut : ${all.length} posts`);

  // Dédup par (platform, post_id)
  const seen = new Set();
  const unique = all.filter(p => {
    const key = `${p.platform}:${p.post_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`📊 Après dédup : ${unique.length} posts uniques`);

  if (unique.length === 0) {
    console.log('ℹ️ Aucun post à insérer');
    return;
  }

  let inserted = 0, errors = 0;
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const { error } = await supabase
      .from('buzz_social')
      .upsert(batch, { onConflict: 'platform,post_id', ignoreDuplicates: true });
    if (error) { console.warn(`  ⚠️ Batch error : ${error.message}`); errors++; }
    else inserted += batch.length;
  }

  console.log(`✅ ${inserted} posts upsertés · ${errors} batches en erreur`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
