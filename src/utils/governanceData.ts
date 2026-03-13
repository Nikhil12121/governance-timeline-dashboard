import type { Presentation, Slide } from '@/types/presentation'
import type { GovernanceProjectData } from '@/types/governanceApi'

type GovernancePresentationInput = Omit<GovernanceProjectData, 'timelineTasks'>

function withProjectTitle(projectId: string, assetName: string, projectDescription: string) {
  const pieces = [projectId, assetName, projectDescription].filter(Boolean)
  return pieces.join(' - ')
}

export function mergeGovernanceDataIntoPresentation(
  presentation: Presentation,
  data: GovernancePresentationInput
): Presentation {
  const titleText = withProjectTitle(
    data.project.projectId,
    data.project.assetName,
    data.project.projectShortDescription ?? data.project.projectDescription
  )

  const slides = presentation.slides.map((slide): Slide => {
    if (slide.type === 'title') {
      const assetLine = withProjectTitle(
        data.project.projectId,
        data.project.assetName,
        data.project.projectShortDescription ?? data.project.projectDescription
      )
      return {
        ...slide,
        assetName: data.project.assetName,
        projectId: data.project.projectId,
        assetDescriptionLine: assetLine || slide.assetDescriptionLine,
      }
    }

    if (slide.type === 'timeline') {
      return {
        ...slide,
        title: data.project.assetName || slide.title,
        subtitle: data.project.projectDescription || slide.subtitle,
      }
    }

    if (slide.type === 'financials-gantt') {
      return {
        ...slide,
        title: titleText || slide.title,
        subtitle: `Financials from Snowflake-ready backend data for ${data.project.assetName}`,
        financialsYears: data.financials.yearHeaders,
        financialsRows: data.financials.rows,
      }
    }

    if (slide.type === 'resource-demand') {
      return {
        ...slide,
        title: `${data.project.projectId}: Resource Demand (FTE and IPE) by Function`,
        subtitle: `Mapped from forecast/actual query output for ${data.project.assetName}`,
        columnHeaders: data.resourceDemand.columnHeaders,
        groups: data.resourceDemand.groups,
        totalRow: data.resourceDemand.totalRow,
      }
    }

    if (slide.type === 'summary') {
      const lines = [
        `Loaded project: ${data.project.projectId} - ${data.project.assetName}`,
        data.project.currentPhase ? `Phase: ${data.project.currentPhase}` : '',
        data.project.projectStatus ? `Status: ${data.project.projectStatus}` : '',
        data.project.projectManager ? `Project manager: ${data.project.projectManager}` : '',
      ].filter(Boolean)

      return {
        ...slide,
        body: lines.join('\n'),
      }
    }

    return slide
  })

  return {
    ...presentation,
    filename: data.project.projectId
      ? `${data.project.projectId}-${data.project.assetName || 'Governance'}-GSK.pptx`
      : presentation.filename,
    slides,
  }
}
