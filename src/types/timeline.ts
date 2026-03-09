/**
 * Types for governance timeline / Gantt data.
 * Aligns with gantt-task-react Task and extends for manual context.
 */

export type TaskType = 'task' | 'milestone' | 'project'

export interface TimelineTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  type: TaskType
  /** For hierarchy; empty = top level */
  project?: string
  /** Manual context / notes (governance requirement) */
  manualContext?: string
  /** Phase or workstream label */
  phase?: string
  /** For future critical path view */
  isCritical?: boolean
  /** Dependencies for critical path (task ids) */
  dependencies?: string[]
}

export type ViewMode = 'Day' | 'Week' | 'Month' | 'Year'

export interface TimelineFilters {
  dateRange: { start: Date; end: Date } | null
  phases: string[]
  showMilestonesOnly: boolean
  showCriticalPathOnly: boolean
}
