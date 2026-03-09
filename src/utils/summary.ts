import type { TimelineTask } from '@/types/timeline'

/**
 * Generate a short governance-quality summary from the visible timeline data.
 * Can be extended later with LLM or more rules.
 */
export function generateTimelineSummary(tasks: TimelineTask[]): string {
  const milestones = tasks.filter((t) => t.type === 'milestone')
  const projects = tasks.filter((t) => t.type === 'project')
  const workTasks = tasks.filter((t) => t.type === 'task')

  if (tasks.length === 0) {
    return 'No timeline data selected. Apply filters or add tasks to generate a summary.'
  }

  const minStart = new Date(Math.min(...tasks.map((t) => t.start.getTime())))
  const maxEnd = new Date(Math.max(...tasks.map((t) => t.end.getTime())))
  const dateRange = `${minStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${maxEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const phaseList = [...new Set(tasks.map((t) => t.phase).filter(Boolean))].join(', ') || 'Not specified'
  const criticalCount = tasks.filter((t) => t.isCritical).length

  const parts: string[] = []
  parts.push(`This timeline covers ${dateRange} and includes ${tasks.length} item(s): ${workTasks.length} task(s), ${milestones.length} milestone(s), ${projects.length} phase(s).`)
  parts.push(`Phases: ${phaseList}.`)
  if (criticalCount > 0) {
    parts.push(`${criticalCount} item(s) are on the critical path.`)
  }
  if (milestones.length > 0) {
    const names = milestones.slice(0, 5).map((m) => m.name)
    const more = milestones.length > 5 ? ` and ${milestones.length - 5} more` : ''
    parts.push(`Key milestones: ${names.join('; ')}${more}.`)
  }

  return parts.join(' ')
}

/**
 * Generate key message bullets from timeline data for the content slide.
 * PM can edit these in the UI.
 */
export function generateKeyMessages(tasks: TimelineTask[]): string[] {
  if (tasks.length === 0) {
    return ['No timeline data. Add or adjust filters to generate key messages.']
  }
  const milestones = tasks.filter((t) => t.type === 'milestone')
  const phases = [...new Set(tasks.map((t) => t.phase).filter(Boolean))] as string[]
  const bullets: string[] = []
  bullets.push(`Timeline includes ${tasks.length} item(s) across ${phases.length} phase(s): ${phases.join(', ') || '—'}.`)
  if (milestones.length > 0) {
    bullets.push(`Key milestones: ${milestones.slice(0, 5).map((m) => m.name).join('; ')}${milestones.length > 5 ? ` (+${milestones.length - 5} more)` : ''}.`)
  }
  bullets.push('Standardised, automated governance-quality timelines with flexibility for different audiences.')
  bullets.push('Gantt output with ability to add manual context where required.')
  return bullets
}
