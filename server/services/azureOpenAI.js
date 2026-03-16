/**
 * Azure OpenAI – works with both Chat Completions and Responses API (Global Standard).
 * Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT in .env.
 */
function getConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.2'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-04-01-preview'
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env')
  }
  return { endpoint: endpoint.replace(/\/$/, ''), apiKey, deployment, apiVersion }
}

function log(msg) {
  console.error('[Azure OpenAI]', msg)
}

/** Convert messages to a single string for Responses API (input can be string). */
function messagesToInput(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  if (messages.length === 1 && messages[0].role === 'user') return messages[0].content || ''
  return messages.map((m) => `${m.role || 'user'}: ${m.content || ''}`).join('\n\n')
}

/** Try Responses API: POST to .../openai/deployments/{deployment}/responses */
async function tryResponsesDeploymentInPath(input, deployment, endpoint, apiKey, apiVersion) {
  const url = `${endpoint}/openai/deployments/${deployment}/responses?api-version=${encodeURIComponent(apiVersion)}`
  log(`Trying Responses (deployment in path): ${url.replace(apiKey.slice(0, 8), '***')}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ input, max_output_tokens: 2048, temperature: 0.4 }),
  })
  const text = await res.text()
  if (!res.ok) {
    log(`Responses (deployment in path) ${res.status}: ${text.slice(0, 300)}`)
    return null
  }
  try {
    const data = JSON.parse(text || '{}')
    const out = data.output_text ?? (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text)
    return out ? String(out).trim() : null
  } catch {
    return null
  }
}

/** Try Responses API: POST to .../openai/responses or .../openai/v1/responses with model in body */
async function tryResponsesWithModelInBody(input, deployment, endpoint, apiKey, apiVersion, path = '/openai/responses') {
  const url = `${endpoint}${path}?api-version=${encodeURIComponent(apiVersion)}`
  log(`Trying Responses (${path}): ${url.replace(apiKey.slice(0, 8), '***')}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ model: deployment, input, max_output_tokens: 2048, temperature: 0.4 }),
  })
  const body = await res.text()
  if (!res.ok) {
    log(`Responses ${path} ${res.status}: ${body.slice(0, 300)}`)
    return null
  }
  try {
    const data = JSON.parse(body || '{}')
    const out = data.output_text ?? (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text)
    return out ? String(out).trim() : null
  } catch {
    return null
  }
}

/** Try Chat Completions: POST .../openai/deployments/{deployment}/chat/completions */
async function tryChatCompletions(messages, endpoint, apiKey, deployment, apiVersion) {
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  log(`Trying Chat Completions: ${url.replace(apiKey.slice(0, 8), '***')}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ messages, max_tokens: 2048, temperature: 0.4 }),
  })
  const body = await res.text()
  if (!res.ok) {
    log(`Chat Completions ${res.status}: ${body.slice(0, 300)}`)
    return null
  }
  try {
    const data = JSON.parse(body || '{}')
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' ? content.trim() : null
  } catch {
    return null
  }
}

/** API versions to try (Responses first for Global Standard, then Chat). */
const RESPONSES_VERSIONS = ['2025-04-01-preview', '2025-03-01-preview']
const CHAT_VERSIONS = ['2024-08-01-preview', '2024-02-15-preview', '2024-10-21']

export async function chatCompletion(messages) {
  const { endpoint, apiKey, deployment, apiVersion: envVersion } = getConfig()
  const input = messagesToInput(messages)

  // 1) Responses API (Portal often shows /openai/responses – try first)
  for (const ver of [envVersion, ...RESPONSES_VERSIONS].filter((v, i, a) => a.indexOf(v) === i)) {
    let out = await tryResponsesDeploymentInPath(input, deployment, endpoint, apiKey, ver)
    if (out) return out
    out = await tryResponsesWithModelInBody(input, deployment, endpoint, apiKey, ver, '/openai/responses')
    if (out) return out
    out = await tryResponsesWithModelInBody(input, deployment, endpoint, apiKey, ver, '/openai/v1/responses')
    if (out) return out
  }

  // 2) Chat Completions
  for (const ver of [envVersion, ...CHAT_VERSIONS].filter((v, i, a) => a.indexOf(v) === i)) {
    const out = await tryChatCompletions(messages, endpoint, apiKey, deployment, ver)
    if (out) return out
  }

  log(`All attempts failed. Endpoint: ${endpoint}, Deployment: ${deployment}. Check .env and Azure Portal.`)
  throw new Error(
    'Azure OpenAI failed. Check the server terminal for [Azure OpenAI] lines. Ensure AZURE_OPENAI_DEPLOYMENT matches the deployment name in Azure (e.g. gpt-5.2) and the deployment supports Chat or Responses API.'
  )
}
