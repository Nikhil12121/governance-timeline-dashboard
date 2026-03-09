import { useState } from 'react'
import { useTimeline } from '@/context/TimelineContext'
import { TimelineFilters } from '@/components/timeline/TimelineFilters'
import { GanttChart } from '@/components/timeline/GanttChart'
import { EditContextModal } from '@/components/timeline/EditContextModal'
import type { Task } from 'gantt-task-react'

export function TimelinePage() {
  const {
    tasks,
    ganttTasks,
    phases,
    filterPhases,
    setFilterPhases,
    showMilestonesOnly,
    setShowMilestonesOnly,
    viewMode,
    setViewMode,
    dateRange,
    setDateRange,
    updateTaskContext,
  } = useTimeline()
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null)

  const handleDoubleClickTask = (task: Task) => {
    const full = tasks.find((t) => t.id === task.id) ?? null
    setEditingTask(full)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Timeline</h1>
      <p className="text-slate-600 mb-6">
        Customise the view with filters. Double-click a task to add manual context. Export from the Export & Summary page.
      </p>
      <TimelineFilters
        phases={phases}
        filterPhases={filterPhases}
        setFilterPhases={setFilterPhases}
        showMilestonesOnly={showMilestonesOnly}
        setShowMilestonesOnly={setShowMilestonesOnly}
        viewMode={viewMode}
        setViewMode={setViewMode}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <GanttChart
        tasks={ganttTasks}
        viewMode={viewMode}
        onDoubleClickTask={handleDoubleClickTask}
      />
      <EditContextModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={updateTaskContext}
      />
    </div>
  )
}
