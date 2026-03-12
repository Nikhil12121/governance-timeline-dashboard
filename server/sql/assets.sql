SELECT DISTINCT
      prj."project_key" AS "Project Key",
      COALESCE(prj."project_id", prj."project_legacy_id") AS "Project Alternate ID",
      CASE
        WHEN prj."project_modality_type_derived" = 'Vaccine' THEN prj."program_long_name"
        WHEN prj."project_modality_type_derived" = 'Pharma R&D' THEN prj."asset_reported_name"
        ELSE COALESCE(prj."asset_reported_name", prj."program_or_asset_short_name", prj."project_description")
      END AS "Asset Name",
      prj."project_description" AS "Project Description",
      prj."project_short_description" AS "Project Short Description",
      prj."current_phase_long_name" AS "Project Current Phase",
      prj."project_status_long_name" AS "Project Status",
      prj."project_manager" AS "Project Manager Name",
      fun."funder_level_1" AS "Portfolio Owner",
      prj."modification_date" AS "Last Updated"
FROM PPRM_PROD.CONF_FD.D_PROJECT AS prj
LEFT JOIN PPRM_PROD.CONF_FD.B_PROJECT_FUNDER AS fun
  ON prj."project_key" = fun."project_key"
 AND fun."default_funder_flag" = TRUE
 AND fun."latest_snapshot_flag" = FALSE
WHERE prj."project_source" IN ('PDM-Legacy', 'PLM-Legacy', 'MDM')
  AND prj."latest_snapshot_flag" = FALSE
  AND COALESCE(prj."project_id", prj."project_legacy_id") IS NOT NULL
ORDER BY "Asset Name", "Project Alternate ID";
