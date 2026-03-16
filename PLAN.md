# Governance Timeline Dashboard – Analysis & Implementation Plan

## 1. Requirements summary (from Governance PPT)

**Goal:** PMs need a simple, standardized, automated way to produce **governance-quality timelines** without losing flexibility.

| Source | Requirement |
|--------|-------------|
| **Core** | Gantt output, with ability to add manual context |
| **Core** | Critical path view (e.g. to show IP session value) |
| **Core** | Easy milestone selection from column views for fast Excel extraction |
| **Core** | Short- and long-term timeline options for different governance audiences |
| **User** | Standardized, (automated) system that reduces manual effort |
| **User** | Fewer tools; shared tips & tricks for consistency |
| **Your ask** | User-defined/customized timeline charts |
| **Your ask** | Download content (custom selection) → **PPT format** |
| **Your ask** | Generate **summary** when required |

---

## 2. What we’re building (Phase 1 – MVP)

- **React dashboard** where PMs can:
  1. **Build and customize timeline/Gantt visuals** (tasks, milestones, dates, manual context).
  2. **Choose what to show** (filters: date range, phases, milestones, critical path).
  3. **Export** selected view to **PPTX** (slides with chart + optional summary).
  4. **Generate a short summary** (text) of the visible timeline when requested.

Later phases can add: critical path view, Excel export, more chart types.

---

## 3. Suggested tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| **App** | React 18 + TypeScript | Type safety, ecosystem, team familiarity |
| **Build** | Vite | Fast dev and build |
| **Charts** | Gantt/timeline library (e.g. `gantt-task-react` or `frappe-gantt`) | Fits “Gantt + manual context” and “short/long-term” views |
| **Export PPT** | `pptxgenjs` | Client-side PPTX generation from JS |
| **Export Excel** | `xlsx` (later) | Milestone/column export |
| **State** | React state + context (or Zustand later) | Enough for filters and selected data |
| **Styling** | Tailwind CSS | Quick, consistent UI |

---

## 4. Implementation roadmap

### Phase 1 – MVP (this project)

1. **Project setup**
   - Vite + React + TypeScript.
   - Tailwind, routing (e.g. React Router), basic layout (sidebar + main area).

2. **Data model**
   - **Tasks**: id, name, start, end, progress, type (task/milestone), phase, isCritical (for later critical path).
   - **Manual context**: optional notes/labels per task or milestone.
   - Sample/mock dataset for demos.

3. **Timeline / Gantt view**
   - Single Gantt chart with:
     - Tasks and milestones.
     - Optional manual context (e.g. tooltip or inline label).
   - **Customization:**
     - Date range (short-term vs long-term).
     - Toggle milestones only / tasks only / both.
     - (Later: “critical path only” toggle.)

4. **Filters & selection**
   - Filters: date range, phase, milestone vs task.
   - “Selected data” = what’s currently visible (and optionally checked) for export.

5. **Export to PPT**
   - Use `pptxgenjs`:
     - One slide: title + Gantt chart (e.g. as image from canvas/svg or as table).
     - Optional second slide: “Summary” text (from generated summary).
   - User gets a `.pptx` file download.

6. **Summary generation**
   - On “Generate summary”:
     - Input: current filtered/visible tasks and milestones.
     - Output: 2–4 sentence text (e.g. “Timeline from X to Y, N milestones, key phases: …”).
   - Rule-based at first (no backend); can plug in LLM later.
   - Summary shown in UI and included in PPT when exporting.

7. **UI flow**
   - **Home / Timeline:** Gantt + filters + “Add manual context” where needed.
   - **Export:** “Download as PPT” (and optionally “Include summary”).
   - **Summary:** “Generate summary” button → show in panel/modal and optionally add to PPT.

### Phase 2 (later)

- **Critical path view**: compute and show critical path; optional view “Critical path only”.
- **Excel export**: table of milestones (and selected tasks) for “column view → Excel”.
- **More visuals**: e.g. milestone-only timeline, phase bars (aligned with PPT).
- **Backend (optional)**: save projects, templates, user prefs.

### Phase 3 (later)

- Multiple chart types from the same data.
- Templates aligned with Governance PPT slide layouts.
- Auth and multi-user if needed.

---

## 5. Confirmed choices

| Topic | Decision |
|-------|----------|
| **Data source** | **Snowflake** data warehouse. Timeline data will be loaded via API/backend that queries Snowflake (Phase 2). MVP uses mock data. |
| **PPT template** | Use the provided Governance slide template: title styling, footer with page number + date (bottom left), logo area (bottom right), orange accent, clean white background. |
| **Critical path** | Ignored for now. |
| **Manual context** | Yes – per-task/milestone notes (add/edit via double-click). |

---

## 6. Project structure (target)

```
governance-timeline-dashboard/
├── PLAN.md                    # This file
├── README.md
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── timeline.ts        # Task, Milestone, etc.
│   ├── data/
│   │   └── mockTimeline.ts    # Sample data
│   ├── components/
│   │   ├── layout/
│   │   ├── timeline/          # Gantt chart wrapper, filters
│   │   ├── export/            # PPT export, summary
│   │   └── ui/
│   ├── hooks/
│   │   └── useTimelineData.ts
│   └── utils/
│       ├── summary.ts         # Summary text from data
│       └── pptExport.ts       # pptxgenjs usage
└── public/
```

---

## 7. Success criteria (MVP)

- [ ] PM can open the app and see a Gantt/timeline with sample data.
- [ ] PM can change date range and filters and see the chart update.
- [ ] PM can add/edit manual context (e.g. notes) on tasks/milestones.
- [ ] PM can click “Generate summary” and see a short text summary.
- [ ] PM can click “Download as PPT” and get a .pptx with chart (+ optional summary slide).
- [ ] UI is clear and fits “governance-quality” (readable, professional).

Once this works, we can add critical path, Excel export, and more chart types in the next phases.
