# Governance Timeline Dashboard

A React dashboard for Project Managers to create **governance-quality timelines**, customise views with filters, and export to **PowerPoint (.pptx)** with an optional **summary** slide.

## Features

Single **Governance PPT** flow (one page, no separate tabs):

1. **Your inputs** – PM enters presentation title and subtitle.
2. **Timeline & analysis** – Customise the Gantt (filters, view; double-click tasks to add manual context). **Generate from data** fills summary and key messages; PM can edit both.
3. **Preview** – See all slides in the UI in GSK format (same look as the final PPT: footer with page + date, GSK logo, orange accent).
4. **Download** – When everything looks good, download the deck as a .pptx file in GSK format.

Output matches the governance PDF format: title slide, timeline (table), key messages/content slide, summary slide; all with consistent GSK styling.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use **Timeline** to adjust the view, then **Export & Summary** to generate a summary and download as PPT.

## Backend-ready data flow

The app now supports a local API for asset lookup and project data hydration.

1. Start the API:

```bash
npm run server
```

2. In a second terminal, start the frontend:

```bash
npm run dev
```

3. Open the app, go to **Your inputs**, select an asset, and click **Load selected asset**.

The current backend runs in `mock` mode and returns Snowflake-shaped project, actual, and forecast data from `server/mock/`. Replace that repository with Snowflake queries when credentials are available.

## Snowflake mode

The backend now supports two modes:

- `GOVERNANCE_DATA_MODE=mock`
- `GOVERNANCE_DATA_MODE=snowflake`

To wire Snowflake:

1. Copy `.env.example` to `.env`
2. Fill in your Snowflake connection values
3. Paste your SQL into:
   - `server/sql/assets.sql`
   - `server/sql/projectSummary.sql`
   - `server/sql/actuals.sql`
   - `server/sql/forecast.sql`
   - `server/sql/timeline.sql`
   - optionally `server/sql/roleLookup.sql`

Use `{{projectKey}}` in SQL files where the selected project key should be injected.

Example:

```sql
SELECT *
FROM my_table
WHERE "Project Key" = {{projectKey}}
```

## Tech stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS**
- **gantt-task-react** – Gantt chart
- **pptxgenjs** – PPTX export
- **React Router** – Navigation

## Project structure

- `src/pages/` – Timeline page, Export page
- `src/components/` – Layout, Gantt chart, filters, export panel
- `src/context/` – Timeline state (tasks, filters)
- `src/data/` – Mock timeline data
- `src/utils/` – Summary generation, PPT export
- `PLAN.md` – Requirements analysis and implementation roadmap (including Phase 2/3 ideas)

## Data source (Phase 2)

Recommended production architecture:

- `React frontend` -> `Node/Express API` -> `Snowflake`
- Frontend never stores Snowflake credentials
- Backend runs the SQL and maps rows into the JSON contract used by the UI

The current local API exposes:

- `GET /api/health`
- `GET /api/assets`
- `GET /api/projects/:projectKey/governance`

## Roadmap

- **Phase 1 (current)** – Gantt view, filters, summary, PPT export with Governance template (footer, logo area, orange accent)
- **Phase 2** – Snowflake integration, Excel export, manual context in UI (done)
- **Phase 3** – More chart types, optional backend

See **PLAN.md** for full roadmap and template details.
