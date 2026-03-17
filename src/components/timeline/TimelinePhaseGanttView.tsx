/**
 * Timeline tab: phase-based Gantt (one row per milestone category), like Plan+Financials.
 * No Approved governance lane. Asset name is expandable; under each asset, selected Phases appear as rows.
 * Milestone labels get distinct vertical slots to avoid overlap.
 */
import { useMemo, useCallback, useState, useEffect } from 'react'
import type { MilestoneTimelineRow } from '@/types/milestoneTimeline'
import type { ViewMode } from '@/types/timeline'
import { GSK_THEME } from '@/theme/gsk'
import { parseDateLocal } from '@/utils/dateUtils'

const ROW_HEIGHT = 40
const HEADER_HEIGHT = 48
const LEFT_WIDTH = 220
const TOGGLE_WIDTH = 28
const TIMELINE_WIDTH = 720
const MILESTONE_SIZE = 10
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

const PHASE_COLORS: Record<string, string> = {
  'C2 Milestones': '#f59e0b',
  C2: '#facc15',
  'Phase 1, 2, 3 Start': '#0ea5e9',
  'Phase 1, 2, & 3 start': '#7dd3fc',
  'Key Results': '#dc2626',
  'Key results': '#dc2626',
  'Regulatory Submission / Approval / Launch': '#9333ea',
  'Regulatory submission, Approval & Launch': '#9333ea',
  'Study Milestones': '#1f2937',
  Study: '#1f2937',
  'External News': '#64748b',
  'Project Milestone': '#94a3b8',
  Other: '#22c55e',
  default: GSK_THEME.accentColor,
}

function isApprovedGovernance(row: { itemType: string; planCategory?: string }): boolean {
  const it = (row.itemType ?? '').toLowerCase()
  if (it.includes('approved')) return true
  return (row.planCategory ?? '').toLowerCase().includes('approved')
}

/** Strip " - Current" / " - Approved Governance Baseline" from parent to get asset name. */
function getAssetName(parent: string): string {
  return (parent ?? '').replace(/\s*-\s*(Current|Approved Governance Baseline)\s*$/i, '').trim() || parent || 'Asset'
}

function getPhaseColor(cat: string): string {
  const key = Object.keys(PHASE_COLORS).find((k) => k !== 'default' && cat && cat.includes(k))
  return key ? PHASE_COLORS[key] : PHASE_COLORS.default
}

function toDate(s: string): Date {
  const d = parseDateLocal(s)
  return isNaN(d.getTime()) ? new Date() : d
}

interface PhaseLane {
  category: string
  color: string
  milestones: { label: string; date: Date; xPct: number }[]
}

/** Asset group: expandable; contains phase lanes (only selected phases). */
interface AssetGroup {
  assetName: string
  phaseLanes: PhaseLane[]
}

const LABEL_SLOT_COUNT = 5
/** Min horizontal gap (% of timeline) so two labels in same slot don't overlap (~90px at 720px). */
const MIN_LABEL_GAP_PCT = 18

/** Assign vertical slots (0..4) so close milestones get different vertical positions and don't overlap. */
function assignLabelSlots(milestones: { xPct: number }[]): number[] {
  if (milestones.length === 0) return []
  const sorted = milestones.map((m, i) => ({ x: m.xPct, i })).sort((a, b) => a.x - b.x)
  const slots: number[] = new Array(milestones.length).fill(0)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (curr.x - prev.x < MIN_LABEL_GAP_PCT) {
      slots[curr.i] = (slots[prev.i] + 1) % LABEL_SLOT_COUNT
    }
  }
  return slots
}

/** Vertical offset (px) from row center for each slot so labels don't overlap. Slot 0=above, 1..4 stagger. */
function getLabelOffsetY(slot: number, rowHeight: number): number {
  const half = rowHeight / 2
  switch (slot) {
    case 0: return -half - 10
    case 1: return -half - 2
    case 2: return -half + 6
    case 3: return half - 6
    case 4: return half + 2
    default: return -half - 10
  }
}

export interface TimelinePhaseGanttViewProps {
  rows: MilestoneTimelineRow[]
  assetName?: string
  /** Subtitle under the title (e.g. "Timeline from Snowflake-ready data for GSK4425689"). */
  subtitle?: string
  viewMode?: ViewMode
  dateRange?: { start: Date; end: Date } | null
  /** Selected phase (milestone category) names; empty = show all. */
  filterPhases?: string[]
}

