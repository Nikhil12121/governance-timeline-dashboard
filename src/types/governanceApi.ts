import type { FinancialsRow, ResourceDemandGroup } from '@/types/presentation'
import type { TaskType } from '@/types/timeline'
import type { MilestoneTimelineRow } from '@/types/milestoneTimeline'

export interface AssetOption {
  projectKey: string
  projectId: string
  assetName: string
  label: string
}

export interface GovernanceProjectSummary {
  projectKey: string
  projectId: string
  assetName: string
  projectDescription: string
  projectShortDescription?: string
  currentPhase?: string
  projectStatus?: string
  projectManager?: string
  portfolioOwner?: string
  lastUpdated?: string
}

export interface TimelineTaskDto {
  id: string
  name: string
  start: string
  end: string
  progress: number
  type: TaskType
  project?: string
  manualContext?: string
  phase?: string
  isCritical?: boolean
  dependencies?: string[]
}

export interface GovernanceFinancialsData {
  yearHeaders: string[]
  rows: FinancialsRow[]
}

export interface GovernanceResourceDemandData {
  columnHeaders: string[]
  groups: ResourceDemandGroup[]
  totalRow: (string | number)[]
}

export interface GovernanceProjectData {
  project: GovernanceProjectSummary
  timelineTasks: TimelineTaskDto[]
  financials: GovernanceFinancialsData
  resourceDemand: GovernanceResourceDemandData
  /** When present, same structure as Power BI Milestone Timeline query; use for Milestones & Governance view instead of deriving from timelineTasks. */
  milestoneTimelineRows?: MilestoneTimelineRow[]
}
