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
// Cascade : API officielle (si YOUTUBE_API_KEY) → Invidious → Piped → RSS chaînes
// L'objectif est de toujours remonter au moins quelques vidéos même quand
// les instances communautaires (Invidious/Piped) tombent — ça arrive souvent.

const YT_QUERIES = ['Bandi Netflix', 'Bandi série Netflix', 'Bandi serie Netflix', 'Bandi Martinique'];

// Instances Invidious actives (vérifiées via api.invidious.io) — élargies
const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://iv.datura.network',
  'https://invidious.privacydev.net',
  'https://invidious.fdn.fr',
  'https://yewtu.be',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
];

// Instances Piped (alternative à Invidious, souvent plus stables)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.smnz.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.darkness.services',
];

// Chaînes YouTube qui couvrent régulièrement les sorties Netflix FR/Caraïbes
// → on récupère leurs derniers uploads via le flux RSS officiel YouTube
//   (https://www.youtube.com/feeds/videos.xml?channel_id=XXX), puis on filtre
//   par mots-clés liés à Bandi.
const YT_CHANNELS = [
  { id: 'UCpko_-a4wgz2u_DgDgd9fqA', name: 'Konbini' },
  { id: 'UCmfBYOZ3E3K2qLcDeFt5XAg', name: 'Brut' },
  { id: 'UCwo7AwBPnsJDSpV0gscjMHQ', name: 'Première' },
  { id: 'UCS2nGbZyL_KJxPP4Lxc7v3w', name: 'AlloCiné' },
  { id: 'UCqMAavhpwXcvONqVDF7Knhg', name: 'Netflix France' },
  { id: 'UCWOA1ZGywLbqmigxE4Qlvuw', name: 'Netflix' },
];
const YT_KEYWORDS = ['bandi', 'martinique'];

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
  console.log('  YouTube Invidious: toutes instances KO');
  return [];
}

async function fetchYouTubePiped() {
  for (const base of PIPED_INSTANCES) {
    try {
      const url = `${base}/search?q=${encodeURIComponent('Bandi Netflix')}&filter=videos`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.items || [];
      if (items.length === 0) continue;
      console.log(`  YouTube (Piped ${base}): ${items.length} vidéos`);
      return items.slice(0, 30).map(v => {
        const vid = (v.url || '').split('v=')[1] || (v.url || '').split('/').pop();
        return {
          platform: 'youtube', post_id: vid,
          url: `https://www.youtube.com/watch?v=${vid}`,
          author_name: v.uploaderName || null,
          content: truncate((v.title || '') + (v.shortDescription ? '\n' + v.shortDescription : '')),
          engagement_score: v.views || 0,
          published_at: parseDate(v.uploaded || null),
          thumbnail_url: v.thumbnail || null,
        };
      }).filter(p => p.post_id);
    } catch (_) {}
  }
  console.log('  YouTube Piped: toutes instances KO');
  return [];
}

// Parse une feed RSS YouTube (XML) sans dépendance — regex suffisante pour
// les balises stables <entry>/<yt:videoId>/<title>/<author><name>.
function parseYouTubeRSS(xml, channelName) {
  const entries = xml.split(/<entry>/).slice(1);
  const out = [];
  for (const e of entries) {
    const vid = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (e.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1];
    const author = (e.match(/<name>([^<]+)<\/name>/) || [])[1] || channelName;
    const desc = (e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';
    const thumb = (e.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1];
    if (!vid) continue;
    const blob = (title + ' ' + desc).toLowerCase();
    if (!YT_KEYWORDS.some(k => blob.includes(k))) continue;
    out.push({
      platform: 'youtube', post_id: vid,
      url: `https://www.youtube.com/watch?v=${vid}`,
      author_name: author,
      content: truncate(title + (desc ? '\n' + desc : '')),
      engagement_score: 0, // pas de stats dans le flux RSS
      published_at: parseDate(published),
      thumbnail_url: thumb || null,
    });
  }
  return out;
}

async function fetchYouTubeRSS() {
  const posts = [];
  for (const ch of YT_CHANNELS) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const found = parseYouTubeRSS(xml, ch.name);
      if (found.length) console.log(`  YouTube RSS ${ch.name}: +${found.length} vidéo(s) Bandi`);
      posts.push(...found);
    } catch (err) {
      console.warn(`  ⚠️ YouTube RSS ${ch.name}: ${err.message}`);
    }
  }
  return posts;
}

async function fetchYouTube() {
  const key = process.env.YOUTUBE_API_KEY;
  const all = [];

  if (key) {
    const apiPosts = await fetchYouTubeAPI(key);
    all.push(...apiPosts);
    console.log(`  ↳ YouTube API : ${apiPosts.length} vidéos`);
  } else {
    console.log('  YouTube : clé absente → cascade Invidious / Piped / RSS');
    const inv = await fetchYouTubeInvidious();
    all.push(...inv);
    if (inv.length === 0) {
      const pip = await fetchYouTubePiped();
      all.push(...pip);
    }
  }

  // RSS : toujours en complément (chaînes éditoriales FR/Caraïbes)
  const rss = await fetchYouTubeRSS();
  all.push(...rss);

  console.log(`  ↳ YouTube total : ${all.length} vidéos (avant dédup)`);
  return all;
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
