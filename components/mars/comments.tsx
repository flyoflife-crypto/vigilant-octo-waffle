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
import { Textarea } from "@/components/ui/textarea"
import { TextFormatMenu } from "@/components/ui/text-format-menu"
import type { OnePagerData } from "@/types/onepager"

interface CommentsProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

export function Comments({ data, setData }: CommentsProps) {
  const [formatMenu, setFormatMenu] = useState<{
    show: boolean
    x: number
    y: number
  }>({
    show: false,
    x: 0,
    y: 0,
  })

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      e.preventDefault()
      setFormatMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  const handleFormat = (format: "bold" | "italic" | "underline" | "link" | "code") => {
    const selection = window.getSelection()
    if (!selection) return

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

    const range = /*SAFE*/(safeGetRangeFrom(selection))
    const startOffset = range.startOffset
    const endOffset = range.endOffset

    const newValue = data.comments.substring(0, startOffset) + formattedText + data.comments.substring(endOffset)
    setData({ ...data, comments: newValue })
  }

  return (
    <Card className="p-6 shadow-sm hover:shadow-md transition-shadow animate-slide-up">
      <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4">Comments</h3>
      <Textarea
        value={data.comments}
        onChange={(e) => setData({ ...data, comments: e.target.value })}
        onContextMenu={handleContextMenu}
        className="min-h-[120px] resize-none border-[var(--mars-gray-border)] focus-visible:ring-[var(--mars-blue-primary)]"
        placeholder="Additional comments and notes..."
      />

      {formatMenu.show && (
        <TextFormatMenu
          position={{ x: formatMenu.x, y: formatMenu.y }}
          onFormat={handleFormat}
          onClose={() => setFormatMenu({ show: false, x: 0, y: 0 })}
        />
      )}
    </Card>
  )
}
