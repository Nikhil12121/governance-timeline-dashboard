/**
 * Power BI–style Milestone & Governance View for the Timeline tab.
 * Left: Parent (expand/collapse), Project/Study. Right: Years + quarters, horizontal bars, diamond milestones, today line. Legend below.
 * Expand/collapse by parent like Template 3 (Milestones & swimlane).
 */
import { useMemo, useCallback, useState, useEffect } from 'react'
import type { MilestoneTimelineRow, MilestoneBarRow } from '@/types/milestoneTimeline'
import type { ViewMode } from '@/types/timeline'
import { GSK_THEME } from '@/theme/gsk'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48
const LEFT_WIDTH = 320
const TOGGLE_COLUMN_WIDTH = 32
const TIMELINE_WIDTH = 720
const MILESTONE_SIZE = 10
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

interface ParentGroup {
  key: string
  label: string
  bars: MilestoneBarRow[]
}

/* Bar colors (Type) – match PM reference: Approved governance (light pink), Current Plan (light blue/gray), Study (dark gray). */
const ITEM_TYPE_COLORS: Record<string, string> = {
  'Project - Approved Governance Baseline': '#e8a87c',
  'Project - Current': '#87ceeb',
  'Study - Current': '#6b7280',
  'Study - Approved Governance Baseline': '#9ca3af',
  default: '#94a3b8',
}

/* Milestone categories – exact match to reference visual: C2 (yellow), Key results (red), Other (green), Phase 1,2,&3 start (light blue), Regulatory (purple), Study (black). */
const MILESTONE_CATEGORY_COLORS: Record<string, string> = {
  'C2 Milestones': '#facc15',
  C2: '#facc15',
  'Phase 1, 2, 3 Start': '#7dd3fc',
  'Phase 1, 2, & 3 start': '#7dd3fc',
  'Submit, Approval & Launch': '#9333ea',
  'Regulatory submission, Approval & Launch': '#9333ea',
  'Regulatory Submission / Approval / Launch': '#9333ea',
  'Pivotal Result': '#dc2626',
  'Study Milestones': '#1f2937',
  Study: '#1f2937',
  'Key results': '#dc2626',
  'Key Results': '#dc2626',
  'External News': '#64748b',
  'Project Milestone': '#94a3b8',
  'Stacked milestones': '#1f2937',
  Other: '#22c55e',
  default: GSK_THEME.accentColor,
}

function getItemTypeColor(itemType: string): string {
  return ITEM_TYPE_COLORS[itemType] ?? ITEM_TYPE_COLORS.default
}

function getMilestoneColor(cat: string): string {
  const key = Object.keys(MILESTONE_CATEGORY_COLORS).find((k) => k !== 'default' && cat && cat.includes(k))
  return key ? MILESTONE_CATEGORY_COLORS[key] : MILESTONE_CATEGORY_COLORS.default
}

function toDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

/** One bar per (Parent=asset, Item Task Code=project/study). All milestones for that project/study go on the SAME swim lane (same bar). */
function groupRowsIntoBars(rows: MilestoneTimelineRow[]): MilestoneBarRow[] {
  const map = new Map<string, MilestoneBarRow>()
  for (const r of rows) {
    const parent = r.parent ?? ''
    const itemTaskCode = r.itemTaskCode ?? (r as { taskCode?: string }).taskCode ?? ''
    const plan = r.planCategory || 'Current'
    const key = `${parent}|${itemTaskCode}|${plan}|${r.itemType}`
    const minD = toDate(r.minTaskReportedDate)
    const maxD = toDate(r.maxTaskReportedDate)
    const reportedD = toDate(r.reportedDate)
    const cat = r.milestoneCategory || 'Other'
    if (!map.has(key)) {
      map.set(key, {
        parent,
        categoryLabel: `${cat} - ${plan}`,
        childLabel: `${r.taskShortDescription} - ${plan}`,
        itemTaskCode,
        planCategory: plan,
        itemType: r.itemType,
        minDate: minD,
        maxDate: maxD,
        milestones: [],
        assetProgram: r.assetProgram,
      })
    }
    const bar = map.get(key)!
    if (bar.minDate > minD) bar.minDate = minD
    if (bar.maxDate < maxD) bar.maxDate = maxD
    bar.milestones.push({
      taskShortDescription: r.taskShortDescription,
      reportedDate: reportedD,
      milestoneCategory: cat,
    })
  }
  const bars = Array.from(map.values())
  bars.sort((a, b) => a.parent.localeCompare(b.parent) || a.itemTaskCode.localeCompare(b.itemTaskCode))
  return bars
}

