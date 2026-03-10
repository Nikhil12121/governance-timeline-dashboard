/**
 * Types for multi-slide presentation (GSK-style deck).
 * PM fills each slide; export produces full PPT in GSK format.
 * Aligns with VIDRU Governance Slide library (title, consultation objectives, asset plan Gantt, financials, scenarios, resource demand).
 */

export type SlideType =
  | 'title'
  | 'timeline'
  | 'content'
  | 'summary'
  | 'consultation-objectives'
  | 'financials-gantt'
  | 'scenarios'
  | 'resource-demand'

/** GSK cover slide: VIDRU Board/ DRB/ PIB with asset name, consultation type, date, project ID */
export interface TitleSlide {
  type: 'title'
  id: string
  title: string
  subtitle?: string
  /** Governance: main heading e.g. "VIDRU Board/ DRB/ PIB*" */
  boardHeading?: string
  /** [ASSET- NAME] */
  assetName?: string
  /** [Type of consultation] */
  consultationType?: string
  /** [DD/MM/YYYY] */
  consultationDate?: string
  /** [Project ID Code] */
  projectId?: string
}

export interface TimelineSlide {
  type: 'timeline'
  id: string
  title: string
  /** Optional subtitle e.g. "Asset Plan showing Primary indication and Life Cycle Innovation" */
  subtitle?: string
}

export interface ContentSlide {
  type: 'content'
  id: string
  title: string
  bullets: string[]
}

export interface SummarySlide {
  type: 'summary'
  id: string
  title: string
  body: string
}

/** Why does the Team consult VIDRU Board/ DRB/ PIB – For Decision / For Input / For Awareness */
export interface ConsultationObjectivesSlide {
  type: 'consultation-objectives'
  id: string
  title: string
  forDecision: string[]
  forInput: string[]
  forAwareness: string[]
}

/** Row in financials table (e.g. Gross EPE (£m), IPE (£m), PTRS %) */
export interface FinancialsRow {
  label: string
  values: (string | number)[]
}

/** High level project plan to launch with financials – Gantt + table */
export interface FinancialsGanttSlide {
  type: 'financials-gantt'
  id: string
  title: string
  subtitle?: string
  /** Column headers: Year labels + "Total (£m)" */
  financialsYears: string[]
  financialsRows: FinancialsRow[]
}

/** Scenario row: e.g. "Cumulative EPE /IPE (£m)", "PTRS %" */
export interface ScenarioRow {
  label: string
  values: (string | number)[]
}

export interface ScenarioOption {
  name: string
  launchYear?: string
  rows: ScenarioRow[]
}

/** High level plan showing scenarios – 3 options with table rows */
export interface ScenariosSlide {
  type: 'scenarios'
  id: string
  title: string
  scenarios: ScenarioOption[]
  /** Year column headers */
  yearHeaders: string[]
}

/** Resource Demand (FTE and IPE) by Function – grouped rows */
export interface ResourceDemandRow {
  name: string
  values: (string | number)[]
}

export interface ResourceDemandGroup {
  groupName: string
  rows: ResourceDemandRow[]
}

export interface ResourceDemandSlide {
  type: 'resource-demand'
  id: string
  title: string
  /** e.g. "(Title to reflect asset/project code and project name)" */
  subtitle?: string
  columnHeaders: string[]
  groups: ResourceDemandGroup[]
  totalRow: (string | number)[]
}

export type Slide =
  | TitleSlide
  | TimelineSlide
  | ContentSlide
  | SummarySlide
  | ConsultationObjectivesSlide
  | FinancialsGanttSlide
  | ScenariosSlide
  | ResourceDemandSlide

export interface Presentation {
  slides: Slide[]
  filename: string
}
