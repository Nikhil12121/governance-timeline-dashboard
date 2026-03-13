import snowflake from 'snowflake-sdk'
import {
  buildAssetOptions,
  buildGovernanceResponse,
} from '../services/governanceMapper.js'
import { applySqlParams, readSqlFile } from '../utils/sql.js'

function getSnowflakeConfig() {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT,
    user: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PASSWORD || undefined,
    authenticator: process.env.SNOWFLAKE_AUTHENTICATOR || 'externalbrowser',
    role: process.env.SNOWFLAKE_ROLE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    host: process.env.SNOWFLAKE_HOST || undefined,
    loginTimeout: 60,
    networkTimeout: 300,
  }
}

function normalizeRecord(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [String(key).trim(), value])
  )
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key]
    }
  }
  return undefined
}

function mapProjectRow(row) {
  const normalized = normalizeRecord(row)
  const projectKey = String(firstValue(normalized, ['Project Key', 'PROJECT KEY', 'project_key']) ?? '')
  const projectId = String(
    firstValue(normalized, ['Project Alternate ID', 'PROJECT ALTERNATE ID', 'project_code_id_l_id', 'project_id']) ?? ''
  )
  const assetName = String(firstValue(normalized, ['Asset Name', 'ASSET NAME', 'asset_name']) ?? '')

  return {
    projectKey,
    projectId,
    assetName,
    projectDescription: String(
      firstValue(normalized, ['Project Description', 'PROJECT DESCRIPTION', 'project_description']) ?? ''
    ),
    projectShortDescription: String(
      firstValue(normalized, ['Project Short Description', 'PROJECT SHORT DESCRIPTION', 'project_short_description']) ?? ''
    ),
    currentPhase: String(firstValue(normalized, ['Project Current Phase', 'PROJECT CURRENT PHASE']) ?? ''),
    projectStatus: String(firstValue(normalized, ['Project Status', 'PROJECT STATUS']) ?? ''),
    projectManager: String(firstValue(normalized, ['Project Manager Name', 'PROJECT MANAGER NAME']) ?? ''),
    portfolioOwner: String(firstValue(normalized, ['Portfolio Owner', 'PORTFOLIO OWNER']) ?? ''),
    lastUpdated: String(firstValue(normalized, ['Last Updated', 'LAST UPDATED']) ?? ''),
  }
}

function mapActualRow(row) {
  const normalized = normalizeRecord(row)
  return {
    projectCodeId: String(firstValue(normalized, ['project_code_id_l_id', 'PROJECT_CODE_ID_L_ID']) ?? ''),
    dateKey: String(firstValue(normalized, ['Date Key', 'DATE KEY']) ?? ''),
    projectKey: String(firstValue(normalized, ['Project Key', 'PROJECT KEY']) ?? ''),
    personRoleKey: String(firstValue(normalized, ['Person Role Key', 'PERSON ROLE KEY']) ?? ''),
    fte: Number(firstValue(normalized, ['FTE']) ?? 0),
    ipeAmountGbp: Number(firstValue(normalized, ['IPE Amount GBP']) ?? 0),
    epeAmountGbp: Number(firstValue(normalized, ['EPE Amount GBP']) ?? 0),
  }
}

function mapForecastRow(row) {
  const normalized = normalizeRecord(row)
  return {
    dateKey: String(firstValue(normalized, ['Date Key', 'DATE KEY']) ?? ''),
    projectKey: String(firstValue(normalized, ['Project Key', 'PROJECT KEY']) ?? ''),
    planKey: String(firstValue(normalized, ['Plan Key', 'PLAN KEY']) ?? ''),
    personRoleKey: String(firstValue(normalized, ['Person Role Key', 'PERSON ROLE KEY']) ?? ''),
    currentForecastFte: Number(firstValue(normalized, ['Current Forecast FTE', 'CURRENT FORECAST FTE']) ?? 0),
    ipeAmountGbp: Number(firstValue(normalized, ['IPE Amount GBP']) ?? 0),
    epeAmountGbp: Number(firstValue(normalized, ['EPE Amount GBP']) ?? 0),
    governanceApprovedFte: Number(firstValue(normalized, ['Governance Approved FTE', 'GOVERNANCE APPROVED FTE']) ?? 0),
    governanceIpeAmountGbp: Number(firstValue(normalized, ['Governance IPE Amount GBP', 'GOVERNANCE IPE AMOUNT GBP']) ?? 0),
    governanceEpeAmountGbp: Number(firstValue(normalized, ['Governance EPE Amount GBP', 'GOVERNANCE EPE AMOUNT GBP']) ?? 0),
  }
}

