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

const CONSULTATION_SYSTEM = `You are an expert PM writing governance board materials for a pharma R&D project. Output ONLY valid JSON with three arrays of strings: "forDecision", "forInput", "forAwareness". Each array must have at least 5 items (use empty string "" for placeholder lines if needed). Write concise, professional bullet points suitable for VIDRU Board/DRB/PIB. No markdown, no explanation.`

const SUMMARY_SYSTEM = `You are an expert PM writing a short executive summary for a governance slide. Write 2–4 sentences based only on the project and timeline data provided. Be factual and professional. Output plain text only, no headings or bullets.`

export async function generateConsultationRationale(projectKey, getGovernanceData) {
  let data
  try {
    data = await getGovernanceData(projectKey)
  } catch {
    return getDefaultConsultation()
  }
  const context = buildContextFromGovernance(data)
  const userPrompt = `Based on this project and timeline data, generate three sections of consultation points for "Why does the Team consult the Board?".\n\nData: ${context || 'No project data.'}\n\nReturn JSON: { "forDecision": ["...","...",...], "forInput": ["...",...], "forAwareness": ["...",...] } with at least 5 items per array.`

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
    return {
      forDecision: pad(parsed.forDecision),
      forInput: pad(parsed.forInput),
      forAwareness: pad(parsed.forAwareness),
    }
  } catch {
    return getDefaultConsultation()
  }
}

function getDefaultConsultation() {
  const five = (first, rest) => [first, ...rest, '', ''].slice(0, 5)
  return {
    forDecision: five('Does the Board approve the proposed scenario and timelines?', ['Include level of confidence.']),
    forInput: five('Team seeks Board input on', ['Key dependencies and risks.']),
    forAwareness: five('Team is sharing for awareness:', ['Current status and next milestones.']),
  }
}

export async function generateSummary(projectKey, getGovernanceData) {
  let data
  try {
    data = await getGovernanceData(projectKey)
  } catch {
    return 'Summary could not be generated. Load project data and try again.'
  }
  const context = buildContextFromGovernance(data)
  const userPrompt = `Write a short executive summary for a governance slide based on:\n\n${context || 'No project data.'}`

  try {
    const text = await chatCompletion([
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: userPrompt },
    ])
    return text || 'Summary could not be generated.'
  } catch {
    return 'Summary could not be generated. Ensure Azure OpenAI is configured.'
  }
}
