import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { toPng, toCanvas } from 'html-to-image'
import { usePresentation } from '@/context/PresentationContext'
import { useTimeline } from '@/context/TimelineContext'
import { GanttColumnWidthsProvider } from '@/context/GanttColumnWidthsContext'
import { generateTimelineSummary, generateKeyMessages } from '@/utils/summary'
import { exportPresentationToPptx } from '@/utils/pptExport'
import { fetchAssetOptions, fetchGovernanceProjectData, fetchConsultationAnalysis, fetchSummaryAnalysis } from '@/lib/governanceApi'
import { TimelineFilters } from '@/components/timeline/TimelineFilters'
import { GanttChart } from '@/components/timeline/GanttChart'
import { GanttChartTemplate2 } from '@/components/timeline/GanttChartTemplate2'
import { GanttChartTemplate3 } from '@/components/timeline/GanttChartTemplate3'
import { MilestoneGovernanceView } from '@/components/timeline/MilestoneGovernanceView'
import { EditContextModal } from '@/components/timeline/EditContextModal'
import { SlidePreviewCard } from '@/components/presentation/SlidePreview'
import { GSK_THEME } from '@/theme/gsk'
import type { AssetOption } from '@/types/governanceApi'
import { mergeGovernanceDataIntoPresentation } from '@/utils/governanceData'
import { timelineTasksToMilestoneRows } from '@/utils/milestoneTimelineData'

const GSK_ORANGE = GSK_THEME.accentColor

interface GovernancePPTPageProps {
  templateId?: 1 | 2 | 3
}

