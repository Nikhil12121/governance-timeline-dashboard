# Milestone Timeline – data mapping (query → UI)

## Query output (milestoneTimeline.sql)

The query returns two kinds of rows via `UNION ALL`:

### 1. Project milestone rows (cte_project_milestone)

| Column / concept | Source | Example | Frontend mapping |
|------------------|--------|---------|------------------|
| **Parent** | `COALESCE(Parent, Asset/Program) \|\| ' - ' \|\| Plan Category` | `GSK4425689 - Current` | `parent`; strip suffix to get **asset** |
| **Task Code** | `project_code - project_short_description \|\| ' - ' \|\| Plan Category` | `52535-GSK'689A CSP mAb - Current` | `itemTaskCode` |
| **Type** | `'Project'` | Project | Drives **Item Type** |
| **Item Type** | `Type \|\| ' - ' \|\| Plan Category` | `Project - Current`, `Project - Approved Governance Baseline` | `itemType` → swim lane (Approved vs Current) |
| **Plan Category** | `pl.plan_category` | `Current`, `Approved Governance Baseline` | `planCategory` |
| **Task Short Description** | Milestone abbreviation | C2C, 1stINDsub, C2PH2A | `taskShortDescription` |
| **Milestone Category** | Derived | C2 Milestones, Phase 1,2,3 Start, etc. | `milestoneCategory` |
| **Reported Date**, Min/Max | Task dates | | `reportedDate`, `minTaskReportedDate`, `maxTaskReportedDate` |
| **Project Key** | `pr.project_key` | | `projectKey` (links to asset for study rows) |

### 2. Study milestone rows (cte_study_milestone)

| Column / concept | Source | Example | Frontend mapping |
|------------------|--------|---------|------------------|
| **Parent** | `project_code - project_short_description \|\| ' - ' \|\| Plan Category` | `52535-GSK'689A CSP mAb - Current` | `parent` (project, not asset) |
| **Task Code** | `clinical_study_code - clinical_study_description \|\| ' - ' \|\| Plan Category` | `309027-...`, `223290-A First-in-Human Do... - Current` | `itemTaskCode` (study id) |
| **Type** | `'Study'` | Study | Drives **Item Type** |
| **Item Type** | `Type \|\| ' - ' \|\| Plan Category` | `Study - Current` (or NULL if Plan Category NULL) | `itemType` → plot **below** Current plan |
| **Plan Category** | `Current` or NULL (when Approved Governance) | `Current` | `planCategory` |
| **Task Short Description** | Study milestone type | CPA, FPA, DBL, LSLV, SAC | `taskShortDescription` |
| **Milestone Category** | `'Study Milestones'` | Study Milestones | `milestoneCategory` |
| **Project Key** | Same as project | | `projectKey` → used to look up **asset** from project rows |

## Swim lane order (UI)

1. **Approved governance** – project rows with Item Type `Project - Approved Governance Baseline`.
2. **Current plan** – project rows with Item Type `Project - Current`.
3. **Study milestones** – study rows (Item Type `Study - Current` or `Study - ...`), plotted **below** the Current plan swim lane for the same asset.

## Grouping by asset

- **Project rows**: asset = `Parent` with suffix ` - Current` / ` - Approved Governance Baseline` stripped.
- **Study rows**: asset = look up from **project_key** using project rows (same `project_key` → same asset).
- All bars (Approved, Current, Study) for the same asset are grouped under one expandable **Parent** (asset), with bars ordered: Approved → Current → Study.

## Repository (mapMilestoneTimelineRow)

- Map **Item Type** from `['Item Type', 'ITEM TYPE']`. If missing and **Type** = `'Study'`, set `itemType = 'Study - ' + (planCategory || 'Current')` so study rows are always identifiable.
- Map **Type** from `['Type', 'TYPE']` if needed for fallback; frontend can derive Study from `itemType.toLowerCase().startsWith('study')`.
