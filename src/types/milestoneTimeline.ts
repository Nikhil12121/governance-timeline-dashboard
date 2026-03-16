/**
 * Data shape for Milestone & Governance View – matches Power BI field mappings exactly.
 * Use the same field names when mapping from the Milestone Timeline query.
 *
 * Power BI mappings:
 * - Parents: Parent          → parent
 * - Item: Task code as Parent/Study → itemTaskCode (Project/Study column; must be project/study name, same for all milestones in that project so they show on one swim lane)
 * - Item Name: Parent        → itemNameParent (optional; display name for parent)
 * - Start Date               → minTaskReportedDate
 * - End Date                 → maxTaskReportedDate
 * - Legend: Item type        → itemType
 * - Label / Milestone        → taskShortDescription
 * - Tooltips: Asset/program  → assetProgram (CAPITAL)
 * - Milestone Date           → reportedDate
 * - Milestone Legend         → milestoneCategory
 * - Milestone Tooltips       → taskShortDescription
 */
export interface MilestoneTimelineRow {
  projectKey: string
  /** Power BI: Item (Task code as Parent/Study) – project/study name; same value for all rows in that project so they group into one swim lane */
  itemTaskCode: string
  /** Power BI: Parents: Parent – value for Parent column */
  parent: string
  /** Power BI: Item Name: Parent (optional display) */
  itemNameParent?: string
  /** Power BI: Label / Milestone Tooltips */
  taskShortDescription: string
  /** Power BI: Milestone Date */
  reportedDate: string
  reportedDateYear?: number
  /** Power BI: Legend: Item type */
  itemType: string
  /** Power BI: Milestone Legend */
  milestoneCategory: string
  planCategory: string
  /** Power BI: Start Date */
  minTaskReportedDate: string
  /** Power BI: End Date */
  maxTaskReportedDate: string
  timelineProgress?: number
  /** Power BI: Tooltips: Asset/program - CAPITAL */
  assetProgram?: string
}

/** One bar row: one (Parent, Item Task Code). Parent = query Parent (asset/project), not phases. */
export interface MilestoneBarRow {
  /** Query Parent – asset/project (e.g. GSK4425689, 52535-GSK689A CSP mAb - Current). Display in Parent column. */
  parent: string
  /** For legend/coloring: Milestone Category + " - " + Plan Category */
  categoryLabel: string
  /** For tooltips: Task Short Description + " - " + Plan Category */
  childLabel: string
  /** Power BI: Item: Task code as Parent/Study. Display in Project/Study column. */
  itemTaskCode: string
  planCategory: string
  /** Power BI: Legend: Item type */
  itemType: string
  minDate: Date
  maxDate: Date
  milestones: { taskShortDescription: string; reportedDate: Date; milestoneCategory: string }[]
  /** Power BI: Tooltips: Asset/program */
  assetProgram?: string
}
