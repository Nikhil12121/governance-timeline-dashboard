import type { Task } from 'gantt-task-react'
import type { Slide } from '@/types/presentation'
import type { FinancialsGanttSlide as FinancialsGanttSlideType } from '@/types/presentation'
import type { TimelineTask } from '@/types/timeline'
import type { ViewMode } from '@/types/timeline'
import type { MilestoneTimelineRow } from '@/types/milestoneTimeline'
import { GanttChart } from '@/components/timeline/GanttChart'
import { GanttChartTemplate2 } from '@/components/timeline/GanttChartTemplate2'
import { GanttChartTemplate3 } from '@/components/timeline/GanttChartTemplate3'
import { MilestoneGovernanceView } from '@/components/timeline/MilestoneGovernanceView'

const GSK = {
  titleColor: '#1a1a1a',
  accentColor: '#E87722',
  footerColor: '#666666',
  footerFontSize: '0.875rem',
}

/** Frame matching template: white slide, light grey border, footer with page | date and GSK. Large size for PM review. */
function SlideFrame({
  pageNum,
  children,
}: {
  pageNum: number
  children: React.ReactNode
}) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <div
      className="w-full max-w-[960px] min-w-0 rounded-lg bg-white overflow-hidden border-2 border-slate-200 shadow-md"
      style={{ aspectRatio: '16/10', minHeight: 520 }}
    >
      <div className="flex flex-col h-full p-6 min-w-0">
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">{children}</div>
        <div
          className="flex justify-between items-center pt-3 mt-auto border-t border-slate-200 text-sm"
          style={{ color: GSK.footerColor, fontSize: GSK.footerFontSize }}
        >
          <span>{pageNum} | {dateStr}</span>
          <span className="font-semibold" style={{ color: GSK.accentColor }}>GSK</span>
        </div>
      </div>
    </div>
  )
}

function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="font-bold text-2xl" style={{ color: GSK.titleColor }}>
        {title || 'Slide title'}
      </h2>
      <div
        className="w-14 h-1 rounded-full mt-1.5 mb-2"
        style={{ backgroundColor: GSK.accentColor }}
      />
      {subtitle && (
        <p className="text-base mt-1" style={{ color: GSK.footerColor }}>
          {subtitle}
        </p>
      )}
    </>
  )
}

/** Preview column width: Month needs ~28px so labels don't overlap; Year can be narrower */
function previewColumnWidth(viewMode: ViewMode | undefined): number {
  return viewMode === 'Year' ? 20 : 28
}

