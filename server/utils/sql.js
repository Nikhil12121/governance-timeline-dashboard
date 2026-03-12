import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sqlDir = path.resolve(__dirname, '..', 'sql')

export async function readSqlFile(name) {
  return fs.readFile(path.join(sqlDir, name), 'utf8')
}

export function applySqlParams(sql, params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    const safeValue =
      value == null
        ? 'NULL'
        : typeof value === 'number'
          ? String(value)
          : `'${String(value).replace(/'/g, "''")}'`

    return result.replaceAll(`{{${key}}}`, safeValue)
  }, sql)
}

