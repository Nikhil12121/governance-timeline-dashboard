import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { usePresentation } from '@/context/PresentationContext'
import { useTimeline } from '@/context/TimelineContext'
import { generateTimelineSummary, generateKeyMessages } from '@/utils/summary'
import { exportPresentationToPptx } from '@/utils/pptExport'
import { TimelineFilters } from '@/components/timeline/TimelineFilters'
import { GanttChart } from '@/components/timeline/GanttChart'
import { EditContextModal } from '@/components/timeline/EditContextModal'
import { SlidePreviewCard } from '@/components/presentation/SlidePreview'

export function GovernancePPTPage() {
  const { presentation, updateSlide } = usePresentation()
  const {
    tasks,
    filteredTasks,
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

  const chartExportRef = useRef<HTMLDivElement>(null)
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filename, setFilename] = useState(presentation.filename)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1)

  const titleSlide = presentation.slides.find((s) => s.type === 'title')
  const timelineSlide = presentation.slides.find((s) => s.type === 'timeline')
  const contentSlide = presentation.slides.find((s) => s.type === 'content')
  const summarySlide = presentation.slides.find((s) => s.type === 'summary')

  const handleGenerateAnalysis = () => {
    const summaryText = generateTimelineSummary(filteredTasks)
    const bullets = generateKeyMessages(filteredTasks)
    if (summarySlide) updateSlide(summarySlide.id, { body: summaryText })
    if (contentSlide && contentSlide.type === 'content') {
      updateSlide(contentSlide.id, { bullets })
    }
  }

  const handleDoubleClickTask = (task: { id: string }) => {
    const full = tasks.find((t) => t.id === task.id) ?? null
    setEditingTask(full)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      let chartImage: string | undefined
      if (chartExportRef.current && ganttTasks.length > 0) {
        // Ensure chart is painted: wait for layout and a short paint delay
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise((r) => setTimeout(r, 400))
        try {
          chartImage = await toPng(chartExportRef.current, {
            width: 960,
            height: 420,
            pixelRatio: 2,
            cacheBust: true,
            includeQueryParams: true,
          })
        } catch (e) {
          console.warn('Chart capture failed, using table fallback:', e)
        }
      }
      await exportPresentationToPptx(
        { ...presentation, filename },
        filteredTasks,
        filename,
        chartImage
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Off-viewport but painted so html-to-image can capture (in-viewport + invisible) */}
      <div
        ref={chartExportRef}
        className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 960,
          height: 420,
          zIndex: -1,
          opacity: 0.002,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <GanttChart
          tasks={ganttTasks}
          viewMode={viewMode}
          listCellWidth="180px"
          columnWidth={36}
        />
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Governance PPT</h1>
      <p className="text-slate-600 mb-8">
        Fill in your inputs, customise the timeline, review generated analysis (edit if needed), preview the deck, then download.
      </p>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {([1, 2, 3, 4] as const).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => setActiveStep(step)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeStep === step
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {step === 1 && '1. Your inputs'}
            {step === 2 && '2. Timeline & analysis'}
            {step === 3 && '3. Preview'}
            {step === 4 && '4. Download'}
          </button>
        ))}
      </div>

      {/* Step 1: PM inputs */}
      {activeStep === 1 && (
        <section className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Your inputs</h2>
            <p className="text-sm text-slate-600 mb-4">Enter the title and subtitle for your governance deck.</p>
            {titleSlide && titleSlide.type === 'title' && (
              <>
                <label className="block mb-3">
                  <span className="text-sm font-medium text-slate-700">Presentation title</span>
                  <input
                    type="text"
                    value={titleSlide.title}
                    onChange={(e) => updateSlide(titleSlide.id, { title: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Project Governance – Timeline Overview"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Subtitle (optional)</span>
                  <input
                    type="text"
                    value={titleSlide.subtitle ?? ''}
                    onChange={(e) => updateSlide(titleSlide.id, { subtitle: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Governance-quality timelines | [Project Name]"
                  />
                </label>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium"
          >
            Next: Timeline & analysis →
          </button>
        </section>
      )}

      {/* Step 2: Timeline + generated analysis (editable) */}
      {activeStep === 2 && (
        <section className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Timeline & data</h2>
            <p className="text-sm text-slate-600 mb-4">
              Customise the view. Double-click a task to add manual context. This data drives the timeline slide and the analysis below.
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
            {timelineSlide && (
              <label className="block mt-4">
                <span className="text-sm font-medium text-slate-700">Timeline slide title (for PPT)</span>
                <input
                  type="text"
                  value={timelineSlide.title}
                  onChange={(e) => updateSlide(timelineSlide.id, { title: e.target.value })}
                  className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Governance Timeline"
                />
              </label>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Generated analysis</h2>
            <p className="text-sm text-slate-600 mb-4">
              Analysis is based on the timeline data above. Generate, then edit if required.
            </p>
            <button
              type="button"
              onClick={handleGenerateAnalysis}
              className="mb-4 px-4 py-2 bg-amber-100 text-amber-900 rounded-lg text-sm font-medium hover:bg-amber-200"
            >
              Generate from data
            </button>

            {summarySlide && (
              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-700">Summary (editable)</span>
                <textarea
                  value={summarySlide.body}
                  onChange={(e) => updateSlide(summarySlide.id, { body: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[100px]"
                  placeholder="Generate from data or type here."
                  rows={4}
                />
              </label>
            )}

            {contentSlide && contentSlide.type === 'content' && (
              <>
                <label className="block mb-2">
                  <span className="text-sm font-medium text-slate-700">Content slide title</span>
                  <input
                    type="text"
                    value={contentSlide.title}
                    onChange={(e) => updateSlide(contentSlide.id, { title: e.target.value })}
                    className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Key messages & objectives"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Key messages (one per line, editable)</span>
                  <textarea
                    value={contentSlide.bullets.join('\n')}
                    onChange={(e) =>
                      updateSlide(contentSlide.id, {
                        bullets: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[120px] font-mono"
                    placeholder="One key message per line"
                    rows={5}
                  />
                </label>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium"
          >
            Next: Preview →
          </button>
        </section>
      )}

      {/* Step 3: Preview */}
      {activeStep === 3 && (
        <section className="space-y-8">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Preview your PPT</h2>
            <p className="text-sm text-slate-600 mb-6">
              This is how your slides will look in the PDF/PPT format. If something needs changing, go back to step 1 or 2.
            </p>
            <div className="space-y-6">
              {presentation.slides.map((slide, index) => (
                <div key={slide.id}>
                  <SlidePreviewCard
                    slide={slide}
                    pageNum={index + 1}
                    timelineTasks={slide.type === 'timeline' ? filteredTasks : undefined}
                    ganttTasks={slide.type === 'timeline' ? ganttTasks : undefined}
                    viewMode={slide.type === 'timeline' ? viewMode : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium"
            >
              ← Back to edit
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium"
            >
              Looks good → Download
            </button>
          </div>
        </section>
      )}

      {/* Step 4: Download */}
      {activeStep === 4 && (
        <section className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Download your PPT</h2>
            <p className="text-sm text-slate-600 mb-4">
              Everything looks perfect? Download the presentation in GSK format. The timeline slide will include the <strong>Gantt chart visual</strong> (same as in step 2), not just a table.
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
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Generating…' : 'Download PPT'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            ← Back to preview
          </button>
        </section>
      )}

      <EditContextModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={updateTaskContext}
      />
    </div>
  )
}
