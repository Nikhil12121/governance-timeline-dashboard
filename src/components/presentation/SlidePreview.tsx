import type { Task } from 'gantt-task-react'
import type { Slide } from '@/types/presentation'
import type { TimelineTask } from '@/types/timeline'
import type { ViewMode } from '@/types/timeline'
import { GanttChart } from '@/components/timeline/GanttChart'

const GSK = {
  titleColor: '#1a1a1a',
  accentColor: '#E87722',
  footerColor: '#666666',
  footerFontSize: '0.75rem',
}

/** Frame matching template: white slide, light grey border, footer with page | date and GSK */
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
      className="rounded-sm bg-white overflow-hidden border border-slate-300 shadow-sm"
      style={{ aspectRatio: '16/10', minHeight: 340 }}
    >
      <div className="flex flex-col h-full p-5">
        <div className="flex-1 min-h-0">{children}</div>
        <div
          className="flex justify-between items-center pt-2 mt-auto border-t border-slate-200"
          style={{ color: GSK.footerColor, fontSize: GSK.footerFontSize }}
        >
          <span>{pageNum} | {dateStr}</span>
          <span className="font-medium" style={{ color: GSK.accentColor }}>GSK</span>
        </div>
      </div>
    </div>
  )
}

function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="font-bold text-xl" style={{ color: GSK.titleColor }}>
        {title || 'Slide title'}
      </h2>
      <div
        className="w-12 h-1 rounded-full mt-1 mb-2"
        style={{ backgroundColor: GSK.accentColor }}
      />
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: GSK.footerColor }}>
          {subtitle}
        </p>
      )}
    </>
  )
}

