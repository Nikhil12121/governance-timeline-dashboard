import type { ViewMode } from '@/types/timeline'

interface TimelineFiltersProps {
  phases: string[]
  filterPhases: string[]
  setFilterPhases: (p: string[]) => void
  showMilestonesOnly: boolean
  setShowMilestonesOnly: (v: boolean) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  dateRange: { start: Date; end: Date } | null
  setDateRange: (r: { start: Date; end: Date } | null) => void
}

export function TimelineFilters({
  phases,
  filterPhases,
  setFilterPhases,
  showMilestonesOnly,
  setShowMilestonesOnly,
  viewMode,
  setViewMode,
  dateRange,
  setDateRange,
}: TimelineFiltersProps) {
  const togglePhase = (phase: string) => {
    if (filterPhases.includes(phase)) {
      setFilterPhases(filterPhases.filter((p) => p !== phase))
    } else {
      setFilterPhases([...filterPhases, phase])
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">View</label>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="Day">Day</option>
          <option value="Week">Week</option>
          <option value="Month">Month</option>
          <option value="Year">Year</option>
        </select>
      </div>
      {phases.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Phase</label>
          <div className="flex gap-2 flex-wrap">
            {phases.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePhase(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterPhases.includes(p)
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showMilestonesOnly}
          onChange={(e) => setShowMilestonesOnly(e.target.checked)}
          className="rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">Milestones only</span>
      </label>
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={dateRange?.start.toISOString().slice(0, 10) ?? ''}
            onChange={(e) => {
              const d = e.target.value ? new Date(e.target.value) : null
              if (!d) return
              if (!dateRange) {
                const end = new Date(d)
                end.setMonth(end.getMonth() + 3)
                setDateRange({ start: d, end })
              } else {
                setDateRange({ ...dateRange, start: d })
              }
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={dateRange?.end.toISOString().slice(0, 10) ?? ''}
            onChange={(e) => {
              const d = e.target.value ? new Date(e.target.value) : null
              if (!d || !dateRange) return
              setDateRange({ ...dateRange, end: d })
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {dateRange && (
          <button
            type="button"
            onClick={() => setDateRange(null)}
            className="text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  )
}