export function TimelinePhaseGanttView({
  rows,
  assetName = '',
  subtitle,
  viewMode = 'Year',
  dateRange = null,
  filterPhases = [],
}: TimelinePhaseGanttViewProps) {
  const currentOnly = useMemo(() => rows.filter((r) => !isApprovedGovernance(r)), [rows])

  const assetGroups = useMemo(() => {
    const byAsset = new Map<string, Map<string, { label: string; date: Date }[]>>()
    for (const r of currentOnly) {
      const asset = getAssetName(r.parent ?? '')
      const cat = (r.milestoneCategory && r.milestoneCategory.trim()) || 'Other'
      if (filterPhases.length > 0 && !filterPhases.includes(cat)) continue
      const date = toDate(r.reportedDate)
      const label = r.taskShortDescription || ''
      if (!byAsset.has(asset)) byAsset.set(asset, new Map())
      const byCat = byAsset.get(asset)!
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push({ label, date })
    }
    const groups: AssetGroup[] = []
    for (const [assetName, byCategory] of byAsset) {
      const phaseLanes: PhaseLane[] = []
      for (const [category, items] of byCategory) {
        phaseLanes.push({
          category,
          color: getPhaseColor(category),
          milestones: items.map(({ label, date }) => ({ label, date, xPct: 0 })),
        })
      }
      phaseLanes.sort((a, b) => {
        const aMin = Math.min(...a.milestones.map((m) => m.date.getTime()))
        const bMin = Math.min(...b.milestones.map((m) => m.date.getTime()))
        return aMin - bMin
      })
      groups.push({ assetName, phaseLanes })
    }
    groups.sort((a, b) => a.assetName.localeCompare(b.assetName))
    return groups
  }, [currentOnly, filterPhases])

  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(() => new Set())
  const assetGroupKey = useMemo(() => assetGroups.map((g) => g.assetName).join(','), [assetGroups])
  useEffect(() => {
    if (assetGroups.length > 0) {
      setExpandedAssets((prev) => {
        const next = new Set(prev)
        assetGroups.forEach((g) => next.add(g.assetName))
        return next
      })
    }
  }, [assetGroupKey, assetGroups.length])
  const toggleAsset = useCallback((name: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const { yearMin, yearMax, totalMonths, startMonth, totalYears } = useMemo(() => {
    const allMilestones = assetGroups.flatMap((g) => g.phaseLanes.flatMap((l) => l.milestones))
    if (allMilestones.length === 0 && !dateRange) {
      const y = new Date().getFullYear()
      return { yearMin: y - 2, yearMax: y + 4, totalMonths: 84, startMonth: (y - 2) * 12, totalYears: 7 }
    }
    let minT: number
    let maxT: number
    if (dateRange?.start && dateRange?.end) {
      minT = dateRange.start.getTime()
      maxT = dateRange.end.getTime()
    } else if (allMilestones.length > 0) {
      const dates = allMilestones.map((m) => m.date.getTime())
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
  }, [assetGroups, dateRange])

  const isYearView = viewMode === 'Year'

  const xForDate = useCallback(
    (d: Date) => {
      if (isYearView) {
        return ((d.getFullYear() - yearMin) / totalYears) * TIMELINE_WIDTH
      }
      const month = d.getFullYear() * 12 + d.getMonth()
      return ((month - startMonth) / totalMonths) * TIMELINE_WIDTH
    },
    [isYearView, yearMin, totalYears, startMonth, totalMonths]
  )

  const assetGroupsWithPositions = useMemo(() => {
    return assetGroups.map((group) => ({
      ...group,
      phaseLanes: group.phaseLanes.map((lane) => {
        const milestones = lane.milestones.map((m) => ({
          ...m,
          xPct: (xForDate(m.date) / TIMELINE_WIDTH) * 100,
        }))
        const slots = assignLabelSlots(milestones)
        return {
          ...lane,
          milestones: milestones.map((m, i) => ({ ...m, slot: slots[i] })),
        }
      }),
    }))
  }, [assetGroups, xForDate])

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = yearMin; y <= yearMax; y++) list.push(y)
    return list
  }, [yearMin, yearMax])

  if (currentOnly.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No current-plan milestone data. Load a project or clear phase filter.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-timeline-phase-gantt>
      <div className="px-4 pt-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-4 shrink-0 rounded-sm" style={{ backgroundColor: GSK_THEME.accentColor }} />
          <h3 className="text-lg font-bold text-slate-800">{assetName || 'Timeline'}</h3>
        </div>
        {subtitle && <p className="text-sm text-slate-600 mt-0.5 ml-4">{subtitle}</p>}
      </div>
      <div className="flex overflow-x-auto">
        <div className="shrink-0 border-r border-slate-200 bg-slate-50/50" style={{ width: LEFT_WIDTH + TOGGLE_WIDTH, minWidth: LEFT_WIDTH + TOGGLE_WIDTH }}>
          <div className="border-b border-slate-200 bg-slate-100 grid gap-0" style={{ height: HEADER_HEIGHT, gridTemplateColumns: `${TOGGLE_WIDTH}px 1fr` }}>
            <div className="flex items-center justify-center text-xs font-semibold text-slate-600 border-r border-slate-200" />
            <div className="flex items-center px-2 text-xs font-semibold text-slate-700">Asset / Phase</div>
          </div>
          <div className="divide-y divide-slate-100">
            {assetGroupsWithPositions.map((group) => {
              const isExpanded = expandedAssets.has(group.assetName)
              return (
                <div key={group.assetName}>
                  <button
                    type="button"
                    onClick={() => toggleAsset(group.assetName)}
                    className="w-full grid gap-0 text-left hover:bg-slate-100/80 transition-colors border-b border-slate-100 bg-white"
                    style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_WIDTH}px 1fr` }}
                  >
                    <div className="flex items-center justify-center text-slate-500 border-r border-slate-100">
                      <span className="text-sm leading-none font-medium" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                        {isExpanded ? '−' : '+'}
                      </span>
                    </div>
                    <div className="flex items-center px-2 py-1.5">
                      <span className="text-xs font-semibold text-slate-800 truncate" title={group.assetName}>
                        {group.assetName}
                      </span>
                    </div>
                  </button>
                  {isExpanded &&
                    group.phaseLanes.map((lane) => (
                      <div
                        key={`${group.assetName}-${lane.category}`}
                        className="grid gap-0 border-b border-slate-50 bg-slate-50/30"
                        style={{ minHeight: ROW_HEIGHT, gridTemplateColumns: `${TOGGLE_WIDTH}px 1fr` }}
                      >
                        <div className="flex items-center justify-center border-r border-slate-100" />
                        <div className="flex items-center pl-4 pr-2 py-1.5">
                          <span className="text-xs font-medium text-slate-700 truncate" title={lane.category}>
                            {lane.category}
                          </span>
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
            {assetGroupsWithPositions.map((group) => {
              const isExpanded = expandedAssets.has(group.assetName)
              return (
                <div key={group.assetName}>
                  <div className="border-b border-slate-100 bg-slate-50/50" style={{ height: ROW_HEIGHT }} />
                  {isExpanded &&
                    group.phaseLanes.map((lane) => (
                      <div
                        key={`${group.assetName}-${lane.category}`}
                        className="border-b border-slate-50 relative flex items-center bg-white"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {lane.milestones.length > 0 && (() => {
                          const minPct = Math.min(...lane.milestones.map((m) => m.xPct))
                          const maxPct = Math.max(...lane.milestones.map((m) => m.xPct))
                          return (
                            <div
                              className="absolute top-1 bottom-1 rounded opacity-20"
                              style={{
                                left: `${minPct}%`,
                                width: `${Math.max(2, maxPct - minPct)}%`,
                                backgroundColor: lane.color,
                              }}
                            />
                          )
                        })()}
                        {lane.milestones.map((m, j) => {
                          const leftPx = (m.xPct / 100) * TIMELINE_WIDTH
                          const slot = m.slot ?? 0
                          const offsetY = getLabelOffsetY(slot, ROW_HEIGHT)
                          return (
                            <div
                              key={`${j}-${m.date.getTime()}`}
                              className="absolute z-[2]"
                              style={{
                                left: Math.max(0, Math.min(leftPx - 45, TIMELINE_WIDTH - 90)),
                                top: 0,
                                width: 90,
                                height: ROW_HEIGHT,
                              }}
                            >
                              <span
                                className="text-[9px] font-medium text-slate-700 truncate w-full text-center leading-tight block px-0.5 absolute left-0 right-0"
                                style={{
                                  top: `calc(50% + ${offsetY}px)`,
                                  transform: 'translateY(-50%)',
                                }}
                                title={m.label}
                              >
                                {m.label}
                              </span>
                              <div
                                className="rounded flex-shrink-0 border-2 border-slate-700 absolute"
                                style={{
                                  width: MILESTONE_SIZE,
                                  height: MILESTONE_SIZE,
                                  backgroundColor: lane.color,
                                  transform: 'rotate(45deg)',
                                  top: (ROW_HEIGHT - MILESTONE_SIZE) / 2,
                                  left: (90 - MILESTONE_SIZE) / 2,
                                }}
                                title={m.label}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {Object.entries(PHASE_COLORS)
          .filter(([k]) => k !== 'default')
          .map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: color, transform: 'rotate(45deg)' }} />
              <span className="text-slate-600">{label}</span>
            </span>
          ))}
      </div>
    </div>
  )
}
