/**
 * Template 2: High-level project plan with financials.
 * Phase-based swim lanes: one row per phase (phase start→end from tasks). Inside each lane: phase bar (background) and mapped tasks/milestones (bars + diamonds at milestone dates).
 * Phase comes from timeline query "Phase" (real data: timeline.sql outputs "Task Category" AS "Phase") or mock task.phase. Dates from Start Date / End Date (real: Earliest Task Reported Date).
 * Financials table and legend below. Respects viewMode for timeline granularity (Year / Month).
 */
import { useMemo } from 'react'
import type { TimelineTask } from '@/types/timeline'
import type { ViewMode } from '@/types/timeline'
import type { FinancialsGanttSlide } from '@/types/presentation'
import { GSK_THEME } from '@/theme/gsk'
import { parseDateLocal } from '@/utils/dateUtils'

const ROW_HEIGHT = 40
const LEFT_WIDTH = 140
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MILESTONE_SIZE = 10
const PHASE_COLORS: Record<string, string> = {
  'Non-clinical': GSK_THEME.accentColor,
  'Clinical': '#2563eb',
  'VEO': '#16a34a',
  'CMC': '#dc2626',
  'C2 Milestones': '#f59e0b',
  'Phase 1, 2, 3 start': '#0ea5e9',
  'Phase 1, 2, 3 Start': '#0ea5e9',
  'Key Results': '#dc2626',
  'Regulatory Submission / Approval / Launch': '#9333ea',
  'Project Milestone': '#64748b',
  'External News': '#94a3b8',
  'Programme': '#0891b2',
  'Regulatory': '#7c3aed',
  'Launch': '#16a34a',
  default: '#64748b',
}

interface GanttChartTemplate2Props {
  tasks: TimelineTask[]
  financialsSlide: FinancialsGanttSlide | null
  assetName?: string
  subtitle?: string
  viewMode?: ViewMode
  dateRange?: { start: Date; end: Date } | null
}

function getPhaseColor(phase?: string): string {
  if (!phase) return PHASE_COLORS.default
  for (const [key, color] of Object.entries(PHASE_COLORS)) {
    if (key !== 'default' && phase.toLowerCase().includes(key.toLowerCase())) return color
  }
  return PHASE_COLORS.default
}

function toDate(d: unknown): Date {
  if (d instanceof Date) return d
  const parsed = parseDateLocal(d as string | number)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

interface PhaseLane {
  phaseName: string
  phaseStart: Date
  phaseEnd: Date
  phaseLeftPct: number
  phaseWidthPct: number
  color: string
  items: { task: TimelineTask; leftPct: number; widthPct: number; isMilestone: boolean; labelSlot?: number }[]
}

/** Number of vertical slots for labels (above/below row) to avoid overlap. */
const LABEL_SLOT_COUNT = 5
/** Min horizontal gap (as % of timeline) so two labels in same slot don't overlap. ~80px in 720px ≈ 11%. */
const MIN_LABEL_GAP_PCT = 14

/** Assign vertical slots (0..4) to items by leftPct so labels don't overlap. */
function assignLabelSlots(items: { leftPct: number }[]): number[] {
  if (items.length === 0) return []
  const sorted = items.map((m, i) => ({ x: m.leftPct, i })).sort((a, b) => a.x - b.x)
  const slots: number[] = new Array(items.length).fill(0)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x - sorted[i - 1].x < MIN_LABEL_GAP_PCT) {
      slots[sorted[i].i] = (slots[sorted[i - 1].i] + 1) % LABEL_SLOT_COUNT
    }
  }
  return slots
}

