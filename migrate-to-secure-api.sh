#!/bin/bash

# Helper script to migrate existing code to secure API

echo "Ì¥Ñ Migrating imports to secure API..."

# Find and replace imports in TypeScript/TSX files
find components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak \
  "s/import { gemini } from '..\/services\/gemini'/import { secureGemini as gemini } from '..\/services\/geminiSecure'/g" {} \;

find . -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak \
  "s/import { gemini } from '.\/services\/gemini'/import { secureGemini as gemini } from '.\/services\/geminiSecure'/g" {} \;

echo "‚úÖ Migration complete!"
echo "‚ö†Ô∏è  Please review changes and test thoroughly before deploying"
echo ""
echo "Backup files created with .bak extension"
echo "To revert: find . -name '*.bak' -exec sh -c 'mv \"$0\" \"${0%.bak}\"' {} \;"
