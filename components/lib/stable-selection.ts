
let lastNonEmpty: Range | null = null

function safeGetRange(sel: Selection | null): Range {
  const rng = document.createRange();
  const root = (document.body || document.documentElement) as Node;
  try {
    rng.setStart(root, 0);
    rng.setEnd(root, 0);
  } catch {}
  if (!sel || typeof sel.rangeCount !== "number" || sel.rangeCount === 0) return rng;
  try {
    return sel.getRangeAt(0);
  } catch {
    return rng;
  }
}

function isEditable(el: Element | null): boolean {
  if (!el) return false
  const anyEl = el as any
  if (anyEl.tagName === 'TEXTAREA' || (anyEl as HTMLInputElement).type === 'text') return true
  if (el.hasAttribute && el.hasAttribute('contenteditable')) return true
  // поднимаемся к родителю на случай вложенности
  let p = el.parentElement
  while (p) {
    if (p.hasAttribute && p.hasAttribute('contenteditable')) return true
    p = p.parentElement
  }
  return false
}

export function getStableRange(): Range | null {
  const sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null
  if (sel && sel.rangeCount > 0) {
    try {
      const r = safeGetRange(sel)
      // если активен editable и диапазон непустой — обновим lastNonEmpty
      if (r && !r.collapsed && isEditable(document.activeElement)) {
        lastNonEmpty = r.cloneRange()
      }
      if (r && !r.collapsed) return r
    } catch {}
  }
  return lastNonEmpty ? lastNonEmpty.cloneRange() : null
}

// Подписка на изменение выделения — чтобы ловить последний валидный диапазон
if (typeof document !== 'undefined') {
  const handler = () => {
    try {
      const sel = window.getSelection?.()
      if (!sel || sel.rangeCount === 0) return
      const r = safeGetRange(sel)
      if (r && !r.collapsed && isEditable(document.activeElement)) {
        lastNonEmpty = r.cloneRange()
      }
    } catch {}
  }
  document.addEventListener('selectionchange', handler, { passive: true })
  window.addEventListener?.('mouseup', handler, { passive: true })
  window.addEventListener?.('keyup', handler, { passive: true })
}
