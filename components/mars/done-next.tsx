"use client"

import type React from "react"

// === SAFE SELECTION HELPERS (fixed) ===
function __fallbackRange(): Range {
  const r = document.createRange();
  const root = (document.body || document.documentElement);
  try { r.setStart(root, 0); } catch {}
  try { r.collapse(true); } catch {}
  return r;
}
function safeGetRange(): Range {
  const sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0) return __fallbackRange();
  try { return sel.getRangeAt(0); } catch { return __fallbackRange(); }
}
// Prefer textarea/input selection when available (window.getSelection doesn't work for <textarea>)
function getSelectionOffsets(): { start: number; end: number } {
  const ae = document.activeElement as (HTMLTextAreaElement | HTMLInputElement | null);
  if (ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && (ae as HTMLInputElement).type === 'text'))) {
    const start = (ae as HTMLTextAreaElement).selectionStart ?? 0;
    const end = (ae as HTMLTextAreaElement).selectionEnd ?? start;
    return { start, end };
  }
  // Fallback to DOM Range over contenteditable/text nodes
  const r = safeGetRange();
  const start = r.startOffset ?? 0;
  const end = r.endOffset ?? start;
  return { start, end };
}
// === END SAFE SELECTION HELPERS ===

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TextFormatMenu } from "@/components/ui/text-format-menu"
import { Plus, X } from "lucide-react"
import type { OnePagerData } from "@/types/onepager"

interface DoneNextProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

// Auto-growing textarea (no internal scrollbars, grows with content)
const AutoGrowTextarea: React.FC<{
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
}> = ({ value, onChange, onContextMenu, placeholder, className }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const autoresize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(() => { autoresize() }, [])
  useEffect(() => { autoresize() }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e) }}
      onContextMenu={onContextMenu}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: 'hidden', resize: 'none' }}
      className={
        (
          "flex-1 w-full px-3 py-2 text-sm rounded-md border border-[var(--mars-gray-border)] " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mars-blue-primary)] " +
          "bg-white shadow-sm leading-5 min-h-[36px] " +
          (className ? className : "")
        )
      }
    />
  )
}

export function DoneNext({ data, setData }: DoneNextProps) {
  const [formatMenu, setFormatMenu] = useState<{
    show: boolean
    x: number
    y: number
    type: "done" | "next" | null
    index: number | null
  }>({
    show: false,
    x: 0,
    y: 0,
    type: null,
    index: null,
  })

  const addDone = () => {
    setData({ ...data, done: [...data.done, "New completed item"] })
  }

  const addNext = () => {
    setData({ ...data, next: [...data.next, "New upcoming item"] })
  }

  const removeDone = (idx: number) => {
    setData({ ...data, done: data.done.filter((_, i) => i !== idx) })
  }

  const removeNext = (idx: number) => {
    setData({ ...data, next: data.next.filter((_, i) => i !== idx) })
  }

  const updateDone = (idx: number, value: string) => {
    const newDone = [...data.done]
    newDone[idx] = value
    setData({ ...data, done: newDone })
  }

  const updateNext = (idx: number, value: string) => {
    const newNext = [...data.next]
    newNext[idx] = value
    setData({ ...data, next: newNext })
  }

  const handleContextMenu = (e: React.MouseEvent, type: "done" | "next", index: number) => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      e.preventDefault()
      setFormatMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        type,
        index,
      })
    }
  }

  const handleFormat = (format: "bold" | "italic" | "underline" | "link" | "code") => {
    const selection = window.getSelection()
    if (!selection || formatMenu.type === null || formatMenu.index === null) return

    const selectedText = selection.toString()
    let formattedText = ""

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`
        break
      case "italic":
        formattedText = `*${selectedText}*`
        break
      case "underline":
        formattedText = `__${selectedText}__`
        break
      case "link":
        const url = prompt("Enter URL:")
        if (url) formattedText = `[${selectedText}](${url})`
        else return
        break
      case "code":
        formattedText = `\`${selectedText}\``
        break
    }

    const items = formatMenu.type === "done" ? data.done : data.next
    const currentValue = items[formatMenu.index]
    const { start: startOffset, end: endOffset } = getSelectionOffsets()

    const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)

    if (formatMenu.type === "done") {
      updateDone(formatMenu.index, newValue)
    } else {
      updateNext(formatMenu.index, newValue)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 animate-slide-up">
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4">Done (Prev Month)</h3>
        <div className="space-y-2">
          {data.done.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <AutoGrowTextarea
                value={item}
                onChange={(e) => updateDone(idx, e.target.value)}
                onContextMenu={(e) => handleContextMenu(e, "done", idx)}
                placeholder="Completed item..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDone(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          onClick={addDone}
          variant="outline"
          size="sm"
          className="mt-4 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </Card>

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4">Next (Next Month)</h3>
        <div className="space-y-2">
          {data.next.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <AutoGrowTextarea
                value={item}
                onChange={(e) => updateNext(idx, e.target.value)}
                onContextMenu={(e) => handleContextMenu(e, "next", idx)}
                placeholder="Upcoming item..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeNext(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          onClick={addNext}
          variant="outline"
          size="sm"
          className="mt-4 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </Card>

      {formatMenu.show && (
        <TextFormatMenu
          position={{ x: formatMenu.x, y: formatMenu.y }}
          onFormat={handleFormat}
          onClose={() => setFormatMenu({ show: false, x: 0, y: 0, type: null, index: null })}
        />
      )}
    </div>
  )
}
