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

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextFormatMenu } from "@/components/ui/text-format-menu"
import { Plus, X, Circle } from "lucide-react"
import type { OnePagerData, StatusColor } from "@/types/onepager"
import { useState, useRef, useEffect, useLayoutEffect } from "react"

interface RisksArtifactsProps {
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
          "w-full px-3 py-2 text-sm rounded-md border border-[var(--mars-gray-border)] " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mars-blue-primary)] " +
          "bg-white shadow-sm leading-5 min-h-[36px] " +
          (className ? className : "")
        )
      }
    />
  )
}

export function RisksArtifacts({ data, setData }: RisksArtifactsProps) {
  const [formatMenu, setFormatMenu] = useState<{
    show: boolean
    x: number
    y: number
    type: "risk" | "mitigation" | "artifact" | null
    index: number | null
  }>({
    show: false,
    x: 0,
    y: 0,
    type: null,
    index: null,
  })

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    riskIndex: number
  } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const addRisk = () => {
    setData({
      ...data,
      risks: [...data.risks, { risk: "New risk", impact: "yellow", mitigation: "Mitigation plan" }],
    })
  }

  const removeRisk = (idx: number) => {
    setData({ ...data, risks: data.risks.filter((_, i) => i !== idx) })
  }

  const updateRisk = (idx: number, field: keyof (typeof data.risks)[0], value: string | StatusColor) => {
    const newRisks = [...data.risks]
    newRisks[idx][field] = value as any
    setData({ ...data, risks: newRisks })
  }

  const handleImpactClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()

    // Right click or Ctrl+Click (Mac)
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      setContextMenu({ x: e.clientX, y: e.clientY, riskIndex: idx })
    }
  }

  const handleImpactMouseDown = (e: React.MouseEvent, idx: number) => {
    if (e.button === 0 && !e.ctrlKey) {
      // Long press for touchpad
      const timer = setTimeout(() => {
        setContextMenu({ x: e.clientX, y: e.clientY, riskIndex: idx })
      }, 500)
      setLongPressTimer(timer)
    }
  }

  const handleImpactMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const setImpact = (impact: StatusColor) => {
    if (contextMenu) {
      updateRisk(contextMenu.riskIndex, "impact", impact)
      setContextMenu(null)
    }
  }

  const getImpactColor = (impact: StatusColor) => {
    switch (impact) {
      case "green":
        return "text-green-500"
      case "yellow":
        return "text-yellow-500"
      case "red":
        return "text-red-500"
    }
  }

  const getImpactLabel = (impact: StatusColor) => {
    switch (impact) {
      case "green":
        return "Low"
      case "yellow":
        return "Medium"
      case "red":
        return "High"
    }
  }

  const addArtifact = () => {
    setData({
      ...data,
      artifacts: [...data.artifacts, { label: "📄 New artifact", url: "#" }],
    })
  }

  const removeArtifact = (idx: number) => {
    setData({ ...data, artifacts: data.artifacts.filter((_, i) => i !== idx) })
  }

  const updateArtifact = (idx: number, field: "label" | "url", value: string) => {
    const newArtifacts = [...data.artifacts]
    newArtifacts[idx][field] = value
    setData({ ...data, artifacts: newArtifacts })
  }

  const handleContextMenu = (e: React.MouseEvent, type: "risk" | "mitigation" | "artifact", index: number) => {
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

    const range = /*SAFE*/(safeGetRangeFrom(selection))
    const startOffset = range.startOffset
    const endOffset = range.endOffset

    if (formatMenu.type === "risk") {
      const currentValue = data.risks[formatMenu.index].risk
      const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)
      updateRisk(formatMenu.index, "risk", newValue)
    } else if (formatMenu.type === "mitigation") {
      const currentValue = data.risks[formatMenu.index].mitigation
      const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)
      updateRisk(formatMenu.index, "mitigation", newValue)
    } else if (formatMenu.type === "artifact") {
      const currentValue = data.artifacts[formatMenu.index].label
      const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)
      updateArtifact(formatMenu.index, "label", newValue)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 animate-slide-up">
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4">Risks</h3>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_1fr] gap-2 pb-2 border-b border-[var(--mars-gray-border)] font-semibold text-sm text-gray-600">
            <div>Risk</div>
            <div className="text-center">Impact</div>
            <div>Mitigation</div>
          </div>

          {data.risks.map((risk, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_100px_1fr] gap-2 items-start group border-b border-[var(--mars-gray-border)] pb-2 relative"
            >
              <AutoGrowTextarea
                value={risk.risk}
                onChange={(e) => updateRisk(idx, "risk", e.target.value)}
                onContextMenu={(e) => handleContextMenu(e, "risk", idx)}
                placeholder="Risk description"
              />

              <button
                onContextMenu={(e) => handleImpactClick(e, idx)}
                onClick={(e) => {
                  if (e.ctrlKey) handleImpactClick(e, idx)
                }}
                onMouseDown={(e) => handleImpactMouseDown(e, idx)}
                onMouseUp={handleImpactMouseUp}
                onMouseLeave={handleImpactMouseUp}
                className="self-start flex items-center justify-center gap-1 min-h-[36px] px-2 rounded border border-[var(--mars-gray-border)] hover:bg-gray-50 transition-colors cursor-pointer"
                title="Right-click or Ctrl+Click to change"
              >
                <Circle className={`w-4 h-4 fill-current ${getImpactColor(risk.impact)}`} />
                <span className="text-xs">{getImpactLabel(risk.impact)}</span>
              </button>

              <div className="flex items-center gap-2">
                <AutoGrowTextarea
                  value={risk.mitigation}
                  onChange={(e) => updateRisk(idx, "mitigation", e.target.value)}
                  onContextMenu={(e) => handleContextMenu(e, "mitigation", idx)}
                  placeholder="Mitigation plan"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRisk(idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={addRisk}
          variant="outline"
          size="sm"
          className="mt-4 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent"
        >
          <Plus className="w-4 h-4" />
          Add Risk
        </Button>

        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => setImpact("green")}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Circle className="w-4 h-4 fill-current text-green-500" />
              Low
            </button>
            <button
              onClick={() => setImpact("yellow")}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Circle className="w-4 h-4 fill-current text-yellow-500" />
              Medium
            </button>
            <button
              onClick={() => setImpact("red")}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Circle className="w-4 h-4 fill-current text-red-500" />
              High
            </button>
          </div>
        )}
      </Card>

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-4">Artifacts</h3>

        <div className="space-y-2">
          {data.artifacts.map((artifact, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <Input
                value={artifact.label}
                onChange={(e) => updateArtifact(idx, "label", e.target.value)}
                onContextMenu={(e) => handleContextMenu(e, "artifact", idx)}
                className="flex-1 border-[var(--mars-gray-border)] focus-visible:ring-[var(--mars-blue-primary)]"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeArtifact(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          onClick={addArtifact}
          variant="outline"
          size="sm"
          className="mt-4 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent"
        >
          <Plus className="w-4 h-4" />
          Add Artifact
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
