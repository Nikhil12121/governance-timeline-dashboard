WITH cte_project_milestone AS (
    SELECT
          pr."project_key" AS "Project Key"
        , COALESCE(pr."project_legacy_code", pr."project_code") AS "Project Alternate ID"
        , pr."project_status" AS "Project Status"
        , CONCAT(pr."project_code", '-', pr."project_short_description") AS "Task Code"
        , NULL AS "Parent"
        , CASE
            WHEN (ta."task_scope_name" = 'Project Milestone' AND ta."task_milestone_abbreviation" IS NOT NULL) THEN ta."task_milestone_abbreviation"
            WHEN ta."task_type_code" = 'POC_RESULTS' THEN 'PoCRes'
            WHEN ta."task_type_code" = 'POC_ONSET' THEN 'PoCOnset'
            ELSE ta."task_type_code"
          END AS "Task Short Description"
        , CASE
            WHEN ta."task_type_code" = 'GOV_REV' THEN COALESCE(ta."task_actual_end_date", ta."task_planned_end_date")
            ELSE COALESCE(ta."task_actual_end_date", ta."task_actual_start_date", ta."task_planned_end_date", ta."task_planned_start_date")
          END AS "Reported Date"
        , pr."project_active_substance_asset_reported_name" AS "Project Active Substance Asset Reported Name"
        , CASE
            WHEN COALESCE(pr."project_active_substance_asset_reported_name", 'Not Applicable') = 'Not Applicable' THEN COALESCE(pr."project_program_or_assets", 'Not Applicable')
            ELSE pr."project_active_substance_asset_reported_name"
          END AS "Asset/Program"
        , 'Project' AS "Type"
        , CASE
            WHEN ta."task_type_code" IN ('C2PH2B', 'C2PH3', 'C2FL', 'C2FTIH', 'C2C', 'C2PH2A') THEN 'C2 Milestones'
            WHEN ta."task_type_code" IN ('PH3_START', 'FDIH', 'FIRST_PH2_DOSE') THEN 'Phase 1, 2, 3 Start'
            WHEN ta."task_type_code" IN ('EU_APPROVAL', 'SUBMIT_MAA', 'SUBMIT_NDA', 'US_APPROVAL', 'JAPAN_APPROVAL', 'CHINA_APPROVAL', 'CHINA_LAUNCH', 'EU_LAUNCH', 'JAPAN_LAUNCH', 'US_LAUNCH', 'SUBMIT_CHINA', 'SUBMIT_JAPAN', 'IND_SUB') THEN 'Submit, Approval & Launch'
            WHEN ta."task_type_code" IN ('LAST_PATIENT_VISIT', 'POC', 'POC_ONSET', 'POC_RESULTS', 'PIVOTAL_STUDY_RES', 'EOP2') THEN 'Pivotal Result'
            ELSE 'Project Milestone'
          END AS "Milestone Category"
        , CASE
            WHEN pl."plan_business_state" IN ('Active', 'Closed', 'Completed', 'Migrated') THEN 'Current'
            ELSE pl."plan_business_state"
          END AS "Plan Category"
        , CASE WHEN ta."task_first_submission_milestone" = 'True' THEN COALESCE(ta."task_actual_end_date", ta."task_actual_start_date", ta."task_planned_end_date", ta."task_planned_start_date") END AS "First Submission Date"
        , CASE WHEN ta."task_first_launch_milestone" = 'True' THEN COALESCE(ta."task_actual_end_date", ta."task_actual_start_date", ta."task_planned_end_date", ta."task_planned_start_date") END AS "First Launch Date"
    FROM irm."f_estimated_effort" AS fe
    JOIN irm."d_project" AS pr
      ON fe."project_key" = pr."project_key"
    JOIN irm."d_plan" AS pl
      ON fe."plan_key" = pl."plan_key"
    JOIN irm."d_task" AS ta
      ON fe."task_key" = ta."task_key"
    WHERE fe."data_origin" = 'PLW_ACTIVITY'
      AND pl."plan_type_name" IN ('MDP', 'PCMP', 'PT')
      AND pl."plan_business_state" IN ('Active', 'Closed')
      AND pr."project_source" IN ('Vx-PLM', 'Rx-PDM')
      AND ta."task_source" = 'PLW-NEW'
      AND ta."task_scope_name" = 'Project Milestone'
      AND TO_VARCHAR(fe."project_key") = {{projectKey}}
),
cte_study_milestone AS (
    SELECT DISTINCT
          pr."project_key" AS "Project Key"
        , COALESCE(pr."project_legacy_code", pr."project_code") AS "Project Alternate ID"
        , pr."project_status" AS "Project Status"
        , CONCAT(cs."clinical_study_code", '-', cs."clinical_study_description") AS "Task Code"
        , CONCAT(pr."project_code", '-', pr."project_short_description") AS "Parent"
        , CASE
            WHEN ta."task_type_code" = 'DBF_FINAL' THEN 'DBL'
            WHEN ta."task_type_code" = 'DBL_FINAL' THEN 'DBL'
            WHEN ta."task_type_code" = 'LSLV_FINAL' THEN 'LSLV'
            WHEN ta."task_type_code" = 'SAC_FINAL' THEN 'SAC'
            WHEN ta."task_type_code" = 'SAC_PRIM' THEN 'pSAC'
            WHEN ta."task_type_code" = 'DBL_PRIM' THEN 'pDBL'
            ELSE ta."task_type_code"
          END AS "Task Short Description"
        , COALESCE(ta."task_actual_end_date", ta."task_planned_end_date") AS "Reported Date"
        , cs."clinical_study_primary_asset" AS "Project Active Substance Asset Reported Name"
        , cs."clinical_study_primary_asset" AS "Asset/Program"
        , 'Study' AS "Type"
        , 'Study Milestones' AS "Milestone Category"
        , CASE
            WHEN pl."plan_business_state" IN ('Active', 'Closed', 'Completed', 'Migrated') THEN 'Current'
            ELSE pl."plan_business_state"
          END AS "Plan Category"
    FROM irm."f_estimated_effort" AS fe
    JOIN cte_project_milestone AS cte_prm
      ON fe."project_key" = cte_prm."Project Key"
    JOIN irm."d_project" AS pr
      ON fe."project_key" = pr."project_key"
    JOIN irm."d_plan" AS pl
      ON fe."plan_key" = pl."plan_key"
    JOIN irm."d_clinical_study" AS cs
      ON fe."clinical_study_key" = cs."clinical_study_key"
    JOIN irm."d_task" AS ta
      ON fe."task_key" = ta."task_key"
    WHERE fe."data_origin" = 'PLW_ACTIVITY'
      AND pl."plan_business_state" = 'Active'
      AND pl."plan_type_name" IN ('MDP', 'CSAP')
      AND ta."task_source" = 'PLW-NEW'
      AND ta."task_scope_name" = 'Study Milestone'
      AND ta."task_type_code" IN ('CPA', 'FPA', 'FSFV', 'LSFV', 'LSLV_FINAL', 'DBL_FINAL', 'SAC_FINAL')
      AND ta."task_planned_end_date" >= '2021-01-01'
      AND TO_VARCHAR(fe."project_key") = {{projectKey}}
),
cte_timeline AS (
    SELECT
          prm."Project Key"
        , prm."Task Code" || ' - ' || prm."Plan Category" AS "Task Code"
        , prm."Parent" AS "Parent"
        , prm."Task Short Description" AS "Task Short Description"
        , prm."Type" AS "Type"
        , prm."Milestone Category" AS "Milestone Category"
        , prm."Plan Category" AS "Plan Category"
        , MIN(prm."Reported Date") OVER (PARTITION BY prm."Task Code", prm."Plan Category") AS "Min Task Reported Date"
        , MAX(prm."Reported Date") OVER (PARTITION BY prm."Task Code", prm."Plan Category") AS "Max Task Reported Date"
    FROM cte_project_milestone AS prm

    UNION ALL

    SELECT
          stm."Project Key"
        , stm."Task Code" || ' - ' || stm."Plan Category" AS "Task Code"
        , stm."Parent" || ' - ' || stm."Plan Category" AS "Parent"
        , stm."Task Short Description" AS "Task Short Description"
        , stm."Type" AS "Type"
        , stm."Milestone Category" AS "Milestone Category"
        , stm."Plan Category" AS "Plan Category"
        , MIN(stm."Reported Date") OVER (PARTITION BY stm."Task Code", stm."Plan Category") AS "Min Task Reported Date"
        , MAX(stm."Reported Date") OVER (PARTITION BY stm."Task Code", stm."Plan Category") AS "Max Task Reported Date"
    FROM cte_study_milestone AS stm
)
SELECT DISTINCT
      "Task Code" AS "Task ID"
    , "Task Short Description" AS "Task Name"
    , TO_CHAR("Min Task Reported Date", 'YYYY-MM-DD') AS "Start Date"
    , TO_CHAR("Max Task Reported Date", 'YYYY-MM-DD') AS "End Date"
    , ROUND(
        CASE
          WHEN "Max Task Reported Date" <= CURRENT_DATE() THEN 100
          WHEN "Max Task Reported Date" = "Min Task Reported Date" OR "Min Task Reported Date" > CURRENT_DATE() THEN 0
          ELSE DATEDIFF(DAY, "Min Task Reported Date", CURRENT_DATE()) * 100.0 /
               NULLIF(DATEDIFF(DAY, "Min Task Reported Date", "Max Task Reported Date"), 0)
        END
      , 0) AS "Progress"
    , CASE WHEN "Type" = 'Project' THEN 'project' ELSE 'task' END AS "Task Type"
    , "Parent" AS "Parent Task ID"
    , "Milestone Category" AS "Phase"
    , "Plan Category" AS "Context"
FROM cte_timeline
WHERE "Project Key" = {{projectKey}}
  AND "Min Task Reported Date" IS NOT NULL
  AND "Max Task Reported Date" IS NOT NULL
ORDER BY "Start Date", "Task Type", "Task Name";
