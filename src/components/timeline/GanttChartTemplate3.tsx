/**
 * Template 3: Milestones & Governance View – Parent (expandable) and Project/Study columns; timeline with milestone markers.
 * Respects viewMode for timeline header (Year with quarters, or Month).
 */
import { useMemo, useState, useCallback, useEffect } from 'react'
import type { TimelineTask } from '@/types/timeline'
import type { ViewMode } from '@/types/timeline'
import { GSK_THEME } from '@/theme/gsk'

const ROW_HEIGHT = 32
const HEADER_HEIGHT = 40
const LEFT_WIDTH = 320
const MILESTONE_SIZE = 10
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface GanttChartTemplate3Props {
  tasks: TimelineTask[]
  assetName?: string
  timelineWidth?: number
  viewMode?: ViewMode
}

interface ParentRow {
  key: string
  label: string
  tasks: TimelineTask[]
}

const toDate = (d: unknown): Date => (d instanceof Date ? d : new Date(d as string | number))

export function GanttChartTemplate3({
  tasks = [],
  assetName = '',
  timelineWidth = 640,
  viewMode = 'Year',
}: GanttChartTemplate3Props) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set())

  const { parents, yearMin, yearMax, totalMonths, startMonth } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : []
    if (list.length === 0) {
      return {
        parents: [] as ParentRow[],
        yearMin: new Date().getFullYear(),
        yearMax: new Date().getFullYear() + 2,
        totalMonths: 36,
        startMonth: new Date().getFullYear() * 12,
      }
    }
    const dates = list.flatMap((t) => [toDate(t.start).getTime(), toDate(t.end).getTime()])
    const minT = Math.min(...dates)
    const maxT = Math.max(...dates)
    const yearMin = new Date(minT).getFullYear()
    const yearMax = new Date(maxT).getFullYear()
    const totalMonths = (yearMax - yearMin + 1) * 12
    const startMonth = yearMin * 12

    const byParent = new Map<string, TimelineTask[]>()
    for (const t of list) {
      const parentKey = (t.phase && t.phase.trim()) || 'Milestones'
      if (!byParent.has(parentKey)) byParent.set(parentKey, [])
      byParent.get(parentKey)!.push(t)
    }
    const parents: ParentRow[] = Array.from(byParent.entries())
      .map(([key, taskList]) => ({
        key,
        label: key,
        tasks: taskList.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return { parents, yearMin, yearMax, totalMonths, startMonth }
  }, [tasks])

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = yearMin; y <= yearMax; y++) list.push(y)
    return list
  }, [yearMin, yearMax])

  const monthLabels = useMemo(() => {
    const labels: { label: string; year?: number }[] = []
    for (let y = yearMin; y <= yearMax; y++) {
      for (let m = 0; m < 12; m++) {
        labels.push({ label: MONTH_ABBR[m], year: y })
      }
    }
    return labels
  }, [yearMin, yearMax])

  const toggleParent = useCallback((key: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const xForDate = useCallback(
    (d: Date) => {
      const month = d.getFullYear() * 12 + d.getMonth()
      return ((month - startMonth) / totalMonths) * timelineWidth
    },
    [startMonth, totalMonths, timelineWidth]
  )

  const todayX = useMemo(() => xForDate(new Date()), [xForDate])
  const isTodayInRange = todayX >= 0 && todayX <= timelineWidth

  useEffect(() => {
    if (parents.length > 0) {
      setExpandedParents(new Set(parents.map((p) => p.key)))
    }
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No milestone data. Load a project to see the milestones &amp; swimlane view.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-gantt-template="3">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">
          Milestones &amp; Governance View
          {assetName && <span className="text-slate-600 font-normal ml-2">({assetName})</span>}
        </h3>
      </div>
      <div className="flex overflow-x-auto">
        <div className="shrink-0 border-r border-slate-200 bg-slate-50/50" style={{ width: LEFT_WIDTH, minWidth: LEFT_WIDTH }}>
          <div className="grid grid-cols-[32px_1fr] gap-0 border-b border-slate-200 bg-slate-100" style={{ height: HEADER_HEIGHT }}>
            <div className="flex items-center justify-center text-xs font-semibold text-slate-600" />
            <div className="flex items-center px-2 text-xs font-semibold text-slate-700">
              <span className="w-24">Parent</span>
              <span className="ml-2 flex-1">Project / Study</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {parents.map((parent) => {
              const isExpanded = expandedParents.has(parent.key)
              return (
                <div key={parent.key}>
                  <button
                    type="button"
                    onClick={() => toggleParent(parent.key)}
                    className="w-full grid grid-cols-[32px_1fr] gap-0 text-left hover:bg-slate-100/80 transition-colors border-b border-slate-100"
                    style={{ minHeight: ROW_HEIGHT }}
                  >
                    <div className="flex items-center justify-center text-slate-500">
                      <span className="text-sm leading-none" aria-label={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? '−' : '+'}</span>
                    </div>
                    <div className="flex items-center px-2 py-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate">{parent.label}</span>
                    </div>
                  </button>
                  {isExpanded &&
                    parent.tasks.map((task) => (
                      <div key={task.id} className="grid grid-cols-[32px_1fr] gap-0 pl-4 border-b border-slate-50 bg-white" style={{ minHeight: ROW_HEIGHT }}>
                        <div className="flex items-center justify-center" />
                        <div className="flex items-center px-2 py-1.5">
                          <span className="text-xs text-slate-600 truncate" title={task.name}>{task.name}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-x-auto relative">
          <div className="border-b border-slate-200 bg-slate-100 flex" style={{ height: HEADER_HEIGHT, width: timelineWidth, minWidth: timelineWidth }}>
            {(viewMode === 'Month' || viewMode === 'Week' || viewMode === 'Day') ? (
              monthLabels.map(({ label, year }, i) => (
                <div key={`${year}-${i}`} className="flex-shrink-0 flex flex-col items-center justify-center text-center border-r border-slate-200 last:border-r-0" style={{ width: timelineWidth / monthLabels.length, minWidth: 20 }}>
                  <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                </div>
              ))
            ) : (
              years.map((y) => (
                <div key={y} className="flex-1 flex flex-col min-w-0">
                  <div className="text-center text-xs font-semibold text-slate-600 py-1">{y}</div>
                  <div className="flex justify-around text-[10px] text-slate-500">
                    {QUARTERS.map((q) => (
                      <span key={q}>{q}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="relative" style={{ width: timelineWidth, minWidth: timelineWidth }}>
            {isTodayInRange && (
              <div className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-slate-400 pointer-events-none z-10" style={{ left: todayX }} title="Today" />
            )}
            {parents.map((parent) => {
              const isExpanded = expandedParents.has(parent.key)
              return (
                <div key={parent.key}>
                  <div className="border-b border-slate-100 bg-slate-50/30" style={{ height: ROW_HEIGHT }} />
                  {isExpanded &&
                    parent.tasks.map((task) => {
                      const startDate = toDate(task.start)
                      const x = xForDate(startDate)
                      return (
                        <div key={task.id} className="border-b border-slate-50 relative flex items-center bg-white" style={{ height: ROW_HEIGHT }}>
                          <div
                            className="absolute flex items-center justify-center rounded z-[1]"
                            style={{
                              left: x - MILESTONE_SIZE / 2,
                              top: (ROW_HEIGHT - MILESTONE_SIZE) / 2,
                              width: MILESTONE_SIZE,
                              height: MILESTONE_SIZE,
                              backgroundColor: GSK_THEME.accentColor,
                              transform: 'rotate(45deg)',
                            }}
                            title={`${task.name} – ${startDate.toLocaleDateString()}`}
                          />
                          <span className="absolute text-[10px] text-slate-600 truncate max-w-[140px] z-[1]" style={{ left: Math.min(x + MILESTONE_SIZE + 4, timelineWidth - 150) }}>
                            {task.name.length > 16 ? task.name.slice(0, 14) + '…' : task.name}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
