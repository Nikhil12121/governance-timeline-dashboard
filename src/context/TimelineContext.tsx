import { createContext, useContext, type ReactNode } from 'react'
import { useTimelineData } from '@/hooks/useTimelineData'

type TimelineContextValue = ReturnType<typeof useTimelineData>

const TimelineContext = createContext<TimelineContextValue | null>(null)

export function TimelineProvider({ children }: { children: ReactNode }) {
  const value = useTimelineData()
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  const ctx = useContext(TimelineContext)
  if (!ctx) throw new Error('useTimeline must be used within TimelineProvider')
  return ctx
}
