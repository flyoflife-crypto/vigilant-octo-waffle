import type { OnePagerData } from "@/types/onepager"

export interface Project {
  id: string
  name: string
  data: OnePagerData
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "mars-onepager-projects"
const ACTIVE_PROJECT_KEY = "mars-onepager-active"

export const WEEK_COUNT = 52
export const PERIOD_COUNT = 13

export const weekToPeriod = (weekIndex: number) => Math.min(13, Math.floor(weekIndex / 4) + 1)

export const QUARTER_MONTHS = [
  ["Jan", "Feb", "Mar"],
  ["Apr", "May", "Jun"],
  ["Jul", "Aug", "Sep"],
  ["Oct", "Nov", "Dec"],
]

export const QUARTER_PERIODS: number[][] = [
  [1, 2, 3], // Q1
  [4, 5, 6], // Q2
  [7, 8, 9], // Q3
  [10, 11, 12, 13], // Q4
]

export function getAllProjects(): Project[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACTIVE_PROJECT_KEY)
}

export function setActiveProjectId(id: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id)
}

export function saveProject(project: Project) {
  const projects = getAllProjects()
  const index = projects.findIndex((p) => p.id === project.id)

  if (index >= 0) {
    projects[index] = { ...project, updatedAt: new Date().toISOString() }
  } else {
    projects.push(project)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function deleteProject(id: string) {
  const projects = getAllProjects().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))

  if (getActiveProjectId() === id) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
  }
}

export function createNewProject(name: string, templateData?: OnePagerData): Project {
  const defaultData: OnePagerData = templateData || {
    projectName: name,
    niicDate: new Date().toISOString().slice(0, 7),
    kpis: [
      { label: "Money Plan", value: "1000", color: "green" },
      { label: "Money Fact", value: "850", color: "yellow" },
      { label: "Benefits", value: "150", color: "green" },
    ],
    roles: {
      sponsor: "Sponsor Name",
      productOwner: "PO Name",
      projectManager: "PM Name",
    },
    projectStatus: "green",
    goal: "Project goal and objectives",
    description: "Detailed project description and context",
    yearGantt: {
      labels: [
        { top: "Jan", bottom: "P01 | Q1" },
        { top: "Feb", bottom: "P02 | Q1" },
        { top: "Mar", bottom: "P03 | Q1" },
        { top: "Apr", bottom: "P04 | Q2" },
        { top: "May", bottom: "P05 | Q2" },
        { top: "Jun", bottom: "P06 | Q2" },
        { top: "Jul", bottom: "P07 | Q3" },
        { top: "Aug", bottom: "P08 | Q3" },
        { top: "Sep", bottom: "P09 | Q3" },
        { top: "Oct", bottom: "P10 | Q4" },
        { top: "Nov", bottom: "P11 | Q4" },
        { top: "Dec", bottom: "P12 | Q4" },
        { top: "Dec", bottom: "P13 | Q4" },
      ],
      rows: ["Workstream 1", "Workstream 2", "Workstream 3"],
      bars: [
        { row: 0, start: 0, end: 3, label: "Phase 1", status: "green" },
        { row: 1, start: 4, end: 7, label: "Phase 2", status: "yellow" },
        { row: 2, start: 8, end: 11, label: "Phase 3", status: "green" },
      ],
      milestones: [
        { row: null, at: 2, label: "Q1 Review" },
        { row: null, at: 5, label: "Q2 Review" },
        { row: null, at: 8, label: "Q3 Review" },
        { row: null, at: 12, label: "Year End" },
      ],
      nowCol: 5,
      nowFrac: 0.5,
    },
    quarterGantt: {
      labels: Array.from({ length: 52 }, (_, i) => {
        const period = weekToPeriod(i)
        const week = (i % 4) + 1
        const quarterIndex = Math.floor(i / 12)
        const monthInQuarter = Math.floor((i % 12) / 4)
        const month = QUARTER_MONTHS[quarterIndex]?.[monthInQuarter] || "Dec"
        return {
          top: `P${period.toString().padStart(2, "0")}`,
          bottom: `${month} | W${week}`,
        }
      }),
      rows: ["Task 1", "Task 2", "Task 3"],
      bars: [
        { row: 0, start: 0, end: 3, label: "Sprint 1", status: "green" },
        { row: 1, start: 4, end: 7, label: "Sprint 2", status: "green" },
      ],
      milestones: [{ row: null, at: 8, label: "Q1 End" }],
      nowCol: 5,
      nowFrac: 0.5,
    },
    selectedQuarter: 0,
    done: ["Completed task 1", "Completed task 2"],
    next: ["Upcoming task 1", "Upcoming task 2"],
    teamMetrics: [
      { label: "Velocity", value: "85%", color: "green" },
      { label: "Quality", value: "92%", color: "green" },
      { label: "Budget", value: "78%", color: "yellow" },
    ],
    risks: [
      { risk: "Vendor dependency", impact: "red", mitigation: "Multi-vendor strategy" },
      { risk: "Resource availability", impact: "yellow", mitigation: "Cross-training team members" },
    ],
    artifacts: [
      { label: "📄 Passport", url: "#" },
      { label: "👥 Team", url: "#" },
      { label: "📋 Task Tracking", url: "#" },
      { label: "📑 NIIC Presentation", url: "#" },
    ],
    comments: "",
    extraSections: [],
  }

  return {
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    data: defaultData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
