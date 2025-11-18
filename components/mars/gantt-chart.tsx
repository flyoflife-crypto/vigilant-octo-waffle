"use client";

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GanttData } from "@/types/onepager"
import { Plus, Trash2, Edit2, Circle } from "lucide-react"

/* === inline EditableSpan helper (typed) === */
function EditableSpan({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (t: string) => void;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault?.();
      const target = e.target as HTMLElement | null;
      target?.blur();
    }
  };
  const safe: string = (value ?? '').toString();
  return (
    <span tabIndex={0} contentEditable
      suppressContentEditableWarning
      onKeyDown={onKeyDown}
      onBlur={(e: React.FocusEvent<HTMLSpanElement>) =>
        onCommit(((e.target as HTMLElement)?.innerText ?? '').toString().trim())
      }
      className={`${className ?? ''} cursor-text outline-none ring-1 ring-transparent focus:ring-[var(--mars-blue-primary)]/40 rounded-sm px-0.5`}
    >
      {safe}
    </span>
  );
}

function updateRowTitle(data:any,onChange:(d:any)=>void, idx:number, text:string){
  const rows=Array.isArray(data?.rows)?[...data.rows]:[];
  rows[idx]=text;
  onChange?.({...data, rows});
}
function updateBarText(data:any,onChange:(d:any)=>void, idx:number, text:string){
  const bars=Array.isArray(data?.bars)?[...data.bars]:[];
  if(!bars[idx]) return;
  bars[idx] = {...bars[idx], label:text, text:text};
  onChange?.({...data, bars});
}
function updateMsText(data:any,onChange:(d:any)=>void, idx:number, text:string){
  const ms=Array.isArray(data?.milestones)?[...data.milestones]:[];
  if(!ms[idx]) return;
  ms[idx] = {...ms[idx], label:text, text:text};
  onChange?.({...data, milestones:ms});
}
function addRow(data:any,onChange:(d:any)=>void){
  const rows=Array.isArray(data?.rows)?[...data.rows]:[];
  const next = `Row ${rows.length+1}`;
  rows.push(next);
  onChange?.({...data, rows});
}
function removeRowAt(data:any,onChange:(d:any)=>void, idx:number){
  const rows=Array.isArray(data?.rows)?[...data.rows]:[];
  if(idx<0||idx>=rows.length) return;
  rows.splice(idx,1);
  onChange?.({...data, rows});
}
/** Enter не переносит строку в contentEditable */
function onEditableKeyDown(e: any){
  if(e.key==='Enter'){
    e.preventDefault();
    (e.target as HTMLElement).blur?.();
  }
}
const editableClass="cursor-text outline-none ring-1 ring-transparent focus:ring-[var(--mars-blue-primary)]/40 rounded-sm px-0.5";



// === rows helpers (CSP-safe, no prompt) ===
function addRowWithDefaults(data:any, onChange:(d:any)=>void) {
  const rows = Array.isArray(data?.rows) ? [...data.rows] : [];
  const base = "New Row";
  let name = base, i = 1;
  const set = new Set(rows.map((r:any)=>String(r)));
  while (set.has(name)) name = base + " " + (++i);
  rows.push(name);
  onChange?.({ ...data, rows });
}

/** remove row + reindex bars/milestones by .row if present */
function removeRowAtIndex(data:any, onChange:(d:any)=>void, idx:number) {
  if (!data || !Array.isArray(data.rows) || idx < 0 || idx >= data.rows.length) return;
  const rows = data.rows.slice(0, idx).concat(data.rows.slice(idx + 1));

  let bars = Array.isArray(data?.bars) ? data.bars.map((b:any)=>({ ...b })) : [];
  if (bars.length && typeof bars[0]?.row !== 'undefined') {
    bars = bars
      .filter((b:any) => b.row !== idx)
      .map((b:any) => (b.row > idx ? { ...b, row: b.row - 1 } : b));
  }

  let milestones = Array.isArray(data?.milestones) ? data.milestones.map((m:any)=>({ ...m })) : [];
  if (milestones.length && typeof milestones[0]?.row !== 'undefined') {
    milestones = milestones
      .filter((m:any) => m.row !== idx)
      .map((m:any) => (m.row > idx ? { ...m, row: m.row - 1 } : m));
  }

  onChange?.({ ...data, rows, bars, milestones });
}
// === end helpers ===

