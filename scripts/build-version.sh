#!/usr/bin/env bash
# Régénère public/version.txt au moment du build Netlify.
# Permet de toujours servir le SHA réellement déployé (pas un SHA figé
# au moment du commit, qui serait toujours 1 commit en retard).
set -e
OUT="public/version.txt"
{
  git rev-parse HEAD 2>/dev/null || echo "unknown"
  git rev-parse --short HEAD 2>/dev/null || echo "unknown"
  git log -1 --pretty=format:'%s' 2>/dev/null || echo "no message"
  echo
  git log -1 --pretty=format:'%ai' 2>/dev/null || date -u +'%Y-%m-%d %H:%M:%S +0000'
} > "$OUT"
echo "✓ Version écrite dans $OUT :"
cat "$OUT"
