/**
 * Azure OpenAI – direct REST calls using your API key and endpoint.
 * No workarounds: uses the official Chat Completions API.
 * Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT in .env.
 * Optional: AZURE_OPENAI_API_VERSION (default 2024-08-01-preview for broad compatibility).
 */
function getConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.2'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview'
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env')
  }
  return { endpoint: endpoint.replace(/\/$/, ''), apiKey, deployment, apiVersion }
}

/**
 * Call Azure Chat Completions via direct REST (official contract).
 * This is the primary path – no proxy, no Python backend required.
 */
async function chatCompletionsRest(messages, maxTokens = 2048, temperature = 0.4) {
  const { endpoint, apiKey, deployment, apiVersion } = getConfig()
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Azure OpenAI ${res.status}: ${errBody || res.statusText}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

/**
 * Single entry point for the app: send messages, get assistant text.
 * Tries Chat Completions first (direct REST); if 404, tries Responses API for Global Standard deployments.
 */
export async function chatCompletion(messages) {
  const { deployment } = getConfig()

  try {
    return await chatCompletionsRest(messages)
  } catch (err) {
    const msg = String(err?.message ?? err)
    const is404 = err?.message?.includes('404') || msg.includes('404') || msg.includes('Resource not found')
    if (!is404) throw err

    // Fallback: Responses API (e.g. Global Standard deployments)
    const { endpoint, apiKey, apiVersion } = getConfig()
    const input =
      messages.length === 1 && messages[0].role === 'user'
        ? messages[0].content
        : messages.map((m) => ({ role: m.role || 'user', content: m.content || '' }))
    const url = `${endpoint}/openai/deployments/${deployment}/responses?api-version=${encodeURIComponent(apiVersion)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ input, max_output_tokens: 2048, temperature: 0.4 }),
    })
    if (!res.ok) throw err
    const data = await res.json().catch(() => ({}))
    const text = data.output_text ?? (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text)
    if (text) return String(text).trim()
    throw err
  }
}
