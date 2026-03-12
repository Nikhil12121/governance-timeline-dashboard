SELECT
      "Date Key",
      "Project Key",
      "Plan Key",
      "Person Role Key",
      SUM("FTE Forecast") AS "Current Forecast FTE",
      SUM("IPE Forecast") AS "IPE Amount GBP",
      SUM("EPE Forecast") AS "EPE Amount GBP",
      SUM("Governance Approved FTE") AS "Governance Approved FTE",
      SUM("Governance IPE Amount GBP") AS "Governance IPE Amount GBP",
      SUM("Governance EPE Amount GBP") AS "Governance EPE Amount GBP"
FROM
(
    SELECT
          fee."date_key" AS "Date Key",
          fee."project_key" AS "Project Key",
          fee."plan_key" AS "Plan Key",
          fee."resource_key" AS "Person Role Key",
          SUM(fee."fte_forecast") AS "FTE Forecast",
          SUM(fee."ipe_cost_forecast") AS "IPE Forecast",
          0 AS "EPE Forecast",
          0 AS "Governance Approved FTE",
          0 AS "Governance IPE Amount GBP",
          0 AS "Governance EPE Amount GBP"
    FROM PPRM_PROD.CONF_FD.F_ESTIMATED_EFFORT AS fee
    JOIN PPRM_PROD.CONF_FD.D_PLAN AS pln
      ON fee."plan_key" = pln."plan_key"
    WHERE fee."project_key" <> -1
      AND fee."date_key" >= TO_VARCHAR(YEAR(CURRENT_DATE) - 1) || '0101'
      AND pln."plan_business_state" IN ('Active', 'Closed')
      AND fee."latest_snapshot_flag" = FALSE
    GROUP BY
        fee."date_key",
        fee."project_key",
        fee."plan_key",
        fee."resource_key",
        fee."latest_snapshot_flag"

    UNION ALL

    SELECT
          fee."date_key" AS "Date Key",
          fee."project_key" AS "Project Key",
          btp."plan_key" AS "Plan Key",
          fee."resource_key" AS "Person Role Key",
          0 AS "FTE Forecast",
          0 AS "IPE Forecast",
          0 AS "EPE Forecast",
          SUM(fee."fte_forecast") AS "Governance Approved FTE",
          SUM(fee."ipe_cost_forecast") AS "Governance IPE Amount GBP",
          0 AS "Governance EPE Amount GBP"
    FROM PPRM_PROD.CONF_FD.F_BASELINE_ESTIMATED_EFFORT AS fee
    JOIN PPRM_PROD.CONF_FD.D_BASELINE_PLAN AS pl
      ON fee."baseline_plan_key" = pl."baseline_plan_key"
    JOIN PPRM_PROD.CONF_FD.B_PLAN_TO_BASELINE_PLAN AS btp
      ON btp."baseline_plan_key" = pl."baseline_plan_key"
     AND btp."latest_snapshot_flag" = FALSE
    WHERE fee."date_key" >= CONCAT(YEAR(GETDATE()) - 1, '0101')
      AND btp."latest_approved_governance_flag" = TRUE
    GROUP BY
        fee."date_key",
        fee."project_key",
        btp."plan_key",
        fee."resource_key"

    UNION ALL

    SELECT
          fee."date_key" AS "Date Key",
          fee."project_key" AS "Project Key",
          -1 AS "Plan Key",
          1 AS "Person Role Key",
          0 AS "FTE Forecast",
          0 AS "IPE Forecast",
          SUM(CASE WHEN fee."expense_category" = 'Current Estimate' THEN fee."epe_estimated_cost" END) AS "EPE Forecast",
          0 AS "Governance Approved FTE",
          0 AS "Governance IPE Amount GBP",
          SUM(CASE WHEN fee."expense_category" LIKE 'Update 1%' THEN fee."epe_estimated_cost" END) AS "Governance EPE Amount GBP"
    FROM PPRM_PROD.CONF_FD.F_ESTIMATED_EPE_EXPENSE AS fee
    WHERE (fee."expense_category" = 'Current Estimate' OR fee."expense_category" LIKE 'Update 1%')
      AND fee."project_key" <> -1
      AND fee."date_key" >= TO_VARCHAR(YEAR(CURRENT_DATE) - 1) || '0101'
      AND fee."latest_snapshot_flag" = FALSE
    GROUP BY
        fee."date_key",
        fee."project_key",
        fee."latest_snapshot_flag"
    HAVING SUM(fee."epe_estimated_cost") IS NOT NULL
) AS A
WHERE "Project Key" = {{projectKey}}
GROUP BY
      "Date Key",
      "Project Key",
      "Plan Key",
      "Person Role Key";