interface MilestoneGovernanceViewProps {
  rows: MilestoneTimelineRow[]
  assetName?: string
  /** When provided, timeline axis respects Day / Week / Month / Year. */
  viewMode?: ViewMode
}

/** Group milestones by date on a bar; same-date = stacked (show asterisk). */
function groupMilestonesByDate(milestones: MilestoneBarRow['milestones']): { date: Date; list: typeof milestones }[] {
  const byDate = new Map<number, typeof milestones>()
  for (const m of milestones) {
    const t = m.reportedDate.getTime()
    if (!byDate.has(t)) byDate.set(t, [])
    byDate.get(t)!.push(m)
  }
  return Array.from(byDate.entries()).map(([t, list]) => ({ date: new Date(t), list }))
}

/** Group bars by query Parent (asset), so Asset = parent, Project = child row. */
function groupBarsByParent(bars: MilestoneBarRow[]): ParentGroup[] {
  const byParent = new Map<string, MilestoneBarRow[]>()
  for (const b of bars) {
    const key = b.parent || '\u00A0'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(b)
  }
  return Array.from(byParent.entries())
    .map(([key, barList]) => ({
      key,
      label: key,
      bars: barList.sort((a, b) => a.itemTaskCode.localeCompare(b.itemTaskCode)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function MilestoneGovernanceView({ rows, assetName = '', viewMode = 'Month' }: MilestoneGovernanceViewProps) {
  const bars = useMemo(() => groupRowsIntoBars(rows), [rows])
  const parentGroups = useMemo(() => groupBarsByParent(bars), [bars])
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set())
  const isYearView = viewMode === 'Year'

  const toggleParent = useCallback((key: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  useEffect(() => {
    if (parentGroups.length > 0) {
      setExpandedParents(new Set(parentGroups.map((p) => p.key)))
    }
  }, [rows])

  const { yearMin, yearMax, totalMonths, startMonth, totalYears } = useMemo(() => {
    if (bars.length === 0) {
      const y = new Date().getFullYear()
      return { yearMin: y - 2, yearMax: y + 4, totalMonths: 84, startMonth: (y - 2) * 12, totalYears: 7 }
    }
    const dates = bars.flatMap((b) => [b.minDate.getTime(), b.maxDate.getTime()])
    const minT = Math.min(...dates)
    const maxT = Math.max(...dates)
    const yearMin = new Date(minT).getFullYear()
    const yearMax = new Date(maxT).getFullYear()
    const totalMonths = (yearMax - yearMin + 1) * 12
    const startMonth = yearMin * 12
    const totalYears = yearMax - yearMin + 1
    return { yearMin, yearMax, totalMonths, startMonth, totalYears }
  }, [bars])

  const xForDate = useCallback(
    (d: Date) => {
      if (isYearView) {
        const year = d.getFullYear()
        return ((year - yearMin) / totalYears) * TIMELINE_WIDTH
      }
      const month = d.getFullYear() * 12 + d.getMonth()
      return ((month - startMonth) / totalMonths) * TIMELINE_WIDTH
    },
    [isYearView, yearMin, totalYears, startMonth, totalMonths]
  )

  const todayX = useMemo(() => xForDate(new Date()), [xForDate])
  const isTodayInRange = todayX >= 0 && todayX <= TIMELINE_WIDTH

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = yearMin; y <= yearMax; y++) list.push(y)
    return list
  }, [yearMin, yearMax])

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No milestone timeline data. Load a project or ensure the milestone timeline query returns rows for this asset.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-milestone-governance-view>
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">
          Milestones &amp; Governance View
          {assetName && <span className="text-slate-600 font-normal ml-2">({assetName})</span>}
        </h3>
      </div>
      <div className="flex overflow-x-auto">
        <div className="shrink-0 border-r border-slate-200 bg-slate-50/50" style={{ width: LEFT_WIDTH + TOGGLE_COLUMN_WIDTH, minWidth: LEFT_WIDTH + TOGGLE_COLUMN_WIDTH }}>
          <div className="grid gap-0 border-b border-slate-200 bg-slate-100" style={{ height: HEADER_HEIGHT, gridTemplateColumns: `${TOGGLE_COLUMN_WIDTH}px 1fr 1fr` }}>
            <div className="flex items-center justify-center text-xs font-semibold text-slate-600 border-r border-slate-200" />
            <div className="flex items-center px-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Asset</div>
            <div className="flex items-center px-2 text-xs font-semibold text-slate-700">Project</div>
          </div>
          <div className="divide-y divide-slate-100">
            {parentGroups.map((group) => {
              const isExpanded = expandedParents.has(group.key)
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleParent(group.key)}
                    className="w-full grid gap-0 text-left hover:bg-slate-100/80 transition-colors border-b border-slate-100 bg-white"
                    style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_COLUMN_WIDTH}px 1fr 1fr` }}
                  >
                    <div className="flex items-center justify-center text-slate-500 border-r border-slate-100">
                      <span className="text-sm leading-none font-medium" aria-label={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? '−' : '+'}</span>
                    </div>
                    <div className="flex items-center px-2 py-1.5 border-r border-slate-100">
                      <span className="text-xs font-medium text-slate-800 truncate" title={group.label}>{group.label}</span>
                    </div>
                    <div className="flex items-center px-2 py-1.5" />
                  </button>
                  {isExpanded &&
                    group.bars.map((bar, i) => (
                      <div
                        key={`${bar.parent}-${bar.itemTaskCode}-${i}`}
                        className="grid gap-0 border-b border-slate-50 bg-white pl-4"
                        style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_COLUMN_WIDTH}px 1fr 1fr` }}
                      >
                        <div className="flex items-center justify-center border-r border-slate-100" />
                        <div className="flex items-center px-2 py-1.5 border-r border-slate-100" />
                        <div className="flex items-center px-2 py-1.5">
                          <span className="text-xs text-slate-600 truncate" title={bar.itemTaskCode}>{bar.itemTaskCode}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-x-auto relative">
          <div className="border-b border-slate-200 bg-slate-100 flex" style={{ height: HEADER_HEIGHT, width: TIMELINE_WIDTH, minWidth: TIMELINE_WIDTH }}>
            {years.map((y) => (
              <div key={y} className="flex-1 flex flex-col min-w-0 border-r border-slate-200 last:border-r-0">
                <div className="text-center text-xs font-semibold text-slate-700 py-1">{y}</div>
                {!isYearView && (
                  <div className="flex justify-around text-[10px] text-slate-500">
                    {QUARTERS.map((q) => (
                      <span key={q}>{q}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="relative" style={{ width: TIMELINE_WIDTH, minWidth: TIMELINE_WIDTH }}>
            {isTodayInRange && (
              <div className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-slate-800 pointer-events-none z-10" style={{ left: todayX }} title="Today" />
            )}
            {parentGroups.map((group) => {
              const isExpanded = expandedParents.has(group.key)
              return (
                <div key={group.key}>
                  <div className="border-b border-slate-100 bg-slate-50/30" style={{ height: ROW_HEIGHT }} />
                  {isExpanded &&
                    group.bars.map((bar, i) => {
                      const xMin = xForDate(bar.minDate)
                      const xMax = xForDate(bar.maxDate)
                      const barColor = getItemTypeColor(bar.itemType)
                      const barTooltip = bar.assetProgram ? `Asset/Program: ${bar.assetProgram}` : undefined
                      const milestoneGroups = groupMilestonesByDate(bar.milestones)
                      return (
                        <div key={`${group.key}-${bar.itemTaskCode}-${i}`} className="border-b border-slate-50 relative flex items-center bg-white" style={{ height: ROW_HEIGHT }}>
                          <div
                            className="absolute top-1 bottom-1 rounded-sm opacity-80"
                            style={{
                              left: Math.max(0, xMin),
                              width: Math.max(4, xMax - xMin),
                              backgroundColor: barColor,
                            }}
                            title={barTooltip}
                          />
                          {milestoneGroups.map((mg, j) => {
                            const x = xForDate(mg.date)
                            const q = Math.floor(mg.date.getMonth() / 3) + 1
                            const isStacked = mg.list.length > 1
                            const color = isStacked ? '#1f2937' : getMilestoneColor(mg.list[0].milestoneCategory)
                            const label = isStacked ? mg.list.map((m) => m.taskShortDescription).join(', ') : mg.list[0].taskShortDescription
                            return (
                              <div
                                key={`${i}-${j}`}
                                className="absolute flex flex-col items-center z-[2]"
                                style={{ left: x - MILESTONE_SIZE / 2, top: 0, width: MILESTONE_SIZE * 2, height: ROW_HEIGHT }}
                              >
                                <span className="text-[9px] font-medium text-slate-700 truncate max-w-[100px] text-center leading-tight" style={{ marginTop: 2 }}>
                                  {label}
                                </span>
                                {isStacked ? (
                                  <span className="text-base font-bold text-slate-800 leading-none" style={{ marginTop: 2 }} title={label}>*</span>
                                ) : (
                                  <div
                                    className="rounded flex-shrink-0"
                                    style={{
                                      width: MILESTONE_SIZE,
                                      height: MILESTONE_SIZE,
                                      backgroundColor: color,
                                      transform: 'rotate(45deg)',
                                      marginTop: 0,
                                    }}
                                    title={label}
                                  />
                                )}
                                <span className="text-[9px] text-slate-500">Q{q}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-700">Type:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: ITEM_TYPE_COLORS['Project - Approved Governance Baseline'] }} />
            <span className="text-slate-600">Approved governance</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: ITEM_TYPE_COLORS['Project - Current'] }} />
            <span className="text-slate-600">Current Plan</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: ITEM_TYPE_COLORS['Study - Current'] }} />
            <span className="text-slate-600">Study</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-700">Milestones:</span>
          {[
            { label: 'Stacked milestones', color: '#1f2937', shape: 'asterisk' as const },
            { label: 'C2', color: '#facc15', shape: 'diamond' as const },
            { label: 'Key results', color: '#dc2626', shape: 'diamond' as const },
            { label: 'Other', color: '#22c55e', shape: 'diamond' as const },
            { label: 'Phase 1, 2, & 3 start', color: '#7dd3fc', shape: 'diamond' as const },
            { label: 'Regulatory submission, Approval & Launch', color: '#9333ea', shape: 'diamond' as const },
            { label: 'Study', color: '#1f2937', shape: 'diamond' as const },
          ].map(({ label, color, shape }) => (
            <span key={label} className="flex items-center gap-1.5">
              {shape === 'asterisk' ? (
                <span className="text-slate-800 font-bold text-sm leading-none">*</span>
              ) : (
                <span className="w-3 h-3 rounded border border-slate-300 inline-block" style={{ backgroundColor: color, transform: 'rotate(45deg)' }} />
              )}
              <span className="text-slate-600">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
