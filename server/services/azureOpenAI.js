/**
 * Azure OpenAI chat completion for GenAI analysis.
 * Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT in .env.
 */
async function getClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-2'
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env')
  }
  const { default: OpenAI } = await import('openai')
  const baseURL = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}`
  return new OpenAI({ apiKey, baseURL })
}

export async function chatCompletion(messages) {
  const client = await getClient()
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-2'
  const response = await client.chat.completions.create({
    model: deployment,
    messages,
    max_tokens: 2048,
    temperature: 0.4,
  })
  return response.choices?.[0]?.message?.content?.trim() ?? ''
}
