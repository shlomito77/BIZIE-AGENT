#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node -v)"
echo "NPM:  $(npm -v)"
echo "Git:  $(git --version)"

echo ""
echo "== Lint/Typecheck (if configured) =="
if npm run | grep -q "typecheck"; then
  npm run typecheck
else
  echo "No typecheck script found."
fi

echo ""
echo "== Build (optional) =="
if npm run | grep -q "build"; then
  npm run build
else
  echo "No build script found."
fi

echo ""
echo "OK ✅"
