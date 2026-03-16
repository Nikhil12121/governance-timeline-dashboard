/**
 * GenAI analysis: consultation (Decision / Input / Awareness) and summary.
 * Uses your Azure OpenAI endpoint and API key only – no proxy, no workaround.
 * Analyzes: selected timeline data, project metadata, and cost/FTE (financials).
 */
import { chatCompletion } from './azureOpenAI.js'

/** Build rich context from governance data: project metadata, selected timeline, cost/FTE. */
function buildContextFromGovernance(data, visibleTimelineSummary = '') {
  if (!data) return ''
  const parts = []

  if (data.project) {
    const p = data.project
    parts.push(
      `Project metadata: ID ${p.projectId || '—'}, Asset ${p.assetName || '—'}. ${p.projectShortDescription || p.projectDescription || ''}. Phase: ${p.currentPhase || '—'}. Status: ${p.projectStatus || '—'}.`
    )
  }

  if (data.timelineTasks && data.timelineTasks.length > 0) {
    const tasks = data.timelineTasks.slice(0, 25).map(
      (t) =>
        `${t.name} (${t.phase || '—'}): ${typeof t.start === 'string' ? t.start : t.start?.toISOString?.()?.slice(0, 10) || '—'}–${typeof t.end === 'string' ? t.end : t.end?.toISOString?.()?.slice(0, 10) || '—'}${t.isCritical ? ' [critical]' : ''}`
    )
    parts.push(`Timeline tasks: ${tasks.join('; ')}.`)
  }

  if (visibleTimelineSummary && String(visibleTimelineSummary).trim()) {
    parts.push(`User-selected timeline summary (base your analysis on this):\n${String(visibleTimelineSummary).trim()}`)
  }

  if (data.financials && (data.financials.rows?.length > 0 || data.financials.yearHeaders?.length > 0)) {
    const headers = data.financials.yearHeaders || []
    const headerLine = headers.length ? `Years: ${headers.join(', ')}` : ''
    const rows = (data.financials.rows || []).map((r) => {
      const vals = (r.values || []).map(String).join(', ')
      return `${r.label || 'Row'}: ${vals}`
    })
    parts.push(`Cost / FTE / financials. ${headerLine}. ${rows.join('. ')}`)
  }

  return parts.join('\n\n')
}

const CONSULTATION_SYSTEM = `You are a pharma governance communications specialist for VIDRU Board/DRB/PIB.

Task: From the provided project metadata, selected timeline, and cost/FTE data, produce exactly three sections for "Why does the Team consult the Board?"

Rules:
- Use ONLY the data provided. Do not invent facts, numbers, or dates.
- Tone: formal, crisp, leadership-ready.
- Output valid JSON only (no markdown, no explanation).
- Structure: for_decision_intro, for_decision (exactly 2 bullets), for_input_intro, for_input (exactly 2 bullets), for_awareness_intro, for_awareness (exactly 2 bullets).
- For Decision: board-facing approval/endorsement (e.g. "Does the Board endorse:" then 2 points).
- For Input: guidance-seeking (e.g. "Team seeks input on:" then 2 points).
- For Awareness: informational (e.g. "Team is sharing for awareness:" then 2 points).

Output ONLY this JSON (2 items per array):
{"for_decision_intro":"...","for_decision":["...","..."],"for_input_intro":"...","for_input":["...","..."],"for_awareness_intro":"...","for_awareness":["...","..."]}`

const SUMMARY_SYSTEM = `You are a pharma governance communications specialist for the "Generated analysis" section.

Task: Write a short executive summary based ONLY on the provided: project metadata, selected timeline data, and cost/FTE (financial) analysis.

Rules:
- Use ONLY the information provided. Do not invent data.
- Write exactly 3 short paragraphs. Each paragraph 2–4 sentences.
- Paragraph 1: project and current status (phase, key milestones from selected timeline).
- Paragraph 2: timeline and dependencies (critical activities, timing).
- Paragraph 3: cost/FTE and financial takeaways where data is provided.
- Formal governance language (VIDRU Board, DRB, PIB). No headings, no bullet lists, no JSON.`

