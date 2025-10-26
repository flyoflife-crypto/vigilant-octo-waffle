#!/usr/bin/env bash
set -euo pipefail
cd "/Users/Saveliy/Downloads/mars-onepager-аfinal"
if [ -d "_backup_md_editor_1761499539" ]; then
  echo "Откат из _backup_md_editor_1761499539"
  [ -f "_backup_md_editor_1761499539/goal-description.tsx" ] && cp -f "_backup_md_editor_1761499539/goal-description.tsx" components/mars/goal-description.tsx
  [ -f "_backup_md_editor_1761499539/markdown-ops.ts" ] && cp -f "_backup_md_editor_1761499539/markdown-ops.ts" components/lib/markdown-ops.ts || true
else
  echo "Не найден бэкап _backup_md_editor_1761499539"
  exit 1
fi
rm -rf .next
npm run dev
