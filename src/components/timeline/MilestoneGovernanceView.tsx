/**
 * Power BI–style Milestone & Governance View for the Timeline tab.
 * Left: Parent (expand/collapse), Project/Study. Right: Years + quarters, horizontal bars, diamond milestones, today line. Legend below.
 * Expand/collapse by parent like Template 3 (Milestones & swimlane).
 */
import { useMemo, useCallback, useState, useEffect } from 'react'
import type { MilestoneTimelineRow, MilestoneBarRow } from '@/types/milestoneTimeline'
import type { ViewMode } from '@/types/timeline'
import { GSK_THEME } from '@/theme/gsk'
import { parseDateLocal } from '@/utils/dateUtils'

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
  const d = parseDateLocal(s)
  return isNaN(d.getTime()) ? new Date() : d
}

/**
 * Segregate lanes from the data: Item Type (and Plan Category) from the API/Snowflake.
 * SQL returns Item Type as e.g. "Project - Current" | "Project - Approved Governance Baseline" | "Study - Current".
 * Plan Category is "Current" | "Approved Governance Baseline". We use Item Type first, then Plan Category.
 */
function isApprovedGovernanceFromRow(row: { itemType: string; planCategory?: string }): boolean {
  const it = (row.itemType ?? '').toLowerCase()
  if (it.includes('approved') || it.includes('approved governance baseline')) return true
  if (it.includes('current')) return false
  return (row.planCategory ?? '').toLowerCase().includes('approved')
}

function isApprovedGovernanceBar(bar: MilestoneBarRow): boolean {
  return isApprovedGovernanceFromRow(bar)
}

/** Study rows from query (Item Type "Study - Current" etc.) – plot below Current plan swim lane. */
function isStudyRow(row: { itemType: string }): boolean {
  return (row.itemType ?? '').toLowerCase().startsWith('study')
}

function isStudyBar(bar: MilestoneBarRow): boolean {
  return isStudyRow(bar)
}

/** Strip " - Current" / " - Approved Governance Baseline" from query Parent to get asset name. */
function stripPlanSuffix(parent: string): string {
  return (parent ?? '').replace(/\s*-\s*(Current|Approved Governance Baseline)\s*$/i, '').trim() || parent
}

/** Lane order: Approved (0) → Current (1) → Study (2) so study milestones plot below current plan. */
function laneOrder(b: MilestoneBarRow): number {
  if (isStudyBar(b)) return 2
  return isApprovedGovernanceBar(b) ? 0 : 1
}

/** Order: Approved governance first, then Current plan (consistent swim lane order). */
function approvedFirst(b: MilestoneBarRow): number {
  return isApprovedGovernanceBar(b) ? 0 : 1
}

/** Build projectKey → asset from project rows (asset = Parent with plan suffix stripped). */
function buildProjectKeyToAsset(rows: MilestoneTimelineRow[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of rows) {
    if (isStudyRow(r)) continue
    const asset = stripPlanSuffix(r.parent ?? '')
    if (r.projectKey && asset) m.set(r.projectKey, asset)
  }
  return m
}

