# backend_llm – Akash's Python LLM API

This package provides the FastAPI endpoints for **polish-consultation** and **generate-summary** (Azure OpenAI). It is optional: the main app uses the **Node.js** backend (`server/`) for LLM; this Python API is for teams who want to run Akash's FastAPI service instead or in addition.

**If Node's Azure calls fail (e.g. 404), run this Python backend and set `LLM_BACKEND_URL=http://localhost:8000` in `.env`.** The Node server will then proxy consultation and summary requests here, using the same Azure credentials that work with Python.

## Run from project root

Always run uvicorn from the **project root** (the folder that contains `backend_llm`), not from inside `backend_llm`:

```bash
# Windows (Command Prompt or PowerShell)
cd C:\path\to\governance-timeline-dashboard
python -m uvicorn backend_llm.app:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Mac/Linux
cd /path/to/governance-timeline-dashboard
python -m uvicorn backend_llm.app:app --reload --host 0.0.0.0 --port 8000
```

## .env at project root

Put your `.env` file in the **project root** (same folder as `package.json` and `backend_llm/`), with:

- `AZURE_OPENAI_ENDPOINT` – e.g. `https://your-resource.openai.azure.com`
- `AZURE_OPENAI_API_KEY` – your key
- `AZURE_OPENAI_DEPLOYMENT` – deployment name (e.g. `gpt-5.2`)
- Optional: `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_TIMEOUT`

## Endpoints

- `GET /health` – health check
- `POST /api/polish-consultation` – polish consultation bullets (request/response: see `app.py`)
- `POST /api/generate-summary` – generate governance summary

## Dependencies

Install Python deps (from project root):

```bash
pip install fastapi uvicorn openai python-dotenv pydantic
```

Or use the repo’s `requirements.txt` if it lists these.
