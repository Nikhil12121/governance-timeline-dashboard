# Sample LLM demo (branch: sample-llm-demo)

This branch adds **sample project data** so you can run the app with **mock data** and test the LLM (Generate analysis / Generate from data) without Snowflake.

## What’s in the sample

- **Mock mode** uses `server/mock/governanceMockData.js` with three projects:
  - **1001** – Bepirovirsen (CHB cure programme)
  - **1002** – Orion-17 (Respiratory)
  - **demo-llm** – Vidru Governance Demo (dedicated sample for LLM testing)

Each project has **project metadata**, **timeline tasks**, and **cost/FTE (financials)** so the LLM gets the same kind of context as in production.

## How to run the sample with LLM

1. **Use this branch**
   ```bash
   git checkout sample-llm-demo
   ```

2. **Configure Azure OpenAI** in `.env` at project root:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-key
   AZURE_OPENAI_DEPLOYMENT=gpt-5.2
   ```

3. **Start the API in mock mode** (no Snowflake):
   ```bash
   npm run demo:server
   ```
   Or:
   ```bash
   GOVERNANCE_DATA_MODE=mock npm run server
   ```
   You should see: `Governance API running on http://localhost:8787 (mock mode)` and `Azure OpenAI: configured (gpt-5.2)`.

4. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```

5. **In the app**
   - Open the URL shown by Vite (e.g. http://localhost:5173).
   - Go to **Governance PPT** (or the flow that loads a project).
   - Select a project: **Vidru Governance Demo (DEMO-LLM-001)** or **Bepirovirsen (61368)** or **Orion-17 (53467)**.
   - Click **Generate analysis** for Decision / Input / Awareness.
   - Click **Generate from data** for the 3-paragraph summary.

The LLM uses the **selected project’s** metadata, timeline, and cost/FTE data for both consultation and summary.

## If the LLM doesn’t respond

- Check the **terminal where the server is running**. You’ll see `[Azure OpenAI]` lines showing which endpoint was tried and any error (e.g. 404, 401).
- Ensure `.env` has the correct endpoint, key, and deployment name (as in Azure Portal).
- Restart the server after changing `.env`.
