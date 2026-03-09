import { useState } from 'react'
import { useTimeline } from '@/context/TimelineContext'
import { generateTimelineSummary } from '@/utils/summary'
import { exportToPptx } from '@/utils/pptExport'

export function ExportPanel() {
  const { filteredTasks } = useTimeline()
  const [summary, setSummary] = useState<string | null>(null)
  const [includeSummaryInPpt, setIncludeSummaryInPpt] = useState(true)
  const [title, setTitle] = useState('Governance Timeline')
  const [exporting, setExporting] = useState(false)

  const handleGenerateSummary = () => {
    const text = generateTimelineSummary(filteredTasks)
    setSummary(text)
  }

  const handleExportPpt = async () => {
    setExporting(true)
    try {
      const summaryText = includeSummaryInPpt
        ? summary ?? generateTimelineSummary(filteredTasks)
        : undefined
      await exportToPptx(title, filteredTasks, summaryText)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Summary</h2>
        <p className="text-sm text-slate-600 mb-4">
          Generate a short summary of the currently visible timeline (based on your filters). Use it in reports or include it in the PPT export.
        </p>
        <button
          type="button"
          onClick={handleGenerateSummary}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 transition-colors"
        >
          Generate summary
        </button>
        {summary && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Export to PowerPoint</h2>
        <p className="text-sm text-slate-600 mb-4">
          Download the current timeline view as a .pptx file. Slide 1: title + timeline table; optional Slide 2: summary.
        </p>
        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Slide title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Governance Timeline"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSummaryInPpt}
              onChange={(e) => setIncludeSummaryInPpt(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Include summary slide (generate summary first if needed)</span>
          </label>
        </div>
        <button
          type="button"
          onClick={handleExportPpt}
          disabled={exporting || filteredTasks.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? 'Exporting…' : 'Download as PPTX'}
        </button>
        {filteredTasks.length === 0 && (
          <p className="mt-2 text-sm text-amber-600">No data to export. Add tasks or adjust filters on the Timeline page.</p>
        )}
      </section>
    </div>
  )
}