/** prompt-редактор, возвращает строку или null */
function promptEditText(title: string, initial: string = ""): string | null {
  try {
    const g: any = (globalThis as any);
    const p = g && typeof g.prompt === "function" ? g.prompt : null;
    if (p) {
      const res = p(title, initial);
      return res == null ? null : String(res);
    }
    return null;
  } catch { return null; }
}







interface GanttChartProps {
  type: "year" | "quarter"
  title: string
  data: GanttData
  onChange: (data: GanttData) => void
  selectedQuarter?: number
  onQuarterChange?: (quarter: number) => void
}

export function GanttChart({ type, title, data, onChange, selectedQuarter, onQuarterChange }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [selectedMs, setSelectedMs] = useState<number | null>(null)
  const [dragState, setDragState] = useState<{
    type: "bar" | "milestone" | "bar-resize" | "now-line"
    idx: number
    startX: number
    startCol: number
    startEnd?: number
    handle?: "left" | "right"
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [containerWidth, setContainerWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(48);
  const [rowHeights, setRowHeights] = useState<number[]>([]);
  const [rowTops, setRowTops] = useState<number[]>([]); // centers of each row from top of container

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      setContainerWidth(containerRef.current.offsetWidth);
      const rows = Array.from(containerRef.current.querySelectorAll('[data-row]')) as HTMLElement[];
      if (rows.length) {
        const heights: number[] = [];
        const tops: number[] = [];
        let accTop = 0;
        for (const el of rows) {
          const h = el.getBoundingClientRect().height || 48;
          heights.push(h);
          // center of the row relative to container
          tops.push(accTop + h / 2);
          accTop += h;
        }
        setRowHeights(heights);
        setRowTops(tops);
        // keep rowHeight as a fallback (use first row height)
        if (Number.isFinite(heights[0])) setRowHeight(heights[0]!);
      } else {
        setRowHeights([]);
        setRowTops([]);
      }
    };
    const RO: any = (typeof window !== 'undefined' && (window as any).ResizeObserver) ? (window as any).ResizeObserver : null;
    let ro: any = null;
    if (RO) {
      ro = new RO(measure);
      ro.observe(containerRef.current);
    } else {
      // Fallback: listen to window resize if ResizeObserver is unavailable
      window.addEventListener('resize', measure);
    }
    // initial measure
    measure();
    return () => {
      if (ro && typeof ro.disconnect === 'function') ro.disconnect();
      else if (typeof window !== 'undefined') window.removeEventListener('resize', measure);
    };
  }, [containerRef]);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<{ x: number; y: number; element: HTMLElement } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, items: any[]) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  const handlePointerDown = (e: React.PointerEvent, element: HTMLElement, items: any[]) => {
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, items })
      return
    }

    if (e.pointerType === "touch" || e.pointerType === "pen") {
      longPressTarget.current = { x: e.clientX, y: e.clientY, element }
      longPressTimer.current = setTimeout(() => {
        if (longPressTarget.current) {
          setContextMenu({ x: longPressTarget.current.x, y: longPressTarget.current.y, items })
        }
      }, 500)
    }
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressTarget.current = null
  }

  const handlePointerMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // NEW: clear selection on document click and on Escape
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setSelectedBar(null)
      setSelectedMs(null)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setSelectedBar(null)
        setSelectedMs(null)
      }
    }
    document.addEventListener("click", handleClick)
    document.addEventListener("keydown", handleKey)

    /** === text mutators for inline editing === */
    function renameRow(idx: number, text: string){
      const rows = Array.isArray(data?.rows) ? [...data.rows] : [];
      if (idx < 0 || idx >= rows.length) return;
      rows[idx] = text || rows[idx];
      onChange({ ...data, rows });
    }
    function setBarText(idx: number, text: string){
      const bars = Array.isArray(data?.bars) ? data.bars.map((b:any,i:number)=> i===idx ? ({...b, label: text||b.label, text: text||b.text}) : b) : [];
      onChange({ ...data, bars });
    }
    function setMsText(idx: number, text: string){
      const milestones = Array.isArray(data?.milestones) ? data.milestones.map((m:any,i:number)=> i===idx ? ({...m, label: text||m.label, text: text||m.text}) : m) : [];
      onChange({ ...data, milestones });
    }
    function updateLabel(colIndex:number, which:'top'|'bottom', text:string){
      const labels = Array.isArray(data?.labels) ? data.labels.map((l:any,i:number)=> i===colIndex ? ({...l, [which]: text||l[which]}) : l) : [];
      onChange({ ...data, labels });
    }

    return () => {
      document.removeEventListener("click", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - 120
        const cellWidth = (rect.width - 120) / data.labels.length
        const col = Math.floor(x / cellWidth)
        const clampedCol = Math.max(0, Math.min(data.labels.length - 1, col))

        if (dragState.type === "bar") {
          const bar = data.bars[dragState.idx]
          const width = bar.end - bar.start
          const newStart = clampedCol
          const newEnd = Math.min(data.labels.length - 1, newStart + width)
          const newBars = [...data.bars]
          newBars[dragState.idx] = { ...bar, start: newStart, end: newEnd }
          onChange({ ...data, bars: newBars })
        } else if (dragState.type === "bar-resize") {
          const bar = data.bars[dragState.idx]
          const newBars = [...data.bars]
          if (dragState.handle === "left") {
            newBars[dragState.idx] = { ...bar, start: Math.min(clampedCol, bar.end) }
          } else {
            newBars[dragState.idx] = { ...bar, end: Math.max(clampedCol, bar.start) }
          }
          onChange({ ...data, bars: newBars })
        } else if (dragState.type === "milestone") {
          const ms = data.milestones[dragState.idx] as any
          // horizontal floating position across the grid [0..N]
          let f = x / cellWidth
          // clamp to [0, labels.length]
          f = Math.max(0, Math.min(data.labels.length, f))

          // snapping modifiers
          if ((e as MouseEvent).altKey) {
            // hard snap to month boundaries (start/end)
            const w = Math.floor(f)
            const delta = f - w
            f = delta < 0.5 ? w : w + 1
          } else if ((e as MouseEvent).shiftKey) {
            // soft snap to nearest of 0 / 0.5 / 1 within the cell
            const w = Math.floor(f)
            const delta = f - w
            const pts = [0, 0.5, 1]
            let best = 0, bestD = Infinity
            for (const p of pts) {
              const d = Math.abs(delta - p)
              if (d < bestD) { bestD = d; best = p }
            }
            f = w + best
          }

          // convert to (at, frac)
          f = Math.max(0, Math.min(data.labels.length, f))
          let at = Math.min(data.labels.length - 1, Math.floor(f))
          let frac = f - at
          if (at === data.labels.length - 1 && frac > 1) frac = 1

          // vertical snap to nearest row center
          let row = ms.row as number | null
          const y = e.clientY - rect.top
          if (Array.isArray(rowTops) && rowTops.length) {
            let bestIdx = 0, bestDist = Infinity
            for (let i = 0; i < rowTops.length; i++) {
              const d = Math.abs(y - rowTops[i])
              if (d < bestDist) { bestDist = d; bestIdx = i }
            }
            row = bestIdx
          }

          const nextMs = [...data.milestones]
          nextMs[dragState.idx] = { ...ms, row, at, frac }
          onChange({ ...data, milestones: nextMs })
        } else if (dragState.type === "now-line") {
          const frac = Math.max(0, Math.min(1, (x % cellWidth) / cellWidth))
          onChange({ ...data, nowCol: clampedCol, nowFrac: frac })
        }
      })
    }

    const handleMouseUp = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setDragState(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [dragState, data, onChange, rowTops])

  const createBar = (rowIdx: number, colIdx: number) => {
    const newBar = {
      row: rowIdx,
      start: colIdx,
      end: colIdx,
      label: "New Task",
      status: "green" as const,
    }
    onChange({ ...data, bars: [...data.bars, newBar] })
  }

  const addMilestone = (rowIdx: number | null, colIdx: number) => {
    const newMs = {
      row: rowIdx,
      at: colIdx,
      frac: 0.5,
      label: "Milestone",
    }
    onChange({ ...data, milestones: [...data.milestones, newMs] })
  }

  const deleteBar = (idx: number) => {
    const newBars = data.bars.filter((_, i) => i !== idx)
    onChange({ ...data, bars: newBars })
    setSelectedBar(null)
  }

  const deleteMs = (idx: number) => {
    const newMs = data.milestones.filter((_, i) => i !== idx)
    onChange({ ...data, milestones: newMs })
    setSelectedMs(null)
  }

  const changeBarStatus = (idx: number, status: "green" | "yellow" | "red") => {
    const newBars = [...data.bars]
    newBars[idx] = { ...newBars[idx], status }
    onChange({ ...data, bars: newBars })
  }

  const addRow = () => {
    const base = "Row";
    const used = new Set((data.rows ?? []).map((r) => String(r)));
    let i = (data.rows?.length ?? 0) + 1;
    let name = `${base} ${i}`;
    while (used.has(name)) {
      i += 1;
      name = `${base} ${i}`;
    }
    onChange({ ...data, rows: [...data.rows, name] });
  }

  const addRowAbove = (idx: number) => {
    const base = "Row";
    const used = new Set((data.rows ?? []).map((r) => String(r)));
    const suggested = `${base} ${idx + 1}`;
    const fromPrompt = null;
    let name = (fromPrompt ?? '').trim();
    if (!name) {
      let i = idx + 1;
      name = `${base} ${i}`;
      while (used.has(name)) {
        i += 1;
        name = `${base} ${i}`;
      }
    }

    const newRows = [...data.rows];
    newRows.splice(idx, 0, name);

    const newBars = data.bars.map((bar) => ({
      ...bar,
      row: bar.row >= idx ? bar.row + 1 : bar.row,
    }));
    const newMs = data.milestones.map((ms) => ({
      ...ms,
      row: ms.row !== null && ms.row >= idx ? ms.row + 1 : ms.row,
    }));

    onChange({ ...data, rows: newRows, bars: newBars, milestones: newMs });
  }

  const addRowBelow = (idx: number) => {
    const base = "Row";
    const used = new Set((data.rows ?? []).map((r) => String(r)));
    const suggested = `${base} ${idx + 2}`;
    const fromPrompt = null;
    let name = (fromPrompt ?? '').trim();
    if (!name) {
      let i = idx + 2;
      name = `${base} ${i}`;
      while (used.has(name)) {
        i += 1;
        name = `${base} ${i}`;
      }
    }

    const newRows = [...data.rows];
    newRows.splice(idx + 1, 0, name);

    const newBars = data.bars.map((bar) => ({
      ...bar,
      row: bar.row > idx ? bar.row + 1 : bar.row,
    }));
    const newMs = data.milestones.map((ms) => ({
      ...ms,
      row: ms.row !== null && ms.row > idx ? ms.row + 1 : ms.row,
    }));

    onChange({ ...data, rows: newRows, bars: newBars, milestones: newMs });
  }

  const deleteRow = (idx: number) => {
    const newRows = data.rows.filter((_, i) => i !== idx)
    const newBars = data.bars
      .filter((bar) => bar.row !== idx)
      .map((bar) => ({
        ...bar,
        row: bar.row > idx ? bar.row - 1 : bar.row,
      }))
    const newMs = data.milestones
      .filter((ms) => ms.row === null || ms.row !== idx)
      .map((ms) => ({
        ...ms,
        row: ms.row !== null && ms.row > idx ? ms.row - 1 : ms.row,
      }))
    onChange({ ...data, rows: newRows, bars: newBars, milestones: newMs })
  }

  const editRowLabel = (idx: number, newLabel: string) => {
    const newRows = [...data.rows]
    newRows[idx] = newLabel
    onChange({ ...data, rows: newRows })
  }

  const editBarLabel = (idx: number, newLabel: string) => {
    const newBars = [...data.bars]
    newBars[idx] = { ...newBars[idx], label: newLabel }
    onChange({ ...data, bars: newBars })
  }

  const editMsLabel = (idx: number, newLabel: string) => {
    const newMs = [...data.milestones]
    newMs[idx] = { ...newMs[idx], label: newLabel }
    onChange({ ...data, milestones: newMs })
  }

  const editTickLabel = (idx: number, newLabel: string) => {
    const newLabels = [...data.labels]
    newLabels[idx] = newLabel
    onChange({ ...data, labels: newLabels })
  }


  return (
    <Card className="p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow animate-slide-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-4">
  <h3 className="text-base md:text-lg font-bold text-[var(--mars-blue-primary)]">{title}</h3>
  {type === "quarter" && typeof onQuarterChange === "function" && (
    <Select value={selectedQuarter?.toString()} onValueChange={(v) => onQuarterChange(Number.parseInt(v))}>
      <SelectTrigger className="w-24 h-8 text-sm">
        <SelectValue placeholder="Q" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">Q1</SelectItem>
        <SelectItem value="1">Q2</SelectItem>
        <SelectItem value="2">Q3</SelectItem>
        <SelectItem value="3">Q4</SelectItem>
      </SelectContent>
    </Select>
  )}
</div>
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={addRow}
            className="px-3 py-1.5 text-sm bg-[var(--mars-blue-primary)] text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 print:hidden"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
          <div className="flex items-center gap-3 text-xs md:text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--status-green)]" />
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--status-yellow)]" />
              <span>At Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--status-red)]" />
              <span>Delayed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline header */}
      <div className="flex mb-2 overflow-x-auto">
        <div className="w-[120px] flex-shrink-0" />
        <div className="flex-1 flex border-b border-gray-300 min-w-max">
          {data.labels.map((label, i) => (
            <div
              key={i}
              className="flex-1 text-center text-xs py-2 hover:bg-gray-50 cursor-pointer min-w-[60px]"
              onDoubleClick={() => {}}
              onContextMenu={(e) => { e.preventDefault(); }}
            >
              {typeof label === "string" ? (
    <EditableSpan
      value={typeof label === "string" ? label : String(label)}
      onCommit={(t) => editTickLabel(i, t)}
    />
  ) : (
                <div className="flex flex-col">
                  <div className="font-semibold text-[10px]">
                    {/* editable top label */}
                    <EditableSpan
                      value={label.top ?? ""}
                      onCommit={(t) => {
                        const labels = (data.labels ?? []).map((L, idx) =>
                          idx === i ? { ...(L as any), top: t } : L
                        );
                        onChange({ ...data, labels });
                      }}
                    />
                  </div>
                  <div className="text-[10px] opacity-60">
                    {/* editable bottom label */}
                    <EditableSpan
                      value={label.bottom ?? ""}
                      onCommit={(t) => {
                        const labels = (data.labels ?? []).map((L, idx) =>
                          idx === i ? { ...(L as any), bottom: t } : L
                        );
                        onChange({ ...data, labels });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt body */}
      <div ref={containerRef} className="relative overflow-x-auto overflow-y-visible pt-8">
        {data.rows.map((rowName, rowIdx) => (
          <div
            key={rowIdx}
            data-row
            className="flex min-h-[48px] border-b border-gray-200 hover:bg-gray-50 relative group"
            onContextMenu={(e) =>
              handleContextMenu(e, [
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add row above
                    </span>
                  ),
                  action: () => addRowAbove(rowIdx),
                },
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add row below
                    </span>
                  ),
                  action: () => addRowBelow(rowIdx),
                },
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> Rename row
                    </span>
                  ),
                  action: () => {},
                },
                {
                  label: (
                    <span className="flex items-center gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" /> Delete row
                    </span>
                  ),
                  action: () => deleteRow(rowIdx),
                },
                { type: "separator" },
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add bar here
                    </span>
                  ),
                  action: () => createBar(rowIdx, 0),
                },
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add milestone
                    </span>
                  ),
                  action: () => addMilestone(rowIdx, 0),
                },
              ])
            }
          >
            {/* Row label */}
            <div
              className="w-[120px] flex-shrink-0 px-2 py-3 text-sm font-semibold flex items-center cursor-pointer overflow-hidden border-r border-gray-200"
              onDoubleClick={() => {}}
            >
              {/* inline editable row */}
              <span tabIndex={0} contentEditable
                suppressContentEditableWarning
                className={editableClass + " whitespace-pre-wrap break-words break-all leading-tight block"}
                onKeyDown={onEditableKeyDown}
                onBlur={(e)=>updateRowTitle(data, onChange, rowIdx, (e.target as HTMLElement).innerText.trim())}
              >{rowName}</span>
            </div>

            {/* Grid cells */}
            <div
              className="flex-1 flex relative min-w-max"
              onMouseDown={() => { setSelectedBar(null); setSelectedMs(null); setContextMenu(null); }}
            >
              {data.labels.map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="flex-1 border-r border-gray-100 relative min-w-[60px]"
                  onDoubleClick={() => createBar(rowIdx, colIdx)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, [
                      {
                        label: (
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add bar
                          </span>
                        ),
                        action: () => createBar(rowIdx, colIdx),
                      },
                      {
                        label: (
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add milestone
                          </span>
                        ),
                        action: () => addMilestone(rowIdx, colIdx),
                      },
                    ])
                  }
                />
              ))}

              {/* Render bars for this row */}
              {data.bars
                .filter((bar) => bar.row === rowIdx)
                .map((bar, barIdx) => {
                  const actualIdx = data.bars.indexOf(bar)
                  const cellWidth = 100 / data.labels.length
                  const left = bar.start * cellWidth
                  const width = (bar.end - bar.start + 1) * cellWidth

                  return (
                    <div
                      key={actualIdx}
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-move flex items-center px-2 text-xs font-semibold text-white transition-shadow ${
                        bar.status === "green"
                          ? "bg-[var(--status-green)]"
                          : bar.status === "yellow"
                            ? "bg-[var(--status-yellow)] text-gray-900"
                            : "bg-[var(--status-red)]"
                      } ${selectedBar === actualIdx ? "ring-2 ring-blue-500" : ""}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onMouseDown={(e) => {
                        // If user clicked on an editable area (label), don't start drag
                        const target = e.target as HTMLElement;
                        if (target?.closest('[data-bar-edit]') || (target as any)?.isContentEditable) {
                          return;
                        }
                        e.preventDefault();
                        if (e.button === 0) {
                          setDragState({
                            type: "bar",
                            idx: actualIdx,
                            startX: e.clientX,
                            startCol: bar.start,
                          });
                          setSelectedBar(actualIdx);
                        }
                      }}
                      onDoubleClick={() => {}}
                      onContextMenu={(e) =>
                        handleContextMenu(e, [
                          {
                            label: (
                              <span className="flex items-center gap-2">
                                <Circle className="w-3 h-3 fill-[var(--status-green)] text-[var(--status-green)]" /> On
                                Track
                              </span>
                            ),
                            action: () => changeBarStatus(actualIdx, "green"),
                          },
                          {
                            label: (
                              <span className="flex items-center gap-2">
                                <Circle className="w-3 h-3 fill-[var(--status-yellow)] text-[var(--status-yellow)]" />{" "}
                                At Risk
                              </span>
                            ),
                            action: () => changeBarStatus(actualIdx, "yellow"),
                          },
                          {
                            label: (
                              <span className="flex items-center gap-2">
                                <Circle className="w-3 h-3 fill-[var(--status-red)] text-[var(--status-red)]" /> Delayed
                              </span>
                            ),
                            action: () => changeBarStatus(actualIdx, "red"),
                          },
                          { type: "separator" },
                          {
                            label: (
                              <span className="flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Edit label
                              </span>
                            ),
                            action: () => {},
                          },
                          {
                            label: (
                              <span className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-4 h-4" /> Delete bar
                              </span>
                            ),
                            action: () => deleteBar(actualIdx),
                          },
                        ])
                      }
                      onMouseLeave={() => { if (!dragState) setSelectedBar(null) }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setDragState({
                            type: "bar-resize",
                            idx: actualIdx,
                            startX: e.clientX,
                            startCol: bar.start,
                            startEnd: bar.end,
                            handle: "left",
                          })
                        }}
                      />
                      <span
                        className="truncate"
                        data-bar-edit
                        tabIndex={0}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                      >
                        {/* editable bar label */}
                        <EditableSpan
                          value={bar.label ?? ""}
                          onCommit={(t) => {
                            const bars = data.bars.map((b, i) =>
                              i === actualIdx ? { ...b, label: t } : b
                            );
                            onChange({ ...data, bars });
                          }}
                        />
                      </span>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setDragState({
                            type: "bar-resize",
                            idx: actualIdx,
                            startX: e.clientX,
                            startCol: bar.start,
                            startEnd: bar.end,
                            handle: "right",
                          })
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        {/* NOW line */}
        {containerWidth > 0 && (
          <div
            data-export-keep
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--mars-blue-primary)] cursor-ew-resize z-10 hover:w-1 transition-all"
            style={{
              left: `calc(120px + ${((data.nowCol + (data.nowFrac || 0)) / data.labels.length) * (containerWidth - 120)}px)`,
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                setDragState({
                  type: "now-line",
                  idx: -1,
                  startX: e.clientX,
                  startCol: data.nowCol,
                })
              }
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--mars-blue-primary)] whitespace-nowrap bg-white px-2 py-0.5 rounded shadow-sm border border-[var(--mars-blue-primary)]">
              Мы здесь
            </div>
          </div>
        )}

        {/* Milestones */}
        {containerWidth > 0 &&
          data.milestones.map((ms, msIdx) => {
            const cellWidth = (containerWidth - 120) / data.labels.length
            const msFrac = typeof (ms as any).frac === 'number' ? (ms as any).frac : 0.5
            const left = 120 + (ms.at + msFrac) * cellWidth

            let top = -30;
            if (ms.row !== null && ms.row >= 0 && ms.row < rowTops.length) {
              const barHalfHeight = 16; // h-8 => 32px bar height; half is 16px
              const rowCenter = rowTops[ms.row] ?? ((ms.row + 0.5) * rowHeight);
              top = rowCenter - barHalfHeight;
            }

            return (
              <div
                data-export-keep
                key={msIdx}
                className={`absolute cursor-move z-30 select-none ${selectedMs === msIdx ? "ring-2 ring-blue-500 rounded" : ""}`}
                style={{ left: `${left}px`, top: `${top}px`, transform: "translateX(-50%)" }}
                onMouseDown={(e) => {
                  // Allow editing label without starting drag
                  const target = e.target as HTMLElement;
                  if (target?.closest('[data-ms-edit]') || (target as any)?.isContentEditable) {
                    e.stopPropagation();
                    return;
                  }
                  e.preventDefault(); e.stopPropagation();
                  if (e.button === 0) {
                    setDragState({
                      type: "milestone",
                      idx: msIdx,
                      startX: e.clientX,
                      startCol: ms.at,
                    })
                    setSelectedMs(msIdx)
                  }
                }}
                onDoubleClick={() => {}}
                onContextMenu={(e) =>
                  handleContextMenu(e, [
                    {
                      label: (
                        <span className="flex items-center gap-2 text-red-600">
                          <Trash2 className="w-4 h-4" /> Delete milestone
                        </span>
                      ),
                      action: () => deleteMs(msIdx),
                    },
                  ])
                }
                onMouseLeave={() => { if (!dragState) setSelectedMs(null) }}
              >
                <div
                  className="text-[10px] font-semibold text-[var(--mars-blue-primary)] text-center whitespace-nowrap -mb-0.5"
                  data-ms-edit
                  onMouseDown={(e) => { e.stopPropagation(); }}
                >
                  <EditableSpan
                    value={ms.label ?? ""}
                    onCommit={(t) => {
                      const milestones = data.milestones.map((m, i) => i === msIdx ? { ...m, label: t, text: t } : m);
                      onChange({ ...data, milestones });
                    }}
                  />
                </div>
                <div className="w-5 h-5 bg-[var(--mars-blue-primary)] rotate-45 mx-auto mb-1 shadow-lg border-2 border-white" />
              </div>
            )
          })}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white shadow-lg rounded-lg py-1 z-50 min-w-[180px] border border-gray-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((item, i) =>
            item.type === "separator" ? (
              <div key={i} className="h-px bg-gray-200 my-1" />
            ) : (
              <button
                key={i}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                onClick={() => {
                  item.action()
                  setContextMenu(null)
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </Card>
  )
}


function editRowTitle(data: any, onChange: (d:any)=>void, idx: number) {
  const rows = Array.isArray(data?.rows) ? [...data.rows] : [];
  const current = String(rows[idx] ?? "");
  const next = promptEditText("Edit row title", current);
  if (next == null) return;
  rows[idx] = next;
  onChange?.({ ...data, rows });
}

function editBarText(data: any, onChange: (d:any)=>void, idx: number) {
  const bars = Array.isArray(data?.bars) ? [...data.bars] : [];
  if (!bars[idx]) return;
  const cur = String(bars[idx]?.label ?? bars[idx]?.text ?? "");
  const next = promptEditText("Edit bar text", cur);
  if (next == null) return;
  bars[idx] = { ...bars[idx], label: next, text: next };
  onChange?.({ ...data, bars });
}

function editMsText(data: any, onChange: (d:any)=>void, idx: number) {
  const ms = Array.isArray(data?.milestones) ? [...data.milestones] : [];
  if (!ms[idx]) return;
  const cur = String(ms[idx]?.label ?? ms[idx]?.text ?? "");
  const next = promptEditText("Edit milestone text", cur);
  if (next == null) return;
  ms[idx] = { ...ms[idx], label: next, text: next };
  onChange?.({ ...data, milestones: ms });
}