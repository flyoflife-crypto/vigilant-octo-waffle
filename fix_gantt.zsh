#!/usr/bin/env zsh
set -e
# отключаем history expansion в zsh, чтобы "!" не ломал команды,
# хотя в патче его нет — просто на всякий случай
set +H

F="components/mars/gantt-chart.tsx"
if [[ ! -f "$F" ]]; then
  echo "⛔ Файл не найден: $F"
  exit 1
fi

# Бэкап
cp -n "$F" "$F.bak.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Патчим проблемные места
perl -0777 -i -pe '
  # 1) Нормальный promptEditText (без прямого window.prompt в ноде)
  s/function\s+promptEditText\s*\([^)]*\)\s*:\s*string\s*\|\s*null\s*\{[\s\S]*?\n\}/function promptEditText(title: string, initial: string = ""): string | null {\n  try {\n    const g: any = (globalThis as any);\n    const p = g && typeof g.prompt === "function" ? g.prompt : null;\n    if (p) {\n      const res = p(title, initial);\n      return res == null ? null : String(res);\n    }\n    return null;\n  } catch { return null; }\n}\n/s;

  # 2) Чиним битые конструкции вида "fromPrompt = typeof window ? ... : ...;"
  s/\bfromPrompt\s*=\s*typeof\s+window[\s\S]*?;/fromPrompt = null;/g;

  # 3) Сметаем обрывки
  s/^\s*const\s+next\s*=\s*;\s*$//mg;
  s/window\.\s*;?//g;

  # 4) Убираем несуществующую переменную rowIdx из data-атрибута
  s/data-row-title=\{rowIdx\}\s*//g;

  # 5) Удаляем обращения к отсутствующей ф-ции focusRowInput
  s/onDoubleClick\s*=\s*\{\s*\(\)\s*=>\s*focusRowInput\([^}]*\)\s*\}/onDoubleClick={() => {}}/g;
  s/\bfocusRowInput\s*\([^)]*\)//g;
' "$F"

echo "✅ TSX patched"

# Чистим кеш и собираем
rm -rf .next out
npm run build
