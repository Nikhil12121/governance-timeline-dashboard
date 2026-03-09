import { useState } from 'react'
import { usePresentation } from '@/context/PresentationContext'
import { useTimeline } from '@/context/TimelineContext'
import { generateTimelineSummary } from '@/utils/summary'
import { exportPresentationToPptx } from '@/utils/pptExport'
import { SlideEditor } from '@/components/presentation/SlideEditor'

export function PresentationPage() {
  const { presentation, updateSlide, removeSlide } = usePresentation()
  const { filteredTasks } = useTimeline()
  const [exporting, setExporting] = useState(false)
  const [filename, setFilename] = useState(presentation.filename)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPresentationToPptx(
        { ...presentation, filename },
        filteredTasks,
        filename
      )
    } finally {
      setExporting(false)
    }
  }

  const summarySlide = presentation.slides.find((s) => s.type === 'summary')
  const handleUseGeneratedSummary = () => {
    const text = generateTimelineSummary(filteredTasks)
    if (summarySlide) updateSlide(summarySlide.id, { body: text })
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Build presentation</h1>
      <p className="text-slate-600 mb-6">
        Edit each slide below. Timeline slide uses the data from the Timeline page (with your filters). When ready, generate the PPT in GSK format.
      </p>

      <div className="space-y-6 mb-8">
        {presentation.slides.map((slide, index) => (
          <SlideEditor
            key={slide.id}
            slide={slide}
            index={index}
            onUpdate={updateSlide}
            onRemove={removeSlide}
          />
        ))}
      </div>

      {summarySlide && (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <button
            type="button"
            onClick={handleUseGeneratedSummary}
            className="text-sm font-medium text-amber-800 hover:text-amber-900"
          >
            Use generated summary from current timeline →
          </button>
          <p className="text-xs text-amber-700 mt-1">
            Fills the Summary slide with text generated from the visible timeline (same as Export & Summary).
          </p>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Export to GSK format</h2>
        <p className="text-sm text-slate-600 mb-4">
          Download the full presentation as a PowerPoint file. Each slide uses the GSK template (footer with date and logo, orange accent).
        </p>
        <label className="block mb-4">
          <span className="text-sm font-medium text-slate-700">Filename</span>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Governance-Timeline-GSK.pptx"
          />
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? 'Generating…' : 'Generate PPT in GSK format'}
        </button>
      </section>
    </div>
  )
}
