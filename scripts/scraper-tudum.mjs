/**
 * Scraper Netflix Tudum Top 10
 * Source officielle Netflix : heures vues hebdomadaires
 * Usage : node scripts/scraper-tudum.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TSV_URL = 'https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv';

export async function scrapeTudum() {
  console.log('📡 GET Netflix Tudum TSV...');
  const res = await fetch(TSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} depuis Netflix Tudum`);

  const tsv = await res.text();
  const lines = tsv.trim().split('\n');
  // header: week\tcategory\tweekly_rank\tshow_title\tseason_title\tweekly_hours_viewed\truntime\tweekly_views\tcumulative_weeks_in_top_10

  // Trouver la dernière semaine disponible
  const lastWeek = lines[1]?.split('\t')[0];
  if (!lastWeek) throw new Error('TSV vide ou malformé');

  // Extraire toutes les lignes Bandi
  const bandiRows = lines
    .slice(1)
    .filter(l => l.toLowerCase().split('\t')[3]?.toLowerCase() === 'bandi');

  // Extraire le Top 10 TV Non-English de la dernière semaine (pour contexte concurrent)
  const tvNonEngLastWeek = lines
    .slice(1)
    .filter(l => {
      const cols = l.split('\t');
      return cols[0] === lastWeek && cols[1] === 'TV (Non-English)';
    })
    .map(l => {
      const [week, , rank, title, , hours, , views, cumul] = l.split('\t');
      return {
        week,
        rank: parseInt(rank, 10),
        title: title.trim(),
        weekly_hours_viewed: parseInt(hours, 10) || 0,
        weekly_views: parseInt(views, 10) || 0,
        cumulative_weeks: parseInt(cumul, 10) || 0
      };
    });

  // Construire les données Bandi par semaine
  const bandiByWeek = bandiRows.reduce((acc, l) => {
    const [week, category, rank, , , hours, , views, cumul] = l.split('\t');
    if (category !== 'TV (Non-English)') return acc;
    acc[week] = {
      week,
      rank_noneng: parseInt(rank, 10),
      weekly_hours_viewed: parseInt(hours, 10) || 0,
      weekly_views: parseInt(views, 10) || 0,
      cumulative_weeks: parseInt(cumul, 10) || 0
    };
    return acc;
  }, {});

  return {
    lastWeek,
    bandiByWeek,
    bandiOnLastWeek: bandiByWeek[lastWeek] || null,
    tvTop10LastWeek: tvNonEngLastWeek
  };
}

async function main() {
  console.log('🎬 Tudum Scraper · ' + new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { lastWeek, bandiByWeek, bandiOnLastWeek, tvTop10LastWeek } = await scrapeTudum();

  console.log(`📅 Dernière semaine Tudum : ${lastWeek}`);
  if (bandiOnLastWeek) {
    console.log(`🏆 Bandi rang TV Non-English : #${bandiOnLastWeek.rank_noneng}`);
    console.log(`👁️  Heures vues : ${(bandiOnLastWeek.weekly_hours_viewed / 1e6).toFixed(1)}M`);
    console.log(`👥 Vues : ${(bandiOnLastWeek.weekly_views / 1e6).toFixed(1)}M`);
  } else {
    console.log('⚠️  Bandi absent du Top 10 TV Non-English cette semaine');
  }

  // Upsert toutes les semaines Bandi (pas seulement la dernière)
  const rows = Object.values(bandiByWeek);
  if (rows.length > 0) {
    const { error } = await supabase
      .from('bandi_tudum_weekly')
      .upsert(rows, { onConflict: 'week' });
    if (error) throw error;
    console.log(`✅ ${rows.length} semaine(s) Tudum upsertée(s)`);
  }

  // Upsert top 10 TV concurrent Tudum pour la dernière semaine
  if (tvTop10LastWeek.length > 0) {
    const tvRows = tvTop10LastWeek.map(r => ({
      week: r.week,
      rang: r.rank,
      titre: r.title,
      weekly_hours_viewed: r.weekly_hours_viewed,
      weekly_views: r.weekly_views
    }));
    const { error } = await supabase
      .from('tudum_tv_top10_noneng')
      .upsert(tvRows, { onConflict: 'week,rang' });
    if (error) throw error;
    console.log(`✅ Top 10 TV Non-English Tudum (${lastWeek}) inséré`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Tudum scraper terminé');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
