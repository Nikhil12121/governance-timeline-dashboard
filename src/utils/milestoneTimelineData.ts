import type { TimelineTask } from '@/types/timeline'
import type { MilestoneTimelineRow } from '@/types/milestoneTimeline'
import { parseDateLocal, formatDateLocal } from '@/utils/dateUtils'

/**
 * Derive Power BI–style milestone timeline rows from existing timeline tasks.
 * Parent column = asset name; Project/Study column = project name. Each task is one milestone on the same (asset, project) bar.
 * When assetName/projectName are provided, all tasks share the same parent and itemTaskCode so they group into one bar with multiple milestones.
 */
export function timelineTasksToMilestoneRows(
  tasks: TimelineTask[],
  projectKey: string,
  /** Display in Parent column (asset name). */
  assetName?: string,
  /** Display in Project/Study column (project name). */
  projectName?: string
): MilestoneTimelineRow[] {
  const parent = assetName != null && assetName !== '' ? `${assetName} - Current` : `${projectKey} - Current`
  const projectLabel = projectName != null && projectName !== '' ? `${projectName} - Current` : `${projectKey} - Current`
  return tasks.map((t) => {
    const start = t.start instanceof Date ? t.start : parseDateLocal(t.start)
    const end = t.end instanceof Date ? t.end : parseDateLocal(t.end)
    const startStr = formatDateLocal(start)
    const endStr = formatDateLocal(end)
    const phase = t.phase && t.phase.trim() ? t.phase : 'Milestones'
    const name = t.name || t.id
    return {
      projectKey,
      itemTaskCode: projectLabel,
      parent,
      taskShortDescription: name.length > 12 ? name.slice(0, 10) + '…' : name,
      reportedDate: startStr,
      reportedDateYear: start.getFullYear(),
      itemType: 'Project - Current',
      milestoneCategory: phase.includes('C2') ? 'C2 Milestones' : phase.includes('Phase') ? 'Phase 1, 2, 3 Start' : phase.includes('Regulatory') || phase.includes('Launch') || phase.includes('Approval') ? 'Regulatory Submission / Approval / Launch' : phase.includes('Key') || phase.includes('Result') || phase.includes('Pivotal') ? 'Key Results' : phase.includes('Study') ? 'Study Milestones' : 'Other',
      planCategory: 'Current',
      minTaskReportedDate: startStr,
      maxTaskReportedDate: endStr,
      assetProgram: undefined,
    }
  })
}
