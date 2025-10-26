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
 * Markdown-редактор без contentEditable:
 * - textarea + превью через react-markdown/remark-gfm
 * - тулбар без <button> (span role="button") — чтобы не было nested <button>
 * - клики на onMouseDown (раньше blur), хоткеи Cmd/Ctrl+B и Cmd/Ctrl+I
 * - хранит «последнюю валидную» селекцию; не добавляет **** в начало строки
 * - локальный state + мягкая синхронизация наружу (не сбивает каретку)
 */
export default function MarkdownEditable({ value, onChange, className, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [text, setText] = useState<string>(value ?? '')
  const isApplying = useRef(false)
  const pendingSel = useRef<{ s: number; e: number } | null>(null)

  // трекинг селекции
  const lastSel = useRef<{ s: number; e: number }>({ s: 0, e: 0 })
  const lastNonZeroSel = useRef<{ s: number; e: number }>({ s: 0, e: 0 })

  // принимать внешние апдейты только если мы сами сейчас не правим текст
  useEffect(() => {
    if (!isApplying.current) setText(value ?? '')
  }, [value])

  // восстановить селекцию после локального изменения
  useEffect(() => {
    if (!pendingSel.current) return
    const { s, e } = pendingSel.current
    pendingSel.current = null
    requestAnimationFrame(() => {
      const ta = taRef.current
      if (!ta) return
      try { ta.setSelectionRange(s, e) } catch {}
      ta.focus()
    })
  }, [text])

  // глобально следим за селекцией, пока активна наша textarea
  useEffect(() => {
    const handler = () => {
      const ta = taRef.current
      if (!ta) return
      if (document.activeElement === ta) {
        const s = ta.selectionStart ?? 0
        const e = ta.selectionEnd ?? 0
        lastSel.current = { s, e }
        if (s !== e) lastNonZeroSel.current = { s, e }
      }
    }
    document.addEventListener('selectionchange', handler, { passive: true })
    window.addEventListener('mouseup', handler, { passive: true })
    window.addEventListener('keyup', handler, { passive: true })
    return () => {
      document.removeEventListener('selectionchange', handler as any)
      window.removeEventListener('mouseup', handler as any)
      window.removeEventListener('keyup', handler as any)
    }
  }, [])

  const ensureTA = () => {
    const ta = taRef.current
    if (!ta) return null
    ta.focus()
    return ta
  }

  const emitChange = (v: string) => {
    // даём React дорендерить textarea и только потом сообщаем наружу
    setTimeout(() => onChange(v), 0)
  }

  function applyChange(newText: string, s: number, e: number) {
    const ta = ensureTA(); if (!ta) return
    isApplying.current = true
    setText(newText)
    pendingSel.current = { s, e }
    isApplying.current = false
    emitChange(newText)
  }

  function getStableRange(): { s: number; e: number } | null {
    const cur = lastSel.current
    if (cur.s !== cur.e) return cur
    const prev = lastNonZeroSel.current
    if (prev.s !== prev.e) return prev
    return null
  }

  function toggleWrap(before: string, after = before) {
    const rng = getStableRange(); if (!rng) return
    const { s, e } = rng
    const src = text
    const hasLeft  = s - before.length >= 0 && src.slice(s - before.length, s) === before
    const hasRight = src.slice(e, e + after.length) === after

    if (hasLeft && hasRight) {
      // снять обёртку
      const newText = src.slice(0, s - before.length) + src.slice(s, e) + src.slice(e + after.length)
      const ns = s - before.length
      const ne = ns + (e - s)
      applyChange(newText, ns, ne)
    } else {
      // добавить обёртку
      const newText = src.slice(0, s) + before + src.slice(s, e) + after + src.slice(e)
      const ns = s + before.length
      const ne = ns + (e - s)
      applyChange(newText, ns, ne)
    }
  }

  function togglePrefix(prefix: string) {
    const rng = getStableRange(); if (!rng) return
    const { s: s0, e: e0 } = rng
    const src = text
    const lineStart = (i: number) => src.lastIndexOf('\n', i - 1) + 1
    const lineEnd   = (i: number) => { const j = src.indexOf('\n', i); return j === -1 ? src.length : j }
    const L = lineStart(s0), R = lineEnd(e0)
    const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R)

    const lines = middle.split('\n')
    const allPrefixed = lines.every(l => l.startsWith(prefix))
    const newLines = allPrefixed
      ? lines.map(l => (l.startsWith(prefix) ? l.slice(prefix.length) : l))
      : lines.map(l => (l.trim().length === 0 ? l : (l.startsWith(prefix) ? l : prefix + l)))

    const newMiddle = newLines.join('\n')
    const delta = newMiddle.length - middle.length
    const newText = before + newMiddle + after
    applyChange(newText, s0, e0 + delta)
  }

  // хоткеи
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.ctrlKey || e.metaKey
    if (!meta) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); toggleWrap('**') }
    if (k === 'i') { e.preventDefault(); toggleWrap('*') }
  }

  // элемент тулбара — span role="button" (без <button>, чтобы не было вложенности)
  const makeItem = (action: () => void, label: string, node: React.ReactNode) => {
    const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); action() }
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action() }
    }
    return (
      <span
        role="button"
        aria-label={label}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onKeyDown={onKey}
        className="inline-flex items-center px-2 py-1 rounded border bg-white cursor-pointer select-none hover:bg-gray-50"
      >
        {node}
      </span>
    )
  }

  return (
    <div className={className} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center gap-2 mb-2 select-none" role="toolbar" aria-label="Formatting">
        {makeItem(() => toggleWrap('**'), 'Bold', <b>B</b>)}
        {makeItem(() => toggleWrap('*'),  'Italic', <i>I</i>)}
        <span className="mx-2">|</span>
        {makeItem(() => togglePrefix('# '),   'H1', <>H1</>)}
        {makeItem(() => togglePrefix('## '),  'H2', <>H2</>)}
        {makeItem(() => togglePrefix('### '), 'H3', <>H3</>)}
        <span className="mx-2">|</span>
        {makeItem(() => togglePrefix('- '),   'Bulleted list', <>•</>)}
        {makeItem(() => togglePrefix('1. '),  'Numbered list', <>1.</>)}
      </div>

      <textarea
        ref={taRef}
        className="w-full min-h-[160px] resize-y border rounded p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
      />

      <div className="prose max-w-none border rounded p-3 bg-white mt-3">
        {text?.trim()
          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          : <div className="opacity-60">{placeholder || 'Nothing to preview'}</div>}
      </div>
    </div>
  )
}