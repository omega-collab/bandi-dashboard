/**
 * Cross-check FlixPatrol × Netflix Tudum
 * Compare les deux sources et signale les divergences
 * Usage : node scripts/cross-check.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function computeCrossCheck() {
  // Dernier snapshot FlixPatrol
  const { data: fp } = await supabase
    .from('bandi_snapshots')
    .select('date, rang_monde, score_monde, pays_top10')
    .order('date', { ascending: false })
    .limit(2);

  // Dernier snapshot Tudum
  const { data: td } = await supabase
    .from('bandi_tudum_weekly')
    .select('week, rank_noneng, weekly_hours_viewed, weekly_views, cumulative_weeks')
    .order('week', { ascending: false })
    .limit(2);

  if (!fp?.length || !td?.length) return null;

  const fpCurrent = fp[0];
  const fpPrevious = fp[1] || fp[0];
  const tdCurrent = td[0];
  const tdPrevious = td[1] || td[0];

  // Trend FlixPatrol (rang mondial — inverse : rang plus bas = meilleur)
  const fpTrend = fpPrevious.rang_monde - fpCurrent.rang_monde; // > 0 = amélioré
  // Trend Tudum (même logique)
  const tdTrend = (tdPrevious.rank_noneng || 11) - (tdCurrent.rank_noneng || 11);

  // Cohérence : les deux sont dans le top 10 et même direction de trend
  const fpInTop10 = fpCurrent.rang_monde <= 10;
  const tdInTop10 = tdCurrent.rank_noneng !== null && tdCurrent.rank_noneng <= 10;

  let status = 'coherent';
  let reason = null;

  if (!tdInTop10 && fpInTop10) {
    status = 'divergent';
    reason = `FlixPatrol #${fpCurrent.rang_monde} mondial mais absent du Tudum Top 10`;
  } else if (tdInTop10 && !fpInTop10) {
    status = 'divergent';
    reason = `Tudum #${tdCurrent.rank_noneng} TV Non-English mais absent du FlixPatrol Top 10`;
  } else if (fpTrend !== 0 && tdTrend !== 0 && Math.sign(fpTrend) !== Math.sign(tdTrend)) {
    status = 'warning';
    reason = `Tendances opposées — FlixPatrol ${fpTrend > 0 ? '↑' : '↓'} / Tudum ${tdTrend > 0 ? '↑' : '↓'}`;
  }

  return {
    status,          // 'coherent' | 'warning' | 'divergent'
    reason,
    flixpatrol: {
      date: fpCurrent.date,
      rang: fpCurrent.rang_monde,
      score: fpCurrent.score_monde,
      paysTop10: fpCurrent.pays_top10,
      trend: fpTrend
    },
    tudum: {
      week: tdCurrent.week,
      rank_noneng: tdCurrent.rank_noneng,
      hours_viewed_m: (tdCurrent.weekly_hours_viewed / 1e6).toFixed(1),
      views_m: (tdCurrent.weekly_views / 1e6).toFixed(1),
      cumulative_weeks: tdCurrent.cumulative_weeks,
      trend: tdTrend
    }
  };
}

async function main() {
  console.log('🔍 Cross-check FlixPatrol × Tudum');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const result = await computeCrossCheck();
  if (!result) { console.log('⚠️ Données insuffisantes'); return; }

  const { status, reason, flixpatrol: fp, tudum: td } = result;

  const icon = status === 'coherent' ? '✅' : status === 'warning' ? '⚠️' : '🔴';
  console.log(`${icon} Statut : ${status.toUpperCase()}`);
  if (reason) console.log(`   Raison : ${reason}`);
  console.log(`\nFlixPatrol (${fp.date})`);
  console.log(`  Rang mondial  : #${fp.rang}  (trend: ${fp.trend > 0 ? '+' : ''}${fp.trend})`);
  console.log(`  Score         : ${fp.score} pts`);
  console.log(`  Pays top 10   : ${fp.paysTop10}`);
  console.log(`\nNetflix Tudum (semaine du ${td.week})`);
  console.log(`  Rang TV Non-Eng : ${td.rank_noneng ? '#' + td.rank_noneng : 'Absent'}`);
  console.log(`  Heures vues     : ${td.hours_viewed_m}M`);
  console.log(`  Vues            : ${td.views_m}M`);
  console.log(`  Semaines top 10 : ${td.cumulative_weeks}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