export function GanttChartTemplate2({
  tasks = [],
  financialsSlide,
  assetName = '',
  subtitle = 'High level project plan to launch with financials',
  viewMode = 'Year',
  dateRange = null,
}: GanttChartTemplate2Props) {
  const { yearMin, yearMax, phaseLanes } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : []
    if (list.length === 0 && !dateRange?.start) {
      return { yearMin: new Date().getFullYear(), yearMax: new Date().getFullYear() + 5, phaseLanes: [] as PhaseLane[] }
    }
    let minT: number
    let maxT: number
    if (dateRange?.start && dateRange?.end) {
      minT = dateRange.start.getTime()
      maxT = dateRange.end.getTime()
    } else if (list.length > 0) {
      const dates = list.flatMap((t) => [toDate(t.start).getTime(), toDate(t.end).getTime()])
      minT = Math.min(...dates)
      maxT = Math.max(...dates)
    } else {
      const y = new Date().getFullYear()
      minT = new Date(y, 0, 1).getTime()
      maxT = new Date(y + 5, 11, 31).getTime()
    }
    const yearMin = new Date(minT).getFullYear()
    const yearMax = new Date(maxT).getFullYear()
    const totalMonths = (yearMax - yearMin + 1) * 12
    const startMonth = yearMin * 12

    const byPhase = new Map<string, TimelineTask[]>()
    for (const t of list) {
      const key = (t.phase && t.phase.trim()) || 'Other'
      if (!byPhase.has(key)) byPhase.set(key, [])
      byPhase.get(key)!.push(t)
    }

    const lanes: PhaseLane[] = []
    for (const [phaseName, phaseTasks] of byPhase) {
      const starts = phaseTasks.map((t) => toDate(t.start).getTime())
      const ends = phaseTasks.map((t) => toDate(t.end).getTime())
      const phaseStart = new Date(Math.min(...starts))
      const phaseEnd = new Date(Math.max(...ends))
      const color = getPhaseColor(phaseName === 'Other' ? undefined : phaseName)
      const phaseLeftPct = ((phaseStart.getFullYear() * 12 + phaseStart.getMonth()) - startMonth) / totalMonths * 100
      const phaseWidthPct = Math.max(((phaseEnd.getFullYear() * 12 + phaseEnd.getMonth()) - (phaseStart.getFullYear() * 12 + phaseStart.getMonth())) / totalMonths * 100, 2)
      const items = phaseTasks.map((task) => {
        const s = toDate(task.start).getTime()
        const e = toDate(task.end).getTime()
        const leftMonths = new Date(s).getFullYear() * 12 + new Date(s).getMonth() - startMonth
        const rightMonths = new Date(e).getFullYear() * 12 + new Date(e).getMonth() - startMonth
        const leftPct = (leftMonths / totalMonths) * 100
        const widthPct = task.type === 'milestone' ? 0 : Math.max((rightMonths - leftMonths) / totalMonths * 100, 1.5)
        return { task, leftPct, widthPct, isMilestone: task.type === 'milestone' }
      })
      const slots = assignLabelSlots(items)
      items.forEach((it, i) => { (it as { labelSlot?: number }).labelSlot = slots[i] })
      lanes.push({ phaseName, phaseStart, phaseEnd, phaseLeftPct, phaseWidthPct, color, items })
    }
    lanes.sort((a, b) => a.phaseStart.getTime() - b.phaseStart.getTime())
    return { yearMin, yearMax, phaseLanes: lanes }
  }, [tasks, dateRange])

  const timelineHeaders = useMemo(() => {
    const useMonthGranularity = viewMode === 'Month' || viewMode === 'Week' || viewMode === 'Day'
    if (useMonthGranularity) {
      const headers: string[] = []
      for (let y = yearMin; y <= yearMax; y++) {
        for (let m = 0; m < 12; m++) headers.push(`${MONTH_ABBR[m]} ${y}`)
      }
      return headers
    }
    const years: string[] = []
    for (let y = yearMin; y <= yearMax; y++) years.push(String(y))
    return years
  }, [yearMin, yearMax, viewMode])

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No timeline data. Load a project or add tasks to see the high-level plan.
      </div>
    )
  }

  const timelineMinWidth = viewMode !== 'Year' ? Math.max(timelineHeaders.length * 24, 400) : undefined

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-gantt-template="2">
      <div className="px-4 pt-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-4 shrink-0 rounded-sm" style={{ backgroundColor: GSK_THEME.accentColor }} />
          <h3 className="text-lg font-bold text-slate-800">{assetName || 'Project'}</h3>
        </div>
        {subtitle && <p className="text-sm text-slate-600 mt-0.5 ml-4">{subtitle}</p>}
      </div>
      <div className="px-4 pt-3 overflow-x-auto">
        <div className="flex text-xs font-medium text-slate-600 mb-1" style={{ minWidth: timelineMinWidth ? LEFT_WIDTH + timelineMinWidth : undefined }}>
          <div className="shrink-0 border-r border-slate-200 pr-2" style={{ width: LEFT_WIDTH }}>Phase</div>
          <div className="flex flex-1" style={{ gap: 0, minWidth: timelineMinWidth }}>
            {timelineHeaders.map((label, i) => (
              <div key={`${label}-${i}`} className={`text-center border-r border-slate-200 last:border-r-0 ${viewMode !== 'Year' ? 'flex-shrink-0' : 'flex-1 min-w-0'}`} style={viewMode !== 'Year' ? { width: 24, minWidth: 24 } : undefined}>
                {viewMode !== 'Year' ? label.split(' ')[0] : label}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1" style={{ minWidth: timelineMinWidth ? LEFT_WIDTH + timelineMinWidth : undefined }}>
          {phaseLanes.map((lane) => (
            <div key={lane.phaseName} className="flex items-stretch" style={{ height: ROW_HEIGHT }}>
              <div className="shrink-0 flex items-center pr-2 border-r border-slate-100 text-xs font-medium text-slate-700 truncate" style={{ width: LEFT_WIDTH }}>
                {lane.phaseName}
              </div>
              <div className="flex-1 relative min-h-[32px] rounded border border-slate-100" style={{ minWidth: timelineMinWidth }}>
                <div
                  className="absolute top-1 bottom-1 rounded opacity-25"
                  style={{
                    left: `${lane.phaseLeftPct}%`,
                    width: `${lane.phaseWidthPct}%`,
                    backgroundColor: lane.color,
                  }}
                />
                {lane.items.map(({ task, leftPct, widthPct, isMilestone, labelSlot = 0 }) =>
                  isMilestone ? (
                    <div
                      key={task.id}
                      className="absolute top-0 bottom-0 z-[1] flex flex-col items-center justify-center pointer-events-none"
                      style={{
                        left: `max(0%, min(${leftPct}%, calc(100% - 90px)))`,
                        marginLeft: -MILESTONE_SIZE / 2,
                        width: 90,
                        minWidth: 90,
                      }}
                      title={`${task.name} – ${toDate(task.start).toLocaleDateString()}`}
                    >
                      {labelSlot <= 2 && (
                        <span
                          className="text-[9px] font-medium text-slate-700 truncate w-full text-center leading-tight block px-0.5"
                          style={{
                            marginBottom: 2,
                            transform: labelSlot === 2 ? 'translateY(-6px)' : undefined,
                          }}
                        >
                          {task.name}
                        </span>
                      )}
                      <div
                        className="rounded flex-shrink-0 border-2 border-slate-700"
                        style={{
                          width: MILESTONE_SIZE,
                          height: MILESTONE_SIZE,
                          backgroundColor: lane.color,
                          transform: 'rotate(45deg)',
                          marginTop: labelSlot <= 2 ? 0 : 2,
                          marginBottom: labelSlot <= 2 ? 2 : 0,
                        }}
                      />
                      {labelSlot > 2 && (
                        <span
                          className="text-[9px] font-medium text-slate-700 truncate w-full text-center leading-tight block px-0.5"
                          style={{ marginTop: 2, transform: labelSlot === 4 ? 'translateY(4px)' : undefined }}
                        >
                          {task.name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      key={task.id}
                      className="absolute top-1 bottom-1 rounded flex items-center px-1.5 overflow-hidden border border-slate-300 z-[1]"
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 3)}%`,
                        backgroundColor: lane.color,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                      title={`${task.name} (${toDate(task.start).toLocaleDateString()} – ${toDate(task.end).toLocaleDateString()})`}
                    >
                      <span className="truncate">{task.name}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {financialsSlide && financialsSlide.financialsYears.length > 0 && (
        <div className="px-4 py-4 mt-2 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Cumulative EPE/IPE to key inflection points</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100">
                  {financialsSlide.financialsYears.map((h, i) => (
                    <th key={i} className="py-2 px-2 text-left font-medium text-slate-700 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financialsSlide.financialsRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-1.5 px-2 font-medium text-slate-700">{r.label}</td>
                    {r.values.map((v, j) => (
                      <td key={j} className="py-1.5 px-2 text-slate-600">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs">
        {Object.entries(PHASE_COLORS).filter(([k]) => k !== 'default').map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: color }} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
