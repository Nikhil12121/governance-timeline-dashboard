import { useCallback, useMemo } from 'react'
import { Gantt, Task, ViewMode as GanttViewMode } from 'gantt-task-react'
import type { ViewMode } from '@/types/timeline'
import { GSK_THEME } from '@/theme/gsk'
import { GanttListHeaderCustom, GanttListTableCustom } from './GanttListCustom'
import 'gantt-task-react/dist/index.css'

const viewModeMap: Record<ViewMode, GanttViewMode> = {
  Day: GanttViewMode.Day,
  Week: GanttViewMode.Week,
  Month: GanttViewMode.Month,
  Year: GanttViewMode.Year,
}

/** Min column width so month labels (Jan, Feb, …) don’t overlap in Template 1 */
const MIN_COLUMN_WIDTH_MONTH_VIEW = 28
/** Compact column width for Year view so we don’t waste horizontal space */
const COLUMN_WIDTH_YEAR_VIEW = 28

interface GanttChartProps {
  tasks: Task[]
  viewMode: ViewMode
  listCellWidth?: string
  /** When set, use custom list with resizable Phase/Activity columns */
  phaseColumnWidth?: number
  columnWidth?: number
  /** When true, allow narrower column width for preview cards (avoids month overlap) */
  previewFit?: boolean
  onDoubleClickTask?: (task: Task) => void
  /** When user drags task bar to fix timeline; (taskId, start, end) */
  onDateChange?: (taskId: string, start: Date, end: Date) => void
  showLegend?: boolean
}

export function GanttChart({
  tasks,
  viewMode,
  listCellWidth = '200px',
  phaseColumnWidth,
  columnWidth = 40,
  previewFit = false,
  onDoubleClickTask,
  onDateChange,
  showLegend = true,
}: GanttChartProps) {
  const baseWidth = columnWidth ?? 40
  const effectiveColumnWidth = useMemo(() => {
    if (previewFit) return baseWidth
    if (viewMode === 'Year') return COLUMN_WIDTH_YEAR_VIEW
    return Math.max(baseWidth, MIN_COLUMN_WIDTH_MONTH_VIEW)
  }, [previewFit, viewMode, baseWidth])
  const totalListWidth = useMemo(() => {
    if (phaseColumnWidth != null) {
      const nameNum = typeof listCellWidth === 'string' ? parseInt(listCellWidth, 10) || 200 : listCellWidth
      return `${phaseColumnWidth + nameNum}px`
    }
    return listCellWidth
  }, [listCellWidth, phaseColumnWidth])

  const useCustomList = phaseColumnWidth != null

  const handleDoubleClick = useCallback(
    (task: Task) => {
      onDoubleClickTask?.(task)
    },
    [onDoubleClickTask]
  )

  const handleDateChange = useCallback(
    (task: Task) => {
      if (onDateChange && task.start && task.end) {
        onDateChange(task.id, task.start, task.end)
      }
    },
    [onDateChange]
  )

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No tasks to display. Adjust filters or add data.
      </div>
    )
  }

  return (
    <div className="gantt-timeline-wrapper bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <Gantt
        tasks={tasks}
        viewMode={viewModeMap[viewMode] ?? GanttViewMode.Month}
        listCellWidth={totalListWidth}
        columnWidth={effectiveColumnWidth}
        rowHeight={44}
        barFill={50}
        barCornerRadius={4}
        barBackgroundColor={GSK_THEME.clinical}
        barBackgroundSelectedColor="#334155"
        projectBackgroundColor={GSK_THEME.accentColor}
        projectBackgroundSelectedColor="#c45a10"
        milestoneBackgroundColor={GSK_THEME.veo}
        milestoneBackgroundSelectedColor="#5a9b35"
        TaskListHeader={useCustomList ? GanttListHeaderCustom : undefined}
        TaskListTable={useCustomList ? GanttListTableCustom : undefined}
        onDoubleClick={onDoubleClickTask ? handleDoubleClick : undefined}
        onDateChange={onDateChange ? handleDateChange : undefined}
        fontSize="12px"
      />
      {showLegend && (
        <div className="flex flex-wrap gap-4 px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs">
          <span className="font-medium text-slate-600">Milestones and key inflection points:</span>
          <span style={{ color: GSK_THEME.nonClinical }}>■ Non-clinical</span>
          <span style={{ color: GSK_THEME.clinical }}>■ Clinical</span>
          <span style={{ color: GSK_THEME.veo }}>■ VEO</span>
          <span style={{ color: GSK_THEME.cmc }}>■ CMC</span>
        </div>
      )}
    </div>
  )
}
