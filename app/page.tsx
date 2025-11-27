"use client";
import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/mars/header"
import { GoalDescription } from "@/components/mars/goal-description"
import { GanttChart } from "@/components/mars/gantt-chart"
import { DoneNext } from "@/components/mars/done-next"
import { TeamPerformance } from "@/components/mars/team-performance"
import { RisksArtifacts } from "@/components/mars/risks-artifacts"
import { Comments } from "@/components/mars/comments"
import { ExtraSections } from "@/components/mars/extra-sections"
import { TopButtons } from "@/components/mars/top-buttons"
import { ProjectManager } from "@/components/mars/project-manager"
import { useToast } from "@/hooks/use-toast"
import { sanitizeHTML } from "@/lib/sanitize"
import type { OnePagerData, GanttData } from "@/types/onepager"
import { exportFullPagePng } from '@/lib/png';
import MarkdownHotkeys from "@/components/global/MarkdownHotkeys";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Settings as SettingsIcon } from "lucide-react"
import {
  getAllProjects,
  getActiveProjectId,
  setActiveProjectId,
  saveProject,
  createNewProject,
  type Project,
} from "@/lib/storage"
import {
  createHistoryState,
  canUndo,
  canRedo,
  undo,
  redo,
  pushHistory,
  saveHistoryToStorage,
  loadHistoryFromStorage,
  type HistoryState,
} from "@/lib/history"

const QUARTER_PERIODS: number[][] = [
  [1, 2, 3], // Q1
  [4, 5, 6], // Q2
  [7, 8, 9], // Q3
  [10, 11, 12, 13], // Q4
]
const QUARTER_MONTHS_ENG = [
  ["Jan", "Feb", "Mar"], // Q1
  ["Apr", "May", "Jun"], // Q2
  ["Jul", "Aug", "Sep"], // Q3
  ["Oct", "Nov", "Dec"], // Q4
]

const quarterRanges = [
  { start: 0, end: 11, periods: QUARTER_PERIODS[0], months: QUARTER_MONTHS_ENG[0] },
  { start: 12, end: 23, periods: QUARTER_PERIODS[1], months: QUARTER_MONTHS_ENG[1] },
  { start: 24, end: 35, periods: QUARTER_PERIODS[2], months: QUARTER_MONTHS_ENG[2] },
  { start: 36, end: 51, periods: QUARTER_PERIODS[3], months: QUARTER_MONTHS_ENG[3] },
]

const weekToPeriod = (weekIndex: number) => Math.min(13, Math.floor(weekIndex / 4) + 1)

