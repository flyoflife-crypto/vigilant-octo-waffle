"use client"

import type React from "react"

import { useEffect, useLayoutEffect, useRef } from "react"

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 250) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}

export type BarModel = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  label?: string
  locked?: boolean
}

type DraggableBarProps = {
  bar: BarModel
  onCommit: (next: BarModel) => void
  snap?: (x: number, width: number) => { x: number; width: number }
  bounds?: { minX: number; maxX: number }
  rowHeight?: number
  onContextMenu?: (e: React.MouseEvent) => void
  onDoubleClick?: () => void
}

export const DraggableBar: React.FC<DraggableBarProps> = ({
  bar,
  onCommit,
  snap,
  bounds,
  rowHeight,
  onContextMenu,
  onDoubleClick,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const lastX = useRef(bar.x)
  const lastW = useRef(bar.width)
  const rafActive = useRef(false)
  const rafId = useRef<number | null>(null)
  const dragging = useRef<"none" | "move" | "resize">("none")
  const start = useRef<{ pointerX: number; baseX: number; baseW: number }>({
    pointerX: 0,
    baseX: bar.x,
    baseW: bar.width,
  })

  const applyTransform = (x: number) => {
    const el = rootRef.current
    if (!el) return
    el.style.transform = `translate3d(${x}px, 0, 0)`
  }

  const applyWidth = (w: number) => {
    const el = rootRef.current
    if (!el) return
    el.style.width = `${w}px`
  }

  const clamp = (x: number, w: number) => {
    if (!bounds) return { x, w }
    const minX = bounds.minX ?? Number.NEGATIVE_INFINITY
    const maxX = bounds.maxX ?? Number.POSITIVE_INFINITY
    if (x < minX) x = minX
    if (x + w > maxX) x = Math.max(minX, maxX - w)
    w = Math.max(1, w)
    return { x, w }
  }

  const startRaf = () => {
    if (rafActive.current) return
    rafActive.current = true
    const tick = () => {
      applyTransform(lastX.current)
      applyWidth(lastW.current)
      if (rafActive.current) {
        rafId.current = requestAnimationFrame(tick)
      }
    }
    rafId.current = requestAnimationFrame(tick)
  }

  const stopRaf = () => {
    rafActive.current = false
    if (rafId.current != null) cancelAnimationFrame(rafId.current)
    rafId.current = null
  }

  const beginGestureStyle = () => {
    const el = rootRef.current
    if (!el) return
    el.style.willChange = "transform, width"
    el.style.transition = "none"
    el.classList.add("dragging")
  }

  const endGestureStyle = () => {
    const el = rootRef.current
    if (!el) return
    el.style.willChange = ""
    el.style.transition = ""
    el.classList.remove("dragging")
  }

  const onPointerDownMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (dragging.current !== "none") return
    dragging.current = "move"
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { pointerX: e.clientX, baseX: bar.x, baseW: bar.width }
    lastX.current = bar.x
    lastW.current = bar.width
    beginGestureStyle()
    startRaf()
  }

  const onPointerDownResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (dragging.current !== "none") return
    e.stopPropagation()
    dragging.current = "resize"
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { pointerX: e.clientX, baseX: bar.x, baseW: bar.width }
    lastX.current = bar.x
    lastW.current = bar.width
    beginGestureStyle()
    startRaf()
  }

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (dragging.current === "none") return
      const dx = ev.clientX - start.current.pointerX
      if (dragging.current === "move") {
        let nx = start.current.baseX + dx
        let nw = start.current.baseW
        ;({ x: nx, w: nw } = clamp(nx, nw))
        if (snap) ({ x: nx, width: nw } = snap(nx, nw))
        lastX.current = nx
        lastW.current = nw
      } else if (dragging.current === "resize") {
        let nw = Math.max(1, start.current.baseW + dx)
        let nx = start.current.baseX
        ;({ x: nx, w: nw } = clamp(nx, nw))
        if (snap) ({ x: nx, width: nw } = snap(nx, nw))
        lastX.current = nx
        lastW.current = nw
      }
    }

    const onUp = () => {
      if (dragging.current === "none") return
      let nx = lastX.current
      let nw = lastW.current
      if (snap) ({ x: nx, width: nw } = snap(nx, nw))
      stopRaf()
      endGestureStyle()
      dragging.current = "none"
      const next: BarModel = { ...bar, x: nx, width: nw }
      onCommit(next)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp, { passive: true })
    window.addEventListener("pointercancel", onUp, { passive: true })

    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [bar, onCommit, snap, bounds])

  useLayoutEffect(() => {
    lastX.current = bar.x
    lastW.current = bar.width
    applyTransform(bar.x)
    applyWidth(bar.width)
    const el = rootRef.current
    if (el) {
      el.style.height = `${rowHeight ?? bar.height}px`
      if (bar.color) el.style.background = bar.color
    }
  }, [bar.x, bar.width, bar.height, bar.color, rowHeight])

  return (
    <div
      ref={rootRef}
      className="absolute rounded-md shadow-sm select-none flex items-center px-2 text-xs font-semibold text-white"
      style={{
        left: 0,
        top: bar.y,
        height: rowHeight ?? bar.height,
        width: bar.width,
        background: bar.color || "var(--status-green)",
        transform: `translate3d(${bar.x}px, 0, 0)`,
        cursor: bar.locked ? "not-allowed" : "grab",
      }}
      onPointerDown={bar.locked ? undefined : onPointerDownMove}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      role="button"
      aria-label="Gantt bar"
    >
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-white/30"
        onPointerDown={bar.locked ? undefined : onPointerDownResize}
        aria-label="Resize handle left"
      />
      <span className="truncate">{bar.label}</span>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-white/30"
        onPointerDown={bar.locked ? undefined : onPointerDownResize}
        aria-label="Resize handle right"
      />
    </div>
  )
}
