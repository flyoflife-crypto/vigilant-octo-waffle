#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/Saveliy/Downloads/mars-onepager-аfinal"
cd "$ROOT"
[ -d "_fix_goaldesc_backup_1761500996" ] || { echo "Нет бэкапа: _fix_goaldesc_backup_1761500996"; exit 1; }
echo "Откатываю из _fix_goaldesc_backup_1761500996"
cp -f "_fix_goaldesc_backup_1761500996/text-format-menu.tsx" components/ui/text-format-menu.tsx 2>/dev/null || true
cp -f "_fix_goaldesc_backup_1761500996/goal-description.tsx" components/mars/goal-description.tsx 2>/dev/null || true
rm -rf .next
echo "Готово. Перезапусти dev-сервер: npm run dev"
