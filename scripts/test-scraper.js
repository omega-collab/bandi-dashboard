/**
 * Test de connexion Supabase SANS écrire
 * Usage : node scripts/test-scraper.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ .env manquant ou incomplet');
  console.error('   → Copie .env.example vers .env et remplis les valeurs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  console.log('🧪 Test Supabase');
  console.log(`   URL: ${SUPABASE_URL}`);

  // Test 1 : lire les tables
  for (const table of ['bandi_snapshots', 'bandi_country_rankings', 'netflix_tv_top10_world']) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Table ${table} : ${error.message}`);
      console.error('   → Vérifie que le schéma SQL a été exécuté dans Supabase');
      process.exit(1);
    }
    console.log(`✅ Table ${table} : ${count ?? 0} lignes`);
  }

  // Test 2 : écriture test (puis suppression)
  const testDate = '1999-01-01';
  const { error: insErr } = await supabase.from('bandi_snapshots').upsert({
    date: testDate,
    score_monde: 0,
    rang_monde: 99,
    pays_n1: 0,
    pays_top10: 0
  }, { onConflict: 'date' });

  if (insErr) {
    console.error(`❌ Écriture impossible : ${insErr.message}`);
    console.error('   → Vérifie que la clé SERVICE_KEY (pas anon) est bien utilisée');
    process.exit(1);
  }
  console.log('✅ Écriture OK');

  await supabase.from('bandi_snapshots').delete().eq('date', testDate);
  console.log('✅ Nettoyage OK');

  console.log('\n🎉 Tout est prêt. Lance maintenant : node scripts/scraper.js');
}

test();
