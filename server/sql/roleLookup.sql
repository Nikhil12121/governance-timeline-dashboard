SELECT
    pr."resource_key" AS "Person Role Key",
    COALESCE(
        pr."resource_level4",
        pr."resource_level3",
        pr."resource_level2",
        pr."resource_level1",
        pr."internal_resource_id"
    ) AS "Person Role Name"
FROM PPRM_PROD.CONF_FD.D_RESOURCE AS pr
WHERE pr."latest_snapshot_flag" = FALSE
ORDER BY pr."resource_key" ASC;
