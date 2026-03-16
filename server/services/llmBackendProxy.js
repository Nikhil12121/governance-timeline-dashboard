/**
 * Optional proxy to Akash's Python LLM backend (backend_llm).
 * When LLM_BACKEND_URL is set, consultation and summary requests are forwarded there
 * so the same Azure config that works for Python is used.
 */

const baseUrl = process.env.LLM_BACKEND_URL?.replace(/\/$/, '')

function isConfigured() {
  return !!baseUrl
}

async function post(path, body) {
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM backend ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

/**
 * Call Python POST /api/polish-consultation.
 * @param {object} payload - { board_name, project_name, project_date, owner, for_decision, for_input, for_awareness }
 * @returns {Promise<{ forDecisionIntro, forDecision, forInputIntro, forInput, forAwarenessIntro, forAwareness }>}
 */
export async function proxyPolishConsultation(payload) {
  const r = await post('/api/polish-consultation', payload)
  const pad = (arr) => {
    const a = Array.isArray(arr) ? arr.map((s) => String(s ?? '').trim()) : []
    while (a.length < 5) a.push('')
    return a.slice(0, 10)
  }
  return {
    forDecisionIntro: r.for_decision_intro ?? '',
    forDecision: pad(r.for_decision),
    forInputIntro: r.for_input_intro ?? '',
    forInput: pad(r.for_input),
    forAwarenessIntro: r.for_awareness_intro ?? '',
    forAwareness: pad(r.for_awareness),
  }
}

/**
 * Call Python POST /api/generate-summary.
 * @param {object} payload - { project_name, project_id, timeline_title, timeline_tasks, financial_year_headers, financial_rows }
 * @returns {Promise<string>}
 */
export async function proxyGenerateSummary(payload) {
  const r = await post('/api/generate-summary', payload)
  return r?.body ?? ''
}

export { isConfigured }
