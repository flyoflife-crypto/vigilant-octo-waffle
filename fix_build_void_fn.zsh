#!/usr/bin/env zsh
set -e
set +H

F="components/mars/gantt-chart.tsx"
[[ -f "$F" ]] || { echo "⛔ $F not found"; exit 1; }

# Бэкап
cp -n "$F" "$F.bak.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# 1) Чиним артефакт "function void 0 { ... }" и ставим простую заглушку
perl -0777 -i -pe '
  s/function\s+void\s+0\s*\{[\s\S]*?\}/function focusRowInput(idx: number): void { /* noop */ }/g;
  s/\bfromPrompt\s*=\s*typeof\s+window[\s\S]*?;/fromPrompt = null;/g;
  s/^\s*const\s+next\s*=\s*;\s*$//mg;
' "$F"

# 2) На случай, если ф-и всё ещё нет — добавим минимальную
grep -q "function focusRowInput(" "$F" || cat >> "$F" <<'TS'

function focusRowInput(idx: number): void { /* noop for build */ }
TS

echo "✅ Patched $F"

# 3) Сборка
rm -rf .next out
npm run build
