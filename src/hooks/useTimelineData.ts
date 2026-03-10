import { useMemo, useState, useCallback } from 'react'
import type { Task } from 'gantt-task-react'
import type { TimelineTask, ViewMode } from '@/types/timeline'
import { mockGovernanceTimelineTasks } from '@/data/mockGovernanceTimeline'

function toGanttTask(t: TimelineTask): Task {
  return {
    id: t.id,
    name: t.name,
    start: t.start,
    end: t.end,
    progress: t.progress,
    type: t.type,
    project: t.project,
  }
}

export function useTimelineData(initialTasks: TimelineTask[] = mockGovernanceTimelineTasks) {
  const [tasks, setTasks] = useState<TimelineTask[]>(initialTasks)
  const [viewMode, setViewMode] = useState<ViewMode>('Month')
  const [filterPhases, setFilterPhases] = useState<string[]>([])
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)

  const filteredTasks = useMemo(() => {
    let list = [...tasks]
    if (filterPhases.length > 0) {
      list = list.filter((t) => t.phase && filterPhases.includes(t.phase))
    }
    if (showMilestonesOnly) {
      list = list.filter((t) => t.type === 'milestone')
    }
    if (dateRange) {
      list = list.filter(
        (t) => t.end >= dateRange.start && t.start <= dateRange.end
      )
    }
    return list
  }, [tasks, filterPhases, showMilestonesOnly, dateRange])

  const ganttTasks: Task[] = useMemo(
    () => filteredTasks.map(toGanttTask),
    [filteredTasks]
  )

  const phases = useMemo(
    () => [...new Set(tasks.map((t) => t.phase).filter(Boolean))] as string[],
    [tasks]
  )

  const updateTaskContext = useCallback((id: string, manualContext: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, manualContext } : t))
    )
  }, [])

  /** Called when user drags a task bar to change start/end (fix mismatching visual) */
  const onTaskDateChange = useCallback((taskId: string, start: Date, end: Date) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, start, end } : t
      )
    )
  }, [])

  return {
    tasks,
    filteredTasks,
    ganttTasks,
    phases,
    viewMode,
    setViewMode,
    filterPhases,
    setFilterPhases,
    showMilestonesOnly,
    setShowMilestonesOnly,
    dateRange,
    setDateRange,
    updateTaskContext,
    setTasks,
    onTaskDateChange,
  }
}
