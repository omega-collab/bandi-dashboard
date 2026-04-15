/**
 * BANDI Scraper · FlixPatrol → Supabase
 * Usage : node scripts/scraper.js
 *
 * Récupère :
 *   - Score et rang mondial de Bandi
 *   - Classement par pays (dernier jour disponible)
 *   - Top 10 TV Shows Monde (pour comparaison)
 *
 * Insère dans Supabase (upsert sur la date du jour)
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
};

// Mapping pays → région (complet)
const REGIONS = {
  'Martinique': 'Caraïbes', 'Guadeloupe': 'Caraïbes', 'Bahamas': 'Caraïbes',
  'Jamaica': 'Caraïbes', 'Dominican Republic': 'Caraïbes', 'Trinidad and Tobago': 'Caraïbes',
  'Cuba': 'Caraïbes',
  'Reunion': 'Océan Indien', 'Mauritius': 'Océan Indien', 'Maldives': 'Océan Indien',
  'France': 'Europe', 'Hungary': 'Europe', 'Portugal': 'Europe', 'Spain': 'Europe',
  'Belgium': 'Europe', 'Switzerland': 'Europe', 'Netherlands': 'Europe', 'Italy': 'Europe',
  'Luxembourg': 'Europe', 'Czech Republic': 'Europe', 'Slovakia': 'Europe', 'Romania': 'Europe',
  'Germany': 'Europe', 'Austria': 'Europe', 'Poland': 'Europe', 'Greece': 'Europe',
  'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
  'Ireland': 'Europe', 'United Kingdom': 'Europe', 'Croatia': 'Europe', 'Bulgaria': 'Europe',
  'Iceland': 'Europe', 'Lithuania': 'Europe', 'Latvia': 'Europe', 'Estonia': 'Europe',
  'Slovenia': 'Europe', 'Cyprus': 'Europe', 'Malta': 'Europe', 'Serbia': 'Europe', 'Ukraine': 'Europe',
  'Panama': 'Amérique Centrale', 'Honduras': 'Amérique Centrale', 'Costa Rica': 'Amérique Centrale',
  'Nicaragua': 'Amérique Centrale', 'Salvador': 'Amérique Centrale', 'Guatemala': 'Amérique Centrale',
  'Venezuela': 'Amérique du Sud', 'Brazil': 'Amérique du Sud', 'Argentina': 'Amérique du Sud',
  'Chile': 'Amérique du Sud', 'Colombia': 'Amérique du Sud', 'Uruguay': 'Amérique du Sud',
  'Ecuador': 'Amérique du Sud', 'Peru': 'Amérique du Sud', 'Paraguay': 'Amérique du Sud',
  'Bolivia': 'Amérique du Sud',
  'United States': 'Amérique du Nord', 'Canada': 'Amérique du Nord', 'Mexico': 'Amérique du Nord',
  'New Caledonia': 'Océanie', 'Australia': 'Océanie', 'New Zealand': 'Océanie',
  'Nigeria': 'Afrique', 'Kenya': 'Afrique', 'Morocco': 'Afrique', 'South Africa': 'Afrique',
  'Egypt': 'Afrique',
  'Japan': 'Asie', 'South Korea': 'Asie', 'Taiwan': 'Asie', 'Hong-Kong': 'Asie',
  'Singapore': 'Asie', 'Malaysia': 'Asie', 'Thailand': 'Asie', 'Philippines': 'Asie',
  'Indonesia': 'Asie', 'Vietnam': 'Asie', 'India': 'Asie',
  'Saudi Arabia': 'Moyen-Orient', 'United Arab Emirates': 'Moyen-Orient',
  'Kuwait': 'Moyen-Orient', 'Qatar': 'Moyen-Orient', 'Bahrain': 'Moyen-Orient',
  'Oman': 'Moyen-Orient', 'Jordan': 'Moyen-Orient', 'Lebanon': 'Moyen-Orient',
  'Israel': 'Moyen-Orient', 'Turkey': 'Moyen-Orient'
};

async function fetchHtml(url) {
  console.log(`📡 GET ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return await res.text();
}

/**
 * Scrape la page titre de Bandi :
 * https://flixpatrol.com/title/bandi/
 * Retourne : { scoreMonde, rangMonde, countries: [{pays, rang, region}] }
 */
