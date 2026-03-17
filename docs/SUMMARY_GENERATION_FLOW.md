# How summary generation works

## End-to-end flow

1. **Frontend (GovernancePPTPage)**  
   User clicks “Generate from data” → `handleGenerateAnalysis()` builds `visibleSummary` from timeline data and calls `fetchSummaryAnalysis(projectKey, visibleSummary, summaryType, customInstruction)`.

2. **API (governanceApi.ts)**  
   `POST /api/analyze/summary` to the Node server (e.g. `http://localhost:8787/api/analyze/summary`) with body:  
   `{ projectKey, visibleTimelineSummary?, summaryType?, customInstruction? }`.

3. **Node server (server/index.js)**  
   Route `POST /api/analyze/summary` reads body, then calls  
   `generateSummary(projectKey, getGovernanceData, visibleTimelineSummary, summaryType, customInstruction)`.

4. **analyzeService.js**  
   - Loads governance data for `projectKey` (project, timeline tasks, financials).  
   - Builds structured payload (project_name, project_id, timeline_tasks, financials).  
   - **If `LLM_BACKEND_URL` is set (e.g. `http://localhost:8000`):** tries the Python backend first: `POST {LLM_BACKEND_URL}/api/generate-summary` with that payload. If it returns 200 and a non-empty `body`, that text is returned. If the request fails, the code falls back to Node Azure below.  
   - Builds context and user prompt with summary type + custom instruction.  
   - Calls **`chatCompletion()`** in `azureOpenAI.js` (Node → Azure OpenAI).

5. **azureOpenAI.js**  
   - Reads `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION` from env.  
   - Tries **Chat Completions** first (most common):  
     `POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version=...`  
     with body `{ messages, max_tokens, temperature }`.  
   - Tries several api-versions (e.g. `2024-02-15-preview`, `2023-05-15`).  
   - If all Chat attempts return 404, tries **Responses API** paths (newer; not all resources have them).  
   - Returns the first successful response text; otherwise throws.

6. **Back to analyzeService**  
   The returned text is sent to the frontend as `{ body }`. If `chatCompletion` throws, the error message is turned into “Summary could not be generated. Azure OpenAI error: …”.

## HTTP 404 “Resource not found”

- 404 means the **URL path or deployment name** does not exist for your Azure OpenAI resource.
- The code now:
  - Tries **Chat Completions first** (path `/openai/deployments/{deployment}/chat/completions`).
  - On 404, **does not throw** from `fetchWithRetry`; it returns the response so the next API shape/version can be tried.
- You must set in `.env`:
  - **AZURE_OPENAI_ENDPOINT**  
    Full base URL, e.g. `https://YOUR_RESOURCE.openai.azure.com` (no trailing path).
  - **AZURE_OPENAI_API_KEY**  
    Key from Azure Portal for that resource.
  - **AZURE_OPENAI_DEPLOYMENT**  
    **Exact deployment name** from Azure Portal (e.g. `gpt-4o`, `gpt-4`, `o4-mini`).  
    If this does not match the deployment name in the portal, you get 404.
- Optional: **AZURE_OPENAI_API_VERSION**  
  e.g. `2024-02-15-preview`. If omitted, the code tries several versions.

After changing `.env`, restart the Node server (`npm run server`). Check the server terminal for `[Azure OpenAI]` lines to see which URL and version were tried and what status was returned.

## Using the Python LLM backend (if Node Azure returns 404)

If the Node server always gets 404 from Azure, use the Python backend instead (it uses the official Azure OpenAI SDK and may work with your resource):

1. In `.env` add: **`LLM_BACKEND_URL=http://localhost:8000`**
2. Start the Python backend:  
   `python -m uvicorn backend_llm.app:app --reload --host 0.0.0.0 --port 8000`
3. Use the same `.env` for Azure (AZURE_OPENAI_*) so the Python app can connect.
4. Restart the Node server (`npm run server`). On startup you should see: `Summary: will try Python LLM backend first at http://localhost:8000`
5. Click “Generate from data” in the app. The Node server will call the Python backend first; if it responds with a summary, that is shown. If the Python backend is unreachable, Node falls back to Azure (and may still 404).
