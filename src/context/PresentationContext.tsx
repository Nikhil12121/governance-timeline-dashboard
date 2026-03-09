import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Presentation, Slide } from '@/types/presentation'
import { dummyPresentation } from '@/data/dummyPresentation'

interface PresentationContextValue {
  presentation: Presentation
  setPresentation: (p: Presentation) => void
  updateSlide: (id: string, patch: Partial<Slide>) => void
  addSlide: (slide: Slide, afterIndex?: number) => void
  removeSlide: (id: string) => void
  reorderSlides: (fromIndex: number, toIndex: number) => void
}

const PresentationContext = createContext<PresentationContextValue | null>(null)

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [presentation, setPresentation] = useState<Presentation>(dummyPresentation)

  const updateSlide = useCallback((id: string, patch: Partial<Slide>) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ) as Slide[],
    }))
  }, [])

  const addSlide = useCallback((slide: Slide, afterIndex?: number) => {
    setPresentation((prev) => {
      const slides = [...prev.slides]
      const idx = afterIndex ?? slides.length
      slides.splice(idx, 0, slide)
      return { ...prev, slides }
    })
  }, [])

  const removeSlide = useCallback((id: string) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.filter((s) => s.id !== id),
    }))
  }, [])

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    setPresentation((prev) => {
      const slides = [...prev.slides]
      const [removed] = slides.splice(fromIndex, 1)
      slides.splice(toIndex, 0, removed)
      return { ...prev, slides }
    })
  }, [])

  const value: PresentationContextValue = {
    presentation,
    setPresentation,
    updateSlide,
    addSlide,
    removeSlide,
    reorderSlides,
  }

  return (
    <PresentationContext.Provider value={value}>
      {children}
    </PresentationContext.Provider>
  )
}

export function usePresentation() {
  const ctx = useContext(PresentationContext)
  if (!ctx) throw new Error('usePresentation must be used within PresentationProvider')
  return ctx
}
