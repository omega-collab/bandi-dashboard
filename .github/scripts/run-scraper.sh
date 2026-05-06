#!/usr/bin/env bash
# Wrapper d'exécution pour tous les scrapers Node.
# - Capture stdout+stderr dans un fichier log temporaire
# - Affiche le log en temps réel (tee)
# - Lit le code de sortie de Node (PIPESTATUS, pas tee)
# - Si échec : annonce GitHub Actions ::error:: + retail des 30 dernières lignes
# - Diagnostic env minimal au début (présence des secrets sans révéler la valeur)
#
# Usage : bash .github/scripts/run-scraper.sh scripts/scraper.js
#
# Exit code propagé du script Node — important pour que le step échoue
# explicitement quand le scraper plante (visibilité dans Actions UI).

set -u

SCRIPT="${1:?Usage: $0 <path/to/script.js>}"
NAME="$(basename "$SCRIPT" .js)"
LOGFILE="/tmp/${NAME}.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 run-scraper.sh"
echo "   Script  : $SCRIPT"
echo "   Logfile : $LOGFILE"
echo "   Date    : $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "   Node    : $(node --version)"

# Diagnostic secrets (sans valeur)
[ -n "${SUPABASE_URL:-}" ] && echo "   ✅ SUPABASE_URL : ${#SUPABASE_URL} chars" || echo "   ❌ SUPABASE_URL : ABSENT"
[ -n "${SUPABASE_SERVICE_KEY:-}" ] && echo "   ✅ SUPABASE_SERVICE_KEY : ${#SUPABASE_SERVICE_KEY} chars" || echo "   ❌ SUPABASE_SERVICE_KEY : ABSENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pas de set -e ici : on veut capturer le code de sortie
node "$SCRIPT" 2>&1 | tee "$LOGFILE"
STATUS=${PIPESTATUS[0]}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Exit code: $STATUS"

if [ "$STATUS" -ne 0 ]; then
  echo "::error title=Scraper $NAME failed::Le scraper $NAME a planté (exit $STATUS). Voir le log ci-dessus pour la cause."
  echo "━━━━━━ DERNIÈRES 30 LIGNES ━━━━━━"
  tail -30 "$LOGFILE" 2>/dev/null || echo "(logfile vide)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit $STATUS
fi

echo "✅ $NAME terminé avec succès"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
