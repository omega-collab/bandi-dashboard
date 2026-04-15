/**
 * Scraper presse Bandi — Phase 4
 * Sources : Google News RSS (4 langues) + presse locale Antilles + GDELT
 * Usage   : node scripts/scrape-press.js
 */

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcesMap = JSON.parse(readFileSync(join(__dirname, 'sources-map.json'), 'utf8'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bandi-dashboard/1.0)' }
});

// Regex word-boundary "Bandi" (évite "bandit", "bandido", etc.)
const BANDI_RE = /\bbandi\b/i;
const BANDI_NETFLIX_RE = /(\bbandi\b.*netflix|netflix.*\bbandi\b)/i;

// ─── Classif source type ──────────────────────────────────────────────────────
function classifyUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (sourcesMap.local.some(d => host.includes(d)))    return 'local';
    if (sourcesMap.national.some(d => host.includes(d))) return 'national';
    return 'international';
  } catch {
    return 'international';
  }
}

function extractLang(url) {
  if (/hl=fr/.test(url)) return 'fr';
  if (/hl=es/.test(url)) return 'es';
  if (/hl=pt/.test(url)) return 'pt';
  if (/hl=en/.test(url)) return 'en';
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function truncate(str, n = 500) {
  if (!str) return null;
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// ─── 1. Google News RSS (4 langues) ──────────────────────────────────────────
const GOOGLE_NEWS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=%22Bandi%22+Netflix&hl=fr&gl=FR&ceid=FR:fr',     lang: 'fr' },
  { url: 'https://news.google.com/rss/search?q=%22Bandi%22+Netflix+series&hl=en&gl=US&ceid=US:en', lang: 'en' },
  { url: 'https://news.google.com/rss/search?q=%22Bandi%22+Netflix+serie&hl=es&gl=ES&ceid=ES:es',  lang: 'es' },
  { url: 'https://news.google.com/rss/search?q=%22Bandi%22+Netflix&hl=pt&gl=BR&ceid=BR:pt-419',   lang: 'pt' },
];

async function fetchGoogleNews() {
  const articles = [];
  for (const feed of GOOGLE_NEWS_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      console.log(`  Google News ${feed.lang}: ${result.items.length} items`);
      for (const item of result.items) {
        const url = item.link || item.guid || '';
        if (!url) continue;
        articles.push({
          url,
          title: item.title || '',
          description: truncate(item.contentSnippet || item.content || ''),
          source_name: item.source?.name || result.title || 'Google News',
          source_type: classifyUrl(url),
          language: feed.lang,
          country_code: null,
          published_at: parseDate(item.pubDate || item.isoDate),
          image_url: item.enclosure?.url || null,
        });
      }
    } catch (err) {
      console.warn(`  ⚠️ Google News ${feed.lang} échoué : ${err.message}`);
    }
  }
  return articles;
}

// ─── 2. Presse locale Antilles ────────────────────────────────────────────────
const LOCAL_FEEDS = [
  // ── Martinique ──
  // ── Martinique ──
  { url: 'https://www.martinique.franceantilles.fr/actualite/faitsdivers/rss.xml', name: 'France-Antilles Martinique', lang: 'fr', country_code: 'MQ' },
  { url: 'https://www.martinique.franceantilles.fr/actualite/rss.xml',             name: 'France-Antilles Martinique', lang: 'fr', country_code: 'MQ' },
  { url: 'https://rci.fm/martinique/fb/articles_rss_mq',                           name: 'RCI Martinique',             lang: 'fr', country_code: 'MQ' },
  { url: 'https://www.zayactu.org/feed/',                                           name: 'Zayactu',                    lang: 'fr', country_code: 'MQ' },
  { url: 'https://www.bondamanjak.com/feed/',                                       name: 'Bondamanjak',                lang: 'fr', country_code: 'MQ' },
  { url: 'https://antilla-martinique.com/feed/',                                    name: 'Antilla Martinique',         lang: 'fr', country_code: 'MQ' },
  { url: 'https://martinique.coconews.com/flux-actualite.rss',                      name: 'Coconews Martinique',        lang: 'fr', country_code: 'MQ' },
  { url: 'https://la1ere.franceinfo.fr/martinique/actu/rss',                        name: 'Martinique La 1ère',         lang: 'fr', country_code: 'MQ' },
  // ── Guadeloupe ──
  { url: 'https://la1ere.franceinfo.fr/guadeloupe/actu/rss',                        name: 'Guadeloupe La 1ère',         lang: 'fr', country_code: 'GP' },
  { url: 'https://www.guadeloupe.franceantilles.fr/actualite/rss.xml',              name: 'France-Antilles Guadeloupe', lang: 'fr', country_code: 'GP' },
];

async function fetchLocalPress() {
  const articles = [];
  for (const feed of LOCAL_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const matches = result.items.filter(item =>
        BANDI_RE.test(item.title || '') || BANDI_RE.test(item.contentSnippet || '')
      );
      console.log(`  ${feed.name}: ${result.items.length} total → ${matches.length} avec Bandi`);
      for (const item of matches) {
        const url = item.link || item.guid || '';
        if (!url) continue;
        articles.push({
          url,
          title: item.title || '',
          description: truncate(item.contentSnippet || item.content || ''),
          source_name: feed.name,
          source_type: 'local',
          language: feed.lang,
          country_code: feed.country_code || 'MQ',
          published_at: parseDate(item.pubDate || item.isoDate),
          image_url: item.enclosure?.url || null,
        });
      }
    } catch (err) {
      console.warn(`  ⚠️ ${feed.name} échoué : ${err.message}`);
    }
  }
  return articles;
}