export async function generateConsultationRationale(projectKey, getGovernanceData) {
  let data
  try {
    data = await getGovernanceData(projectKey)
  } catch {
    return getDefaultConsultation()
  }

  const context = buildContextFromGovernance(data)
  const userPrompt = `Generate the three consultation sections using only the data below. Output valid JSON with for_decision_intro, for_decision (2 items), for_input_intro, for_input (2 items), for_awareness_intro, for_awareness (2 items).\n\nData:\n${context || 'No project data.'}`

  try {
    const raw = await chatCompletion([
      { role: 'system', content: CONSULTATION_SYSTEM },
      { role: 'user', content: userPrompt },
    ])
    const jsonStr = raw.replace(/```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(jsonStr)
    const toTwo = (arr) => {
      const a = Array.isArray(arr) ? arr.map((s) => String(s ?? '').trim()).filter(Boolean) : []
      return [a[0] || '', a[1] || '']
    }
    const padToFive = (two) => [...two, '', '', ''].slice(0, 5)
    const def = getDefaultConsultation()
    return {
      forDecisionIntro: typeof parsed.for_decision_intro === 'string' ? parsed.for_decision_intro.trim() : def.forDecisionIntro,
      forDecision: padToFive(toTwo(parsed.for_decision ?? parsed.forDecision)),
      forInputIntro: typeof parsed.for_input_intro === 'string' ? parsed.for_input_intro.trim() : def.forInputIntro,
      forInput: padToFive(toTwo(parsed.for_input ?? parsed.forInput)),
      forAwarenessIntro: typeof parsed.for_awareness_intro === 'string' ? parsed.for_awareness_intro.trim() : def.forAwarenessIntro,
      forAwareness: padToFive(toTwo(parsed.for_awareness ?? parsed.forAwareness)),
    }
  } catch {
    return getDefaultConsultation()
  }
}

const DEFAULT_INTROS = {
  forDecisionIntro: 'Does the Board endorse:',
  forInputIntro: 'Team seeks input on:',
  forAwarenessIntro: 'Team is sharing for awareness:',
}

function getDefaultConsultation() {
  const two = (a, b) => [a, b, '', '', ''].slice(0, 5)
  return {
    forDecisionIntro: DEFAULT_INTROS.forDecisionIntro,
    forDecision: two('The proposed scenario and associated timelines.', 'Level of confidence and resource ask.'),
    forInputIntro: DEFAULT_INTROS.forInputIntro,
    forInput: two('Key dependencies and risks.', 'Additional considerations before next stage gate.'),
    forAwarenessIntro: DEFAULT_INTROS.forAwarenessIntro,
    forAwareness: two('Current status and next milestones.', 'Governance boards for this stage gate.'),
  }
}

function buildStructuredSummaryInput(data, visibleTimelineSummary = '') {
  const out = { project_name: '', project_id: '', timeline_title: '', timeline_tasks: [], financial_year_headers: [], financial_rows: [] }
  if (!data) return out
  if (data.project) {
    out.project_name = [data.project.assetName, data.project.projectShortDescription].filter(Boolean).join(' – ') || data.project.projectId || ''
    out.project_id = data.project.projectId || ''
  }
  if (data.timelineTasks && data.timelineTasks.length > 0) {
    out.timeline_tasks = data.timelineTasks.slice(0, 25).map((t) => ({
      name: t.name,
      start: typeof t.start === 'string' ? t.start : (t.start && t.start.toISOString ? t.start.toISOString().slice(0, 10) : ''),
      end: typeof t.end === 'string' ? t.end : (t.end && t.end.toISOString ? t.end.toISOString().slice(0, 10) : ''),
      type: t.type || '',
      phase: t.phase || '',
      manualContext: t.manualContext || '',
      isCritical: !!t.isCritical,
    }))
  }
  if (data.financials) {
    out.financial_year_headers = data.financials.yearHeaders || []
    out.financial_rows = (data.financials.rows || []).map((r) => ({ label: r.label || '', values: (r.values || []).map(String) }))
  }
  if (visibleTimelineSummary && visibleTimelineSummary.trim()) {
    out.timeline_title = 'User-selected timeline'
    out.timeline_summary_text = visibleTimelineSummary.trim()
  }
  return out
}

export async function generateSummary(projectKey, getGovernanceData, visibleTimelineSummary = '') {
  let data
  try {
    data = await getGovernanceData(projectKey)
  } catch {
    return 'Summary could not be generated. Load project data and try again.'
  }

  const structured = buildStructuredSummaryInput(data, visibleTimelineSummary)
  const context = buildContextFromGovernance(data, visibleTimelineSummary)
  const inputDataJson = JSON.stringify(structured, null, 2)
  const userPrompt = `Write exactly 3 short paragraphs for the governance slide summary. Use only the information below. Paragraph 1: project and status. Paragraph 2: timeline and dependencies. Paragraph 3: cost/FTE and financial takeaways.\n\nData:\n${context || inputDataJson}`

  try {
    const text = await chatCompletion([
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: userPrompt },
    ])
    return text || 'Summary could not be generated.'
  } catch (err) {
    const msg = err?.message || String(err)
    if (msg.includes('not configured') || msg.includes('AZURE_OPENAI')) {
      return 'Summary could not be generated. Ensure AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are set in .env and restart the server.'
    }
    return `Summary could not be generated. Azure OpenAI error: ${msg}`
  }
}
