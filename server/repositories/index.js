import { createMockRepository } from './mockRepository.js'
import { createSnowflakeRepository } from './snowflakeRepository.js'

export function createGovernanceRepository(mode = process.env.GOVERNANCE_DATA_MODE || 'mock') {
  return mode === 'snowflake' ? createSnowflakeRepository() : createMockRepository()
}

