WITH cte_link AS (
    SELECT lnk."Project Key"
         , lnk."Task Key"
         , lnk."Task Line Identifier"
         , lnk."Task User Comment"
         , lnk."Task Planned Start Date"
         , lnk."Task Planned End Date"
         , lnk."Task Type Code"
         , lnk."Task Scope Name"
         , lnk."Plan State"
         , lnk."Plan Last Modification Date"
    FROM (
        SELECT
            fee."project_key" AS "Project Key",
            fee."activity_key" AS "Task Key",
            tsk."activity_line_id" AS "Task Line Identifier",
            tsk."activity_notepad" AS "Task User Comment",
            tsk."activity_planned_start_date" AS "Task Planned Start Date",
            tsk."activity_planned_end_date" AS "Task Planned End Date",
            tsk."activity_type_name" AS "Task Type Code",
            tsk."activity_scope_name" AS "Task Scope Name",
            pln."plan_business_state" AS "Plan State",
            pln."plan_last_modification_date" AS "Plan Last Modification Date"
        FROM PPRM_PROD.CONF_FD.F_ESTIMATED_SCHEDULE AS fee
        JOIN PPRM_PROD.CONF_FD.D_ACTIVITY AS tsk
          ON tsk."activity_key" = fee."activity_key"
         AND tsk."latest_snapshot_flag" = FALSE
        JOIN PPRM_PROD.CONF_FD.D_PLAN AS pln
          ON pln."plan_key" = fee."plan_key"
         AND pln."plan_type_name" IN ('MDP', 'PCMP')
         AND pln."plan_business_state" IN ('Active', 'Closed')
         AND pln."latest_snapshot_flag" = FALSE
        WHERE fee."latest_snapshot_flag" = FALSE
    ) AS lnk
),
cte_term_prj AS (
    SELECT prj_term."Project Key"
         , MIN(CASE WHEN prj_term."Task Type Code" = 'PROJ_TERM_DEC' AND prj_term."prj_term_decision_date_rn" = 1 THEN prj_term."Task Planned Start Date" END) AS "Project Termination Decision Date"
         , MIN(CASE WHEN prj_term."Task Type Code" = 'PROJ_TERM_CLOSE' AND prj_term."prj_term_date_rn" = 1 THEN prj_term."Task Planned End Date" END) AS "Project Termination Date"
         , MIN(CASE WHEN prj_term."Task Line Identifier" = 1 AND prj_term."prj_term_comm_rn" = 1 THEN prj_term."Task User Comment" END) AS "Terminated Project Commentary"
         , MIN(CASE WHEN prj_term."Task Type Code" = 'PROJ_TERM_CLOSE' AND prj_term."Task Scope Name" = 'Project Milestone' AND prj_term."prj_term_last_updated_rn" = 1 THEN prj_term."Plan Last Modification Date" END) AS "Terminated Project Last Updated"
    FROM (
        SELECT lnk."Project Key"
             , lnk."Task Type Code"
             , lnk."Task Planned Start Date"
             , lnk."Task Planned End Date"
             , lnk."Task Line Identifier"
             , lnk."Task User Comment"
             , lnk."Task Scope Name"
             , lnk."Plan Last Modification Date"
             , ROW_NUMBER() OVER (PARTITION BY lnk."Project Key" ORDER BY CASE WHEN lnk."Task Line Identifier" = 1 THEN 1 ELSE 2 END ASC, lnk."Task Key" DESC) AS "prj_term_comm_rn"
             , ROW_NUMBER() OVER (PARTITION BY lnk."Project Key" ORDER BY CASE WHEN lnk."Task Type Code" = 'PROJ_TERM_DEC' THEN 1 ELSE 2 END ASC, lnk."Task Planned Start Date" DESC) AS "prj_term_decision_date_rn"
             , ROW_NUMBER() OVER (PARTITION BY lnk."Project Key" ORDER BY CASE WHEN lnk."Task Type Code" = 'PROJ_TERM_CLOSE' THEN 1 ELSE 2 END ASC, lnk."Task Planned End Date" DESC) AS "prj_term_date_rn"
             , ROW_NUMBER() OVER (PARTITION BY lnk."Project Key" ORDER BY CASE WHEN lnk."Task Type Code" = 'PROJ_TERM_CLOSE' THEN 1 ELSE 2 END ASC, CASE WHEN lnk."Task Scope Name" = 'Project Milestone' THEN 1 ELSE 2 END ASC, lnk."Plan Last Modification Date" DESC) AS "prj_term_last_updated_rn"
        FROM cte_link AS lnk
    ) AS prj_term
    WHERE prj_term."prj_term_decision_date_rn" = 1
       OR prj_term."prj_term_date_rn" = 1
       OR prj_term."prj_term_comm_rn" = 1
       OR prj_term."prj_term_last_updated_rn" = 1
    GROUP BY prj_term."Project Key"
),
cte_on_time_kpi_current AS (
    SELECT
          prj."project_key" AS "Project Key"
        , pl."plan_key" AS "Plan Key"
        , fee."activity_key" AS "Activity Key"
        , task."activity_type_name" AS "Activity Type Name"
        , CASE
            WHEN task."Task Reported Date" BETWEEN DATE_FROM_PARTS(YEAR(DATEADD(YEAR, -3, CURRENT_DATE())), 1, 1) AND DATE_FROM_PARTS(YEAR(DATEADD(YEAR, -1, CURRENT_DATE())), 12, 31)
                THEN task."activity_actual_start_date"
          END AS "Task Actual Start Date - Current - Static 3yr"
        , CASE
            WHEN task."Task Reported Date" BETWEEN DATE_FROM_PARTS(YEAR(DATEADD(YEAR, -1, CURRENT_DATE())), 1, 1) AND DATE_FROM_PARTS(YEAR(DATEADD(YEAR, -1, CURRENT_DATE())), 12, 31)
                THEN task."activity_actual_start_date"
          END AS "Task Actual Start Date - Current - Static 1yr"
        , pl."plan_business_state"
    FROM PPRM_PROD.CONF_FD.F_ESTIMATED_SCHEDULE AS fee
    JOIN PPRM_PROD.CONF_FD.D_PROJECT AS prj
      ON prj."project_key" = fee."project_key"
     AND prj."latest_snapshot_flag" = FALSE
    JOIN PPRM_PROD.CONF_FD.D_PLAN AS pl
      ON fee."plan_key" = pl."plan_key"
     AND pl."latest_snapshot_flag" = FALSE
    JOIN (
        SELECT
              tsk."activity_key"
            , tsk."activity_type_name"
            , tsk."activity_actual_start_date"
            , COALESCE(tsk."activity_actual_end_date", tsk."activity_actual_start_date", tsk."activity_planned_end_date", tsk."activity_planned_start_date") AS "Task Reported Date"
        FROM PPRM_PROD.CONF_FD.D_ACTIVITY AS tsk
        WHERE tsk."activity_scope_name" = 'Project Milestone'
          AND tsk."latest_snapshot_flag" = FALSE
    ) AS task
      ON fee."activity_key" = task."activity_key"
    WHERE pl."plan_business_state" IN ('Active', 'Closed')
      AND pl."plan_type_name" = 'MDP'
      AND task."activity_type_name" IN ('IND_SUB', 'C2FTIH', 'C2PH2A', 'C2PH2B', 'C2PH3', 'EOP2', 'FDIH', 'FIRST_CTA_SUB', 'FIRST_PH2_DOSE', 'FTIH', 'LAST_PATIENT_VISIT', 'EU_LAUNCH', 'US_LAUNCH', 'SUBMIT_NDA', 'PH3_START', 'PIVOTAL_STUDY_RES', 'SUBMIT_X', 'SUBMIT_NONSPEC', 'X_LAUNCH')
      AND task."Task Reported Date" BETWEEN DATE_FROM_PARTS(YEAR(DATEADD(YEAR, -3, CURRENT_DATE())), 1, 1) AND CURRENT_DATE()
      AND task."activity_actual_start_date" IS NOT NULL
      AND fee."latest_snapshot_flag" = FALSE
),
cte_on_time_kpi_baselines AS (
    SELECT
          prj."project_key" AS "Project Key"
        , pl."baseline_plan_key" AS "Baseline Plan Key"
        , fee."baseline_activity_key" AS "Baseline Activity Key"
        , task."activity_type_name" AS "Activity Type Name"
        , CASE
            WHEN CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = TO_VARCHAR(YEAR(CURRENT_DATE()) - 3) || TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE())))
             AND "Task Planned Date" >= TO_DATE(CONCAT(TO_VARCHAR(YEAR(CURRENT_DATE()) - 3), '-', LPAD(TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))), 2, '0'), '-01'), 'YYYY-MM-DD')
             AND "Task Planned Date" < TO_DATE(CONCAT(TO_VARCHAR(YEAR(CURRENT_DATE())), '-', LPAD(TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))), 2, '0'), '-01'), 'YYYY-MM-DD')
                THEN "Task Planned Date"
          END AS "Task Planned Date - Snapshot Rel 3yr"
        , CASE
            WHEN CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = CONCAT(YEAR(CURRENT_DATE()) - 3, 1)
                THEN "Task Planned Date"
          END AS "Task Planned Date - Snapshot Static 3yr"
        , CASE
            WHEN CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = TO_VARCHAR(YEAR(CURRENT_DATE()) - 1) || TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE())))
             AND "Task Planned Date" >= TO_DATE(CONCAT(TO_VARCHAR(YEAR(CURRENT_DATE()) - 1), '-', LPAD(TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))), 2, '0'), '-01'), 'YYYY-MM-DD')
             AND "Task Planned Date" < TO_DATE(CONCAT(TO_VARCHAR(YEAR(CURRENT_DATE())), '-', LPAD(TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))), 2, '0'), '-01'), 'YYYY-MM-DD')
                THEN "Task Planned Date"
          END AS "Task Planned Date - Snapshot Rel 1yr"
        , CASE
            WHEN CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = CONCAT(YEAR(CURRENT_DATE()) - 1, 1)
                THEN "Task Planned Date"
          END AS "Task Planned Date - Snapshot Static 1yr"
        , CASE
            WHEN pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%'
             AND pl."baseline_reference_creation_date" = latest_snapshot."plan_baseline_date"
                THEN task."activity_actual_start_date"
          END AS "Task Actual Start Date - Latest Snapshot"
        , pl."plan_business_state"
        , pl."baseline_reference_creation_date"
    FROM PPRM_PROD.CONF_FD.F_BASELINE_ESTIMATED_SCHEDULE AS fee
    JOIN PPRM_PROD.CONF_FD.D_PROJECT AS prj
      ON prj."project_key" = fee."project_key"
     AND prj."latest_snapshot_flag" = FALSE
    JOIN PPRM_PROD.CONF_FD.D_BASELINE_PLAN AS pl
      ON fee."baseline_plan_key" = pl."baseline_plan_key"
    JOIN (
        SELECT
              btsk."baseline_activity_key"
            , btsk."activity_type_name"
            , btsk."activity_actual_start_date"
            , COALESCE(btsk."activity_planned_end_date", btsk."activity_planned_start_date") AS "Task Planned Date"
            , COALESCE(btsk."activity_actual_end_date", btsk."activity_actual_start_date", btsk."activity_planned_end_date", btsk."activity_planned_start_date") AS "Task Reported Date"
        FROM PPRM_PROD.CONF_FD.D_BASELINE_ACTIVITY AS btsk
        WHERE btsk."activity_scope_name" = 'Project Milestone'
    ) AS task
      ON fee."baseline_activity_key" = task."baseline_activity_key"
    JOIN (
        SELECT MAX("baseline_reference_creation_date") AS "plan_baseline_date"
        FROM PPRM_PROD.CONF_FD.D_BASELINE_PLAN AS pl
        JOIN PPRM_PROD.CONF_FD.F_BASELINE_ESTIMATED_SCHEDULE AS fee
          ON fee."baseline_plan_key" = pl."baseline_plan_key"
        WHERE fee."latest_snapshot_flag" = FALSE
          AND "baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%'
    ) AS latest_snapshot
      ON 1 = 1
    WHERE pl."plan_type_name" = 'MDP'
      AND task."activity_type_name" IN ('IND_SUB', 'C2FTIH', 'C2PH2A', 'C2PH2B', 'C2PH3', 'EOP2', 'FDIH', 'FIRST_CTA_SUB', 'FIRST_PH2_DOSE', 'FTIH', 'LAST_PATIENT_VISIT', 'EU_LAUNCH', 'US_LAUNCH', 'SUBMIT_NDA', 'PH3_START', 'PIVOTAL_STUDY_RES', 'SUBMIT_X', 'SUBMIT_NONSPEC', 'X_LAUNCH')
      AND (
            (pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%' AND CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = TO_VARCHAR(YEAR(CURRENT_DATE()) - 3) || TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))) AND task."Task Planned Date" BETWEEN DATEADD(YEAR, -3, CURRENT_DATE()) AND CURRENT_DATE())
         OR (pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%' AND CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = CONCAT(YEAR(CURRENT_DATE()) - 3, 1) AND task."Task Planned Date" BETWEEN TO_DATE(TO_CHAR(DATEADD(YEAR, -3, CURRENT_DATE()), 'YYYY') || '-01-01') AND TO_DATE(TO_CHAR(DATEADD(YEAR, -1, CURRENT_DATE()), 'YYYY') || '-12-31'))
         OR (pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%' AND CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = TO_VARCHAR(YEAR(CURRENT_DATE()) - 1) || TO_VARCHAR(MONTH(DATEADD(MONTH, -1, CURRENT_DATE()))) AND task."Task Planned Date" BETWEEN DATEADD(YEAR, -1, CURRENT_DATE()) AND CURRENT_DATE())
         OR (pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%' AND CONCAT(YEAR("baseline_reference_creation_date"), MONTH("baseline_reference_creation_date")) = CONCAT(YEAR(CURRENT_DATE()) - 1, 1) AND task."Task Planned Date" BETWEEN TO_DATE(TO_CHAR(DATEADD(YEAR, -1, CURRENT_DATE()), 'YYYY') || '-01-01') AND TO_DATE(TO_CHAR(DATEADD(YEAR, -1, CURRENT_DATE()), 'YYYY') || '-12-31'))
         OR (pl."baseline_reference_type" LIKE 'MONTHLY_SNAPSHOT%' AND pl."baseline_reference_creation_date" = latest_snapshot."plan_baseline_date")
      )
),
cte_on_time_kpi AS (
    SELECT
          on_time_kpi."Project Key"
        , on_time_kpi."Activity Type Name"
        , COUNT("Task Planned Date - Snapshot Rel 3yr") AS "Planned Milestones Rel 3yr"
        , COUNT("Task Planned Date - Snapshot Static 3yr") AS "Planned Milestones Static 3yr"
        , CASE WHEN MIN("Task Planned Date - Snapshot Rel 3yr") >= DATEADD(DAY, -30, MIN("Task Actual Start Date - Latest Snapshot")) THEN 1 END AS "Is Actual Date lte Planned Date Rel 3yr"
        , CASE WHEN MIN("Task Planned Date - Snapshot Static 3yr") >= DATEADD(DAY, -30, MIN("Task Actual Start Date - Current - Static 3yr")) THEN 1 END AS "Is Actual Date lte Planned Date Static 3yr"
        , COUNT("Task Planned Date - Snapshot Rel 1yr") AS "Planned Milestones Rel 1yr"
        , COUNT("Task Planned Date - Snapshot Static 1yr") AS "Planned Milestones Static 1yr"
        , CASE WHEN MIN("Task Planned Date - Snapshot Rel 1yr") >= DATEADD(DAY, -30, MIN("Task Actual Start Date - Latest Snapshot")) THEN 1 END AS "Is Actual Date lte Planned Date Rel 1yr"
        , CASE WHEN MIN("Task Planned Date - Snapshot Static 1yr") >= DATEADD(DAY, -30, MIN("Task Actual Start Date - Current - Static 1yr")) THEN 1 END AS "Is Actual Date lte Planned Date Static 1yr"
    FROM (
        SELECT
              "Project Key"
            , "Plan Key"
            , "Activity Key"
            , "Activity Type Name"
            , "Task Actual Start Date - Current - Static 3yr"
            , "Task Actual Start Date - Current - Static 1yr"
            , NULL AS "Task Planned Date - Snapshot Rel 3yr"
            , NULL AS "Task Planned Date - Snapshot Static 3yr"
            , NULL AS "Task Planned Date - Snapshot Rel 1yr"
            , NULL AS "Task Planned Date - Snapshot Static 1yr"
            , NULL AS "Task Actual Start Date - Latest Snapshot"
            , "plan_business_state"
            , NULL AS "baseline_reference_creation_date"
        FROM cte_on_time_kpi_current

        UNION ALL

        SELECT
              "Project Key"
            , "Baseline Plan Key"
            , "Baseline Activity Key"
            , "Activity Type Name"
            , NULL AS "Task Actual Start Date - Current - Static 3yr"
            , NULL AS "Task Actual Start Date - Current - Static 1yr"
            , "Task Planned Date - Snapshot Rel 3yr"
            , "Task Planned Date - Snapshot Static 3yr"
            , "Task Planned Date - Snapshot Rel 1yr"
            , "Task Planned Date - Snapshot Static 1yr"
            , "Task Actual Start Date - Latest Snapshot"
            , "plan_business_state"
            , "baseline_reference_creation_date"
        FROM cte_on_time_kpi_baselines
    ) AS on_time_kpi
    GROUP BY on_time_kpi."Project Key", on_time_kpi."Activity Type Name"
)
SELECT
      prj."project_key" AS "Project Key"
    , COALESCE(prj."project_id", prj."project_legacy_id") AS "Project Alternate ID"
    , prj."project_description" AS "Project Description"
    , prj."project_short_description" AS "Project Short Description"
    , prj."current_phase_long_name" AS "Project Current Phase"
    , prj."project_status_long_name" AS "Project Status"
    , prj."project_manager" AS "Project Manager Name"
    , fun."funder_level_1" AS "Portfolio Owner"
    , prj."modification_date" AS "Last Updated"
    , CASE
        WHEN prj."project_modality_type_derived" = 'Vaccine' THEN prj."program_long_name"
        WHEN prj."project_modality_type_derived" = 'Pharma R&D' THEN prj."asset_reported_name"
        ELSE COALESCE(prj."asset_reported_name", prj."program_or_asset_short_name", prj."project_description")
      END AS "Asset Name"
    , otk."Planned Milestones Rel 3yr" AS "Planned Milestones Rel 3yr"
    , otk."Planned Milestones Static 3yr" AS "Planned Milestones Static 3yr"
    , otk."Is Actual Date lte Planned Date Rel 3yr" AS "Is Actual Date lte Planned Date Rel 3yr"
    , otk."Is Actual Date lte Planned Date Static 3yr" AS "Is Actual Date lte Planned Date Static 3yr"
    , otk."Planned Milestones Rel 1yr" AS "Planned Milestones Rel 1yr"
    , otk."Planned Milestones Static 1yr" AS "Planned Milestones Static 1yr"
    , otk."Is Actual Date lte Planned Date Rel 1yr" AS "Is Actual Date lte Planned Date Rel 1yr"
    , otk."Is Actual Date lte Planned Date Static 1yr" AS "Is Actual Date lte Planned Date Static 1yr"
FROM PPRM_PROD.CONF_FD.D_PROJECT AS prj
LEFT JOIN PPRM_PROD.CONF_FD.B_PROJECT_FUNDER AS fun
  ON prj."project_key" = fun."project_key"
 AND fun."default_funder_flag" = TRUE
 AND fun."latest_snapshot_flag" = FALSE
LEFT JOIN cte_term_prj AS term_prj
  ON term_prj."Project Key" = prj."project_key"
LEFT JOIN (
    SELECT
          "Project Key"
        , SUM("Planned Milestones Rel 3yr") AS "Planned Milestones Rel 3yr"
        , SUM("Planned Milestones Static 3yr") AS "Planned Milestones Static 3yr"
        , SUM("Is Actual Date lte Planned Date Rel 3yr") AS "Is Actual Date lte Planned Date Rel 3yr"
        , SUM("Is Actual Date lte Planned Date Static 3yr") AS "Is Actual Date lte Planned Date Static 3yr"
        , SUM("Planned Milestones Rel 1yr") AS "Planned Milestones Rel 1yr"
        , SUM("Planned Milestones Static 1yr") AS "Planned Milestones Static 1yr"
        , SUM("Is Actual Date lte Planned Date Rel 1yr") AS "Is Actual Date lte Planned Date Rel 1yr"
        , SUM("Is Actual Date lte Planned Date Static 1yr") AS "Is Actual Date lte Planned Date Static 1yr"
    FROM cte_on_time_kpi
    GROUP BY "Project Key"
) AS otk
  ON prj."project_key" = otk."Project Key"
WHERE prj."project_source" IN ('PDM-Legacy', 'PLM-Legacy', 'MDM')
  AND prj."latest_snapshot_flag" = FALSE
  AND prj."project_key" = {{projectKey}};