/** One bar per (Parent=asset, Item Task Code=project/study). All milestones for that project/study go on the SAME swim lane (same bar). */
function groupRowsIntoBars(rows: MilestoneTimelineRow[]): MilestoneBarRow[] {
  const projectKeyToAsset = buildProjectKeyToAsset(rows)
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
    const assetKey = isStudyRow(r)
      ? (r.projectKey ? projectKeyToAsset.get(r.projectKey) : null) ?? stripPlanSuffix(parent)
      : stripPlanSuffix(parent)
    if (!map.has(key)) {
      map.set(key, {
        parent,
        assetKey: assetKey || parent,
        projectKey: r.projectKey,
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
  let bars = Array.from(map.values())
  bars.sort((a, b) => (a.assetKey ?? a.parent).localeCompare(b.assetKey ?? b.parent) || laneOrder(a) - laneOrder(b) || a.itemTaskCode.localeCompare(b.itemTaskCode))

  // Ensure two swim lanes per (parent, itemTaskCode) for *project* bars only: Approved governance first, then Current plan
  const byParentAndProject = new Map<string, MilestoneBarRow[]>()
  for (const b of bars) {
    if (isStudyBar(b)) continue
    const k = `${b.parent}|${b.itemTaskCode}`
    if (!byParentAndProject.has(k)) byParentAndProject.set(k, [])
    byParentAndProject.get(k)!.push(b)
  }
  const hasApproved = new Set(bars.filter((b) => isApprovedGovernanceBar(b)).map((b) => `${b.parent}|${b.itemTaskCode}`))
  const syntheticApproved: MilestoneBarRow[] = []
  for (const [, barList] of byParentAndProject) {
    if (barList.some((b) => isApprovedGovernanceBar(b))) continue
    const currentBar = barList.find((b) => !isApprovedGovernanceBar(b) && !isStudyBar(b))
    if (!currentBar) continue
    syntheticApproved.push({
      parent: currentBar.parent,
      assetKey: currentBar.assetKey,
      projectKey: currentBar.projectKey,
      categoryLabel: 'Approved governance',
      childLabel: currentBar.itemTaskCode + ' (Approved)',
      itemTaskCode: currentBar.itemTaskCode,
      planCategory: 'Approved Governance Baseline',
      itemType: 'Project - Approved Governance Baseline',
      minDate: currentBar.minDate,
      maxDate: currentBar.maxDate,
      milestones: [],
      assetProgram: currentBar.assetProgram,
    })
  }
  bars = [...bars, ...syntheticApproved]
  bars.sort((a, b) => (a.assetKey ?? a.parent).localeCompare(b.assetKey ?? b.parent) || laneOrder(a) - laneOrder(b) || a.itemTaskCode.localeCompare(b.itemTaskCode))
  return bars
}

interface MilestoneGovernanceViewProps {
  rows: MilestoneTimelineRow[]
  assetName?: string
  /** When provided, timeline axis respects Day / Week / Month / Year. */
  viewMode?: ViewMode
  /** When set, axis is clamped to this range so it stays in sync with the Gantt and filters. */
  dateRange?: { start: Date; end: Date } | null
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

/** Group bars by asset: Approved + Current + Study bars for same asset (assetKey from query mapping). */
function groupBarsByParent(bars: MilestoneBarRow[]): ParentGroup[] {
  const byAsset = new Map<string, MilestoneBarRow[]>()
  for (const b of bars) {
    const key = b.assetKey ?? b.parent ?? '\u00A0'
    if (!byAsset.has(key)) byAsset.set(key, [])
    byAsset.get(key)!.push(b)
  }
  return Array.from(byAsset.entries())
    .map(([key, barList]) => ({
      key,
      label: key,
      bars: barList.sort((a, b) => laneOrder(a) - laneOrder(b) || a.itemTaskCode.localeCompare(b.itemTaskCode)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Split bars into project lanes (Approved + Current) and study lanes (Study). */
function splitProjectAndStudyBars(bars: MilestoneBarRow[]): { projectBars: MilestoneBarRow[]; studyBars: MilestoneBarRow[] } {
  const projectBars = bars.filter((b) => !isStudyBar(b))
  const studyBars = bars.filter((b) => isStudyBar(b))
  return { projectBars, studyBars }
}

const STUDY_LANE_KEY_SUFFIX = '-study'

export function MilestoneGovernanceView({ rows, assetName = '', viewMode = 'Month', dateRange = null }: MilestoneGovernanceViewProps) {
  const bars = useMemo(() => groupRowsIntoBars(rows), [rows])
  const parentGroups = useMemo(() => groupBarsByParent(bars), [bars])
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set())
  const [expandedStudyLanes, setExpandedStudyLanes] = useState<Set<string>>(() => new Set())
  const isYearView = viewMode === 'Year'

  const toggleParent = useCallback((key: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleStudyLane = useCallback((assetKey: string) => {
    const key = assetKey + STUDY_LANE_KEY_SUFFIX
    setExpandedStudyLanes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  useEffect(() => {
    if (parentGroups.length > 0) {
      setExpandedParents(new Set(parentGroups.map((p) => p.key)))
      setExpandedStudyLanes((prev) => {
        const next = new Set(prev)
        parentGroups.forEach((g) => {
          const { studyBars } = splitProjectAndStudyBars(g.bars)
          if (studyBars.length > 0) next.add(g.key + STUDY_LANE_KEY_SUFFIX)
        })
        return next
      })
    }
  }, [rows])

  const { yearMin, yearMax, totalMonths, startMonth, totalYears } = useMemo(() => {
    if (bars.length === 0 && !dateRange) {
      const y = new Date().getFullYear()
      return { yearMin: y - 2, yearMax: y + 4, totalMonths: 84, startMonth: (y - 2) * 12, totalYears: 7 }
    }
    let minT: number
    let maxT: number
    if (dateRange?.start && dateRange?.end) {
      minT = dateRange.start.getTime()
      maxT = dateRange.end.getTime()
    } else if (bars.length > 0) {
      const dates = bars.flatMap((b) => [b.minDate.getTime(), b.maxDate.getTime()])
      minT = Math.min(...dates)
      maxT = Math.max(...dates)
    } else {
      const y = new Date().getFullYear()
      minT = new Date(y - 2, 0, 1).getTime()
      maxT = new Date(y + 4, 11, 31).getTime()
    }
    const yearMin = new Date(minT).getFullYear()
    const yearMax = new Date(maxT).getFullYear()
    const totalMonths = (yearMax - yearMin + 1) * 12
    const startMonth = yearMin * 12
    const totalYears = yearMax - yearMin + 1
    return { yearMin, yearMax, totalMonths, startMonth, totalYears }
  }, [bars, dateRange])

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
              const { projectBars, studyBars } = splitProjectAndStudyBars(group.bars)
              const studyLaneKey = group.key + STUDY_LANE_KEY_SUFFIX
              const isStudyLaneExpanded = expandedStudyLanes.has(studyLaneKey)
              const hasStudyBars = studyBars.length > 0
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
                  {isExpanded && (
                    <>
                      {projectBars.map((bar, i) => (
                        <div
                          key={`proj-${bar.parent}-${bar.itemTaskCode}-${i}`}
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
                      {hasStudyBars && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleStudyLane(group.key)}
                            className="w-full grid gap-0 text-left hover:bg-slate-100/80 transition-colors border-b border-slate-100 bg-slate-50/50 pl-4"
                            style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_COLUMN_WIDTH}px 1fr 1fr` }}
                          >
                            <div className="flex items-center justify-center text-slate-500 border-r border-slate-100">
                              <span className="text-sm leading-none font-medium" aria-label={isStudyLaneExpanded ? 'Collapse study milestones' : 'Expand study milestones'}>
                                {isStudyLaneExpanded ? '−' : '+'}
                              </span>
                            </div>
                            <div className="flex items-center px-2 py-1.5 border-r border-slate-100">
                              <span className="text-xs font-medium text-slate-600 truncate">Study milestones</span>
                            </div>
                            <div className="flex items-center px-2 py-1.5 text-[10px] text-slate-500">{studyBars.length} study/studies</div>
                          </button>
                          {isStudyLaneExpanded &&
                            studyBars.map((bar, i) => (
                              <div
                                key={`study-${bar.parent}-${bar.itemTaskCode}-${i}`}
                                className="grid gap-0 border-b border-slate-50 bg-white pl-8"
                                style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_COLUMN_WIDTH}px 1fr 1fr` }}
                              >
                                <div className="flex items-center justify-center border-r border-slate-100" />
                                <div className="flex items-center px-2 py-1.5 border-r border-slate-100" />
                                <div className="flex items-center px-2 py-1.5">
                                  <span className="text-xs text-slate-600 truncate" title={bar.itemTaskCode}>{bar.itemTaskCode}</span>
                                </div>
                              </div>
                            ))}
                        </>
                      )}
                    </>
                  )}
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
              const { projectBars, studyBars } = splitProjectAndStudyBars(group.bars)
              const studyLaneKey = group.key + STUDY_LANE_KEY_SUFFIX
              const isStudyLaneExpanded = expandedStudyLanes.has(studyLaneKey)
              const hasStudyBars = studyBars.length > 0
              return (
                <div key={group.key}>
                  <div className="border-b border-slate-100 bg-slate-50/30" style={{ height: ROW_HEIGHT }} />
                  {isExpanded && (
                    <>
                      {projectBars.map((bar, i) => {
                        const xMin = xForDate(bar.minDate)
                        const xMax = xForDate(bar.maxDate)
                        const barColor = getItemTypeColor(bar.itemType)
                        const barTooltip = bar.assetProgram ? `Asset/Program: ${bar.assetProgram}` : undefined
                        const milestoneGroups = groupMilestonesByDate(bar.milestones)
                        return (
                          <div key={`proj-${group.key}-${bar.itemTaskCode}-${i}`} className="border-b border-slate-50 relative flex items-center bg-white" style={{ height: ROW_HEIGHT }}>
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
                      {hasStudyBars && (
                        <>
                          <div className="border-b border-slate-100 bg-slate-50/50" style={{ height: ROW_HEIGHT }} />
                          {isStudyLaneExpanded &&
                            studyBars.map((bar, i) => {
                              const xMin = xForDate(bar.minDate)
                              const xMax = xForDate(bar.maxDate)
                              const barColor = getItemTypeColor(bar.itemType)
                              const barTooltip = bar.assetProgram ? `Asset/Program: ${bar.assetProgram}` : undefined
                              const milestoneGroups = groupMilestonesByDate(bar.milestones)
                              return (
                                <div key={`study-${group.key}-${bar.itemTaskCode}-${i}`} className="border-b border-slate-50 relative flex items-center bg-white" style={{ height: ROW_HEIGHT }}>
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
                        </>
                      )}
                    </>
                  )}
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
