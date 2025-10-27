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

interface ExtraSectionsProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

export function ExtraSections({ data, setData }: ExtraSectionsProps) {
  const [formatMenu, setFormatMenu] = useState<{
    show: boolean
    x: number
    y: number
    sectionId: string | null
    itemIndex: number | null
  }>({
    show: false,
    x: 0,
    y: 0,
    sectionId: null,
    itemIndex: null,
  })

  const addSection = () => {
    setData({
      ...data,
      extraSections: [...data.extraSections, { id: Date.now().toString(), title: "New Section", items: ["Item 1"] }],
    })
  }

  const removeSection = (id: string) => {
    setData({
      ...data,
      extraSections: data.extraSections.filter((s) => s.id !== id),
    })
  }

  const updateSectionTitle = (id: string, title: string) => {
    setData({
      ...data,
      extraSections: data.extraSections.map((s) => (s.id === id ? { ...s, title } : s)),
    })
  }

  const addItem = (id: string) => {
    setData({
      ...data,
      extraSections: data.extraSections.map((s) => (s.id === id ? { ...s, items: [...s.items, "New item"] } : s)),
    })
  }

  const removeItem = (id: string, itemIdx: number) => {
    setData({
      ...data,
      extraSections: data.extraSections.map((s) =>
        s.id === id ? { ...s, items: s.items.filter((_, i) => i !== itemIdx) } : s,
      ),
    })
  }

  const updateItem = (id: string, itemIdx: number, value: string) => {
    setData({
      ...data,
      extraSections: data.extraSections.map((s) =>
        s.id === id ? { ...s, items: s.items.map((item, i) => (i === itemIdx ? value : item)) } : s,
      ),
    })
  }

  const handleContextMenu = (e: React.MouseEvent, sectionId: string, itemIndex: number) => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      e.preventDefault()
      setFormatMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        sectionId,
        itemIndex,
      })
    }
  }

  const handleFormat = (format: "bold" | "italic" | "underline" | "link" | "code") => {
    const selection = window.getSelection()
    if (!selection || formatMenu.sectionId === null || formatMenu.itemIndex === null) return

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

    const section = data.extraSections.find((s) => s.id === formatMenu.sectionId)
    if (!section) return

    const currentValue = section.items[formatMenu.itemIndex]
    const range = /*SAFE*/(safeGetRangeFrom(selection))
    const startOffset = range.startOffset
    const endOffset = range.endOffset

    const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)
    updateItem(formatMenu.sectionId, formatMenu.itemIndex, newValue)
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {data.extraSections.map((section) => (
        <Card key={section.id} className="p-6 shadow-sm hover:shadow-md transition-shadow relative group">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeSection(section.id)}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </Button>

          <Input
            value={section.title}
            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
            className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4 border-none p-0 h-auto focus-visible:ring-0"
          />

          <div className="space-y-2">
            {section.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group/item">
                <Input
                  value={item}
                  onChange={(e) => updateItem(section.id, idx, e.target.value)}
                  onContextMenu={(e) => handleContextMenu(e, section.id, idx)}
                  className="flex-1 border-[var(--mars-gray-border)] focus-visible:ring-[var(--mars-blue-primary)]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(section.id, idx)}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={() => addItem(section.id)}
            variant="outline"
            size="sm"
            className="mt-4 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </Card>
      ))}

      <Button
        onClick={addSection}
        variant="outline"
        className="w-full gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </Button>

      {formatMenu.show && (
        <TextFormatMenu
          position={{ x: formatMenu.x, y: formatMenu.y }}
          onFormat={handleFormat}
          onClose={() => setFormatMenu({ show: false, x: 0, y: 0, sectionId: null, itemIndex: null })}
        />
      )}
    </div>
  )
}
