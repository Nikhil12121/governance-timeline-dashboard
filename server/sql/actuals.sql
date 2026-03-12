SELECT
    act."project_code_id_l_id",
    act."Date Key" AS "Date Key",
    act."Project Key" AS "Project Key",
    act."Person Role Key" AS "Person Role Key",
    SUM(act.FTE) AS "FTE",
    SUM(act."IPE Amount GBP") AS "IPE Amount GBP",
    SUM(act."EPE Amount GBP") AS "EPE Amount GBP"
FROM
(
    SELECT
        COALESCE(prj."project_id", prj."project_legacy_id") AS "project_code_id_l_id",
        fa."date_key" AS "Date Key",
        COALESCE(fa."project_key", prj."project_key") AS "Project Key",
        fa."resource_key" AS "Person Role Key",
        NULL AS "EPE Amount GBP",
        SUM(fa."ipe_cost_actual") AS "IPE Amount GBP",
        SUM(fa."actual_fte") AS "FTE"
    FROM PPRM_PROD.CONF_FD.F_ACTUAL_EFFORT AS fa
    JOIN PPRM_PROD.CONF_FD.D_PROJECT AS prj
        ON fa."project_key" = prj."project_key"
       AND prj."project_source" IN ('MDM', 'PDM-Legacy', 'PLM-Legacy')
    WHERE fa."latest_snapshot_flag" = FALSE
      AND prj."latest_snapshot_flag" = FALSE
      AND fa."date_key" >= TO_VARCHAR(YEAR(CURRENT_DATE()) - 1) || '0101'
      AND fa."project_key" <> -1
    GROUP BY
        fa."date_key",
        COALESCE(fa."project_key", prj."project_key"),
        fa."resource_key",
        COALESCE(prj."project_id", prj."project_legacy_id")

    UNION ALL

    SELECT
        COALESCE(prj."project_id", prj."project_legacy_id") AS "project_code_id_l_id",
        fee."date_key" AS "Date Key",
        COALESCE(fee."project_key", prj."project_key") AS "Project Key",
        -1 AS "Person Role Key",
        SUM(fee."epe_actual_cost") AS "EPE Amount GBP",
        NULL AS "IPE Amount GBP",
        NULL AS "FTE"
    FROM PPRM_PROD.CONF_FD.F_ACTUAL_EPE_EXPENSE AS fee
    JOIN PPRM_PROD.CONF_FD.D_PROJECT AS prj
        ON fee."project_key" = prj."project_key"
       AND prj."project_source" IN ('MDM', 'PDM-Legacy', 'PLM-Legacy')
    WHERE fee."latest_snapshot_flag" = FALSE
      AND prj."latest_snapshot_flag" = FALSE
      AND fee."date_key" >= TO_VARCHAR(YEAR(CURRENT_DATE()) - 1) || '0101'
    GROUP BY
        fee."date_key",
        COALESCE(fee."project_key", prj."project_key"),
        COALESCE(prj."project_id", prj."project_legacy_id")
) AS act
WHERE act."Project Key" = {{projectKey}}
GROUP BY
    act."project_code_id_l_id",
    act."Date Key",
    act."Project Key",
    act."Person Role Key";
