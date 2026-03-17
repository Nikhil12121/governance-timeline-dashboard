import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createGovernanceRepository } from './repositories/index.js'
import { generateConsultationRationale, generateSummary } from './services/analyzeService.js'

const app = express()
const port = Number(process.env.PORT || 8787)
const mode = process.env.GOVERNANCE_DATA_MODE || 'mock'
const repository = createGovernanceRepository(mode)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  const hasEndpoint = !!process.env.AZURE_OPENAI_ENDPOINT
  const hasKey = !!process.env.AZURE_OPENAI_API_KEY
  res.json({
    ok: true,
    mode: process.env.GOVERNANCE_DATA_MODE || 'mock',
    genAiConfigured: hasEndpoint && hasKey,
    genAiHint: !hasEndpoint && !hasKey ? 'Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env' : !hasKey ? 'Set AZURE_OPENAI_API_KEY in .env' : !hasEndpoint ? 'Set AZURE_OPENAI_ENDPOINT in .env' : null,
  })
})

app.get('/api/assets', async (_req, res) => {
  try {
    res.json(await repository.getAssetOptions())
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'Failed to load asset options.')
  }
})

app.get('/api/projects/:projectKey/governance', async (req, res) => {
  try {
    const data = await repository.getGovernanceProjectData(req.params.projectKey)

    if (!data) {
      res.status(404).send(`Project ${req.params.projectKey} was not found in the configured data source.`)
      return
    }

    res.json(data)
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'Failed to load governance project data.')
  }
})

app.post('/api/analyze/consultation', async (req, res) => {
  try {
    const { projectKey, userParagraph } = req.body || {}
    const hasParagraph = typeof userParagraph === 'string' && userParagraph.trim().length > 0
    if (!hasParagraph && (!projectKey || typeof projectKey !== 'string')) {
      res.status(400).json({ error: 'Provide a written paragraph and/or projectKey.' })
      return
    }
    const key = projectKey && typeof projectKey === 'string' ? projectKey : ''
    const result = await generateConsultationRationale(key, (k) => (k ? repository.getGovernanceProjectData(k) : Promise.reject(new Error('No project'))), hasParagraph ? userParagraph.trim() : undefined)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Consultation analysis failed.' })
  }
})

app.post('/api/analyze/summary', async (req, res) => {
  try {
    const { projectKey, visibleTimelineSummary, summaryType, customInstruction } = req.body || {}
    if (!projectKey || typeof projectKey !== 'string') {
      res.status(400).json({ error: 'projectKey is required' })
      return
    }
    const body = await generateSummary(
      projectKey,
      (key) => repository.getGovernanceProjectData(key),
      typeof visibleTimelineSummary === 'string' ? visibleTimelineSummary : '',
      typeof summaryType === 'string' ? summaryType.trim() : '',
      typeof customInstruction === 'string' ? customInstruction.trim() : ''
    )
    res.json({ body })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Summary analysis failed.' })
  }
})

app.listen(port, () => {
  console.log(`Governance API running on http://localhost:${port} (${mode} mode)`)
  const llmBackend = (process.env.LLM_BACKEND_URL || '').replace(/\/$/, '')
  if (llmBackend) {
    console.log(`Summary: will try Python LLM backend first at ${llmBackend}`)
  }
  const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY)
  console.log(`Azure OpenAI: ${hasAzure ? 'configured (' + (process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.2') + ')' : 'not configured (set .env)'}`)
})
