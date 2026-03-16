/**
 * GenAI analysis: consultation rationale and summary from governance data.
 * Uses Azure OpenAI; falls back to defaults if not configured or on error.
 */
import { chatCompletion } from './azureOpenAI.js'

function buildContextFromGovernance(data) {
  if (!data) return ''
  const parts = []
  if (data.project) {
    parts.push(`Project: ${data.project.projectId} - ${data.project.assetName}. ${data.project.projectShortDescription || data.project.projectDescription || ''}. Phase: ${data.project.currentPhase || '—'}. Status: ${data.project.projectStatus || '—'}.`)
  }
  if (data.timelineTasks && data.timelineTasks.length > 0) {
    const tasks = data.timelineTasks.slice(0, 20).map((t) => `${t.name} (${t.phase || '—'}): ${t.start}–${t.end}`).join('; ')
    parts.push(`Timeline: ${tasks}.`)
  }
  if (data.financials && data.financials.rows?.length > 0) {
    const row = data.financials.rows[0]
    const vals = row.values ? row.values.slice(0, 5).join(', ') : ''
    parts.push(`Financials (${row.label || 'summary'}): ${vals}.`)
  }
  return parts.join(' ')
}

// Akash-style: pharma governance communications specialist; formal, crisp, slide-ready; return intros + bullets (see docs/AKASH-LLM-LOGIC.md)
const CONSULTATION_SYSTEM = `You are a pharma governance communications specialist supporting pharmaceutical project managers.

Your task is to produce governance-slide wording for a board review slide (VIDRU Board/DRB/PIB).

Rules:
- Tone: formal, crisp, leadership-ready, decision-oriented.
- "For Decision": one short intro line (e.g. "Does the Board endorse:") then board-facing approval/endorsement bullets.
- "For Input": one short intro (e.g. "Team seeks input on:") then guidance-seeking bullets.
- "For Awareness": one short intro (e.g. "Team is sharing for awareness:") then awareness bullets.
- Use professional governance vocabulary: approve, endorse, input, considerations, awareness, milestone, plans, stage gate, resource, budget, study.
- Do not invent facts, numbers, or dates. No markdown. No explanation.
- Output ONLY valid JSON with this exact structure (each array at least 5 items; use "" for placeholders):
{"for_decision_intro":"...","for_decision":["...",...],"for_input_intro":"...","for_input":["...",...],"for_awareness_intro":"...","for_awareness":["...",...]}`

const SUMMARY_SYSTEM = `You are a pharma governance communications specialist supporting governance review meetings.

Your task is to write a polished executive summary for the "Generated analysis" section of a governance slide.

Requirements:
- Use only the information provided. Formal pharma governance language suitable for VIDRU Board, DRB, or PIB.
- Focus on current timeline, key milestones, and financial context (EPE/IPE) if present.
- Mention timing, phase progression, critical activities, dependencies, and financial takeaways where relevant.
- Output: plain text only. No headings, markdown, or JSON.
- Return 3 to 5 short executive bullet points, one point per line. Each point concise and slide-ready. Do not return a single paragraph.`

export async function generateConsultationRationale(projectKey, getGovernanceData) {
  let data
  try {
    data = await getGovernanceData(projectKey)
  } catch {
    return getDefaultConsultation()
  }
  const context = buildContextFromGovernance(data)
  const userPrompt = `Generate three sections of consultation points for "Why does the Team consult the Board?" using only the data below. Output valid JSON with for_decision_intro, for_decision, for_input_intro, for_input, for_awareness_intro, for_awareness (each array at least 5 items; use "" for placeholders).\n\nData: ${context || 'No project data.'}`

  try {
    const raw = await chatCompletion([
      { role: 'system', content: CONSULTATION_SYSTEM },
      { role: 'user', content: userPrompt },
    ])
    const jsonStr = raw.replace(/```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(jsonStr)
    const pad = (arr) => {
      const a = Array.isArray(arr) ? arr.map((s) => String(s ?? '').trim()) : []
      while (a.length < 5) a.push('')
      return a.slice(0, 10)
    }
    const def = getDefaultConsultation()
    return {
      forDecisionIntro: typeof parsed.for_decision_intro === 'string' ? parsed.for_decision_intro.trim() : def.forDecisionIntro,
      forDecision: pad(parsed.for_decision ?? parsed.forDecision),
      forInputIntro: typeof parsed.for_input_intro === 'string' ? parsed.for_input_intro.trim() : def.forInputIntro,
      forInput: pad(parsed.for_input ?? parsed.forInput),
      forAwarenessIntro: typeof parsed.for_awareness_intro === 'string' ? parsed.for_awareness_intro.trim() : def.forAwarenessIntro,
      forAwareness: pad(parsed.for_awareness ?? parsed.forAwareness),
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
  const five = (first, rest) => [first, ...rest, '', ''].slice(0, 5)
  return {
    forDecisionIntro: DEFAULT_INTROS.forDecisionIntro,
    forDecision: five('The proposed scenario and associated timelines.', ['Include level of confidence.']),
    forInputIntro: DEFAULT_INTROS.forInputIntro,
    forInput: five('Key dependencies and risks.', ['Any additional considerations before next stage gate.']),
    forAwarenessIntro: DEFAULT_INTROS.forAwarenessIntro,
    forAwareness: five('Current status and next milestones.', ['Governance boards for this stage gate.']),
  }
}

// Akash-style: structured input (project, timeline_tasks, financials) for summary (see docs/AKASH-LLM-LOGIC.md)
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
  const context = buildContextFromGovernance(data)
  const timelineSection = visibleTimelineSummary && visibleTimelineSummary.trim()
    ? `\n\nTimeline the user has selected (use as the basis for your summary):\n${visibleTimelineSummary.trim()}`
    : ''
  const inputDataJson = JSON.stringify(structured, null, 2)
  const userPrompt = `Write a polished executive summary (3–5 bullet points, one per line, plain text only) for the governance slide. Use only the information in the input data below.\n\nInput data:\n${inputDataJson}\n${timelineSection ? `\nAdditional timeline context:\n${timelineSection}` : ''}`

  try {
    const text = await chatCompletion([
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: userPrompt },
    ])
    return text || 'Summary could not be generated.'
  } catch (err) {
    const msg = err?.message || String(err)
    if (msg.includes('not configured') || msg.includes('AZURE_OPENAI')) {
      return 'Summary could not be generated. Ensure Azure OpenAI is configured.'
    }
    return `Summary could not be generated. Azure OpenAI error: ${msg}`
  }
}
