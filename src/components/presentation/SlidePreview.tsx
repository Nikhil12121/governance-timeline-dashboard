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
      className="rounded-xl border-2 border-slate-200 bg-white shadow-lg overflow-hidden"
      style={{ aspectRatio: '16/10', minHeight: 320 }}
    >
      <div className="flex flex-col h-full p-6">
        <div className="flex-1">{children}</div>
        <div
          className="flex justify-between items-center pt-2 border-t border-slate-100 mt-auto"
          style={{ color: GSK.footerColor, fontSize: GSK.footerFontSize }}
        >
          <span>{pageNum} | {dateStr}</span>
          <span>GSK</span>
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
}: {
  slide: Slide
  pageNum: number
  timelineTasks?: TimelineTask[]
  /** When provided for timeline slide, preview shows the actual Gantt chart visual */
  ganttTasks?: Task[]
  viewMode?: ViewMode
}) {
  return (
    <SlideFrame pageNum={pageNum}>
      {slide.type === 'title' && (
        <div className="flex flex-col justify-center h-full">
          <TitleBlock title={slide.title} subtitle={slide.subtitle} />
        </div>
      )}

      {slide.type === 'timeline' && (
        <>
          <TitleBlock title={slide.title} />
          <div className="mt-3 flex-1 min-h-0 flex flex-col">
            {ganttTasks && ganttTasks.length > 0 && viewMode ? (
              <div className="flex-1 min-h-[280px] rounded-lg border border-slate-200 overflow-hidden bg-white">
                <GanttChart
                  tasks={ganttTasks}
                  viewMode={viewMode}
                  listCellWidth="140px"
                  columnWidth={28}
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
                    {timelineTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 px-2 text-slate-500">
                          No data. Adjust timeline filters above.
                        </td>
                      </tr>
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

      {slide.type === 'content' && (
        <>
          <TitleBlock title={slide.title} />
          <ul className="mt-3 space-y-1.5 text-sm list-disc list-inside">
            {slide.bullets.length === 0 ? (
              <li className="text-slate-500">No key messages.</li>
            ) : (
              slide.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))
            )}
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
