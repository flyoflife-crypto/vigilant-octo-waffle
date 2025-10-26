set -euo pipefail

echo "→ Create fix branch"
git checkout -b fix-selection-bugs 2>/dev/null || true

# 1) Не даём фокусу улетать при клике по кнопкам тулбара
echo "→ Patch toolbar buttons (prevent blur on mousedown)"
perl -0777 -i -pe 's/<button([^>]*?)onClick=/<button\1 onMouseDown={(e) => e.preventDefault()} onClick=/g' components/ui/rich-text-editor.tsx 2>/dev/null || true
perl -0777 -i -pe 's/<button([^>]*?)onClick=/<button\1 onMouseDown={(e) => e.preventDefault()} onClick=/g' components/MarkdownEditable.tsx 2>/dev/null || true

# 2) Вставляем safeRange() один раз после импортов, если его ещё нет
echo "→ Inject safeRange() helper"
perl -0777 -i -pe '
  if ($_ !~ /safeRange\s*=\s*\(\)\s*=>/s) {
    s/(import[^;]+;\s*)/$1\n\/\/ Safe range helper to avoid IndexSizeError\nconst safeRange = (): Range | null => {\n  const sel = (typeof window !== "undefined" && window.getSelection) \n    ? window.getSelection()\n    : (typeof document !== "undefined" && (document as any).getSelection && (document as any).getSelection());\n  if (!sel || sel.rangeCount === 0) return null;\n  try { return sel.getRangeAt(0); } catch { return null; }\n};\n\n/s;
  }
' components/ui/rich-text-editor.tsx 2>/dev/null || true

# 3) Заменяем прямые вызовы getRangeAt(0) на safeRange() + guard
echo "→ Replace direct getRangeAt(0) calls with safeRange() + guard"
perl -0777 -i -pe 's/((?:window|document)\.getSelection\(\)\.getRangeAt\(0\))/safeRange()/g' components/ui/rich-text-editor.tsx 2>/dev/null || true
perl -0777 -i -pe 's/const\s+range\s*=\s*safeRange\(\)\s*;/const range = safeRange(); if (!range) { return; }/g' components/ui/rich-text-editor.tsx 2>/dev/null || true

# 4) Форматирование (не обязательно)
echo "→ Prettier (optional)"
npx prettier -w components/ui/rich-text-editor.tsx components/MarkdownEditable.tsx 2>/dev/null || true

git add -A
git commit -m "Fix IndexSizeError: safe getSelection() + keep focus on toolbar mousedown" 2>/dev/null || true

echo "✓ Done. Restart dev server if needed (or hot reload will pick it up)."
