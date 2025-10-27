import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
}

/**
 * Надёжный редактор Markdown:
 * - хранит локальный текст и последние координаты выделения (selStart/selEnd);
 * - тулбар работает по сохранённой селекции, поэтому не зависит от фокуса;
 * - операции выполняются над textarea.value, затем восстанавливается выделение,
 *   и только после этого уведомляется родитель (чтобы ререндер не сбивал курсор).
 */
export default function MarkdownEditable({ value, onChange, className, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [text, setText] = useState<string>(value ?? '')
  const selStartRef = useRef<number>(0)
  const selEndRef = useRef<number>(0)
  const pendingSel = useRef<{ s: number; e: number } | null>(null)
  const isApplying = useRef(false)

  // синхронизация извне (если не в середине применения операции)
  useEffect(() => {
    if (!isApplying.current) setText(value ?? '')
  }, [value])

  // восстановление селекции после локального апдейта
  useEffect(() => {
    if (!pendingSel.current) return
    const { s, e } = pendingSel.current
    pendingSel.current = null
    requestAnimationFrame(() => {
      const ta = taRef.current
      if (ta) {
        try { ta.setSelectionRange(s, e) } catch {}
        ta.focus()
        selStartRef.current = s
        selEndRef.current = e
      }
    })
  }, [text])

  const ensureFocus = () => {
    const ta = taRef.current
    if (!ta) return null
    ta.focus()
    return ta
  }

  // обновляем ref-селекцию на любые изменения выделения
  const captureSelection = () => {
    const ta = taRef.current
    if (!ta) return
    selStartRef.current = ta.selectionStart ?? 0
    selEndRef.current = ta.selectionEnd ?? 0
  }

  function expandToWord(src: string, start: number, end: number): [number, number] {
    if (start !== end) return [start, end]
    let s = start, e = end
    while (s > 0 && /\S/.test(src[s - 1]) && !/\s/.test(src[s - 1])) s--
    while (e < src.length && /\S/.test(src[e]) && !/\s/.test(src[e])) e++
    if (s === e) {
      const L = src.lastIndexOf('\n', start - 1) + 1
      const R0 = src.indexOf('\n', start)
      const R = R0 === -1 ? src.length : R0
      const chunk = src.slice(L, R).trim()
      if (chunk.length > 0) return [L, R]
    }
    return [s, e]
  }

  function applyChange(newText: string, selStart: number, selEnd: number) {
    const ta = ensureFocus()
    if (!ta) return
    isApplying.current = true
    setText(newText)
    pendingSel.current = { s: selStart, e: selEnd }
    // уведомляем родителя после восстановления селекции
    setTimeout(() => {
      isApplying.current = false
      onChange(newText)
    }, 0)
  }

  function toggleWrap(before: string, after = before) {
    const ta = ensureFocus(); if (!ta) return
    const src = ta.value
    let s = selStartRef.current
    let e = selEndRef.current
    ;[s, e] = expandToWord(src, s, e)
    if (s === e) return // не вставляем пустые ****

    const hasLeft = s - before.length >= 0 && src.slice(s - before.length, s) === before
    const hasRight = src.slice(e, e + after.length) === after

    if (hasLeft && hasRight) {
      const newText = src.slice(0, s - before.length) + src.slice(s, e) + src.slice(e + after.length)
      const ns = s - before.length
      const ne = ns + (e - s)
      applyChange(newText, ns, ne)
    } else {
      const newText = src.slice(0, s) + before + src.slice(s, e) + after + src.slice(e)
      const ns = s + before.length
      const ne = ns + (e - s)
      applyChange(newText, ns, ne)
    }
  }

  function togglePrefix(prefix: string) {
    const ta = ensureFocus(); if (!ta) return
    const src = ta.value
    const s0 = selStartRef.current
    const e0 = selEndRef.current

    const lineStart = (i: number) => src.lastIndexOf('\n', i - 1) + 1
    const lineEnd = (i: number) => { const j = src.indexOf('\n', i); return j === -1 ? src.length : j }

    const L = lineStart(s0)
    const R = lineEnd(e0)

    const before = src.slice(0, L)
    const middle = src.slice(L, R)
    const after = src.slice(R)

    const lines = middle.split('\n')
    const allPrefixed = lines.every(l => l.startsWith(prefix))
    const newLines = allPrefixed
      ? lines.map(l => (l.startsWith(prefix) ? l.slice(prefix.length) : l))
      : lines.map(l => (l.trim().length === 0 ? l : (l.startsWith(prefix) ? l : prefix + l)))

    const newMiddle = newLines.join('\n')
    const newText = before + newMiddle + after
    const delta = newMiddle.length - middle.length

    applyChange(newText, s0, e0 + delta)
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggleWrap('**')} title="Bold"><b>B</b></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggleWrap('*')} title="Italic"><i>I</i></button>
        <span className="mx-2">|</span>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => togglePrefix('# ')} title="H1">H1</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => togglePrefix('## ')} title="H2">H2</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => togglePrefix('### ')} title="H3">H3</button>
        <span className="mx-2">|</span>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => togglePrefix('- ')} title="Bulleted">•</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => togglePrefix('1. ')} title="Numbered">1.</button>
        <span className="mx-2">|</span>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
          {mode === 'edit' ? 'Preview' : 'Edit'}
        </button>
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={taRef}
          className="w-full min-h-[160px] resize-y border rounded p-2"
          value={text}
          onChange={(e) => { setText(e.target.value); captureSelection() }}
          onKeyUp={captureSelection}
          onMouseUp={captureSelection}
          onSelect={captureSelection}
          onFocus={captureSelection}
          onBlur={() => onChange(text)}  /* синхронизация на всякий случай */
          placeholder={placeholder}
        />
      ) : (
        <div className="prose max-w-none border rounded p-3 bg-white">
          {text?.trim()
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            : <div className="opacity-60">{placeholder || 'Nothing to preview'}</div>}
        </div>
      )}
    </div>
  )
}
