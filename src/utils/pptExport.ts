import PptxGenJS from 'pptxgenjs'
import type { TimelineTask } from '@/types/timeline'
import type { Presentation } from '@/types/presentation'

/** Template: Governance slide – title, footer (page + date left, logo right), orange accent – GSK format */
const TEMPLATE = {
  titleColor: '1a1a1a',
  titleAccentColor: 'E87722', // orange
  footerFontSize: 9,
  footerColor: '666666',
  footerY: 5.2,
  logoRightX: 8.5,
}

function addTemplateFooter(slide: PptxGenJS.Slide, pageNum: number) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  slide.addText(`${pageNum} | ${dateStr}`, {
    x: 0.5,
    y: TEMPLATE.footerY,
    w: 4,
    h: 0.3,
    fontSize: TEMPLATE.footerFontSize,
    color: TEMPLATE.footerColor,
  })
  slide.addText('GSK', {
    x: TEMPLATE.logoRightX,
    y: TEMPLATE.footerY,
    w: 1,
    h: 0.3,
    fontSize: TEMPLATE.footerFontSize,
    color: TEMPLATE.footerColor,
    align: 'right',
  })
}

function addTitleBlock(
  slide: PptxGenJS.Slide,
  title: string,
  opts?: { subtitle?: string; y?: number }
) {
  const y = opts?.y ?? 0.3
  slide.addText(title, {
    x: 0.5,
    y,
    w: 9,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEMPLATE.titleColor,
  })
  slide.addShape('rect', {
    x: 0.5,
    y: y + 0.58,
    w: 1,
    h: 0.04,
    fill: { color: TEMPLATE.titleAccentColor },
  })
  if (opts?.subtitle?.trim()) {
    slide.addText(opts.subtitle, {
      x: 0.5,
      y: y + 0.75,
      w: 9,
      h: 0.4,
      fontSize: 14,
      color: TEMPLATE.footerColor,
    })
  }
}

type TableCell = { text: string }

/**
 * Export full presentation to a single PPTX file in GSK format.
 * Each slide uses the same template: title area, footer (page + date, GSK logo), orange accent.
 * If timelineChartImage (data URL or base64) is provided, the timeline slide uses the chart visual instead of a table.
 */
export async function exportPresentationToPptx(
  presentation: Presentation,
  timelineTasks: TimelineTask[],
  filename?: string,
  timelineChartImage?: string
): Promise<void> {
  const pptx = new PptxGenJS()
  const fname = filename || presentation.filename || 'Governance-GSK.pptx'
  let pageNum = 0

  for (const s of presentation.slides) {
    pageNum++
    const slide = pptx.addSlide()

    if (s.type === 'title') {
      addTitleBlock(slide, s.title, { subtitle: s.subtitle, y: 0.5 })
    } else if (s.type === 'timeline') {
      addTitleBlock(slide, s.title, { y: 0.3 })
      if (timelineChartImage && timelineChartImage.trim()) {
        // Embed the Gantt chart as an image (same visual as in the app)
        // pptxgenjs expects data as "image/png;base64,<payload>"
        const base64 = timelineChartImage.includes('base64,')
          ? timelineChartImage.split('base64,')[1]
          : timelineChartImage
        const dataForPpt = base64 ? `image/png;base64,${base64}` : ''
        if (dataForPpt) {
          slide.addImage({
            data: dataForPpt,
            x: 0.5,
            y: 0.95,
            w: 9,
            h: 4.1,
          })
        } else {
          addTimelineTable(slide, timelineTasks)
        }
      } else {
        // Fallback: table if no chart image
        addTimelineTable(slide, timelineTasks)
      }

      function addTimelineTable(slide: PptxGenJS.Slide, timelineTasks: TimelineTask[]) {
        const rows: TableCell[][] = [
        [
          { text: 'Task / Milestone' },
          { text: 'Phase' },
          { text: 'Start' },
          { text: 'End' },
          { text: 'Progress %' },
          { text: 'Context' },
        ],
      ]
      for (const t of timelineTasks) {
        rows.push([
          { text: t.name },
          { text: t.phase ?? '—' },
          { text: t.start.toLocaleDateString() },
          { text: t.end.toLocaleDateString() },
          { text: String(t.progress) },
          { text: t.manualContext ?? '—' },
        ])
      }
      slide.addTable(rows, {
        x: 0.5,
        y: 1.0,
        w: 9,
        colW: [2.5, 1.2, 1.0, 1.0, 0.8, 2.5],
        fontSize: 10,
        border: { type: 'solid', pt: 0.5, color: '666666' },
        fill: { color: 'F5F5F5' },
        margin: 0.05,
      })
    }
    } else if (s.type === 'content') {
      addTitleBlock(slide, s.title, { y: 0.3 })
      const bulletY = 1.0
      const lineHeight = 0.35
      s.bullets.forEach((text, i) => {
        if (!text.trim()) return
        slide.addText(`• ${text}`, {
          x: 0.5,
          y: bulletY + i * lineHeight,
          w: 9,
          h: lineHeight,
          fontSize: 12,
          valign: 'top',
          wrap: true,
        })
      })
    } else if (s.type === 'summary') {
      addTitleBlock(slide, s.title, { y: 0.3 })
      slide.addText(s.body, {
        x: 0.5,
        y: 0.9,
        w: 9,
        h: 4,
        fontSize: 12,
        valign: 'top',
        wrap: true,
      })
    }

    addTemplateFooter(slide, pageNum)
  }

  await pptx.writeFile({ fileName: fname })
}

