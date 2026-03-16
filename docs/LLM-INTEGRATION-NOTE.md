# LLM integration – branch note

**Branch:** `Frontend-llm-integration-final`  
**Created from:** `snowflake-integration` (latest)

## Comparison with `akash-code`

- **`akash-code`** is frontend-only (no `server/`). It has:
  - “Generate from data” on Timeline & analysis: uses **rule-based** helpers only (`generateTimelineSummary`, `generateKeyMessages` from `src/utils/summary.ts`). No API calls, no LLM.
  - No “Your inputs” consultation AI; no backend.

- **This branch (and `snowflake-integration`)** already has **full LLM**:
  - **Backend:** `server/services/azureOpenAI.js`, `analyzeService.js`, routes `/api/analyze/consultation` and `/api/analyze/summary`.
  - **Your inputs:** “Generate analysis” calls `fetchConsultationAnalysis()` → Azure OpenAI → fills For Decision / For Input / For Awareness.
  - **Timeline & analysis:** “Generate from data” calls `fetchSummaryAnalysis()` → Azure OpenAI (with optional `visibleTimelineSummary`). Falls back to `generateTimelineSummary(filteredTasks)` if Azure is not configured.

So the **LLM behaviour** you wanted from Akash is already implemented here and is **more complete** (real Azure OpenAI on both pages). No merge from `akash-code` was needed for LLM; that branch only has rule-based generation.

## What this branch is for

- Use this branch as the **single place** for “frontend + LLM integration final” work.
- All current LLM features (consultation + summary) are in this branch.
- To add more LLM (e.g. extra prompts or pages), do it here and keep `snowflake-integration` in sync or merge back as needed.
