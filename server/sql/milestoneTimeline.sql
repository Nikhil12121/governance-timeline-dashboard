-- Milestone Timeline (same structure as Power BI). Filter by project key.
-- Output: Parent (asset/project), Task Code (project or study id), Task Short Description (milestone name), Reported Date, Min/Max, Item Type, Milestone Category, Asset/Program.
-- Parent = asset for project rows; Parent = project for study rows. Task Code = same for all milestones in that project/study (one swim lane per project/study).
WITH cte_project_milestone AS (
  SELECT
    prm."Project Key",
    prm."Project Alternate ID",
    prm."Project Status",
    prm."Task Code",
    prm."Parent",
    prm."Task Short Description",
    prm."Reported Date",
    YEAR(prm."Reported Date") AS "Reported Date Year",
    prm."Project Active Substance Asset Reported Name",
    prm."Asset/Program",
    prm."Type",
    prm."Milestone Category",
    prm."Plan Category",
    prm."First Submission Date",
    prm."First Launch Date"
  FROM (
    SELECT DISTINCT
      pr.project_key AS "Project Key",
      COALESCE(pr.project_legacy_code, pr.project_code) AS "Project Alternate ID",
      pr.project_status AS "Project Status",
      CONCAT(pr.project_code, '-', pr.project_short_description) AS "Task Code",
      NULL AS "Parent",
      CASE
        WHEN (ta.task_scope_name = 'Project Milestone' AND ta.task_milestone_abbreviation IS NOT NULL) THEN ta.task_milestone_abbreviation
        WHEN ta.task_type_code = 'GOV_REV' THEN
          CASE WHEN ta.task_description LIKE '%PIB%' THEN 'GOV PIB'
               WHEN ta.task_description LIKE '%DRB%' THEN 'GOV DRB'
               WHEN ta.task_description LIKE '%NPSB%' THEN 'GOV NPSB'
               WHEN ta.task_description LIKE '%GSB%' THEN 'GOV GPSB'
               WHEN ta.task_description LIKE '%RIB%' THEN 'GOV RIB'
               WHEN ta.task_description LIKE '%RRB%' THEN 'GOV RRB'
               WHEN ta.task_description LIKE '%CMC Board%' THEN 'GOV CMC Board'
               WHEN ta.task_description LIKE '%FRC%' THEN 'GOV FRC'
               WHEN ta.task_description LIKE '%GHPRT%' THEN 'GOV GHPRT'
               WHEN ta.task_description LIKE '%GHIB%' THEN 'GOV GHIB'
               WHEN ta.task_description LIKE '%CMC%' THEN 'GOV CMCST'
               WHEN ta.task_description LIKE '%EDF%' THEN 'GOV EDF'
               WHEN ta.task_description LIKE '%TRF%' THEN 'GOV CMCST'
               ELSE 'Other' END
        WHEN ta.task_type_code = 'POC_RESULTS' THEN 'PoCRes'
        WHEN ta.task_type_code = 'POC_ONSET' THEN 'PoCOnset'
        ELSE ta.task_type_code
      END AS "Task Short Description",
      CASE
        WHEN ta.task_type_code = 'GOV_REV' THEN COALESCE(ta.task_actual_end_date, ta.task_planned_end_date)
        ELSE COALESCE(ta.task_actual_end_date, ta.task_actual_start_date, ta.task_planned_end_date, ta.task_planned_start_date)
      END AS "Reported Date",
      pr.project_active_substance_asset_reported_name AS "Project Active Substance Asset Reported Name",
      CASE
        WHEN COALESCE(pr.project_active_substance_asset_reported_name, 'Not Applicable') = 'Not Applicable'
          THEN COALESCE(pr.project_program_or_assets, 'Not Applicable')
        ELSE pr.project_active_substance_asset_reported_name
      END AS "Asset/Program",
      'Project' AS "Type",
      CASE
        WHEN (CASE WHEN (ta.task_scope_name = 'Project Milestone' AND ta.task_milestone_abbreviation IS NOT NULL) THEN ta.task_milestone_abbreviation WHEN ta.task_type_code = 'GOV_REV' THEN 'GOV' ELSE ta.task_type_code END) IN ('C2PH2B', 'C2PhIII', 'C2FL', 'C2FTIH', 'C2C', 'C2PH2A') THEN 'C2 Milestones'
        WHEN (CASE WHEN (ta.task_scope_name = 'Project Milestone' AND ta.task_milestone_abbreviation IS NOT NULL) THEN ta.task_milestone_abbreviation WHEN ta.task_type_code = 'GOV_REV' THEN 'GOV' ELSE ta.task_type_code END) IN ('PhIIIStart', 'FDIH', 'FirstPhIIDose') THEN 'Phase 1, 2, 3 Start'
        WHEN (CASE WHEN (ta.task_scope_name = 'Project Milestone' AND ta.task_milestone_abbreviation IS NOT NULL) THEN ta.task_milestone_abbreviation WHEN ta.task_type_code = 'GOV_REV' THEN 'GOV' ELSE ta.task_type_code END) IN ('AprvEU', 'MAA', 'NDA', 'AprovUS', 'ApproveJNDA', 'ApproveCHN', 'LaunchCHN', 'LaunchEU', 'LaunchJNDA', 'LaunchUS', 'SubmitCHN', 'SubmitJNDA', '1stINDsub') THEN 'Submit, Approval & Launch'
        WHEN (CASE WHEN (ta.task_scope_name = 'Project Milestone' AND ta.task_milestone_abbreviation IS NOT NULL) THEN ta.task_milestone_abbreviation WHEN ta.task_type_code = 'GOV_REV' THEN 'GOV' ELSE ta.task_type_code END) IN ('LastPatVisit', 'PoC', 'PoCOnset', 'PoCRes', 'PivotalResults', 'EoPhIIMtg') THEN 'Pivotal Result'
      END AS "Milestone Category",
      pl.plan_category AS "Plan Category",
      ta.task_first_submission_milestone AS "First Submission Milestone",
      ta.task_first_launch_milestone AS "First Launch Milestone"
    FROM irm.f_estimated_effort AS fe
    JOIN irm.d_project AS pr ON fe.project_key = pr.project_key
    JOIN irm.d_plan AS pl ON fe.plan_key = pl.plan_key
    JOIN irm.d_task AS ta ON fe.task_key = ta.task_key
    WHERE fe.data_origin = 'PLW_ACTIVITY'
      AND pl.plan_type_name IN ('MDP', 'PCMP', 'PT')
      AND pl.plan_category IN ('Current', 'Approved Governance Baseline')
      AND pl.plan_state IN ('Active', 'Closed')
      AND pr.project_source IN ('Vx-PLM', 'Rx-PDM')
      AND ta.task_source = 'PLW-NEW'
      AND (ta.task_scope_name = 'Project Milestone'
           AND (ta.task_priority_project_milestone_flag = 'Y' OR ta.task_scenario_priority_project_milestone_flag = 'Y' OR ta.task_baseline_priority_project_milestone_flag = 'Y' OR ta.task_source IN ('PDM-MIGRATED', 'PLW-LEGACY')))
      AND pr.project_key = {{projectKey}}
  ) AS prm
  WHERE prm."Task Short Description" IN ('C2PH2B', 'AprvEU', 'C2PhIII', 'LastPatVisit', 'MAA', 'NDA', 'AprovUS', 'PhIIIStart', 'PoC', 'PoCOnset', 'PoCRes', 'ApproveJNDA', 'ApproveCHN', 'C2FL', 'C2FTIH', 'FDIH', 'FirstPhIIDose', 'LaunchCHN', 'LaunchEU', 'LaunchJNDA', 'LaunchUS', 'PivotalResults', 'SubmitCHN', 'SubmitJNDA', 'EoPhIIMtg', '1stINDsub', 'C2C', 'C2PH2A')
    AND prm."Reported Date" >= '2021-01-01'
),
prm_dates AS (
  SELECT "Task Code", "Plan Category",
    MIN("Reported Date") AS "Min Task Reported Date",
    MAX("Reported Date") AS "Max Task Reported Date"
  FROM cte_project_milestone
  GROUP BY "Task Code", "Plan Category"
)
SELECT
  prm."Project Key",
  prm."Project Alternate ID",
  prm."Project Status",
  prm."Task Code" || ' - ' || prm."Plan Category" AS "Task Code",
  COALESCE(prm."Parent", prm."Asset/Program") || ' - ' || prm."Plan Category" AS "Parent",
  prm."Task Short Description",
  prm."Reported Date",
  prm."Reported Date Year",
  prm."Project Active Substance Asset Reported Name" || ' - ' || prm."Plan Category" AS "Project Active Substance Asset Reported Name",
  prm."Asset/Program" || ' - ' || prm."Plan Category" AS "Asset/Program",
  prm."Type",
  prm."Type" || ' - ' || prm."Plan Category" AS "Item Type",
  prm."Milestone Category",
  prm."Plan Category",
  prm_dates."Min Task Reported Date",
  prm_dates."Max Task Reported Date",
  CAST(CASE
    WHEN prm_dates."Max Task Reported Date" <= CURRENT_DATE() THEN 1
    WHEN prm_dates."Max Task Reported Date" = prm_dates."Min Task Reported Date" OR prm_dates."Min Task Reported Date" > CURRENT_DATE() THEN 0
    ELSE DATEDIFF('day', prm_dates."Min Task Reported Date", CURRENT_DATE()) * 1.0 / NULLIF(DATEDIFF('day', prm_dates."Min Task Reported Date", prm_dates."Max Task Reported Date"), 0)
  END AS DECIMAL(18,2)) AS "Timeline Progress",
  prm."First Submission Date",
  prm."First Launch Date"
FROM cte_project_milestone AS prm
JOIN prm_dates ON prm."Task Code" = prm_dates."Task Code" AND prm."Plan Category" = prm_dates."Plan Category"
ORDER BY "Parent", "Task Code", "Reported Date";
