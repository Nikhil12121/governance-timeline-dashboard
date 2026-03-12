WITH cte_abbr_lookup AS (
    SELECT 'C2D' AS "project_milestone_abbreviation_legacy", 'C2D' AS "activity_type_name" UNION ALL
    SELECT 'C2TID', 'C2TID' UNION ALL
    SELECT 'C2TargVal', 'C2TV' UNION ALL
    SELECT 'C2T', 'C2T' UNION ALL
    SELECT 'C2LO', 'C2LO' UNION ALL
    SELECT 'C2PP', 'C2PC' UNION ALL
    SELECT 'C2C', 'C2CS' UNION ALL
    SELECT 'GLPRepDosStdy', 'INIT_FIRST_GLP' UNION ALL
    SELECT 'C2FTIH', 'C2FTIH' UNION ALL
    SELECT 'IND_APPR', 'IND_APPR' UNION ALL
    SELECT 'FDIH', 'FDIH' UNION ALL
    SELECT 'C2PH2A', 'C2PH2A' UNION ALL
    SELECT '1stINDsub', 'IND_SUB' UNION ALL
    SELECT 'FirstCTA', 'FIRST_CTA_SUB' UNION ALL
    SELECT 'FirstPhIIDose', 'FIRST_PH2_DOSE' UNION ALL
    SELECT 'PoCRes', 'PH2A_RES' UNION ALL
    SELECT 'PoC', 'POC' UNION ALL
    SELECT 'C2PH2B', 'C2PH2B' UNION ALL
    SELECT 'ClinDosRngRes', 'CLIN_DOSE_RANGE_RES' UNION ALL
    SELECT 'EoPhIIMtg', 'EOP2' UNION ALL
    SELECT 'C2PhIII', 'C2PH3' UNION ALL
    SELECT 'PhIIIStart', 'PH3_START' UNION ALL
    SELECT 'LastPatVisit', 'LAST_PATIENT_VISIT' UNION ALL
    SELECT 'PivotalResults', 'PIVOTAL_STUDY_RES' UNION ALL
    SELECT 'C2FL', 'C2FL' UNION ALL
    SELECT 'ProjectTerm', 'PROJ_TERM_DEC' UNION ALL
    SELECT 'TermCompl', 'PROJ_TERM_CLOSE' UNION ALL
    SELECT 'MAA', 'SUBMIT_MAA' UNION ALL
    SELECT 'NDA', 'SUBMIT_NDA' UNION ALL
    SELECT 'C2FLE', 'C2FLE' UNION ALL
    SELECT 'SubmitROW', 'SUBMIT_NONSPEC' UNION ALL
    SELECT 'SubmitX', 'SUBMIT_X' UNION ALL
    SELECT 'LaunchEU', 'EU_LAUNCH' UNION ALL
    SELECT 'LaunchUS', 'US_LAUNCH' UNION ALL
    SELECT 'Xlaunch', 'X_LAUNCH'
),
cte_milestones AS (
    SELECT
          task."Project Key"
        , task."Task Key"
        , task."Task Code"
        , task."Task Description"
        , task."Task Type Code"
        , task."Task Scope Name"
        , task."Earliest Task Reported Date"
        , task."Governance Date"
        , CASE
            WHEN task."Task Short Description" LIKE 'C2%' THEN 'C2 Milestones'
            WHEN task."Task Short Description" IN ('PROJ_EXT_INFL', 'PROJ_COMP_INFL') THEN 'External News'
            WHEN task."Task Short Description" IN ('PivotalResults', 'ClinDosRngRes', 'PoCRes') THEN 'Key Results'
            WHEN task."Task Short Description" IN ('FDIH', 'FirstPhIIDose', 'PhIIIStart') THEN 'Phase 1, 2, 3 start'
            WHEN task."Task Short Description" IN ('MAA', 'NDA', '1stINDsub') OR task."Task Short Description" LIKE 'SUBMIT%' OR task."Task Short Description" LIKE '%APPROVAL' OR task."Task Short Description" LIKE '%LAUNCH'
                THEN 'Regulatory Submission / Approval / Launch'
            ELSE 'Project Milestone'
          END AS "Task Category"
        , task."Task Short Description"
        , CASE
            WHEN task."Earliest Task Reported Date" < CURRENT_DATE() THEN 'Achieved'
            WHEN task."Task Actual End Date" IS NOT NULL OR task."Task Actual Start Date" IS NOT NULL THEN 'Achieved'
            WHEN task."Task Planned Start Date" IS NULL AND task."Task Planned End Date" IS NULL THEN 'N/A'
            WHEN task."project_status_long_name" IN ('On Hold', 'Under Review', 'Termination Proposed') THEN task."project_status_long_name"
            ELSE 'Planned'
          END AS "Task Milestone Status"
        , task."Is Key Inflection Point"
        , task."Is Project Milestone"
    FROM (
        SELECT
              tsk."activity_key" AS "Task Key"
            , fee."Project Key" AS "Project Key"
            , tsk."internal_activity_number" AS "Task Code"
            , tsk."activity_description" AS "Task Description"
            , tsk."activity_scope_name" AS "Task Scope Name"
            , tsk."activity_type_name" AS "Task Type Code"
            , tsk."activity_actual_end_date" AS "Task Actual End Date"
            , tsk."activity_actual_start_date" AS "Task Actual Start Date"
            , tsk."activity_planned_end_date" AS "Task Planned End Date"
            , tsk."activity_planned_start_date" AS "Task Planned Start Date"
            , gov_baseline."Governance Date"
            , CASE
                WHEN tsk."activity_type_name" = 'GOV_REV' THEN
                    CASE
                        WHEN tsk."activity_description" LIKE '%PIB%' THEN 'GOV PIB'
                        WHEN tsk."activity_description" LIKE '%DRB%' THEN 'GOV DRB'
                        WHEN tsk."activity_description" LIKE '%NPSB%' THEN 'GOV NPSB'
                        WHEN tsk."activity_description" LIKE '%GSB%' THEN 'GOV GPSB'
                        WHEN tsk."activity_description" LIKE '%RIB%' THEN 'GOV RIB'
                        WHEN tsk."activity_description" LIKE '%RRB%' THEN 'GOV RRB'
                        WHEN tsk."activity_description" LIKE '%CMC Board%' THEN 'GOV CMC Board'
                        WHEN tsk."activity_description" LIKE '%FRC%' THEN 'GOV FRC'
                        WHEN tsk."activity_description" LIKE '%GHPRT%' THEN 'GOV GHPRT'
                        WHEN tsk."activity_description" LIKE '%GHIB%' THEN 'GOV GHIB'
                        WHEN tsk."activity_description" LIKE '%CMC%' THEN 'GOV CMCST'
                        WHEN tsk."activity_description" LIKE '%EDF%' THEN 'GOV EDF'
                        WHEN tsk."activity_description" LIKE '%TRF%' THEN 'GOV CMCST'
                        ELSE 'Other'
                    END
                WHEN COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name") = 'PivData' THEN 'PivotalResults'
                WHEN COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name") = 'AprvEU' THEN 'ApproveEU'
                WHEN COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name") = 'AprovUS' THEN 'ApproveUS'
                WHEN (tsk."activity_type_name" = 'POC' AND prj."project_modality_type_derived" = 'Vaccine') OR tsk."activity_type_name" = 'POC_ONSET' THEN 'PoCOnset'
                WHEN (tsk."activity_type_name" = 'PH2A_RES' AND prj."project_modality_type_derived" <> 'Vaccine') OR tsk."activity_type_name" = 'POC_RESULTS' THEN 'PoCRes'
                WHEN (tsk."activity_type_name" = 'PH2A_RES' AND prj."project_modality_type_derived" = 'Vaccine') THEN tsk."activity_type_name"
                ELSE COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name")
              END AS "Task Short Description"
            , COALESCE(tsk."activity_actual_end_date", tsk."activity_actual_start_date", tsk."activity_planned_end_date", tsk."activity_planned_start_date") AS "Earliest Task Reported Date"
            , prj."project_status_long_name"
            , CASE
                WHEN (
                    (fmi."project_milestone_flag" = TRUE OR fmi."inflection_point_flag" = TRUE OR tsk."activity_type_name" = 'INFLECTIONS' OR tsk."activity_workpackage_code" = 'Inflection')
                    OR tsk."internal_activity_number" IN (
                        '401683633564','401683634064','405884783564','262529139464','380960197064',
                        '124561135554','404648506864','382068266864','422215763564','420534783564','420543596664',
                        '414870587964','422234373664','124417952054','405813037164','405637873164','393021956564',
                        '404521359964','393014651864','420534783764','432989606264','125030367064','242826787764',
                        '117843795754','424123440664','439028478164','389216122864','429930551664','431268979564','401348979664','117837605854',
                        '423632723764','440853453864','183781724164','151701696164','435255944664','117955381254','117955929254',
                        '429246190564','117993021254','448710462764','450555088064','450896669564','450883826064','450896665164','450854719264',
                        '450523283264'
                    )
                )
                AND pln."plan_business_state" IN ('Active', 'Closed', 'Completed', 'Migrated')
                AND prj."project_source" = 'MDM'
                AND prj."project_status_long_name" IN ('Active', 'Proposed')
                    THEN 'Y'
                ELSE 'N'
              END AS "Is Key Inflection Point"
            , CASE
                WHEN pln."plan_type_name" IN ('MDP', 'PCMP', 'PT')
                 AND pln."plan_business_state" IN ('Active', 'Closed')
                 AND (fmi."project_milestone_flag" = TRUE OR tsk."activity_scope_name" = 'Project Milestone')
                    THEN CASE
                        WHEN COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name") IN ('PoCOnset', 'PoCRes') THEN 'Y'
                        WHEN COALESCE(lkp."project_milestone_abbreviation_legacy", tsk."activity_type_name") NOT IN ('PH2A_RES', 'POC') THEN 'Y'
                        ELSE 'N'
                    END
                ELSE 'N'
              END AS "Is Project Milestone"
        FROM PPRM_PROD.CONF_FD.D_ACTIVITY AS tsk
        LEFT JOIN cte_abbr_lookup AS lkp
          ON lkp."activity_type_name" = tsk."activity_type_name"
        LEFT JOIN PPRM_PROD.CONF_FD.F_MILESTONE_AND_INFLECTION AS fmi
          ON fmi."activity_key" = tsk."activity_key"
         AND fmi."latest_snapshot_flag" = FALSE
         AND fmi."activity_key" <> -1
        LEFT JOIN (
            SELECT
                  CAST(tsk."activity_origin_number" AS VARCHAR) AS "activity_origin_number"
                , COALESCE(tsk."activity_actual_end_date", tsk."activity_actual_start_date", tsk."activity_planned_end_date", tsk."activity_planned_start_date") AS "Governance Date"
            FROM PPRM_PROD.CONF_FD.D_BASELINE_ACTIVITY AS tsk
            JOIN PPRM_PROD.CONF_FD.F_BASELINE_ESTIMATED_SCHEDULE AS fee
              ON tsk."baseline_activity_key" = fee."baseline_activity_key"
             AND fee."latest_snapshot_flag" = FALSE
            JOIN PPRM_PROD.CONF_FD.B_PLAN_TO_BASELINE_PLAN AS bpln
              ON bpln."baseline_plan_key" = fee."baseline_plan_key"
             AND bpln."latest_approved_governance_flag" = TRUE
             AND bpln."latest_monthly_snapshot_flag" = FALSE
             AND bpln."latest_snapshot_flag" = FALSE
        ) AS gov_baseline
          ON tsk."internal_activity_number" = gov_baseline."activity_origin_number"
        JOIN (
            SELECT
                  fee."project_key" AS "Project Key"
                , fee."plan_key" AS "Plan Key"
                , fee."activity_key" AS "Task Key"
            FROM PPRM_PROD.CONF_FD.F_ESTIMATED_SCHEDULE AS fee
            WHERE fee."latest_snapshot_flag" = FALSE
              AND fee."activity_key" <> -1
        ) AS fee
          ON tsk."activity_key" = fee."Task Key"
        JOIN PPRM_PROD.CONF_FD.D_PLAN AS pln
          ON fee."Plan Key" = pln."plan_key"
         AND pln."latest_snapshot_flag" = FALSE
        JOIN PPRM_PROD.CONF_FD.D_PROJECT AS prj
          ON fee."Project Key" = prj."project_key"
         AND prj."project_source" IN ('PDM-Legacy', 'PLM-Legacy', 'MDM')
         AND prj."latest_snapshot_flag" = FALSE
        WHERE tsk."latest_snapshot_flag" = FALSE
          AND fee."Project Key" = {{projectKey}}
    ) AS task
    WHERE task."Is Project Milestone" = 'Y'
       OR task."Is Key Inflection Point" = 'Y'
)
SELECT
      CAST("Task Key" AS VARCHAR) AS "Task ID"
    , CASE
        WHEN "Task Scope Name" = 'Project Milestone' THEN "Task Short Description"
        ELSE "Task Description"
      END AS "Task Name"
    , TO_CHAR("Earliest Task Reported Date", 'YYYY-MM-DD') AS "Start Date"
    , TO_CHAR("Earliest Task Reported Date", 'YYYY-MM-DD') AS "End Date"
    , CASE
        WHEN "Task Milestone Status" = 'Achieved' THEN 100
        ELSE 0
      END AS "Progress"
    , 'milestone' AS "Task Type"
    , NULL AS "Parent Task ID"
    , "Task Category" AS "Phase"
    , CONCAT('Governance: ', COALESCE(TO_CHAR("Governance Date", 'YYYY-MM-DD'), 'N/A')) AS "Context"
FROM cte_milestones
WHERE "Earliest Task Reported Date" IS NOT NULL
ORDER BY "Start Date", "Task Name";
