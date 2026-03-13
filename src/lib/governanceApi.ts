import type { AssetOption, GovernanceProjectData, TimelineTaskDto } from '@/types/governanceApi'
import type { TimelineTask } from '@/types/timeline'

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
    start: new Date(task.start),
    end: new Date(task.end),
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
  forDecision: string[]
  forInput: string[]
  forAwareness: string[]
}

export async function fetchConsultationAnalysis(projectKey: string): Promise<ConsultationAnalysis> {
  return postJson<ConsultationAnalysis>('/analyze/consultation', { projectKey })
}

export async function fetchSummaryAnalysis(projectKey: string): Promise<{ body: string }> {
  return postJson<{ body: string }>('/analyze/summary', { projectKey })
}
