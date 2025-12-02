import type { OnePagerData } from "@/types/onepager"

export interface Project {
  id: string
  name: string
  data: OnePagerData
  createdAt: string
  updatedAt: string
}

const ACTIVE_PROJECT_KEY = "mars-onepager-active"

const SHAREPOINT_SITE_URL =
  process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL ?? ""
const ONEPAGER_LIST_NAME = "OnePagerProjects"

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

async function spRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("SharePoint API is only available in the browser")
  }

  if (!SHAREPOINT_SITE_URL) {
    // If SharePoint is not configured, return mock data or use localStorage only
    console.warn("SharePoint URL not configured, using local storage only")
    throw new Error("SharePoint is not configured. Please set NEXT_PUBLIC_SHAREPOINT_SITE_URL environment variable.")
  }

  const url = `${SHAREPOINT_SITE_URL}/_api/web/lists/getbytitle('${ONEPAGER_LIST_NAME}')${path}`

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
      ...(options.headers ?? {}),
    },
    credentials: "include",
    body: options.body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SharePoint request failed: ${res.status} ${res.statusText} – ${text}`)
  }

  return (await res.json()) as T
}

interface SharePointItem {
  ID: number
  Title: string
  ProjectStatus?: string
  NiicDate?: string
  DataJson?: string
  Created: string
  Modified: string
}

export async function getAllProjects(): Promise<Project[]> {
  if (typeof window === "undefined") return []

  const data = await spRequest<{ value: SharePointItem[] }>(
    "/items?$select=ID,Title,ProjectStatus,NiicDate,DataJson,Created,Modified",
  )

  return data.value.map((item) => {
    const parsedData: OnePagerData = item.DataJson
      ? JSON.parse(item.DataJson)
      : ({
          projectName: item.Title,
          niicDate: item.NiicDate ?? new Date().toISOString().slice(0, 7),
        } as any)

    return {
      id: item.ID.toString(),
      name: item.Title,
      data: parsedData,
      createdAt: item.Created,
      updatedAt: item.Modified,
    }
  })
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!id) return null
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return null

  const item = await spRequest<SharePointItem>(
    `/items(${numericId})?$select=ID,Title,ProjectStatus,NiicDate,DataJson,Created,Modified`,
  )

  const parsedData: OnePagerData = item.DataJson
    ? JSON.parse(item.DataJson)
    : ({
        projectName: item.Title,
        niicDate: item.NiicDate ?? new Date().toISOString().slice(0, 7),
      } as any)

  return {
    id: item.ID.toString(),
    name: item.Title,
    data: parsedData,
    createdAt: item.Created,
    updatedAt: item.Modified,
  }
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACTIVE_PROJECT_KEY)
}

export function setActiveProjectId(id: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id)
}

async function upsertSharePointItem(project: Project): Promise<SharePointItem> {
  const payload = {
    Title: project.name,
    ProjectStatus: project.data.projectStatus,
    NiicDate: project.data.niicDate,
    DataJson: JSON.stringify(project.data),
  }

  if (!project.id) {
    const created = await spRequest<SharePointItem>("/items", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return created
  }

  const numericId = Number(project.id)
  if (!Number.isFinite(numericId)) {
    const created = await spRequest<SharePointItem>("/items", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return created
  }

  const updated = await spRequest<SharePointItem>(`/items(${numericId})`, {
    method: "PATCH",
    headers: {
      "IF-MATCH": "*",
      "X-HTTP-Method": "MERGE",
    },
    body: JSON.stringify(payload),
  })
  return updated
}

export async function saveProject(project: Project): Promise<Project> {
  const spItem = await upsertSharePointItem(project)

  return {
    id: spItem.ID.toString(),
    name: spItem.Title,
    data: project.data,
    createdAt: spItem.Created,
    updatedAt: spItem.Modified,
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (!id) return

  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return

  await spRequest<void>(`/items(${numericId})`, {
    method: "POST",
    headers: {
      "IF-MATCH": "*",
      "X-HTTP-Method": "DELETE",
    },
  })

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
    id: "",
    name,
    data: defaultData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
