import type { AssetOption, GovernanceProjectData, TimelineTaskDto } from '@/types/governanceApi'
import type { TimelineTask } from '@/types/timeline'
import { parseDateLocal } from '@/utils/dateUtils'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787/api'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || response.statusText)
  }
  return response.json() as Promise<T>
}

function toTimelineTask(task: TimelineTaskDto): TimelineTask {
  return {
    ...task,
    start: parseDateLocal(task.start),
    end: parseDateLocal(task.end),
  }
}

export async function fetchAssetOptions(): Promise<AssetOption[]> {
  return fetchJson<AssetOption[]>('/assets')
}

export async function fetchGovernanceProjectData(
  projectKey: string
): Promise<Omit<GovernanceProjectData, 'timelineTasks'> & { timelineTasks: TimelineTask[] }> {
  const data = await fetchJson<GovernanceProjectData>(`/projects/${encodeURIComponent(projectKey)}/governance`)
  return {
    ...data,
    timelineTasks: data.timelineTasks.map(toTimelineTask),
  }
}

export interface ConsultationAnalysis {
  forDecisionIntro?: string
  forDecision: string[]
  forInputIntro?: string
  forInput: string[]
  forAwarenessIntro?: string
  forAwareness: string[]
}

export async function fetchConsultationAnalysis(
  projectKey: string,
  /** Optional: user's 2–3 line paragraph; AI converts to governance-ready points (For Decision / Input / Awareness). */
  userParagraph?: string
): Promise<ConsultationAnalysis> {
  return postJson<ConsultationAnalysis>('/analyze/consultation', {
    projectKey,
    ...(userParagraph != null && userParagraph.trim() !== '' ? { userParagraph: userParagraph.trim() } : {}),
  })
}

export async function fetchSummaryAnalysis(
  projectKey: string,
  visibleTimelineSummary?: string,
  summaryType?: string,
  customInstruction?: string
): Promise<{ body: string }> {
  return postJson<{ body: string }>('/analyze/summary', {
    projectKey,
    ...(visibleTimelineSummary != null && visibleTimelineSummary !== ''
      ? { visibleTimelineSummary }
      : {}),
    ...(summaryType != null && summaryType.trim() !== '' ? { summaryType: summaryType.trim() } : {}),
    ...(customInstruction != null && customInstruction.trim() !== '' ? { customInstruction: customInstruction.trim() } : {}),
  })
}