// ─── 2b. Presse & web spécialisés streaming (FR + EN) ────────────────────────
// Flux RSS directs des blogs/magazines spécialisés Netflix / séries.
// On filtre ceux qui mentionnent Bandi — on ne stocke pas tout le feed.
const SPECIALIZED_FEEDS = [
  // ── FR · national généraliste
  { url: 'https://www.leparisien.fr/culture-loisirs/cinema/rss.xml',        name: 'Le Parisien',           lang: 'fr', country_code: 'FR' },
  { url: 'https://www.lemonde.fr/televisions-radio/rss_full.xml',           name: 'Le Monde',              lang: 'fr', country_code: 'FR' },
  { url: 'https://www.lesinrocks.com/tag/series/feed/',                     name: 'Les Inrocks',           lang: 'fr', country_code: 'FR' },
  { url: 'https://www.telerama.fr/rss/services.xml',                        name: 'Télérama',              lang: 'fr', country_code: 'FR' },
  { url: 'https://www.lalibre.be/arc/outboundfeeds/rss/category/culture/?outputType=xml', name: 'La Libre', lang: 'fr', country_code: 'BE' },
  // ── FR · web spécialisé streaming / pop culture
  { url: 'https://www.journaldugeek.com/feed/',                             name: 'Journal du Geek',       lang: 'fr', country_code: 'FR' },
  { url: 'https://www.fnac.com/feeds/rss/blog-le-monde-des-series.xml',     name: 'Fnac Leclaireur',       lang: 'fr', country_code: 'FR' },
  { url: 'https://kinggeek.fr/feed',                                        name: 'King of Geek',          lang: 'fr', country_code: 'FR' },
  { url: 'https://www.numerama.com/feed/',                                  name: 'Numerama',              lang: 'fr', country_code: 'FR' },
  { url: 'https://www.ecranlarge.com/rss/news.xml',                         name: 'Écran Large',           lang: 'fr', country_code: 'FR' },
  { url: 'https://www.programme-tv.net/rss/news.xml',                       name: 'Programme TV',          lang: 'fr', country_code: 'FR' },
  // ── EN · spécialisés Netflix
  { url: 'https://www.whats-on-netflix.com/feed/',                          name: "What's on Netflix",     lang: 'en', country_code: 'US' },
  { url: 'https://www.thereviewgeek.com/feed/',                             name: 'The Review Geek',       lang: 'en', country_code: 'GB' },
  { url: 'https://decider.com/feed/',                                       name: 'Decider',               lang: 'en', country_code: 'US' },
];

async function fetchSpecializedFeeds() {
  const articles = [];
  for (const feed of SPECIALIZED_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const matches = result.items.filter(item =>
        BANDI_RE.test(item.title || '') || BANDI_RE.test(item.contentSnippet || '')
      );
      console.log(`  ${feed.name}: ${result.items.length} total → ${matches.length} avec Bandi`);
      for (const item of matches) {
        const url = item.link || item.guid || '';
        if (!url) continue;
        articles.push({
          url,
          title: item.title || '',
          description: truncate(item.contentSnippet || item.content || ''),
          source_name: feed.name,
          source_type: classifyUrl(url),
          language: feed.lang,
          country_code: feed.country_code || null,
          published_at: parseDate(item.pubDate || item.isoDate),
          image_url: item.enclosure?.url || null,
        });
      }
    } catch (err) {
      console.warn(`  ⚠️ ${feed.name} échoué : ${err.message}`);
    }
  }
  return articles;
}

// ─── 3. GDELT Project ────────────────────────────────────────────────────────
async function fetchGdelt() {
  const articles = [];
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=%22Bandi%22%20Netflix&mode=artlist&format=json&maxrecords=75';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'bandi-dashboard/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.articles || [];
    console.log(`  GDELT: ${items.length} articles`);
    for (const item of items) {
      if (!item.url) continue;
      articles.push({
        url: item.url,
        title: item.title || '',
        description: null,
        source_name: item.domain || new URL(item.url).hostname,
        source_type: classifyUrl(item.url),
        language: item.language?.toLowerCase() || null,
        country_code: item.sourcecountry || null,
        published_at: item.seendate
          ? parseDate(item.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'))
          : null,
        image_url: null,
      });
    }
  } catch (err) {
    console.warn(`  ⚠️ GDELT échoué : ${err.message}`);
  }
  return articles;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🗞️  Scrape presse Bandi · ${new Date().toISOString()}`);
  console.log('━'.repeat(50));

  const [googleArticles, localArticles, specializedArticles, gdeltArticles] = await Promise.all([
    fetchGoogleNews(),
    fetchLocalPress(),
    fetchSpecializedFeeds(),
    fetchGdelt(),
  ]);

  const all = [...googleArticles, ...localArticles, ...specializedArticles, ...gdeltArticles];
  console.log(`\n📊 Total brut : ${all.length} articles`);

  // Déduplique par URL avant upsert
  const seen = new Set();
  const unique = all.filter(a => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
  console.log(`📊 Après dédup : ${unique.length} articles uniques`);

  if (unique.length === 0) {
    console.log('ℹ️ Aucun article à insérer');
    return;
  }

  // Upsert par batch de 50
  let inserted = 0, errors = 0;
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const { error } = await supabase
      .from('buzz_articles')
      .upsert(batch, { onConflict: 'url', ignoreDuplicates: true });
    if (error) { console.warn(`  ⚠️ Batch ${i / 50 + 1} error : ${error.message}`); errors++; }
    else inserted += batch.length;
  }

  console.log(`✅ ${inserted} articles upsertés · ${errors} batches en erreur`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
