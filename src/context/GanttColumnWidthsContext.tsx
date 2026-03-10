import { createContext, useContext, type ReactNode } from 'react'

export interface GanttColumnWidths {
  nameWidth: number
  fromWidth: number
  toWidth: number
}

const defaultWidths: GanttColumnWidths = {
  nameWidth: 220,
  fromWidth: 110,
  toWidth: 110,
}

const GanttColumnWidthsContext = createContext<GanttColumnWidths>(defaultWidths)

export function GanttColumnWidthsProvider({
  value,
  children,
}: {
  value: GanttColumnWidths
  children: ReactNode
}) {
  return (
    <GanttColumnWidthsContext.Provider value={value}>
      {children}
    </GanttColumnWidthsContext.Provider>
  )
}

export function useGanttColumnWidths() {
  const ctx = useContext(GanttColumnWidthsContext)
  return ctx ?? defaultWidths
}

/** Format date as DD-MMM-YYYY e.g. 10-Mar-2026 */
export function formatDateDDMMMYYYY(date: Date): string {
  const d = date.getDate()
  const day = d < 10 ? `0${d}` : String(d)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}
