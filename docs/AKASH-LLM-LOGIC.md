# Akash's LLM implementation – logic summary

This document summarizes the LLM logic from the `akash-code` branch so we can integrate it with our Node backend **without changing our existing UI**.

---

## 1. Backend stack (Akash)

- **Python FastAPI** app (`app.py`) with two endpoints:
  - `POST /api/polish-consultation` – polish rough PM notes into board-ready wording; returns **intro lines** per section.
  - `POST /api/generate-summary` – generate executive summary from project + timeline + financials.
- **Azure OpenAI** via `openai` Python SDK (`llm_service.py`, `llm_summary.py`).
- Uses `client.responses.create()` (Responses API) with `input=prompt` (single prompt string), not chat messages.

---

## 2. Consultation (“Why does the Team consult the Board?”)

**Input (polish-consultation):**
- `board_name`, `project_name`, `project_date`, `owner`
- `for_decision`, `for_input`, `for_awareness` – lists of strings (rough PM notes)

**Output:**
- `for_decision_intro` – e.g. `"Does the Board endorse:"`
- `for_decision` – polished bullet list
- `for_input_intro` – e.g. `"Team seeks input on:"`
- `for_input` – polished bullet list
- `for_awareness_intro` – e.g. `"Team is sharing for awareness:"`
- `for_awareness` – polished bullet list

**Logic (`llm_service.py`):**
- Normalize payload (trim, strip bullet prefixes, dedupe).
- Build prompt from `prompt_templates.build_polish_prompt` (pharma governance specialist; rewrite rough notes; formal, crisp, no hallucinations; example JSON in/out).
- Call Azure OpenAI; parse JSON from response; apply default intros for empty sections.

**Prompt style (`prompt_templates.NOTEBOOK_PROMPT_TEMPLATE`):**
- Role: pharma governance communications specialist.
- Task: rewrite rough notes into polished governance-slide wording.
- Tone: formal, crisp, leadership-ready, decision-oriented.
- Rules: improve wording/grammar/framing; preserve intent; no invented facts; slide-ready; return JSON only (no markdown).
- Style: “For Decision” → board-facing approval/endorsement; “For Input” → “Team seeks input on…” / “Any additional considerations…”; “For Awareness” → “Team is sharing for awareness:”.
- Output shape: `for_decision_intro`, `for_decision`, `for_input_intro`, `for_input`, `for_awareness_intro`, `for_awareness`.

---

## 3. Summary (“Generated analysis”)

**Input (generate-summary):**
- `project_name`, `project_id`, `timeline_title`
- `timeline_tasks` – list of `{ name, start, end, type, phase, manualContext, isCritical }`
- `financial_year_headers`, `financial_rows` (label + values)

**Output:**
- `body` – plain text summary (3–5 bullet points, one per line).

**Logic (`llm_summary.py`):**
- Normalize tasks and financial rows; build prompt from `prompt_templates.build_summary_prompt`.
- Call Azure OpenAI; return `response_text.strip()`.

**Prompt style (`prompt_templates.SUMMARY_PROMPT_TEMPLATE`):**
- Role: pharma governance communications specialist.
- Task: polished executive summary for “Generated analysis” section.
- Use only provided data; formal pharma governance language (VIDRU Board/DRB/PIB).
- Focus: timeline, key milestones, EPE/IPE context, timing, phase progression, critical activities, dependencies, financial takeaways.
- Output: plain text only; 3–5 short bullet points, one per line; no headings/markdown/JSON; concise and slide-ready.

---

## 4. Integration with our version

- **We keep:** Single Node/Express backend, existing UI, existing API shapes for frontend (`/api/analyze/consultation` → `forDecision`/`forInput`/`forAwareness`; `/api/analyze/summary` → `{ body }`).
- **We do not add:** Separate Python server, or intro fields on the consultation slide (to avoid UI changes).
- **We integrate:** Akash’s **prompt style and instructions** into our Node `analyzeService.js`:
  - **Consultation:** Same role and rules (pharma governance specialist, rewrite/generation style, formal, no hallucinations). We already return three arrays; we don’t add intros in the response, but the model is guided to produce content that fits “For Decision” / “For Input” / “For Awareness” in the same way.
  - **Summary:** Same role and output format (3–5 bullet points, one per line, plain text, use only provided data). We already pass project context and `visibleTimelineSummary`; we can also pass financials in the prompt when available so behaviour matches Akash’s input.

Result: **Akash’s logic and style run inside our backend; existing frontend and UI stay unchanged.**
