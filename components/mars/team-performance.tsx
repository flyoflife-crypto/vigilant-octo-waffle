"use client"

import { useEffect, useRef, useState } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X } from "lucide-react"

import type { OnePagerData, StatusColor, TeamMetric } from "@/types/onepager"

interface TeamPerformanceProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

export function TeamPerformance({ data, setData }: TeamPerformanceProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; idx: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const addMetric = () => {
    const nextMetric: TeamMetric = { label: "Metric", value: "0", color: "green" }
    const next: OnePagerData = {
      ...data,
      teamMetrics: ([...(data.teamMetrics ?? []), nextMetric] as TeamMetric[]),
    }
    setData(next)
  }

  const removeMetric = (idx: number) => {
    const nextArr: TeamMetric[] = (data.teamMetrics ?? []).filter((_, i) => i !== idx)
    setData({ ...data, teamMetrics: nextArr })
  }

  const updateMetric = (idx: number, field: "label" | "value", value: string) => {
    const arr: TeamMetric[] = [ ...(data.teamMetrics ?? []) ]
    if (!arr[idx]) return
    arr[idx] = { ...arr[idx], [field]: value } as TeamMetric
    setData({ ...data, teamMetrics: arr })
  }

  const changeMetricColor = (idx: number, color: StatusColor) => {
    const arr: TeamMetric[] = [ ...(data.teamMetrics ?? []) ]
    if (!arr[idx]) return
    arr[idx] = { ...arr[idx], color } as TeamMetric
    setData({ ...data, teamMetrics: arr })
    setContextMenu(null)
  }

  const handleContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, idx })
  }

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, idx })
      return
    }
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      longPressTimer.current = setTimeout(() => {
        setContextMenu({ x: e.clientX, y: e.clientY, idx })
      }, 500)
    }
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <Card className="p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow animate-slide-up">
      <h3 className="text-base md:text-lg font-bold text-[var(--mars-blue-primary)] mb-3">Team Performance</h3>

      <div className="flex flex-wrap gap-2">
        {(data.teamMetrics ?? []).map((metric, idx) => (
          <div
            key={idx}
            className={`rounded-lg px-2.5 py-1.5 min-w-[80px] relative group cursor-pointer transition-all hover:scale-105 ${
              metric.color === "green"
                ? "bg-[var(--status-green)]/20 border-2 border-[var(--status-green)]"
                : metric.color === "yellow"
                  ? "bg-[var(--status-yellow)]/20 border-2 border-[var(--status-yellow)]"
                  : "bg-[var(--status-red)]/20 border-2 border-[var(--status-red)]"
            }`}
            onContextMenu={(e) => handleContextMenu(e, idx)}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            onPointerUp={handlePointerUp}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeMetric(idx)}
              className="absolute -top-2 -right-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="w-3 h-3" />
            </Button>
            <Input
              value={metric.value}
              onChange={(e) => updateMetric(idx, "value", e.target.value)}
              className="text-base font-bold text-center bg-transparent border-none p-0 h-auto mb-0.5 focus-visible:ring-0"
            />
            <Input
              value={metric.label}
              onChange={(e) => updateMetric(idx, "label", e.target.value)}
              className="text-[8px] uppercase text-center bg-transparent border-none p-0 h-auto opacity-80 focus-visible:ring-0"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={addMetric}
        variant="outline"
        size="sm"
        className="mt-3 gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent text-xs h-8"
      >
        <Plus className="w-3 h-3" />
        Add Metric
      </Button>

      {contextMenu && (
        <div
          className="fixed bg-white shadow-lg rounded-lg py-1 z-50 min-w=[160px] border border-gray-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
            onClick={() => changeMetricColor(contextMenu.idx, "green")}
          >
            <div className="w-3 h-3 rounded-full bg-[var(--status-green)]" />
            On Track
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
            onClick={() => changeMetricColor(contextMenu.idx, "yellow")}
          >
            <div className="w-3 h-3 rounded-full bg-[var(--status-yellow)]" />
            At Risk
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
            onClick={() => changeMetricColor(contextMenu.idx, "red")}
          >
            <div className="w-3 h-3 rounded-full bg-[var(--status-red)]" />
            Delayed
          </button>
        </div>
      )}
    </Card>
  )
}
