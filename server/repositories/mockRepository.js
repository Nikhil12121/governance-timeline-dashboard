import {
  actualRows,
  forecastRows,
  projectRows,
  roleLabels,
  timelineTasksByProject,
} from '../mock/governanceMockData.js'
import {
  buildAssetOptions,
  buildGovernanceResponse,
} from '../services/governanceMapper.js'

export function createMockRepository() {
  return {
    async getAssetOptions() {
      return buildAssetOptions(projectRows)
    },

    async getGovernanceProjectData(projectKey) {
      const project = projectRows.find((row) => row.projectKey === projectKey)

      if (!project) {
        return null
      }

      return buildGovernanceResponse(
        project,
        actualRows.filter((row) => row.projectKey === projectKey),
        forecastRows.filter((row) => row.projectKey === projectKey),
        timelineTasksByProject[projectKey] ?? [],
        roleLabels
      )
    },
  }
}

