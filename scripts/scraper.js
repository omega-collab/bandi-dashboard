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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

// Mapping EN → { fr, code } pour les pays FlixPatrol
const __dir = dirname(fileURLToPath(import.meta.url));
const COUNTRY_MAP = JSON.parse(readFileSync(join(__dir, 'country-mapping.json'), 'utf8'));

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

// Retry wrapper avec backoff exponentiel (I1 audit)
// 3 tentatives max, attend 2s, 4s entre chaque
async function fetchHtml(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`📡 GET ${url}${i ? ` (tentative ${i + 1}/${attempts})` : ''}`);
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === attempts - 1) throw new Error(`${url} → ${err.message} (${attempts} tentatives)`);
      const wait = 2000 * Math.pow(2, i);
      console.warn(`⚠️ ${err.message} — retry dans ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
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
  let joursTop10Cumul = 0;   // total country-days en top 10 (cellules non-vides)
  let rangPeak        = null; // meilleur rang mondial jamais atteint sur la page

  $('table').each((_, table) => {
    const headerTexts = $(table).find('thead th, tr:first-child th').map((_, th) => $(th).text().trim().toLowerCase()).get();
    if (!headerTexts.some(h => h.includes('country'))) return;

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

      // Compter TOUTES les cellules non-vides (j-n à hier) = jours en top 10
      for (let i = 1; i < cells.length; i++) {
        const r = parseInt(cells[i].replace(/\D/g, ''), 10);
        if (!isNaN(r) && r >= 1 && r <= 10) joursTop10Cumul++;
      }
    });
  });

  // Rang peak depuis les snapshots précédents n'est pas disponible ici
  // On stocke le rang du jour comme candidat minimum (le vrai peak est dans la DB)
  rangPeak = rangMonde;

  return { scoreMonde, rangMonde, countries, joursTop10Cumul, rangPeak };
}

// Titres caractéristiques de FILMS (guard anti-régression)
const FILM_MARKERS = [
  'thrash', 'sniper', 'anaconda', 'sisu', 'four brothers',
  'striking distance', 'eat pray', 'john wick', 'die hard', 'rambo',
  'fast &', 'transformers', 'expendables', 'mudborn', 'tu yaa main'
];

/**
 * Scrape le Top 10 TV Shows Netflix Monde
 * IMPORTANT : ne jamais utiliser .parent().find('table') → remonte trop haut et prend Films
 */
async function scrapeWorldTop10() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const url = `https://flixpatrol.com/top10/netflix/world/${yesterday}/`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const shows = [];

    // ── Trouver le h2 "TV Shows" — .filter() + .first() = match unique et fiable
    const tvHeader = $('h2').filter((_, el) =>
      /tv\s*show/i.test($(el).text())
    ).first();

    if (!tvHeader.length) {
      console.warn('⚠️ H2 TV Shows non trouvé — structure FlixPatrol peut avoir changé');
      return [];
    }

    // ── Stratégie 1 : table sœur DIRECTE après le h2 (même niveau DOM)
    let tvTable = tvHeader.nextAll('table').first();

    // ── Stratégie 2 : frère du PARENT du h2 (jamais parent().find() !)
    //    Utile si la table est dans un container frère du bloc contenant le h2
    if (!tvTable.length) {
      let cur = tvHeader.parent().next();
      while (cur.length && !tvTable.length) {
        if (cur.is('table')) {
          tvTable = cur;
        } else {
          const inner = cur.find('table').first();
          if (inner.length) tvTable = inner;
        }
        cur = cur.next();
      }
    }

    if (!tvTable.length) {
      console.warn('⚠️ Table TV Shows introuvable après le h2');
      return [];
    }

    tvTable.find('tr').each((_, row) => {
      const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
      if (cells.length < 3) return;
      const rang  = parseInt(cells[0].replace(/\D/g, ''), 10);
      const titre = cells[1].replace(/\s+/g, ' ').trim().split('  ')[0];
      const score = parseInt(cells[2].replace(/\D/g, ''), 10);
      if (!isNaN(rang) && rang >= 1 && rang <= 10 && titre && !isNaN(score)) {
        shows.push({ rang, titre, score });
      }
    });

    // ── Guard : si ≥2 titres sur les 3 premiers ressemblent à des films → abort
    const top3 = shows.slice(0, 3).map(s => s.titre.toLowerCase());
    const filmMatches = top3.filter(t => FILM_MARKERS.some(m => t.includes(m)));
    if (top3.length > 0 && filmMatches.length >= 2) {
      throw new Error(
        `scrapeWorldTop10 a récupéré des Films au lieu de TV Shows ` +
        `(${top3.join(', ')}) — vérifier la structure FlixPatrol`
      );
    }

    console.log(`📺 TV Shows parsés : ${shows.map(s => `#${s.rang} ${s.titre}`).slice(0,3).join(' | ')}...`);
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
    const { scoreMonde, rangMonde, countries, joursTop10Cumul, rangPeak } = await scrapeBandiPage();
    const top10 = await scrapeWorldTop10();

    // C4 (audit) : fail-fast si le scrape revient vide — FlixPatrol a probablement
    // changé de structure. Mieux vaut exit 1 (workflow rouge, notif GitHub) que
    // d'upserter un snapshot null qui ferait tomber le dashboard en fallback statique.
    if (scoreMonde == null && rangMonde == null && countries.length === 0) {
      throw new Error('Scrape FlixPatrol vide — score/rang/pays tous absents. Vérifier la structure HTML.');
    }

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
    console.log(`📅 Jours top 10 : ${joursTop10Cumul} (pays×jours sur la page)`);
    console.log(`📺 Concurrents  : ${top10.length} séries`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Insert snapshot (avec nouvelles colonnes jours_top10_cumul et rang_peak)
    // IMPORTANT : created_at explicitement rafraîchi à chaque run — sinon il
    // garde la valeur de la PREMIÈRE insertion du jour (DEFAULT NOW() ne
    // s'applique pas au UPDATE branch du UPSERT), ce qui fait croire au
    // dashboard que les données datent de plusieurs heures alors qu'un
    // refresh vient d'avoir lieu.
    const snapshotRow = {
      date: today,
      score_monde: scoreMonde,
      rang_monde: rangMonde,
      pays_n1: paysN1,
      pays_top10: countries.length,
      rang_moyen: rangMoyen,
      created_at: new Date().toISOString()
    };
    // Ajouter les nouvelles colonnes seulement si elles existent en DB
    if (joursTop10Cumul > 0) snapshotRow.jours_top10_cumul = joursTop10Cumul;
    if (rangPeak)            snapshotRow.rang_peak          = rangPeak;

    const { error: e1 } = await supabase.from('bandi_snapshots').upsert(snapshotRow, { onConflict: 'date' });
    if (e1) throw new Error(`Insert snapshot : ${e1.message}`);
    console.log('✅ Snapshot inséré');

    // Insert pays (avec code ISO depuis country-mapping.json)
    if (countries.length > 0) {
      const rows = countries.map(c => {
        const mapped = COUNTRY_MAP[c.pays];
        return {
          date: today,
          pays: c.pays,
          code_pays: mapped?.code || null,
          rang: c.rang,
          region: c.region
        };
      });
      const { error: e2 } = await supabase.from('bandi_country_rankings').upsert(rows, { onConflict: 'date,pays' });
      if (e2) throw new Error(`Insert pays : ${e2.message}`);
      const withCode = rows.filter(r => r.code_pays).length;
      console.log(`✅ ${rows.length} pays insérés (${withCode} avec code ISO)`);
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
