import type { OnePagerData } from "@/types/onepager"

const MAX_HISTORY = 10

export interface HistoryState {
  past: OnePagerData[]
  present: OnePagerData
  future: OnePagerData[]
}

export function createHistoryState(initialData: OnePagerData): HistoryState {
  return {
    past: [],
    present: initialData,
    future: [],
  }
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0
}

export function undo(history: HistoryState): HistoryState {
  if (!canUndo(history)) return history

  const previous = history.past[history.past.length - 1]
  const newPast = history.past.slice(0, history.past.length - 1)

  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo(history: HistoryState): HistoryState {
  if (!canRedo(history)) return history

  const next = history.future[0]
  const newFuture = history.future.slice(1)

  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  }
}

export function pushHistory(history: HistoryState, newData: OnePagerData): HistoryState {
  // Don't add to history if data hasn't changed
  if (JSON.stringify(history.present) === JSON.stringify(newData)) {
    return history
  }

  const newPast = [...history.past, history.present]

  // Keep only last MAX_HISTORY items
  if (newPast.length > MAX_HISTORY) {
    newPast.shift()
  }

  return {
    past: newPast,
    present: newData,
    future: [], // Clear future when new change is made
  }
}

// Save/load history from localStorage
export function saveHistoryToStorage(projectId: string, history: HistoryState): void {
  try {
    localStorage.setItem(`mars-history-${projectId}`, JSON.stringify(history))
  } catch (error) {
    console.error("[v0] Failed to save history:", error)
  }
}

export function loadHistoryFromStorage(projectId: string, defaultData: OnePagerData): HistoryState {
  try {
    const stored = localStorage.getItem(`mars-history-${projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("[v0] Failed to load history:", error)
  }
  return createHistoryState(defaultData)
}
