function yearFromDateKey(dateKey) {
  return String(dateKey).slice(0, 4)
}

function formatNumber(value, digits = 1) {
  return Number(value || 0).toFixed(digits)
}

function formatMillions(value) {
  return formatNumber((value || 0) / 1_000_000, 1)
}

function sum(rows, accessor) {
  return rows.reduce((total, row) => total + (accessor(row) || 0), 0)
}

function uniqueYears(actualRows, forecastRows) {
  return [...new Set([...actualRows, ...forecastRows].map((row) => yearFromDateKey(row.dateKey)))].sort()
}

function groupByYear(rows) {
  return rows.reduce((acc, row) => {
    const year = yearFromDateKey(row.dateKey)
    acc[year] ??= []
    acc[year].push(row)
    return acc
  }, {})
}

function buildFinancials(actualRows, forecastRows) {
  const years = uniqueYears(actualRows, forecastRows)
  const actualByYear = groupByYear(actualRows)
  const forecastByYear = groupByYear(forecastRows)

  const actualFte = years.map((year) => sum(actualByYear[year] ?? [], (row) => row.fte))
  const actualIpe = years.map((year) => sum(actualByYear[year] ?? [], (row) => row.ipeAmountGbp))
  const actualEpe = years.map((year) => sum(actualByYear[year] ?? [], (row) => row.epeAmountGbp))
  const forecastFte = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.currentForecastFte))
  const forecastIpe = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.ipeAmountGbp))
  const forecastEpe = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.epeAmountGbp))
  const governanceFte = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.governanceApprovedFte))
  const governanceIpe = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.governanceIpeAmountGbp))
  const governanceEpe = years.map((year) => sum(forecastByYear[year] ?? [], (row) => row.governanceEpeAmountGbp))

  return {
    yearHeaders: ['Metric', ...years, 'Total (£m/FTE)'],
    rows: [
      { label: 'Actual FTE', values: [...actualFte.map((value) => formatNumber(value)), formatNumber(sum(actualRows, (row) => row.fte))] },
      { label: 'Actual IPE (£m)', values: [...actualIpe.map(formatMillions), formatMillions(sum(actualRows, (row) => row.ipeAmountGbp))] },
      { label: 'Actual EPE (£m)', values: [...actualEpe.map(formatMillions), formatMillions(sum(actualRows, (row) => row.epeAmountGbp))] },
      { label: 'Forecast FTE', values: [...forecastFte.map((value) => formatNumber(value)), formatNumber(sum(forecastRows, (row) => row.currentForecastFte))] },
      { label: 'Forecast IPE (£m)', values: [...forecastIpe.map(formatMillions), formatMillions(sum(forecastRows, (row) => row.ipeAmountGbp))] },
      { label: 'Forecast EPE (£m)', values: [...forecastEpe.map(formatMillions), formatMillions(sum(forecastRows, (row) => row.epeAmountGbp))] },
      { label: 'Governance Approved FTE', values: [...governanceFte.map((value) => formatNumber(value)), formatNumber(sum(forecastRows, (row) => row.governanceApprovedFte))] },
      { label: 'Governance IPE (£m)', values: [...governanceIpe.map(formatMillions), formatMillions(sum(forecastRows, (row) => row.governanceIpeAmountGbp))] },
      { label: 'Governance EPE (£m)', values: [...governanceEpe.map(formatMillions), formatMillions(sum(forecastRows, (row) => row.governanceEpeAmountGbp))] },
    ],
  }
}

function buildResourceDemand(forecastRows, roleLabels) {
  const years = [...new Set(forecastRows.map((row) => yearFromDateKey(row.dateKey)))].sort()
  const roleKeys = [...new Set(forecastRows.map((row) => row.personRoleKey).filter((key) => key !== '-1'))].sort()

  const rows = roleKeys.map((roleKey) => {
    const roleRows = forecastRows.filter((row) => row.personRoleKey === roleKey)
    const fteByYear = years.map((year) =>
      sum(roleRows.filter((row) => yearFromDateKey(row.dateKey) === year), (row) => row.currentForecastFte)
    )
    const totalFte = sum(roleRows, (row) => row.currentForecastFte)
    const totalIpe = sum(roleRows, (row) => row.ipeAmountGbp)
    const governanceFte = sum(roleRows, (row) => row.governanceApprovedFte)

    return {
      name: roleLabels[roleKey] ?? `Person Role ${roleKey}`,
      values: [
        ...fteByYear.map((value) => formatNumber(value)),
        formatNumber(totalFte),
        formatMillions(totalIpe),
        formatNumber(governanceFte),
      ],
    }
  })

  const totals = years.map((year) =>
    sum(forecastRows.filter((row) => row.personRoleKey !== '-1' && yearFromDateKey(row.dateKey) === year), (row) => row.currentForecastFte)
  )
  const totalFte = sum(forecastRows.filter((row) => row.personRoleKey !== '-1'), (row) => row.currentForecastFte)
  const totalIpe = sum(forecastRows.filter((row) => row.personRoleKey !== '-1'), (row) => row.ipeAmountGbp)
  const totalGovernanceFte = sum(forecastRows.filter((row) => row.personRoleKey !== '-1'), (row) => row.governanceApprovedFte)

  return {
    columnHeaders: ['R&D Function', ...years.map((year) => `${year} FTE`), 'Total FTE', 'Total IPE (£m)', 'Gov FTE'],
    groups: [{ groupName: 'Forecast resource demand', rows }],
    totalRow: ['Total', ...totals.map((value) => formatNumber(value)), formatNumber(totalFte), formatMillions(totalIpe), formatNumber(totalGovernanceFte)],
  }
}

export function buildAssetOptions(projectRows) {
  return projectRows.map((project) => ({
    projectKey: project.projectKey,
    projectId: project.projectId,
    assetName: project.assetName,
    label: `${project.assetName} (${project.projectId})`,
  }))
}

export function buildGovernanceResponse(projectRow, actualRows, forecastRows, timelineTasks, roleLabels, milestoneTimelineRows = []) {
  return {
    project: projectRow,
    timelineTasks,
    financials: buildFinancials(actualRows, forecastRows),
    resourceDemand: buildResourceDemand(forecastRows, roleLabels),
    milestoneTimelineRows: Array.isArray(milestoneTimelineRows) ? milestoneTimelineRows : [],
  }
}
