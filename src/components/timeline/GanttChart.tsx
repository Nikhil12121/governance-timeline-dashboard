import { useCallback } from 'react'
import { Gantt, Task, ViewMode as GanttViewMode } from 'gantt-task-react'
import type { ViewMode } from '@/types/timeline'
import 'gantt-task-react/dist/index.css'

const viewModeMap: Record<ViewMode, GanttViewMode> = {
  Day: GanttViewMode.Day,
  Week: GanttViewMode.Week,
  Month: GanttViewMode.Month,
  Year: GanttViewMode.Year,
}

interface GanttChartProps {
  tasks: Task[]
  viewMode: ViewMode
  listCellWidth?: string
  columnWidth?: number
  onDoubleClickTask?: (task: Task) => void
}

export function GanttChart({
  tasks,
  viewMode,
  listCellWidth = '200px',
  columnWidth = 40,
  onDoubleClickTask,
}: GanttChartProps) {
  const handleDoubleClick = useCallback(
    (task: Task) => {
      onDoubleClickTask?.(task)
    },
    [onDoubleClickTask]
  )

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No tasks to display. Adjust filters or add data.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <Gantt
        tasks={tasks}
        viewMode={viewModeMap[viewMode] ?? GanttViewMode.Week}
        listCellWidth={listCellWidth}
        columnWidth={columnWidth}
        barFill={60}
        barCornerRadius={4}
        barBackgroundColor="#64748b"
        barBackgroundSelectedColor="#334155"
        projectBackgroundColor="#94a3b8"
        projectBackgroundSelectedColor="#64748b"
        milestoneBackgroundColor="#0f766e"
        milestoneBackgroundSelectedColor="#0d9488"
        onDoubleClick={onDoubleClickTask ? handleDoubleClick : undefined}
        fontSize="12px"
      />
    </div>
  )
}