export function SlidePreviewCard({
  slide,
  pageNum,
  timelineTasks = [],
  ganttTasks,
  viewMode,
  ganttColumnWidth: _ganttColumnWidth,
  onExpandGantt,
  templateId = 1,
  financialsGanttSlide = null,
  assetNameLabel = '',
  phaseColumnWidth,
  listCellWidth,
  milestoneTimelineRows,
}: {
  slide: Slide
  pageNum: number
  timelineTasks?: TimelineTask[]
  ganttTasks?: Task[]
  viewMode?: ViewMode
  ganttColumnWidth?: number
  onExpandGantt?: () => void
  templateId?: 1 | 2 | 3
  financialsGanttSlide?: FinancialsGanttSlideType | null
  assetNameLabel?: string
  /** For template 1: use same Phase + Activity columns as Timeline & analysis (no From/To) */
  phaseColumnWidth?: number
  listCellWidth?: number
  /** For template 1: Milestone & Governance rows (same as Timeline & data tab); when set, preview shows MilestoneGovernanceView */
  milestoneTimelineRows?: MilestoneTimelineRow[]
}) {
  const effectiveViewMode = viewMode ?? 'Month'
  const hasChartData = templateId === 1
    ? ((milestoneTimelineRows && milestoneTimelineRows.length > 0) || (ganttTasks && ganttTasks.length > 0))
    : (timelineTasks && timelineTasks.length > 0)
  const showExpandGantt = onExpandGantt && (slide.type === 'timeline' || slide.type === 'financials-gantt') && hasChartData && (templateId === 1 ? effectiveViewMode : true)

  return (
    <SlideFrame pageNum={pageNum}>
      {slide.type === 'title' && (
        <div className="flex flex-col h-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="font-bold text-base flex-1" style={{ color: GSK.titleColor }}>{slide.boardHeading ?? slide.title}</h2>
            <span className="text-xs shrink-0" style={{ color: GSK.footerColor }}>gsk.com</span>
          </div>
          <div className="w-full h-px bg-slate-200 my-1" />
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <p className="text-5xl font-bold" style={{ color: GSK.accentColor }}>GSK</p>
          </div>
          <p className="font-bold text-base text-center truncate" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).assetDescriptionLine ?? (slide as import('@/types/presentation').TitleSlide).assetName ?? '[Asset / project line]'}</p>
          <p className="text-sm text-center font-medium mt-0.5" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).consultationDate ?? '[DD/MM/YYYY]'}</p>
          {(slide as import('@/types/presentation').TitleSlide).ownerLine && <p className="text-sm text-center mt-1" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).ownerLine}</p>}
          {(slide as import('@/types/presentation').TitleSlide).financePartner && <p className="text-sm text-center" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).financePartner}</p>}
        </div>
      )}

      {slide.type === 'consultation-objectives' && (
        <div className="min-h-0 min-w-0 overflow-hidden flex flex-col">
          <TitleBlock title={slide.title} />
          <p className="text-sm italic text-red-600 mb-3 shrink-0">*Only retain the Board relevant for your project</p>
          <div className="grid grid-cols-1 gap-3 text-base flex-1 min-h-0 min-w-0 overflow-auto">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden min-w-0">
              <div className="w-28 shrink-0 py-3 px-3 text-white font-semibold text-center text-sm" style={{ backgroundColor: GSK.accentColor }}>For Decision</div>
              <ul className="py-3 px-4 list-disc list-inside flex-1 min-w-0 bg-white space-y-1 break-words overflow-hidden">
                {(Array.isArray((slide as import('@/types/presentation').ConsultationObjectivesSlide).forDecision) ? (slide as import('@/types/presentation').ConsultationObjectivesSlide).forDecision : []).map((b, i) => <li key={i} className="break-words">{b || '\u00A0'}</li>)}
              </ul>
            </div>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden min-w-0">
              <div className="w-28 shrink-0 py-3 px-3 text-white font-semibold text-center text-sm" style={{ backgroundColor: GSK.accentColor }}>For Input</div>
              <ul className="py-3 px-4 list-disc list-inside flex-1 min-w-0 bg-white space-y-1 break-words overflow-hidden">
                {(Array.isArray((slide as import('@/types/presentation').ConsultationObjectivesSlide).forInput) ? (slide as import('@/types/presentation').ConsultationObjectivesSlide).forInput : []).map((b, i) => <li key={i} className="break-words">{b || '\u00A0'}</li>)}
              </ul>
            </div>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden min-w-0">
              <div className="w-28 shrink-0 py-3 px-3 text-white font-semibold text-center text-sm" style={{ backgroundColor: GSK.accentColor }}>For Awareness</div>
              <ul className="py-3 px-4 list-disc list-inside flex-1 min-w-0 bg-white space-y-1 break-words overflow-hidden">
                {(Array.isArray((slide as import('@/types/presentation').ConsultationObjectivesSlide).forAwareness) ? (slide as import('@/types/presentation').ConsultationObjectivesSlide).forAwareness : []).map((b, i) => <li key={i} className="break-words">{b || '\u00A0'}</li>)}
              </ul>
            </div>
          </div>
          <p className="text-sm mt-2 shrink-0" style={{ color: GSK.footerColor }}>1. Include team level of confidence (%) in operational delivery of the next business milestone as per the proposed plan (see slide notes for guidance)</p>
        </div>
      )}

      {slide.type === 'timeline' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <TitleBlock title={(slide as import('@/types/presentation').TimelineSlide).subtitle ? `${slide.title} – ${(slide as import('@/types/presentation').TimelineSlide).subtitle}` : slide.title} />
            {showExpandGantt && (
              <button
                type="button"
                onClick={onExpandGantt}
                className="shrink-0 px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Expand Gantt
              </button>
            )}
          </div>
          <div className="mt-2 flex-1 min-h-0 flex flex-col">
            {templateId === 2 && timelineTasks.length > 0 ? (
              <div className="flex-1 min-h-[320px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
                <GanttChartTemplate2
                  tasks={timelineTasks}
                  financialsSlide={financialsGanttSlide}
                  assetName={assetNameLabel}
                  subtitle={(slide as import('@/types/presentation').TimelineSlide).subtitle}
                  viewMode={effectiveViewMode}
                />
              </div>
            ) : templateId === 3 && timelineTasks.length > 0 ? (
              <div className="flex-1 min-h-[320px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
                <GanttChartTemplate3 tasks={timelineTasks} assetName={assetNameLabel} timelineWidth={520} viewMode={effectiveViewMode} />
              </div>
            ) : templateId === 1 && milestoneTimelineRows && milestoneTimelineRows.length > 0 ? (
              <div className="flex-1 min-h-[320px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
                <MilestoneGovernanceView
                  rows={milestoneTimelineRows}
                  assetName={assetNameLabel}
                  viewMode={effectiveViewMode}
                />
              </div>
            ) : ganttTasks && ganttTasks.length > 0 && effectiveViewMode ? (
              <div className="flex-1 min-h-[320px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
                <GanttChart
                  tasks={ganttTasks}
                  viewMode={effectiveViewMode}
                  listCellWidth={listCellWidth != null ? `${listCellWidth}px` : '260px'}
                  phaseColumnWidth={phaseColumnWidth ?? undefined}
                  columnWidth={previewColumnWidth(effectiveViewMode)}
                  previewFit
                  showLegend={false}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-2 px-2 font-semibold">Task / Milestone</th>
                      <th className="py-2 px-2 font-semibold">Phase</th>
                      <th className="py-2 px-2 font-semibold">Start</th>
                      <th className="py-2 px-2 font-semibold">End</th>
                      <th className="py-2 px-2 font-semibold">Progress</th>
                      <th className="py-2 px-2 font-semibold">Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!timelineTasks || timelineTasks.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 px-2 text-slate-500">No data. Adjust timeline filters above.</td></tr>
                    ) : (
                      timelineTasks.map((t) => {
                        const startD = t.start instanceof Date ? t.start : new Date(t.start as string | number)
                        const endD = t.end instanceof Date ? t.end : new Date(t.end as string | number)
                        return (
                          <tr key={t.id} className="border-b border-slate-100">
                            <td className="py-1.5 px-2">{t.name}</td>
                            <td className="py-1.5 px-2">{t.phase ?? '—'}</td>
                            <td className="py-1.5 px-2">{startD.toLocaleDateString()}</td>
                            <td className="py-1.5 px-2">{endD.toLocaleDateString()}</td>
                            <td className="py-1.5 px-2">{t.progress}%</td>
                            <td className="py-1.5 px-2">{t.manualContext ?? '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {slide.type === 'financials-gantt' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-0 h-0 border-y-[6px] border-l-[8px] border-y-transparent border-l-[#E87722]" />
              <div>
                <h2 className="font-bold text-xl" style={{ color: GSK.accentColor }}>{slide.title}</h2>
                <p className="text-base" style={{ color: GSK.footerColor }}>{slide.subtitle}</p>
              </div>
            </div>
            {showExpandGantt && (
              <button
                type="button"
                onClick={onExpandGantt}
                className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Expand Gantt
              </button>
            )}
          </div>
          {templateId === 2 && timelineTasks.length > 0 ? (
            <div className="mt-2 flex-1 min-h-[220px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
              <GanttChartTemplate2
                tasks={timelineTasks}
                financialsSlide={financialsGanttSlide ?? (slide as FinancialsGanttSlideType)}
                assetName={assetNameLabel}
                subtitle={slide.subtitle}
                viewMode={effectiveViewMode}
              />
            </div>
          ) : templateId === 3 && timelineTasks.length > 0 ? (
            <div className="mt-2 flex-1 min-h-[220px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
              <GanttChartTemplate3 tasks={timelineTasks} assetName={assetNameLabel} timelineWidth={520} viewMode={effectiveViewMode} />
            </div>
          ) : templateId === 1 && milestoneTimelineRows && milestoneTimelineRows.length > 0 ? (
            <div className="mt-2 flex-1 min-h-[220px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
              <MilestoneGovernanceView rows={milestoneTimelineRows} assetName={assetNameLabel} viewMode={effectiveViewMode} />
            </div>
          ) : ganttTasks && ganttTasks.length > 0 && effectiveViewMode ? (
            <div className="mt-2 flex-1 min-h-[220px] rounded-lg border border-slate-200 overflow-x-auto overflow-y-hidden bg-white">
              <GanttChart
                tasks={ganttTasks}
                viewMode={effectiveViewMode}
                listCellWidth={listCellWidth != null ? `${listCellWidth}px` : '200px'}
                phaseColumnWidth={phaseColumnWidth ?? undefined}
                columnWidth={previewColumnWidth(effectiveViewMode)}
                previewFit
                showLegend={false}
              />
            </div>
          ) : null}
          {templateId !== 2 && (
            <div className="mt-2 overflow-auto text-sm border border-slate-200 rounded-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 px-2 border border-slate-200">{slide.financialsYears[0]}</th>
                    {slide.financialsYears.slice(1, 6).map((h, i) => <th key={i} className="py-2 px-2 border border-slate-200">{h}</th>)}
                    <th className="py-2 px-2 border border-slate-200 font-semibold">Total (£m)</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.financialsRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 px-2 border border-slate-200 font-medium">{row.label}</td>
                      {row.values.slice(0, 5).map((v, j) => <td key={j} className="py-2 px-2 border border-slate-200">{v}</td>)}
                      <td className="py-2 px-2 border border-slate-200">{row.values[row.values.length - 1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {slide.type === 'scenarios' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-0 h-0 border-y-[6px] border-l-[8px] border-y-transparent border-l-[#E87722]" />
            <div>
              <h2 className="font-bold text-lg" style={{ color: GSK.accentColor }}>{slide.title}</h2>
              <p className="text-sm" style={{ color: GSK.footerColor }}>High level plan showing scenarios</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto text-sm space-y-3">
            {slide.scenarios.map((sc, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3">
                <p className="font-semibold mb-1.5">{sc.name} {sc.launchYear && <span className="text-slate-500 font-normal">{sc.launchYear}</span>}</p>
                <table className="w-full border-collapse">
                  {sc.rows.map((row, j) => (
                    <tr key={j}>
                      <td className="py-0.5 pr-2 font-medium w-48">{row.label}</td>
                      {row.values.slice(0, 5).map((v, k) => <td key={k} className="py-0.5 px-1">{v}</td>)}
                      <td className="py-0.5 pl-1 font-medium">{row.values[row.values.length - 1]}</td>
                    </tr>
                  ))}
                </table>
              </div>
            ))}
          </div>
        </>
      )}

      {slide.type === 'resource-demand' && (
        <>
          <TitleBlock title={slide.title} subtitle={slide.subtitle} />
          <div className="mt-2 flex-1 overflow-auto text-sm border border-slate-200 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {slide.columnHeaders.map((h, i) => <th key={i} className="text-left py-2 px-2 border border-slate-200">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {slide.groups.map((grp) =>
                  grp.rows.map((row, j) => (
                    <tr key={`${grp.groupName}-${j}`}>
                      <td className="py-1.5 px-2 border border-slate-200">{row.name}</td>
                      {row.values.map((v, k) => <td key={k} className="py-1.5 px-2 border border-slate-200">{v}</td>)}
                    </tr>
                  ))
                )}
                <tr className="bg-[#E87722] bg-opacity-20 font-semibold">
                  {slide.totalRow.map((v, i) => <td key={i} className="py-2 px-2 border border-slate-200">{v}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm mt-2" style={{ color: GSK.footerColor }}>Source: Data output from IRM as of DD/MM/YY</p>
        </>
      )}

      {slide.type === 'content' && (
        <>
          <TitleBlock title={slide.title} />
          <ul className="mt-3 space-y-2 text-base list-disc list-inside">
            {slide.bullets.length === 0 ? <li className="text-slate-500">No key messages.</li> : slide.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </>
      )}

      {slide.type === 'summary' && (
        <>
          <TitleBlock title={slide.title} />
          <div className="mt-3 text-base text-slate-700 whitespace-pre-wrap overflow-auto flex-1">
            {slide.body || 'No summary. Generate from data or type here.'}
          </div>
        </>
      )}
    </SlideFrame>
  )
}