async function scrapeBandiPage() {
  const html = await fetchHtml('https://flixpatrol.com/title/bandi/');
  const $ = cheerio.load(html);

  let scoreMonde = null;
  let rangMonde = null;

  // La section "Yesterday" contient un tableau :
  // | Netflix | XXX p. | YY. |
  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (scoreMonde === null && cells[0]?.includes('Netflix') && cells[1]?.match(/\d+\s*p\./)) {
        const score = parseInt(cells[1].replace(/\D/g, ''), 10);
        const rang = parseInt(cells[2].replace(/\D/g, ''), 10);
        if (!isNaN(score) && !isNaN(rang)) {
          scoreMonde = score;
          rangMonde = rang;
        }
      }
    });
  });

  // Tableau des pays : colonne "country" + colonnes jours + "Yesterday"
  const countries = [];
  $('table').each((_, table) => {
    const headerTexts = $(table).find('thead th, tr:first-child th').map((_, th) => $(th).text().trim().toLowerCase()).get();
    if (!headerTexts.some(h => h.includes('country'))) return;

    const allHeaders = $(table).find('th').map((_, th) => $(th).text().trim()).get();
    const yesterdayIdx = allHeaders.findIndex(h => h.toLowerCase().includes('yesterday'));

    $(table).find('tbody tr, tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells.length < 2) return;

      const pays = cells[0].split('\n')[0].trim();
      if (!pays || pays.toLowerCase().includes('average') || pays.toLowerCase().includes('total')) return;

      // Dernière colonne avec un nombre = rang d'hier
      const lastCell = cells[cells.length - 1];
      const rang = parseInt(lastCell.replace(/\D/g, ''), 10);

      if (!isNaN(rang) && rang >= 1 && rang <= 10) {
        countries.push({
          pays,
          rang,
          region: REGIONS[pays] || 'Autre'
        });
      }
    });
  });

  return { scoreMonde, rangMonde, countries };
}

/**
 * Scrape le Top 10 TV Shows Netflix Monde
 */
async function scrapeWorldTop10() {
  // Dernier jour où FlixPatrol a des données (généralement J-1)
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const url = `https://flixpatrol.com/top10/netflix/world/${yesterday}/`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const shows = [];
    // Chercher le tableau sous "TOP TV Shows"
    let tvHeader = null;
    $('h2').each((_, h) => {
      const text = $(h).text();
      if (text.includes('TV Shows') || text.includes('TV Show')) {
        tvHeader = $(h);
      }
    });

    if (!tvHeader) return [];

    const table = tvHeader.nextAll('table').first();
    table.find('tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells.length < 3) return;

      const rangStr = cells[0].replace(/\D/g, '');
      const rang = parseInt(rangStr, 10);
      const titre = cells[1].replace(/\s+/g, ' ').trim().split('  ')[0];
      const score = parseInt(cells[2].replace(/\D/g, ''), 10);

      if (!isNaN(rang) && rang >= 1 && rang <= 10 && titre && !isNaN(score)) {
        shows.push({ rang, titre, score });
      }
    });

    return shows;
  } catch (err) {
    console.warn('⚠️ Top 10 monde non récupéré :', err.message);
    return [];
  }
}

async function main() {
  console.log('🎬 Bandi Scraper · ' + new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { scoreMonde, rangMonde, countries } = await scrapeBandiPage();
    const top10 = await scrapeWorldTop10();

    const today = new Date().toISOString().slice(0, 10);
    const paysN1 = countries.filter(c => c.rang === 1).length;
    const rangMoyen = countries.length > 0
      ? parseFloat((countries.reduce((s, c) => s + c.rang, 0) / countries.length).toFixed(1))
      : null;

    console.log(`📊 Score monde  : ${scoreMonde}`);
    console.log(`🏆 Rang monde   : #${rangMonde}`);
    console.log(`🥇 Pays #1      : ${paysN1}`);
    console.log(`🌍 Top 10 pays  : ${countries.length}`);
    console.log(`📈 Rang moyen   : ${rangMoyen}`);
    console.log(`📺 Concurrents  : ${top10.length} séries`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Insert snapshot
    const { error: e1 } = await supabase.from('bandi_snapshots').upsert({
      date: today,
      score_monde: scoreMonde,
      rang_monde: rangMonde,
      pays_n1: paysN1,
      pays_top10: countries.length,
      rang_moyen: rangMoyen
    }, { onConflict: 'date' });
    if (e1) throw new Error(`Insert snapshot : ${e1.message}`);
    console.log('✅ Snapshot inséré');

    // Insert pays
    if (countries.length > 0) {
      const rows = countries.map(c => ({
        date: today,
        pays: c.pays,
        rang: c.rang,
        region: c.region
      }));
      const { error: e2 } = await supabase.from('bandi_country_rankings').upsert(rows, { onConflict: 'date,pays' });
      if (e2) throw new Error(`Insert pays : ${e2.message}`);
      console.log(`✅ ${rows.length} pays insérés`);
    }

    // Insert top 10
    if (top10.length > 0) {
      const rows = top10.map(s => ({
        date: today,
        rang: s.rang,
        titre: s.titre,
        score: s.score
      }));
      const { error: e3 } = await supabase.from('netflix_tv_top10_world').upsert(rows, { onConflict: 'date,rang' });
      if (e3) throw new Error(`Insert top10 : ${e3.message}`);
      console.log(`✅ ${rows.length} concurrents insérés`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Scraping terminé avec succès');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
