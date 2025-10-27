export type StatusColor = "green" | "yellow" | "red"

export interface KPI {
  label: string
  value: string
  color: StatusColor
}

export interface Roles {
  sponsor: string
  productOwner: string
  projectManager: string
}

export interface Statuses {
  prev: StatusColor
  current: StatusColor
}

export interface GanttLabel {
  top?: string
  bottom?: string
}

export interface Bar {
  row: number
  start: number
  end: number
  label: string
  status: StatusColor
}

export interface Milestone {
  row: number | null
  at: number
  label: string
}

export interface GanttData {
  labels: (string | GanttLabel)[]
  rows: string[]
  bars: Bar[]
  milestones: Milestone[]
  nowCol: number
  nowFrac: number
}

export interface TeamMetric {
  label: string
  value: string
  color: StatusColor
}

export interface Risk {
  risk: string
  impact: StatusColor // Changed from string to StatusColor for traffic light system
  mitigation: string
}

export interface Artifact {
  label: string
  url: string
}

export interface ExtraSection {
  id: string
  title: string
  items: string[]
}

export interface OnePagerData {
  projectName: string
  niicDate: string
  kpis: KPI[]
  roles: Roles
  projectStatus: StatusColor // Single status instead of prev/current
  goal: string
  description: string
  yearGantt: GanttData
  quarterGantt: GanttData
  selectedQuarter: number
  done: string[]
  next: string[]
  teamMetrics: TeamMetric[]
  risks: Risk[]
  artifacts: Artifact[]
  comments: string
  extraSections: ExtraSection[]
}