function mapTimelineRow(row) {
  const normalized = normalizeRecord(row)
  return {
    id: String(firstValue(normalized, ['Task ID', 'TASK ID', 'id']) ?? ''),
    name: String(firstValue(normalized, ['Task Name', 'TASK NAME', 'name']) ?? ''),
    start: String(firstValue(normalized, ['Start Date', 'START DATE', 'start']) ?? ''),
    end: String(firstValue(normalized, ['End Date', 'END DATE', 'end']) ?? ''),
    progress: Number(firstValue(normalized, ['Progress', 'PROGRESS']) ?? 0),
    type: String(firstValue(normalized, ['Task Type', 'TASK TYPE', 'type']) ?? 'task'),
    project: firstValue(normalized, ['Parent Task ID', 'PARENT TASK ID', 'project']),
    phase: firstValue(normalized, ['Phase', 'PHASE', 'phase']),
    manualContext: firstValue(normalized, ['Context', 'CONTEXT', 'manualContext']),
  }
}

function mapRoleRow(row) {
  const normalized = normalizeRecord(row)
  return {
    roleKey: String(firstValue(normalized, ['Person Role Key', 'PERSON ROLE KEY', 'role_key']) ?? ''),
    roleName: String(firstValue(normalized, ['Person Role Name', 'PERSON ROLE NAME', 'role_name']) ?? ''),
  }
}

function executeQuery(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, _stmt, rows) => {
        if (err) {
          reject(err)
          return
        }
        resolve(rows ?? [])
      },
    })
  })
}

function usesAsyncAuthenticator(authenticator) {
  const value = String(authenticator ?? '').toLowerCase()
  return value === 'externalbrowser' || value.startsWith('https://') || value.includes('okta')
}

function connect(connection) {
  const config = getSnowflakeConfig()

  if (usesAsyncAuthenticator(config.authenticator)) {
    return new Promise((resolve, reject) => {
      connection.connectAsync((err) => {
        if (err) reject(err)
        else resolve(connection)
      })
    })
  }

  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(err)
        return
      }
      resolve(conn)
    })
  })
}

async function withConnection(work) {
  const connection = snowflake.createConnection(getSnowflakeConfig())
  await connect(connection)

  try {
    return await work(connection)
  } finally {
    connection.destroy((err) => {
      if (err) {
        console.warn('Failed to close Snowflake connection cleanly:', err.message)
      }
    })
  }
}

async function loadRoleLabels(connection) {
  const sql = await readSqlFile('roleLookup.sql')
  if (!sql.trim() || sql.includes('TODO')) {
    return {}
  }

  const rows = await executeQuery(connection, sql)
  return rows.reduce((acc, row) => {
    const mapped = mapRoleRow(row)
    if (mapped.roleKey) {
      acc[mapped.roleKey] = mapped.roleName || mapped.roleKey
    }
    return acc
  }, {})
}

export function createSnowflakeRepository() {
  return {
    async getAssetOptions() {
      return withConnection(async (connection) => {
        const sql = await readSqlFile('assets.sql')
        const rows = await executeQuery(connection, sql)
        return buildAssetOptions(rows.map(mapProjectRow))
      })
    },

    async getGovernanceProjectData(projectKey) {
      return withConnection(async (connection) => {
        const [projectSql, actualSql, forecastSql, timelineSql] = await Promise.all([
          readSqlFile('projectSummary.sql'),
          readSqlFile('actuals.sql'),
          readSqlFile('forecast.sql'),
          readSqlFile('timeline.sql'),
        ])

        const params = { projectKey }
        const [projectRows, actualRows, forecastRows, timelineRows, roleLabels] = await Promise.all([
          executeQuery(connection, applySqlParams(projectSql, params)),
          executeQuery(connection, applySqlParams(actualSql, params)),
          executeQuery(connection, applySqlParams(forecastSql, params)),
          executeQuery(connection, applySqlParams(timelineSql, params)),
          loadRoleLabels(connection),
        ])

        const project = projectRows.map(mapProjectRow).find((row) => row.projectKey === String(projectKey))

        if (!project) {
          return null
        }

        return buildGovernanceResponse(
          project,
          actualRows.map(mapActualRow),
          forecastRows.map(mapForecastRow),
          timelineRows.map(mapTimelineRow),
          roleLabels
        )
      })
    },
  }
}

