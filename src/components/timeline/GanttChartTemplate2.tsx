/**
 * Template 2: High-level project plan with financials.
 * Activity names on/in bars, financials table and legend below.
 * Respects viewMode for timeline granularity (Year / Month).
 */
import { useMemo } from 'react'
import type { TimelineTask } from '@/types/timeline'
import type { ViewMode } from '@/types/timeline'
import type { FinancialsGanttSlide } from '@/types/presentation'
import { GSK_THEME } from '@/theme/gsk'

const BAR_HEIGHT = 28
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PHASE_COLORS: Record<string, string> = {
  'Non-clinical': GSK_THEME.accentColor,
  'Clinical': '#2563eb',
  'VEO': '#16a34a',
  'CMC': '#dc2626',
  default: '#64748b',
}

interface GanttChartTemplate2Props {
  tasks: TimelineTask[]
  financialsSlide: FinancialsGanttSlide | null
  assetName?: string
  subtitle?: string
  viewMode?: ViewMode
}

function getPhaseColor(phase?: string): string {
  if (!phase) return PHASE_COLORS.default
  for (const [key, color] of Object.entries(PHASE_COLORS)) {
    if (key !== 'default' && phase.toLowerCase().includes(key.toLowerCase())) return color
  }
  return PHASE_COLORS.default
}

export function GanttChartTemplate2({
  tasks = [],
  financialsSlide,
  assetName = '',
  subtitle = 'High level project plan to launch with financials',
  viewMode = 'Year',
}: GanttChartTemplate2Props) {
  const { yearMin, yearMax, rows } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : []
    if (list.length === 0) {
      return { yearMin: new Date().getFullYear(), yearMax: new Date().getFullYear() + 5, rows: [] }
    }
    const toDate = (d: unknown): Date => (d instanceof Date ? d : new Date(d as string | number))
    const dates = list.flatMap((t) => [toDate(t.start).getTime(), toDate(t.end).getTime()])
    const minT = Math.min(...dates)
    const maxT = Math.max(...dates)
    const yearMin = new Date(minT).getFullYear()
    const yearMax = new Date(maxT).getFullYear()
    const totalMonths = (yearMax - yearMin + 1) * 12
    const startMonth = yearMin * 12

    const rows = list.map((t) => {
      const s = toDate(t.start).getTime()
      const e = toDate(t.end).getTime()
      const left = ((new Date(s).getFullYear() * 12 + new Date(s).getMonth()) - startMonth) / totalMonths
      const right = ((new Date(e).getFullYear() * 12 + new Date(e).getMonth()) - startMonth) / totalMonths
      const width = Math.max((right - left), 0.02)
      return {
        ...t,
        left: left * 100,
        width: width * 100,
        color: getPhaseColor(t.phase),
      }
    })
    return { yearMin, yearMax, rows }
  }, [tasks])

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
        <div className="flex text-xs font-medium text-slate-600 mb-1" style={{ gap: 0, minWidth: viewMode !== 'Year' ? Math.max(timelineHeaders.length * 24, 400) : undefined }}>
          {timelineHeaders.map((label, i) => (
            <div key={`${label}-${i}`} className={`text-center border-r border-slate-200 last:border-r-0 ${viewMode !== 'Year' ? 'flex-shrink-0' : 'flex-1 min-w-0'}`} style={viewMode !== 'Year' ? { width: 24, minWidth: 24 } : undefined}>
              {viewMode !== 'Year' ? label.split(' ')[0] : label}
            </div>
          ))}
        </div>
        <div className="space-y-1" style={viewMode !== 'Year' ? { minWidth: timelineHeaders.length * 24 } : undefined}>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center relative" style={{ height: BAR_HEIGHT }}>
              <div
                className="absolute top-0 bottom-0 rounded flex items-center px-2 overflow-hidden border border-slate-300"
                style={{
                  left: `${row.left}%`,
                  width: `${row.width}%`,
                  backgroundColor: row.color,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 500,
                }}
                title={`${row.name} (${(row.start instanceof Date ? row.start : new Date(row.start as string | number)).toLocaleDateString()} – ${(row.end instanceof Date ? row.end : new Date(row.end as string | number)).toLocaleDateString()})`}
              >
                <span className="truncate">{row.name}</span>
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
