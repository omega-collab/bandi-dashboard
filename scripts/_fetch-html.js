/**
 * Module commun de fetch HTML avec bypass Cloudflare via Playwright.
 *
 * Stratégie :
 *   1. fetch direct (rapide) → suffit pour les sites sans anti-bot
 *   2. Si HTTP non-OK ou si HTML contient un challenge Cloudflare, fallback
 *      Playwright Chromium headless qui exécute le JS du challenge.
 *
 * Le browser est partagé entre tous les fetches (singleton) pour ne pas
 * relancer Chromium à chaque appel. Penser à appeler closePlaywright() en
 * fin de script pour ne pas laisser le job hanger.
 *
 * Usage :
 *   import { fetchHtml, closePlaywright } from './_fetch-html.js';
 *   const html = await fetchHtml('https://www.allocine.fr/...');
 *   await closePlaywright();
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://www.google.com/'
};

// Détecte un challenge Cloudflare ou un anti-bot similaire dans le HTML.
const CHALLENGE_RE = /Just a moment\.\.\.|cf-challenge|cf-browser-verification|_cf_chl_opt|jschl_answer|<title>Attention Required! \| Cloudflare<\/title>/i;

let _browser = null;
let _ctx = null;

async function getPlaywrightContext() {
  if (_ctx) return _ctx;
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  _ctx = await _browser.newContext({
    userAgent: HEADERS['User-Agent'],
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    extraHTTPHeaders: {
      'Accept-Language': HEADERS['Accept-Language']
    }
  });
  return _ctx;
}

export async function closePlaywright() {
  try { if (_ctx) await _ctx.close(); } catch (_) {}
  try { if (_browser) await _browser.close(); } catch (_) {}
  _ctx = null; _browser = null;
}

/**
 * Récupère le HTML d'une URL en bypassant Cloudflare si besoin.
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.cloudflareWaitMaxSec=8] secondes max d'attente du challenge
 * @param {boolean} [opts.skipDirectFetch=false] saute la tentative fetch directe
 * @returns {Promise<string>} HTML
 */
export async function fetchHtml(url, opts = {}) {
  const cfWaitMax = opts.cloudflareWaitMaxSec ?? 8;
  const skipDirect = opts.skipDirectFetch ?? false;

  // 1. fetch direct (rapide, suffit pour les sites sans anti-bot)
  if (!skipDirect) {
    try {
      console.log(`📡 GET ${url} (fetch direct)`);
      const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (res.ok) {
        const html = await res.text();
        if (!CHALLENGE_RE.test(html)) {
          return html;
        }
        console.warn(`⚠️ Challenge Cloudflare détecté dans le HTML — fallback Playwright`);
      } else {
        const preview = (await res.text().catch(() => '')).slice(0, 150);
        console.warn(`⚠️ HTTP ${res.status} — fallback Playwright. Preview: ${preview.slice(0, 100)}`);
      }
    } catch (err) {
      console.warn(`⚠️ fetch direct KO : ${err.message} — fallback Playwright`);
    }
  }

  // 2. Fallback Playwright headless Chromium
  try {
    console.log(`🎭 Playwright GET ${url}`);
    const ctx = await getPlaywrightContext();
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    for (let i = 0; i < cfWaitMax; i++) {
      await page.waitForTimeout(1000);
      const html = await page.content();
      if (!CHALLENGE_RE.test(html)) {
        await page.close();
        console.log(`✅ Playwright OK (challenge résolu en ${i + 1}s)`);
        return html;
      }
    }
    const finalHtml = await page.content();
    await page.close();
    throw new Error(`Cloudflare challenge non résolu après ${cfWaitMax}s sur ${url}`);
  } catch (err) {
    throw new Error(`${url} → Playwright: ${err.message}`);
  }
}
