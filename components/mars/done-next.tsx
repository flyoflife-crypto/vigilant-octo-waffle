"use client"

import type React from "react"

// === SAFE SELECTION HELPERS (auto-injected) ===
function __fallbackRange(): Range {
  const r = document.createRange();
  const root = (document.body || document.documentElement);
  // если в корне нет текстовых узлов, схлопываем в root
  try { r.setStart(root, 0); } catch { }
  try { r.collapse(true); } catch { }
  return r;
}
function safeGetRange(): Range {
  const sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0) return __fallbackRange();
  try { return /*SAFE*/(safeGetRangeFrom(sel)); } catch { return __fallbackRange(); }
}
function safeGetRangeFrom(sel: Selection | null): Range {
  if (!sel || sel.rangeCount === 0) return __fallbackRange();
  try { return /*SAFE*/(safeGetRangeFrom(sel)); } catch { return __fallbackRange(); }
}
// === END SAFE SELECTION HELPERS ===

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextFormatMenu } from "@/components/ui/text-format-menu"
import { Plus, X } from "lucide-react"
import type { OnePagerData } from "@/types/onepager"

interface DoneNextProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
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
    const range = /*SAFE*/(safeGetRangeFrom(selection))
    const startOffset = range.startOffset
    const endOffset = range.endOffset

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
              <Input
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
              <Input
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
