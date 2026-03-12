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