export function GovernancePPTPage({ templateId = 1 }: GovernancePPTPageProps) {
  const { presentation, setPresentation, updateSlide } = usePresentation()
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
    setTasks,
    onTaskDateChange,
  } = useTimeline()

  const chartExportRef = useRef<HTMLDivElement>(null)
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filename, setFilename] = useState(presentation.filename)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1)
  const [ganttExpanded, setGanttExpanded] = useState(false)
  const [phaseColumnWidth, setPhaseColumnWidth] = useState(150)
  const [listCellWidth, setListCellWidth] = useState(220)
  const [ganttColumnWidth, setGanttColumnWidth] = useState(44)
  const [isCapturingChart, setIsCapturingChart] = useState(false)
  const [coverPanelOpen, setCoverPanelOpen] = useState(true)
  const [consultationPanelOpen, setConsultationPanelOpen] = useState(true)
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [selectedProjectKey, setSelectedProjectKey] = useState('')
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [loadingProjectData, setLoadingProjectData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [lastLoadedProjectLabel, setLastLoadedProjectLabel] = useState<string | null>(null)
  const [milestoneTimelineRowsFromApi, setMilestoneTimelineRowsFromApi] = useState<import('@/types/milestoneTimeline').MilestoneTimelineRow[]>([])
  const [loadingConsultationAi, setLoadingConsultationAi] = useState(false)
  const [consultationAiError, setConsultationAiError] = useState<string | null>(null)
  const [loadingSummaryAi, setLoadingSummaryAi] = useState(false)
  const [summaryAiError, setSummaryAiError] = useState<string | null>(null)
  const resizeStartRef = useRef<{ x: number; width: number; kind: 'phase' | 'name' } | null>(null)

  const GANTT_ZOOM_MIN = 32
  const GANTT_ZOOM_MAX = 64
  const zoomOut = () => setGanttColumnWidth((w) => Math.max(GANTT_ZOOM_MIN, w - 4))
  const zoomIn = () => setGanttColumnWidth((w) => Math.min(GANTT_ZOOM_MAX, w + 4))

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return
    const delta = e.clientX - resizeStartRef.current.x
    const newWidth = Math.round(resizeStartRef.current.width + delta)
    if (resizeStartRef.current.kind === 'phase') {
      setPhaseColumnWidth(Math.min(240, Math.max(100, newWidth)))
    } else {
      setListCellWidth(Math.min(450, Math.max(120, newWidth)))
    }
  }, [])
  const handleResizeEnd = useCallback(() => {
    if (!resizeStartRef.current) return
    resizeStartRef.current = null
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  }, [handleResizeMove])
  const attachResizeListeners = useCallback(() => {
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }, [handleResizeMove, handleResizeEnd])
  const onResizePhase = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeStartRef.current = { x: e.clientX, width: phaseColumnWidth, kind: 'phase' }
    attachResizeListeners()
  }
  const onResizeName = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeStartRef.current = { x: e.clientX, width: listCellWidth, kind: 'name' }
    attachResizeListeners()
  }

  const effectiveMilestoneRows = useMemo(() => {
    if (milestoneTimelineRowsFromApi.length > 0) {
      if (dateRange?.start && dateRange?.end) {
        return milestoneTimelineRowsFromApi.filter((r) => {
          const d = new Date(r.reportedDate).getTime()
          return d >= dateRange.start.getTime() && d <= dateRange.end.getTime()
        })
      }
      return milestoneTimelineRowsFromApi
    }
    return timelineTasksToMilestoneRows(filteredTasks, selectedProjectKey || '', lastLoadedProjectLabel ?? undefined, lastLoadedProjectLabel ?? undefined)
  }, [milestoneTimelineRowsFromApi, dateRange, filteredTasks, selectedProjectKey, lastLoadedProjectLabel])

  const titleSlide = presentation.slides.find((s) => s.type === 'title')
  const consultationSlide = presentation.slides.find((s) => s.type === 'consultation-objectives')
  const timelineSlide = presentation.slides.find((s) => s.type === 'timeline')
  const financialsGanttSlide = presentation.slides.find((s) => s.type === 'financials-gantt')
  const contentSlide = presentation.slides.find((s) => s.type === 'content')
  const summarySlide = presentation.slides.find((s) => s.type === 'summary')
  const assetNameForTemplate2 = titleSlide && titleSlide.type === 'title' ? titleSlide.assetName : ''

  useEffect(() => {
    let cancelled = false

    async function loadAssets() {
      setLoadingAssets(true)
      try {
        const options = await fetchAssetOptions()
        if (cancelled) return
        setAssetOptions(options)
        setSelectedProjectKey((current) => current || options[0]?.projectKey || '')
        setDataError(null)
      } catch (error) {
        if (cancelled) return
        const msg = error instanceof Error ? error.message : 'Failed to load asset options from the backend API.'
        const isNetworkError = msg === 'Failed to fetch' || String(msg).toLowerCase().includes('failed to fetch')
        setDataError(isNetworkError
          ? 'Cannot reach backend. Start the API server: run "npm run server" in a separate terminal, then refresh.'
          : msg)
      } finally {
        if (!cancelled) setLoadingAssets(false)
      }
    }

    loadAssets()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLoadProjectData = useCallback(async () => {
    if (!selectedProjectKey) return

    setLoadingProjectData(true)
    setDataError(null)

    try {
      const data = await fetchGovernanceProjectData(selectedProjectKey)
      const nextPresentation = mergeGovernanceDataIntoPresentation(presentation, data)
      setTasks(data.timelineTasks)
      setMilestoneTimelineRowsFromApi(data.milestoneTimelineRows ?? [])
      setPresentation(nextPresentation)
      setFilename(nextPresentation.filename)
      setLastLoadedProjectLabel(`${data.project.assetName} (${data.project.projectId})`)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Failed to load project data from the backend API.')
    } finally {
      setLoadingProjectData(false)
    }
  }, [presentation, selectedProjectKey, setPresentation, setTasks])

  const handleGenerateConsultationAi = useCallback(async () => {
    if (!selectedProjectKey || !consultationSlide) return
    setLoadingConsultationAi(true)
    setConsultationAiError(null)
    try {
      const result = await fetchConsultationAnalysis(selectedProjectKey)
      const pad = (arr: string[]) => {
        const a = [...arr]
        while (a.length < 5) a.push('')
        return a.slice(0, 10)
      }
      updateSlide(consultationSlide.id, {
        forDecision: pad(result.forDecision),
        forInput: pad(result.forInput),
        forAwareness: pad(result.forAwareness),
      })
    } catch (e) {
      setConsultationAiError(e instanceof Error ? e.message : 'AI consultation failed')
    } finally {
      setLoadingConsultationAi(false)
    }
  }, [selectedProjectKey, consultationSlide, updateSlide])

  const handleGenerateAnalysis = useCallback(async () => {
    setSummaryAiError(null)
    if (selectedProjectKey) {
      setLoadingSummaryAi(true)
      try {
        const visibleSummary = generateTimelineSummary(filteredTasks)
        const { body } = await fetchSummaryAnalysis(selectedProjectKey, visibleSummary)
        const isErrorResponse =
          typeof body === 'string' &&
          (body.startsWith('Summary could not be generated') || body.includes('Ensure Azure OpenAI is configured'))
        if (isErrorResponse) {
          setSummaryAiError(
            body.includes('Azure OpenAI error:')
              ? body
              : 'AI summary not available. Add AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY to .env in the project root, then restart the server (npm run server). Using timeline-based summary for now.'
          )
          const summaryText = generateTimelineSummary(filteredTasks)
          if (summarySlide) updateSlide(summarySlide.id, { body: summaryText })
        } else if (summarySlide) {
          updateSlide(summarySlide.id, { body })
        }
      } catch (e) {
        setSummaryAiError(e instanceof Error ? e.message : 'AI summary failed')
        const summaryText = generateTimelineSummary(filteredTasks)
        if (summarySlide) updateSlide(summarySlide.id, { body: summaryText })
      } finally {
        setLoadingSummaryAi(false)
      }
    } else {
      const summaryText = generateTimelineSummary(filteredTasks)
      const bullets = generateKeyMessages(filteredTasks)
      if (summarySlide) updateSlide(summarySlide.id, { body: summaryText })
      if (contentSlide && contentSlide.type === 'content') {
        updateSlide(contentSlide.id, { bullets })
      }
    }
  }, [selectedProjectKey, filteredTasks, summarySlide, contentSlide, updateSlide])

  const handleDoubleClickTask = (task: { id: string }) => {
    const full = tasks.find((t) => t.id === task.id) ?? null
    setEditingTask(full)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      let chartImage: string | undefined
      const hasChart = templateId === 1 ? ganttTasks.length > 0 : filteredTasks.length > 0
      if (chartExportRef.current && hasChart) {
        // Bring chart into viewport so browser paints it, then capture
        setIsCapturingChart(true)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise((r) => setTimeout(r, 800))
        try {
          const el = chartExportRef.current
          if (el) {
            // Force white background so captured image matches preview (no black swim lanes)
            el.style.backgroundColor = '#ffffff'
            const addedRects: Element[] = []
            el.querySelectorAll('svg').forEach((svg) => {
              const svgEl = svg as SVGElement
              svgEl.style.backgroundColor = '#ffffff'
              const w = svgEl.getAttribute('width') ?? ''
              const h = svgEl.getAttribute('height') ?? ''
              const num = (v: string) => parseFloat(v) || 0
              const width = num(w)
              const height = num(h)
              if (width > 0 && height > 0) {
                const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                bg.setAttribute('data-export-bg', '1')
                bg.setAttribute('width', String(width))
                bg.setAttribute('height', String(height))
                bg.setAttribute('fill', '#ffffff')
                bg.setAttribute('x', '0')
                bg.setAttribute('y', '0')
                if (svg.firstChild) {
                  svg.insertBefore(bg, svg.firstChild)
                } else {
                  svg.appendChild(bg)
                }
                addedRects.push(bg)
              }
            })
            el.querySelectorAll('.gridBody rect').forEach((rect) => {
              rect.setAttribute('fill', '#ffffff')
            })
            // Gantt calendar header (months/years) must be white, not black, in capture
            el.querySelectorAll('g.calendar rect').forEach((rect) => {
              rect.setAttribute('fill', '#ffffff')
            })
            const opts = {
              width: 960,
              height: templateId === 2 ? 520 : templateId === 3 ? 480 : 420,
              pixelRatio: 2,
              cacheBust: true,
              backgroundColor: '#ffffff',
            }
            try {
              chartImage = await toPng(el, opts)
            } catch {
              const canvas = await toCanvas(el, opts)
              chartImage = canvas.toDataURL('image/png')
            }
            addedRects.forEach((r) => r.remove())
          }
        } catch (e) {
          console.warn('Chart capture failed, using table fallback:', e)
        } finally {
          setIsCapturingChart(false)
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

  const ganttColumnWidths = {
    phaseWidth: phaseColumnWidth,
    nameWidth: listCellWidth,
  }

  return (
    <GanttColumnWidthsProvider value={ganttColumnWidths}>
    <div className="max-w-5xl mx-auto pb-16">
      {/* Overlay during chart capture so user sees "Preparing download..." */}
      {isCapturingChart && (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-900/70 text-white font-medium"
          aria-live="polite"
        >
          Preparing download…
        </div>
      )}
      {/* Chart used for PPT export: brought into viewport only during capture so html-to-image can capture it */}
      <div
        ref={chartExportRef}
        className="gantt-export-capture overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        style={{
          position: 'fixed',
          left: isCapturingChart ? 0 : -10000,
          top: 0,
          width: 960,
          height: templateId === 2 ? 520 : templateId === 3 ? 480 : 420,
          zIndex: isCapturingChart ? 99997 : 1,
          opacity: 1,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        {templateId === 2 ? (
          <GanttChartTemplate2
            tasks={filteredTasks}
            financialsSlide={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide : null}
            assetName={assetNameForTemplate2}
            subtitle={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide.subtitle : undefined}
            viewMode={viewMode}
          />
        ) : templateId === 3 ? (
          <GanttChartTemplate3 tasks={filteredTasks} assetName={assetNameForTemplate2} timelineWidth={640} viewMode={viewMode} />
        ) : (
          <GanttChart
            tasks={ganttTasks}
            viewMode={viewMode}
            listCellWidth={`${listCellWidth}px`}
            phaseColumnWidth={phaseColumnWidth}
            columnWidth={ganttColumnWidth}
          />
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">
        {templateId === 1 ? 'Timeline' : templateId === 2 ? 'Plan + Financials' : 'Milestones & Swimlane'}
      </h1>
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeStep === step
                ? 'text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
            style={activeStep === step ? { backgroundColor: GSK_ORANGE } : {}}
          >
            {step === 1 && '1. Your inputs'}
            {step === 2 && '2. Timeline & analysis'}
            {step === 3 && '3. Preview'}
            {step === 4 && '4. Download'}
          </button>
        ))}
      </div>

      {/* Step 1: PM inputs – cover slide + consultation objectives */}
      {activeStep === 1 && (
        <section className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Load project data</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Asset name, project ID, financials, FTE, and resource-demand tables are now wired to a backend API contract. Pick an asset and load the mapped data into the deck.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadProjectData}
                disabled={loadingAssets || loadingProjectData || !selectedProjectKey}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: GSK_ORANGE }}
              >
                {loadingProjectData ? 'Loading…' : 'Load selected asset'}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] mt-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Asset name / project</span>
                <select
                  value={selectedProjectKey}
                  onChange={(e) => setSelectedProjectKey(e.target.value)}
                  disabled={loadingAssets || assetOptions.length === 0}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                >
                  {loadingAssets && <option value="">Loading assets…</option>}
                  {!loadingAssets && assetOptions.length === 0 && <option value="">No assets available</option>}
                  {assetOptions.map((option) => (
                    <option key={option.projectKey} value={option.projectKey}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="self-end text-xs text-slate-500">
                Backend route: <code>/api/projects/:projectKey/governance</code>
              </div>
            </div>
            {lastLoadedProjectLabel && (
              <p className="mt-3 text-sm text-emerald-700">
                Loaded project data for <strong>{lastLoadedProjectLabel}</strong>. The fields below stay editable, so you can still tailor the deck before export.
              </p>
            )}
            {dataError && (
              <p className="mt-3 text-sm text-red-600">
                {dataError}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Cover slide (GSK format)</h2>
                <button
                  type="button"
                  onClick={() => setCoverPanelOpen((o) => !o)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:opacity-90"
                  style={{ borderColor: GSK_ORANGE, color: GSK_ORANGE }}
                  aria-expanded={coverPanelOpen}
                >
                  {coverPanelOpen ? '▼ Close panel' : '▶ Open panel'}
                </button>
            </div>
            {coverPanelOpen && (
            <div className="px-6 pb-6">
            <p className="text-sm text-slate-600 mb-4">All fields below are shown on the first slide of the PPT. Load an asset to auto-fill project/asset line; edit any field as needed.</p>
            {titleSlide && titleSlide.type === 'title' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Board heading</span>
                  <input type="text" value={titleSlide.boardHeading ?? titleSlide.title} onChange={(e) => updateSlide(titleSlide.id, { boardHeading: e.target.value, title: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="VIDRU Board/ DRB/ PIB*" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Type of consultation</span>
                  <input type="text" value={titleSlide.consultationType ?? ''} onChange={(e) => updateSlide(titleSlide.id, { consultationType: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="[Type of consultation]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Asset / project line (orange on slide)</span>
                  <input type="text" value={titleSlide.assetDescriptionLine ?? ''} onChange={(e) => updateSlide(titleSlide.id, { assetDescriptionLine: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 50987: GSK3772701- P falciparum whole cell inhibitor... – malaria endorsement of C2Phase2" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Owner / presenter</span>
                  <input type="text" value={titleSlide.ownerLine ?? ''} onChange={(e) => updateSlide(titleSlide.id, { ownerLine: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Laura Sanz on behalf of GSK701 EDT" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Finance partner</span>
                  <input type="text" value={titleSlide.financePartner ?? ''} onChange={(e) => updateSlide(titleSlide.id, { financePartner: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Finance partner: Rupe Sehgal" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Date (DD/MM/YYYY)</span>
                  <input type="text" value={titleSlide.consultationDate ?? ''} onChange={(e) => updateSlide(titleSlide.id, { consultationDate: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="DD/MM/YYYY" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Project ID Code</span>
                  <input type="text" value={titleSlide.projectId ?? ''} onChange={(e) => updateSlide(titleSlide.id, { projectId: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="[Project ID Code]" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Asset name (internal)</span>
                  <input type="text" value={titleSlide.assetName ?? ''} onChange={(e) => updateSlide(titleSlide.id, { assetName: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="[ASSET- NAME]" />
                </label>
              </div>
            )}
            </div>
            )}
          </div>
          {consultationSlide && consultationSlide.type === 'consultation-objectives' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">Why does the Team consult VIDRU Board/ DRB/ PIB?</h2>
                <button
                  type="button"
                  onClick={() => setConsultationPanelOpen((o) => !o)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:opacity-90"
                  style={{ borderColor: GSK_ORANGE, color: GSK_ORANGE }}
                  aria-expanded={consultationPanelOpen}
                >
                  {consultationPanelOpen ? '▼ Close panel' : '▶ Open panel'}
                </button>
              </div>
              {consultationPanelOpen && (
              <div className="px-6 pb-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={handleGenerateConsultationAi}
                  disabled={loadingConsultationAi || !selectedProjectKey}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: GSK_ORANGE }}
                >
                  {loadingConsultationAi ? 'Generating…' : 'Generate with AI'}
                </button>
                {consultationAiError && <span className="text-sm text-red-600">{consultationAiError}</span>}
              </div>
              <p className="text-sm text-slate-600 mb-4">Minimum 5 lines per section. You can add blank lines and free-form text; line breaks are preserved.</p>
              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-700">For Decision (min 5 points)</span>
                <textarea
                  value={consultationSlide.forDecision.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map((s) => s.trim())
                    while (lines.length < 5) lines.push('')
                    updateSlide(consultationSlide.id, { forDecision: lines })
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[140px]"
                  placeholder="One point per line; add at least 5 lines"
                  rows={7}
                />
              </label>
              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-700">For Input (min 5 points)</span>
                <textarea
                  value={consultationSlide.forInput.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map((s) => s.trim())
                    while (lines.length < 5) lines.push('')
                    updateSlide(consultationSlide.id, { forInput: lines })
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[140px]"
                  placeholder="One point per line; add at least 5 lines"
                  rows={7}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">For Awareness (min 5 points)</span>
                <textarea
                  value={consultationSlide.forAwareness.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map((s) => s.trim())
                    while (lines.length < 5) lines.push('')
                    updateSlide(consultationSlide.id, { forAwareness: lines })
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[140px]"
                  placeholder="One point per line; add at least 5 lines"
                  rows={7}
                />
              </label>
              </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
            style={{ backgroundColor: GSK_ORANGE }}
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
              Customise the view. Drag task bars to fix dates if the visual is mismatched; double-click a task to add manual context. This data drives the timeline and financials slides in the PPT.
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
            {templateId === 2 ? (
              <GanttChartTemplate2 tasks={filteredTasks} financialsSlide={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide : null} assetName={assetNameForTemplate2} subtitle={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide.subtitle : undefined} viewMode={viewMode} />
            ) : templateId === 3 ? (
              <GanttChartTemplate3 tasks={filteredTasks} assetName={assetNameForTemplate2} timelineWidth={640} viewMode={viewMode} />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <MilestoneGovernanceView
                  rows={effectiveMilestoneRows}
                  assetName={lastLoadedProjectLabel ?? undefined}
                  viewMode={viewMode}
                />
              </div>
            )}
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
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleGenerateAnalysis()}
                disabled={loadingSummaryAi}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
                style={{ backgroundColor: GSK_ORANGE }}
              >
                {loadingSummaryAi ? 'Generating…' : 'Generate from data'}
              </button>
              {summaryAiError && <span className="text-sm text-red-600">{summaryAiError}</span>}
            </div>

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
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
            style={{ backgroundColor: GSK_ORANGE }}
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
            <p className="text-sm text-slate-600 mb-2">
              This is how your slides will look in the PPT format (based on the template). Use <strong>Expand Gantt</strong> on timeline slides to view the chart larger.
            </p>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-slate-500">Gantt zoom:</span>
              <button type="button" onClick={zoomOut} disabled={ganttColumnWidth <= GANTT_ZOOM_MIN} className="px-2 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50">Zoom out</button>
              <button type="button" onClick={zoomIn} disabled={ganttColumnWidth >= GANTT_ZOOM_MAX} className="px-2 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50">Zoom in</button>
            </div>
            <div className="space-y-6 min-w-0 max-w-full">
              {presentation.slides
                .filter((_, i) => i !== 3)
                .map((slide, index) => (
                <div key={slide.id} className="min-w-0 max-w-full">
                  <SlidePreviewCard
                    slide={slide}
                    pageNum={index + 1}
                    timelineTasks={slide.type === 'timeline' || slide.type === 'financials-gantt' ? filteredTasks : undefined}
                    ganttTasks={slide.type === 'timeline' || slide.type === 'financials-gantt' ? ganttTasks : undefined}
                    viewMode={slide.type === 'timeline' || slide.type === 'financials-gantt' ? viewMode : undefined}
                    ganttColumnWidth={ganttColumnWidth}
                    onExpandGantt={() => setGanttExpanded(true)}
                    templateId={templateId}
                    financialsGanttSlide={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide : null}
                    assetNameLabel={assetNameForTemplate2}
                    phaseColumnWidth={phaseColumnWidth}
                    listCellWidth={listCellWidth}
                    milestoneTimelineRows={templateId === 1 && (slide.type === 'timeline' || slide.type === 'financials-gantt') ? effectiveMilestoneRows : undefined}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Expand Gantt modal – same visual as Timeline & analysis for current template */}
          {ganttExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Expanded Gantt chart"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-[95vw] w-full max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">
                    {templateId === 1 ? 'Gantt chart' : templateId === 2 ? 'Plan + Financials' : 'Milestones & Swimlane'} – expanded view
                  </h3>
                  <button
                    type="button"
                    onClick={() => setGanttExpanded(false)}
                    className="px-3 py-1.5 text-sm font-medium rounded border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0 overflow-auto p-4">
                  {templateId === 2 ? (
                    <GanttChartTemplate2
                      tasks={filteredTasks}
                      financialsSlide={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide : null}
                      assetName={assetNameForTemplate2}
                      subtitle={financialsGanttSlide?.type === 'financials-gantt' ? financialsGanttSlide.subtitle : undefined}
                      viewMode={viewMode}
                    />
                  ) : templateId === 3 ? (
                    <GanttChartTemplate3 tasks={filteredTasks} assetName={assetNameForTemplate2} timelineWidth={800} viewMode={viewMode} />
                  ) : (
                    <div className="max-w-full overflow-x-auto">
                      <MilestoneGovernanceView
                        rows={effectiveMilestoneRows}
                        assetName={lastLoadedProjectLabel ?? undefined}
                        viewMode={viewMode}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              ← Back to edit
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
              style={{ backgroundColor: GSK_ORANGE }}
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
              className="px-5 py-2.5 rounded-lg font-medium text-sm text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: GSK_ORANGE }}
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
    </GanttColumnWidthsProvider>
  )
}
