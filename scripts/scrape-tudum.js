// ================================================================
// BANDI · Tudum scraper — données officielles Netflix
// Publiées chaque mardi sur https://www.netflix.com/tudum/top10
// Usage : node scripts/scrape-tudum.js
// ================================================================

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ----------------------------------------------------------------
// Calcul de la dernière semaine publiée
// Netflix publie les données le mardi pour la semaine lundi→dimanche précédente
// ----------------------------------------------------------------
function getLatestWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=dim, 1=lun, 2=mar, ..., 6=sam

  // Trouver le dernier mardi (ou aujourd'hui si mardi après 14h UTC)
  const daysFromTuesday = (day + 5) % 7; // nb de jours depuis le dernier mardi
  const lastTuesday = new Date(now);
  lastTuesday.setUTCDate(now.getUTCDate() - daysFromTuesday);

  // La semaine publiée commence le lundi 7 jours avant ce mardi
  const weekStart = new Date(lastTuesday);
  weekStart.setUTCDate(lastTuesday.getUTCDate() - 7);
  return weekStart.toISOString().slice(0, 10);
}

// La fin de semaine = weekStart + 6 jours (dimanche)
function weekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------
// Fetch + parse TSV
// Netflix publie sous : /tudum/top10/data/week-YYYY-MM-DD.tsv
// La date dans le nom de fichier est le dimanche de fin de semaine
// ----------------------------------------------------------------
async function fetchAndParse(weekStart) {
  const endDate = weekEnd(weekStart);
  const url = `https://www.netflix.com/tudum/top10/data/week-${endDate}.tsv`;
  console.log(`📡 Téléchargement : ${url}`);

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const text = await res.text();

  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('TSV vide ou format inattendu');

  const rawHeaders = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/[\s\-]+/g, '_'));
  console.log(`📋 Colonnes : ${rawHeaders.join(', ')}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    if (cells.length < 3) continue;

    const get = (...keys) => {
      for (const k of keys) {
        const idx = rawHeaders.indexOf(k);
        if (idx !== -1) return cells[idx]?.trim() || '';
      }
      return '';
    };

    const rang        = parseInt(get('weekly_rank', 'rank'), 10);
    const titre       = get('show_title', 'title');
    const saison      = get('season_title', 'season') || null;
    const heuresRaw   = get('hours_viewed_millions', 'hours_viewed');
    const heures      = heuresRaw ? parseFloat(heuresRaw.replace(/,/g, '')) || null : null;
    const semaines    = parseInt(get('cumulative_weeks_in_top_10', 'weeks_in_top_10'), 10) || 0;
    // Colonne "vues" (foyers) — disponible depuis fin 2024 dans certains TSV Netflix
    const vuesRaw     = get('weekly_views', 'views', 'views_millions');
    const views       = vuesRaw ? parseFloat(vuesRaw.replace(/,/g, '')) || null : null;
    const catRaw      = get('category', 'type').toLowerCase();

    // Normalise la catégorie
    let categorie;
    if      (catRaw.includes('film') && catRaw.includes('non'))    categorie = 'film_non_english';
    else if (catRaw.includes('film'))                               categorie = 'film_english';
    else if (catRaw.includes('non'))                                categorie = 'tv_non_english';
    else                                                            categorie = 'tv_english';

    if (!isNaN(rang) && rang > 0 && titre) {
      const row = { week_start: weekStart, categorie, rang, titre, saison, heures_vues: heures, semaines_top10: semaines };
      if (views != null) row.views_millions = views; // bonus si colonne présente
      rows.push(row);
    }
  }

  return rows;
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
async function main() {
  console.log('🎬 Tudum Scraper · ' + new Date().toISOString());

  const weekStart = getLatestWeekStart();
  console.log(`📅 Semaine ciblée : ${weekStart} → ${weekEnd(weekStart)}`);

  // Check si déjà présent — sert juste à logger (on laisse l'upsert rafraîchir
  // les chiffres car Netflix corrige parfois heures/vues post-publication).
  const { data: existing } = await supabase
    .from('tudum_global_weekly')
    .select('id')
    .eq('week_start', weekStart)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log('ℹ️  Données déjà présentes pour cette semaine — refresh (Netflix corrige parfois)');
  }

  try {
    const rows = await fetchAndParse(weekStart);
    console.log(`📊 ${rows.length} entrées parsées`);
    if (rows.length === 0) throw new Error('Aucune entrée valide dans le TSV');

    const { error } = await supabase
      .from('tudum_global_weekly')
      .upsert(rows, { onConflict: 'week_start,categorie,rang', ignoreDuplicates: false });
    if (error) throw error;

    // Résumé
    const tvEn    = rows.filter(r => r.categorie === 'tv_english').length;
    const tvNon   = rows.filter(r => r.categorie === 'tv_non_english').length;
    const filmEn  = rows.filter(r => r.categorie === 'film_english').length;
    const filmNon = rows.filter(r => r.categorie === 'film_non_english').length;
    const bandi   = rows.find(r => r.titre.toLowerCase().includes('bandi'));

    console.log(`✅ Tudum OK — TV EN: ${tvEn} | TV Non-EN: ${tvNon} | Films EN: ${filmEn} | Films Non-EN: ${filmNon}`);
    if (bandi) {
      console.log(`🇲🇶 Bandi présent : "${bandi.titre}" — rang ${bandi.rang} (${bandi.categorie}) — ${bandi.heures_vues}M h`);
    } else {
      console.log('ℹ️  Bandi absent du top 10 Tudum cette semaine');
    }

  } catch (err) {
    console.error('❌ Erreur scraping Tudum:', err.message);
    // Ne pas planter le processus : le TSV peut être absent si scraping avant publication
    console.log('💡 Les données Tudum sont publiées chaque mardi vers 14h UTC');
    process.exit(0);
  }
}

main();