export function SlidePreviewCard({
  slide,
  pageNum,
  timelineTasks = [],
  ganttTasks,
  viewMode,
  ganttColumnWidth,
  onExpandGantt,
}: {
  slide: Slide
  pageNum: number
  timelineTasks?: TimelineTask[]
  ganttTasks?: Task[]
  viewMode?: ViewMode
  /** Zoom level for Gantt (column width); preview scales this down for the card size */
  ganttColumnWidth?: number
  /** When set, timeline/financials-gantt slides show an "Expand Gantt" button that calls this */
  onExpandGantt?: () => void
}) {
  const showExpandGantt = onExpandGantt && (slide.type === 'timeline' || slide.type === 'financials-gantt') && ganttTasks && ganttTasks.length > 0 && viewMode

  return (
    <SlideFrame pageNum={pageNum}>
      {slide.type === 'title' && (
        <div className="flex flex-col justify-center h-full">
          <div className="text-right text-sm mb-2" style={{ color: GSK.footerColor }}>
            gsk.com
          </div>
          <h2 className="font-bold text-xl border-b border-slate-300 pb-1 mb-2" style={{ color: GSK.titleColor }}>
            {slide.boardHeading ?? slide.title}
          </h2>
          <div className="flex items-center gap-2 mt-2 mb-1">
            <div className="w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-[#E87722]" />
            <div>
              <p className="font-bold text-lg" style={{ color: GSK.accentColor }}>{(slide as import('@/types/presentation').TitleSlide).assetName ?? '[ASSET- NAME]'}</p>
              <p className="font-bold text-sm" style={{ color: GSK.accentColor }}>{(slide as import('@/types/presentation').TitleSlide).consultationType ?? '[Type of consultation]'}</p>
            </div>
          </div>
          <p className="text-sm mt-1" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).consultationDate ?? '[DD/MM/YYYY]'}</p>
          <p className="text-sm" style={{ color: GSK.titleColor }}>{(slide as import('@/types/presentation').TitleSlide).projectId ?? '[Project ID Code]'}</p>
          <p className="text-xs italic text-red-600 mt-2">{slide.subtitle}</p>
        </div>
      )}

      {slide.type === 'consultation-objectives' && (
        <>
          <TitleBlock title={slide.title} />
          <p className="text-xs italic text-red-600 mb-2">*Only retain the Board relevant for your project</p>
          <div className="grid grid-cols-1 gap-2 text-sm flex-1 overflow-auto">
            <div className="flex border border-slate-200 rounded overflow-hidden">
              <div className="w-24 shrink-0 py-2 px-2 text-white font-semibold text-center" style={{ backgroundColor: GSK.accentColor }}>For Decision</div>
              <ul className="py-2 px-3 list-disc list-inside flex-1 bg-white">
                {slide.forDecision.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div className="flex border border-slate-200 rounded overflow-hidden">
              <div className="w-24 shrink-0 py-2 px-2 text-white font-semibold text-center" style={{ backgroundColor: GSK.accentColor }}>For Input</div>
              <ul className="py-2 px-3 list-disc list-inside flex-1 bg-white">
                {slide.forInput.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div className="flex border border-slate-200 rounded overflow-hidden">
              <div className="w-24 shrink-0 py-2 px-2 text-white font-semibold text-center" style={{ backgroundColor: GSK.accentColor }}>For Awareness</div>
              <ul className="py-2 px-3 list-disc list-inside flex-1 bg-white">
                {slide.forAwareness.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: GSK.footerColor }}>1. Include team level of confidence (%) in operational delivery of the next business milestone as per the proposed plan (see slide notes for guidance)</p>
        </>
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
            {ganttTasks && ganttTasks.length > 0 && viewMode ? (
              <div className="flex-1 min-h-[240px] rounded-lg border border-slate-200 overflow-hidden bg-white">
                <GanttChart tasks={ganttTasks} viewMode={viewMode} listCellWidth="140px" columnWidth={ganttColumnWidth != null ? Math.round(ganttColumnWidth * 28 / 44) : 28} showLegend={false} />
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
                    {timelineTasks.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 px-2 text-slate-500">No data. Adjust timeline filters above.</td></tr>
                    ) : (
                      timelineTasks.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100">
                          <td className="py-1.5 px-2">{t.name}</td>
                          <td className="py-1.5 px-2">{t.phase ?? '—'}</td>
                          <td className="py-1.5 px-2">{t.start.toLocaleDateString()}</td>
                          <td className="py-1.5 px-2">{t.end.toLocaleDateString()}</td>
                          <td className="py-1.5 px-2">{t.progress}%</td>
                          <td className="py-1.5 px-2">{t.manualContext ?? '—'}</td>
                        </tr>
                      ))
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
                <h2 className="font-bold text-lg" style={{ color: GSK.accentColor }}>{slide.title}</h2>
                <p className="text-sm" style={{ color: GSK.footerColor }}>{slide.subtitle}</p>
              </div>
            </div>
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
          {ganttTasks && ganttTasks.length > 0 && viewMode && (
            <div className="mt-2 flex-1 min-h-[160px] rounded border border-slate-200 overflow-hidden bg-white">
              <GanttChart tasks={ganttTasks} viewMode={viewMode} listCellWidth="100px" columnWidth={ganttColumnWidth != null ? Math.round(ganttColumnWidth * 20 / 44) : 20} showLegend={false} />
            </div>
          )}
          <div className="mt-2 overflow-auto text-xs border border-slate-200 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-1 px-1 border border-slate-200">{slide.financialsYears[0]}</th>
                  {slide.financialsYears.slice(1, 6).map((h, i) => <th key={i} className="py-1 px-1 border border-slate-200">{h}</th>)}
                  <th className="py-1 px-1 border border-slate-200 font-semibold">Total (£m)</th>
                </tr>
              </thead>
              <tbody>
                {slide.financialsRows.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1 px-1 border border-slate-200 font-medium">{row.label}</td>
                    {row.values.slice(0, 5).map((v, j) => <td key={j} className="py-1 px-1 border border-slate-200">{v}</td>)}
                    <td className="py-1 px-1 border border-slate-200">{row.values[row.values.length - 1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="flex-1 overflow-auto text-xs space-y-2">
            {slide.scenarios.map((sc, i) => (
              <div key={i} className="border border-slate-200 rounded p-2">
                <p className="font-semibold mb-1">{sc.name} {sc.launchYear && <span className="text-slate-500 font-normal">{sc.launchYear}</span>}</p>
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
          <div className="mt-2 flex-1 overflow-auto text-xs border border-slate-200 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {slide.columnHeaders.map((h, i) => <th key={i} className="text-left py-1 px-1 border border-slate-200">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {slide.groups.map((grp) =>
                  grp.rows.map((row, j) => (
                    <tr key={`${grp.groupName}-${j}`}>
                      <td className="py-0.5 px-1 border border-slate-200">{row.name}</td>
                      {row.values.map((v, k) => <td key={k} className="py-0.5 px-1 border border-slate-200">{v}</td>)}
                    </tr>
                  ))
                )}
                <tr className="bg-[#E87722] bg-opacity-20 font-semibold">
                  {slide.totalRow.map((v, i) => <td key={i} className="py-1 px-1 border border-slate-200">{v}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-1" style={{ color: GSK.footerColor }}>Source: Data output from IRM as of DD/MM/YY</p>
        </>
      )}

      {slide.type === 'content' && (
        <>
          <TitleBlock title={slide.title} />
          <ul className="mt-3 space-y-1.5 text-sm list-disc list-inside">
            {slide.bullets.length === 0 ? <li className="text-slate-500">No key messages.</li> : slide.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </>
      )}

      {slide.type === 'summary' && (
        <>
          <TitleBlock title={slide.title} />
          <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap overflow-auto flex-1">
            {slide.body || 'No summary. Generate from data or type here.'}
          </div>
        </>
      )}
    </SlideFrame>
  )
}
