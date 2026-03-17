import PptxGenJS from 'pptxgenjs'
import type { TimelineTask } from '@/types/timeline'
import type { Presentation } from '@/types/presentation'

const TEMPLATE = {
  titleColor: '1a1a1a',
  titleAccentColor: 'E87722',
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

function addGanttImage(slide: PptxGenJS.Slide, timelineChartImage: string, y: number, h: number) {
  const trimmed = timelineChartImage?.trim() ?? ''
  if (!trimmed || trimmed.length < 100) return
  // PptxGenJS expects "image/png;base64,<data>"; toPng returns "data:image/png;base64,<data>"
  const base64Part = trimmed.includes('base64,')
    ? trimmed.split('base64,')[1]?.replace(/\s/g, '') ?? ''
    : trimmed.replace(/\s/g, '')
  if (!base64Part) return
  const dataForPpt = `image/png;base64,${base64Part}`
  try {
    slide.addImage({
      data: dataForPpt,
      x: 0.5,
      y,
      w: 9,
      h,
    })
  } catch (err) {
    console.warn('Failed to add Gantt image to slide:', err)
  }
}

/**
 * Export full presentation to a single PPTX file in GSK format.
 * Handles all slide types: title (GSK cover), consultation-objectives, timeline (Gantt image or table), financials-gantt, scenarios, resource-demand, content, summary.
 */
const SLIDE_WIDTH = 10
const SLIDE_HEIGHT = 5.625
const GANTT_IMAGE_Y = 0.95
const GANTT_IMAGE_H = 3.8

export async function exportPresentationToPptx(
  presentation: Presentation,
  timelineTasks: TimelineTask[],
  filename?: string,
  timelineChartImage?: string
): Promise<void> {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'LAYOUT_16_9', width: SLIDE_WIDTH, height: SLIDE_HEIGHT })
  pptx.layout = 'LAYOUT_16_9'
  const fname = filename || presentation.filename || 'Governance-GSK.pptx'
  let pageNum = 0

  for (const s of presentation.slides) {
    // Skip combined Gantt + financials slide in exported deck (requested to remove 4th slide).
    if (s.type === 'financials-gantt') continue

    pageNum++
    const slide = pptx.addSlide()

    if (s.type === 'title') {
      // gsk.com top-right
      slide.addText('gsk.com', {
        x: 8.2,
        y: 0.08,
        w: 0.8,
        h: 0.2,
        fontSize: 8,
        color: TEMPLATE.footerColor,
        align: 'right',
      })
      // VIDRU Board/ DRB/ PIB* at very top of slide
      slide.addText(s.boardHeading ?? s.title, {
        x: 0.5,
        y: 0.08,
        w: 7.5,
        h: 0.4,
        fontSize: 20,
        bold: true,
        color: TEMPLATE.titleColor,
      })
      // GSK – orange, centered, large logo text (no line below header; asset/date go right below GSK)
      const gskY = 1.4
      const gskH = 1.8
      slide.addText('GSK', {
        x: 0.5,
        y: gskY,
        w: 9,
        h: gskH,
        fontSize: 120,
        bold: true,
        color: TEMPLATE.titleAccentColor,
        align: 'center',
        valign: 'middle',
      })
      // [ASSET- NAME] and date – in the space right below GSK (no lines), centered
      const belowGskY = gskY + gskH + 0.12
      const assetLine = (s as import('@/types/presentation').TitleSlide).assetDescriptionLine ?? s.assetName ?? '[ASSET- NAME]'
      slide.addText(assetLine, {
        x: 0.5,
        y: belowGskY,
        w: 9,
        h: 0.35,
        fontSize: 14,
        bold: true,
        color: TEMPLATE.titleColor,
        align: 'center',
        valign: 'middle',
        shrinkText: true,
      })
      slide.addText(s.consultationDate ?? '12/03/2026', {
        x: 0.5,
        y: belowGskY + 0.45,
        w: 9,
        h: 0.3,
        fontSize: 12,
        color: TEMPLATE.titleColor,
        align: 'center',
      })
      const ownerLine = (s as import('@/types/presentation').TitleSlide).ownerLine ?? ''
      if (ownerLine) {
        slide.addText(ownerLine, {
          x: 0.5,
          y: 4.2,
          w: 9,
          h: 0.25,
          fontSize: 11,
          color: TEMPLATE.titleColor,
          align: 'center',
        })
      }
      const financePartner = (s as import('@/types/presentation').TitleSlide).financePartner ?? ''
      if (financePartner) {
        slide.addText(financePartner, {
          x: 0.5,
          y: 4.5,
          w: 9,
          h: 0.25,
          fontSize: 11,
          color: TEMPLATE.titleColor,
          align: 'center',
        })
      }
      slide.addShape('rect', {
        x: 4.85,
        y: 5.15,
        w: 0.3,
        h: 0.3,
        fill: { color: TEMPLATE.titleAccentColor },
        rotate: 45,
      })
    } else if (s.type === 'consultation-objectives') {
      addTitleBlock(slide, s.title, { y: 0.25 })
      slide.addText('*Only retain the Board relevant for your project', {
        x: 6.5,
        y: 0.3,
        w: 3,
        h: 0.3,
        fontSize: 8,
        italic: true,
        color: 'cc0000',
      })
      const sectH = 0.55
      const bullets = (arr: string[], x: number, y: number) => {
        arr.forEach((line, i) => {
          if (!line.trim()) return
          slide.addText(`• ${line}`, {
            x,
            y: y + i * 0.2,
            w: 7.5,
            h: 0.22,
            fontSize: 10,
            valign: 'top',
            wrap: true,
          })
        })
      }
      const sectionWithIntro = (intro: string | undefined, arr: string[], x: number, y: number) => {
        if (intro?.trim()) {
          slide.addText(intro.trim(), { x, y, w: 7.5, h: 0.2, fontSize: 10, bold: true, valign: 'top', wrap: true })
          bullets(arr, x, y + 0.2)
        } else {
          bullets(arr, x, y)
        }
      }
      slide.addShape('rect', {
        x: 0.5,
        y: 0.95,
        w: 1.2,
        h: sectH,
        fill: { color: TEMPLATE.titleAccentColor },
      })
      slide.addText('For Decision', {
        x: 0.5,
        y: 1.05,
        w: 1.2,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      })
      sectionWithIntro(s.forDecisionIntro, s.forDecision, 1.8, 0.95)

      slide.addShape('rect', {
        x: 0.5,
        y: 1.55,
        w: 1.2,
        h: sectH,
        fill: { color: TEMPLATE.titleAccentColor },
      })
      slide.addText('For Input', {
        x: 0.5,
        y: 1.65,
        w: 1.2,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      })
      sectionWithIntro(s.forInputIntro, s.forInput, 1.8, 1.55)

      slide.addShape('rect', {
        x: 0.5,
        y: 2.15,
        w: 1.2,
        h: sectH,
        fill: { color: TEMPLATE.titleAccentColor },
      })
      slide.addText('For Awareness', {
        x: 0.5,
        y: 2.25,
        w: 1.2,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      })
      sectionWithIntro(s.forAwarenessIntro, s.forAwareness, 1.8, 2.15)

      slide.addText('1. Include team level of confidence (%) in operational delivery of the next business milestone as per the proposed plan (see slide notes for guidance)', {
        x: 0.5,
        y: 2.85,
        w: 9,
        h: 0.4,
        fontSize: 7,
        color: TEMPLATE.footerColor,
        wrap: true,
      })
    } else if (s.type === 'timeline') {
      const fullTitle = s.subtitle ? `${s.title} – ${s.subtitle}` : s.title
      addTitleBlock(slide, fullTitle, { y: 0.3 })
      if (timelineChartImage?.trim()) {
        addGanttImage(slide, timelineChartImage, GANTT_IMAGE_Y, GANTT_IMAGE_H)
      } else {
        addTimelineTable(slide, timelineTasks)
      }
    } else if (s.type === 'scenarios') {
      slide.addShape('rect', {
        x: 0.5,
        y: 0.35,
        w: 0.12,
        h: 0.15,
        fill: { color: TEMPLATE.titleAccentColor },
      })
      slide.addText(s.title, {
        x: 0.65,
        y: 0.3,
        w: 8,
        h: 0.3,
        fontSize: 18,
        bold: true,
        color: TEMPLATE.titleAccentColor,
      })
      slide.addText('High level plan showing scenarios', {
        x: 0.65,
        y: 0.55,
        w: 8,
        h: 0.2,
        fontSize: 11,
        color: TEMPLATE.footerColor,
      })
      let yCur = 0.85
      const cols = s.yearHeaders.length + 1
      const colW = 9 / cols
      for (const sc of s.scenarios) {
        slide.addText(sc.name + (sc.launchYear ? ` – ${sc.launchYear}` : ''), {
          x: 0.5,
          y: yCur,
          w: 9,
          h: 0.2,
          fontSize: 11,
          bold: true,
        })
        yCur += 0.22
        const rows: TableCell[][] = sc.rows.map((r) => [
          { text: r.label },
          ...r.values.map((v) => ({ text: String(v) })),
        ])
        slide.addTable(rows, {
          x: 0.5,
          y: yCur,
          w: 9,
          colW: Array(cols).fill(colW),
          fontSize: 8,
          border: { type: 'solid', pt: 0.25, color: '999999' },
          margin: 0.02,
        })
        yCur += 0.15 * sc.rows.length + 0.15
      }
    } else if (s.type === 'resource-demand') {
      addTitleBlock(slide, s.title, { subtitle: s.subtitle, y: 0.25 })
      let allRows: TableCell[][] = [s.columnHeaders.map((h) => ({ text: h }))]
      for (const grp of s.groups) {
        for (const row of grp.rows) {
          allRows.push([
            { text: row.name },
            ...row.values.map((v) => ({ text: String(v) })),
          ])
        }
      }
      // Always keep a total row at the bottom.
      const totalRow = s.totalRow.map((v) => ({ text: String(v) }))

      // Limit table height: at most 9 rows including header and total.
      // Strategy: header + first N body rows + total so nothing flows off the page.
      if (allRows.length > 1) {
        const bodyRows = allRows.slice(1)
        const maxRows = 9
        const maxBody = Math.max(0, maxRows - 2) // header + total
        const limitedBody = bodyRows.slice(0, maxBody)
        allRows = [allRows[0], ...limitedBody, totalRow]
      } else {
        allRows.push(totalRow)
      }

      const numCols = s.columnHeaders.length
      const colW = 9 / numCols
      slide.addTable(allRows, {
        x: 0.5,
        y: 0.9,
        w: 9,
        colW: Array(numCols).fill(colW),
        fontSize: 8,
        border: { type: 'solid', pt: 0.25, color: '666666' },
        fill: { color: 'F5F5F5' },
        margin: 0.03,
      })
      slide.addText('Source: Data output from IRM as of DD/MM/YY', {
        x: 0.5,
        y: 4.9,
        w: 9,
        h: 0.25,
        fontSize: 7,
        color: TEMPLATE.footerColor,
      })
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