/**
 * Export timeline data and optional summary to a PowerPoint file.
 * Uses Governance slide template: title, footer (page + date, logo), orange accent.
 */
export async function exportToPptx(
  title: string,
  tasks: TimelineTask[],
  summary?: string,
  filename = 'Governance-Timeline.pptx'
): Promise<void> {
  const pptx = new PptxGenJS()

  // Slide 1: Title (template style) + timeline table
  const slide1 = pptx.addSlide()
  slide1.addText(title, {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEMPLATE.titleColor,
  })
  // Orange accent line under title (optional visual)
  slide1.addShape('rect', {
    x: 0.5,
    y: 0.88,
    w: 1,
    h: 0.04,
    fill: { color: TEMPLATE.titleAccentColor },
  })

  type TableCell = { text: string }
  const rows: TableCell[][] = [
    [
      { text: 'Task / Milestone' },
      { text: 'Phase' },
      { text: 'Start' },
      { text: 'End' },
      { text: 'Progress %' },
      { text: 'Context' },
    ],
  ]
  for (const t of tasks) {
    rows.push([
      { text: t.name },
      { text: t.phase ?? '—' },
      { text: t.start.toLocaleDateString() },
      { text: t.end.toLocaleDateString() },
      { text: String(t.progress) },
      { text: t.manualContext ?? '—' },
    ])
  }

  slide1.addTable(rows, {
    x: 0.5,
    y: 1.0,
    w: 9,
    colW: [2.5, 1.2, 1.0, 1.0, 0.8, 2.5],
    fontSize: 10,
    border: { type: 'solid', pt: 0.5, color: '666666' },
    fill: { color: 'F5F5F5' },
    margin: 0.05,
  })

  addTemplateFooter(slide1, 1)

  // Slide 2: Summary (if provided) – same template
  if (summary && summary.trim()) {
    const slide2 = pptx.addSlide()
    slide2.addText('Summary', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: TEMPLATE.titleColor,
    })
    slide2.addShape('rect', {
      x: 0.5,
      y: 0.78,
      w: 1,
      h: 0.04,
      fill: { color: TEMPLATE.titleAccentColor },
    })
    slide2.addText(summary, {
      x: 0.5,
      y: 0.9,
      w: 9,
      h: 4,
      fontSize: 12,
      valign: 'top',
      wrap: true,
    })
    addTemplateFooter(slide2, 2)
  }

  await pptx.writeFile({ fileName: filename })
}