export default function OnePagerPage() {
  const { toast } = useToast()

  // Hide service UI only via CSS (screenshot-mode); do not mutate inline styles to avoid Windows/Electron persistence bugs
  async function withHiddenDuringExport(cb: () => Promise<void> | void, _extraSelector: string = "") {
    // Block context menus during export (Windows/Electron may spawn native context menu)
    const preventContext = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('contextmenu', preventContext, { capture: true });

    // Give the UI a frame to apply screenshot-mode CSS before capture
    await new Promise(r => requestAnimationFrame(r));

    try {
      await cb();
    } finally {
      document.removeEventListener('contextmenu', preventContext, { capture: true } as any);
    }
  }

  const handleExportPNG = useCallback(async () => {
    try {
      setScreenshotMode(true);
      await withHiddenDuringExport(async () => {
        const isWindows = navigator.userAgent.toLowerCase().includes('windows')
        // On Windows Electron, native capture drops some absolutely-positioned overlays (milestones/now-line).
        // Force the HTML-to-image path (our helper) with a minimal filter.
        const opts: any = {
          saveAs: true,
          // Only exclude elements explicitly marked as export-hidden
          filter: (n: any) => !(n?.classList && n.classList.contains('export-hidden')),
        }

        if (!isWindows && (window as any).native?.exportFullPagePNG) {
          // macOS/Linux can use native path fine
          await (window as any).native.exportFullPagePNG()
          return
        }
        await exportFullPagePng('#onepagerRoot', 'onepager.png', opts)
      });
      setTimeout(() => {
        toast({ title: "Exported to PNG", description: "Full page PNG saved" });
      }, 250);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "PNG export failed" });
    } finally {
      setScreenshotMode(false);
    }
  }, [toast]);
  const searchParams = useSearchParams()
  const isPresentationMode = searchParams.get("presentation") === "true"
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [data, setData] = useState<OnePagerData | null>(null)
  const [history, setHistory] = useState<HistoryState | null>(null)
  const [showTopMenu, setShowTopMenu] = useState(false)
  const [screenshotMode, setScreenshotMode] = useState(false)

  useEffect(() => {
    const b = document?.body
    if (!b) return
    if (screenshotMode) b.classList.add('screenshot-mode')
    else b.classList.remove('screenshot-mode')
    return () => b.classList.remove('screenshot-mode')
  }, [screenshotMode])

  // Runtime visibility toggles (persisted to localStorage)
  const [showTeam, setShowTeam] = useState(true)
  const [showComments, setShowComments] = useState(true)

  useEffect(() => {
    try {
      // Backward/forward compatibility: accept both legacy and new keys
      const sT = (localStorage.getItem('pref.showTeam') ?? localStorage.getItem('tp'))
      const sC = (localStorage.getItem('pref.showComments') ?? localStorage.getItem('comments'))
      if (sT !== null) setShowTeam(sT === 'true')
      if (sC !== null) setShowComments(sC === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('pref.showTeam', String(showTeam))
      localStorage.setItem('tp', String(showTeam))
    } catch {}
  }, [showTeam])

  useEffect(() => {
    try {
      localStorage.setItem('pref.showComments', String(showComments))
      localStorage.setItem('comments', String(showComments))
    } catch {}
  }, [showComments])

  const isInitialMount = useRef(true)
  const lastSavedData = useRef<string>("")

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${data?.projectName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exported to JSON",
      description: "Project data has been exported successfully",
    })
  }, [data, toast])

  const handleImportJSON = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          setData(imported)
          toast({
            title: "Imported from JSON",
            description: "Project data has been loaded successfully",
          })
        } catch (error) {
          toast({
            title: "Import failed",
            description: "Invalid JSON file",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [toast])

  const handleExportPDF = useCallback(() => {
    setScreenshotMode(true);
    const onAfter = () => {
      setScreenshotMode(false);
      window.removeEventListener('afterprint', onAfter);
    };
    window.addEventListener('afterprint', onAfter);

    withHiddenDuringExport(() => { window.print(); });

    toast({
      title: "Exporting to PDF",
      description: "Use your browser print dialog to save as PDF",
    });
  }, [toast]);

  const handleExportHTML = useCallback(async () => {
    try {
      setScreenshotMode(true)
      await new Promise((r) => setTimeout(r, 50))
      const res = await (window as any).native?.exportFullPagePNG?.();
      setTimeout(() => {
        toast({ title: "Exported to PNG", description: "Full page PNG saved" });
      }, 250);
    } catch (e) {
      console.error(e);
      toast({ variant:"destructive", title:"PNG export failed" });
    } finally {
      setScreenshotMode(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const projects = await getAllProjects()
        const activeId = getActiveProjectId()

        if (cancelled) return

        if (projects.length === 0) {
          const newProject = createNewProject("My First Project")
          try {
            const savedProject = await saveProject(newProject)
            if (cancelled) return
            setActiveProjectId(savedProject.id)
            setCurrentProject(savedProject)
            setData(savedProject.data)
            setHistory(loadHistoryFromStorage(savedProject.id, savedProject.data))
            lastSavedData.current = JSON.stringify(savedProject.data)
          } catch (error) {
            throw error
          }
        } else {
          const active = projects.find((p) => p.id === activeId) || projects[0]
          if (cancelled) return
          setCurrentProject(active)
          setData(active.data)
          setActiveProjectId(active.id)
          setHistory(loadHistoryFromStorage(active.id, active.data))
          lastSavedData.current = JSON.stringify(active.data)
        }
      } catch (error) {
        console.error(error)
        toast({ variant: "destructive", title: "Failed to load projects from SharePoint" })
      } finally {
        if (!cancelled) {
          isInitialMount.current = false
        }
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [toast])

  useEffect(() => {
    if (isInitialMount.current || !currentProject || !data || !history) return

    const currentDataString = JSON.stringify(data)
    if (currentDataString === lastSavedData.current) return

    lastSavedData.current = currentDataString

    const updatedProject: Project = {
      ...currentProject,
      data,
      updatedAt: new Date().toISOString(),
    }

    setCurrentProject(updatedProject)

    const newHistory = pushHistory(history, data)
    setHistory(newHistory)
    saveHistoryToStorage(updatedProject.id, newHistory)

    ;(async () => {
      try {
        await saveProject(updatedProject)
      } catch (e) {
        console.error(e)
        toast({
          variant: "destructive",
          title: "Failed to save project to SharePoint",
        })
      }
    })()
  }, [data, currentProject, history, toast])

  const handleUndo = useCallback(() => {
    if (!history || !canUndo(history)) return

    const newHistory = undo(history)
    setHistory(newHistory)
    setData(newHistory.present)
    saveHistoryToStorage(currentProject!.id, newHistory)

    toast({
      title: "Undo",
      description: "Reverted to previous state",
    })
  }, [history, currentProject, toast])

  const handleRedo = useCallback(() => {
    if (!history || !canRedo(history)) return

    const newHistory = redo(history)
    setHistory(newHistory)
    setData(newHistory.present)
    saveHistoryToStorage(currentProject!.id, newHistory)

    toast({
      title: "Redo",
      description: "Restored next state",
    })
  }, [history, currentProject, toast])

  const handleCreateNew = useCallback(
    async (name: string) => {
      const newProject = createNewProject(name)
      try {
        const savedProject = await saveProject(newProject)
        setCurrentProject(savedProject)
        setData(savedProject.data)
        setActiveProjectId(savedProject.id)
        setHistory(createHistoryState(savedProject.data))
        lastSavedData.current = JSON.stringify(savedProject.data)
        toast({
          title: "Project created",
          description: `Created new project "${name}"`,
        })
      } catch (error) {
        console.error(error)
        toast({ variant: "destructive", title: "Failed to create project" })
      }
    },
    [toast],
  )

  const handleDuplicate = useCallback(
    async (project: Project) => {
      const newName = prompt("Enter name for duplicated project:", `${project.name} (Copy)`)
      if (newName) {
        const newProject = createNewProject(newName, project.data)
        try {
          const savedProject = await saveProject(newProject)
          setCurrentProject(savedProject)
          setData(savedProject.data)
          setActiveProjectId(savedProject.id)
          setHistory(createHistoryState(savedProject.data))
          lastSavedData.current = JSON.stringify(savedProject.data)
          toast({
            title: "Project duplicated",
            description: `Created "${newName}" from "${project.name}"`,
          })
        } catch (error) {
          console.error(error)
          toast({ variant: "destructive", title: "Failed to duplicate project" })
        }
      }
    },
    [toast],
  )

  const getQuarterGanttData = useCallback((): GanttData => {
    if (!data) return { labels: [], rows: [], bars: [], milestones: [], nowCol: 0, nowFrac: 0 }

    const quarter = data.selectedQuarter
    const range = quarterRanges[quarter]
    const weekCount = range.end - range.start + 1

    const labels = Array.from({ length: weekCount }, (_, i) => {
      const weekIndex = range.start + i
      const period = weekToPeriod(weekIndex)
      const week = (weekIndex % 4) + 1
      const monthIndex = Math.floor(i / 4)
      const month = range.months[monthIndex] || range.months[range.months.length - 1]

      return {
        top: `P${period.toString().padStart(2, "0")}`,
        bottom: `${month} | W${week}`,
      }
    })

    const bars = data.quarterGantt.bars
      .filter((bar) => bar.start >= range.start && bar.start <= range.end)
      .map((bar) => ({
        ...bar,
        start: bar.start - range.start,
        end: Math.min(bar.end - range.start, weekCount - 1),
      }))

    const milestones = data.quarterGantt.milestones
      .filter((ms) => ms.at >= range.start && ms.at <= range.end)
      .map((ms) => ({
        ...ms,
        at: ms.at - range.start,
      }))

    return {
      labels,
      rows: data.quarterGantt.rows,
      bars,
      milestones,
      nowCol: Math.max(0, Math.min(data.quarterGantt.nowCol - range.start, weekCount - 1)),
      nowFrac: data.quarterGantt.nowFrac,
    }
  }, [data])

  const handleSelectProject = useCallback(
    (project: Project) => {
      setCurrentProject(project)
      setData(project.data)
      setActiveProjectId(project.id)
      setHistory(loadHistoryFromStorage(project.id, project.data))
      lastSavedData.current = JSON.stringify(project.data)
      toast({
        title: "Project loaded",
        description: `Switched to "${project.name}"`,
      })
    },
    [toast],
  )

  const handleQuarterGanttChange = useCallback(
    (gantt: GanttData) => {
      if (!data) return

      const quarter = data.selectedQuarter
      const quarterRanges = [
        { start: 0, end: 11 },
        { start: 12, end: 23 },
        { start: 24, end: 35 },
        { start: 36, end: 51 },
      ]
      const range = quarterRanges[quarter]

      const adjustedBars = gantt.bars.map((bar) => ({
        ...bar,
        start: bar.start + range.start,
        end: bar.end + range.start,
      }))

      const adjustedMs = gantt.milestones.map((ms) => ({
        ...ms,
        at: ms.at + range.start,
      }))

      const otherBars = data.quarterGantt.bars.filter((bar) => bar.start < range.start || bar.start > range.end)
      const otherMs = data.quarterGantt.milestones.filter((ms) => ms.at < range.start || ms.at > range.end)

      setData({
        ...data,
        quarterGantt: {
          ...data.quarterGantt,
          rows: gantt.rows,
          bars: [...otherBars, ...adjustedBars],
          milestones: [...otherMs, ...adjustedMs],
          nowCol: gantt.nowCol + range.start,
          nowFrac: gantt.nowFrac,
        },
      })
    },
    [data, setData],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Export PNG quick: Ctrl/Cmd+4
      if (modifier && e.key === "4" && !e.shiftKey) {
        e.preventDefault();
        handleExportPNG();
        return;
      }

      // Export PNG Save As…: Ctrl/Cmd+Shift+4
      if (modifier && e.key === "4" && e.shiftKey) {
        e.preventDefault();
        handleExportPNG();
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if ((modifier && e.key === "z" && e.shiftKey) || (modifier && e.key === "y")) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Save: Ctrl+S / Cmd+S (already auto-saves, just show toast)
      if (modifier && e.key === "s") {
        e.preventDefault()
        toast({
          title: "Auto-saved",
          description: "Your project is automatically saved",
        })
        return
      }

      // Export JSON: Ctrl+E / Cmd+E
      if (modifier && e.key === "e") {
        e.preventDefault()
        handleExportJSON()
        return
      }

      // Export PDF: Ctrl+P / Cmd+P
      if (modifier && e.key === "p") {
        e.preventDefault()
        handleExportPDF()
        return
      }

      // New Project: Ctrl+N / Cmd+N
      if (modifier && e.key === "n") {
        e.preventDefault()
        const name = prompt("Enter project name:", "New Project")
        if (name) {
          handleCreateNew(name)
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleRedo, handleExportJSON, handleExportPDF, handleCreateNew, toast])

  if (!data || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--mars-blue-primary)] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div id="onepagerRoot" className="min-h-screen bg-gray-50">
      <MarkdownHotkeys />
      {!isPresentationMode && !screenshotMode && (
        <div
          className="fixed top-0 left-0 right-0 z-50 print:hidden app-topbar export-hidden"
          onMouseEnter={() => setShowTopMenu(true)}
          onMouseLeave={() => setShowTopMenu(false)}
        >
          <div
            className={`bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-transform duration-300 ${
              showTopMenu ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <div className="max-w-[1600px] mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <ProjectManager
                  currentProjectId={currentProject.id}
                  onSelectProject={handleSelectProject}
                  onCreateNew={handleCreateNew}
                  onDuplicate={handleDuplicate}
                />

                <TopButtons
                  onExportJSON={handleExportJSON}
                  onImportJSON={handleImportJSON}
                  onExportPDF={handleExportPDF}
                  onExportPNG={handleExportPNG}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={history ? canUndo(history) : false}
                  canRedo={history ? canRedo(history) : false}
                />
                <div className="print:hidden export-hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--mars-gray-border)] bg-white hover:bg-gray-50"
                        aria-label="Settings"
                        title="Settings"
                      >
                        <SettingsIcon className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <label className="flex items-center justify-between w-full cursor-pointer">
                          <span className="text-sm">Team Performance</span>
                          <Switch checked={showTeam} onCheckedChange={(v) => setShowTeam(!!v)} />
                        </label>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <label className="flex items-center justify-between w-full cursor-pointer">
                          <span className="text-sm">Comments</span>
                          <Switch checked={showComments} onCheckedChange={(v) => setShowComments(!!v)} />
                        </label>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5">
        <div className="space-y-3 sm:space-y-4 md:space-y-5" data-content-area>
          <Header data={data} setData={setData} />

          <GoalDescription data={data} setData={setData} />

          <GanttChart
            type="year"
            title="TOTAL Plan"
            data={data.yearGantt}
            onChange={(gantt) => setData({ ...data, yearGantt: gantt })}
          />

          <GanttChart
            type="quarter"
            title="TOTAL Fact"
            data={getQuarterGanttData()}
            onChange={handleQuarterGanttChange}
            selectedQuarter={data.selectedQuarter}
            onQuarterChange={(q) => setData({ ...data, selectedQuarter: q })}
          />

          <DoneNext data={data} setData={setData} />

          {showTeam && (
            <TeamPerformance data={data} setData={setData} />
          )}

          <RisksArtifacts data={data} setData={setData} />

          {showComments && (
            <Comments data={data} setData={setData} />
          )}

          <ExtraSections data={data} setData={setData} />
        </div>
      </div>
    </div>
  )
}
