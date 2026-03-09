/**
 * Types for multi-slide presentation (GSK-style deck).
 * PM fills each slide; export produces full PPT in GSK format.
 */

export type SlideType = 'title' | 'timeline' | 'content' | 'summary'

export interface TitleSlide {
  type: 'title'
  id: string
  title: string
  subtitle?: string
}

export interface TimelineSlide {
  type: 'timeline'
  id: string
  title: string
  /** Uses current timeline data from app; no extra fields */
}

export interface ContentSlide {
  type: 'content'
  id: string
  title: string
  /** Bullet points (e.g. key messages, objectives – slide 31 style) */
  bullets: string[]
}

export interface SummarySlide {
  type: 'summary'
  id: string
  title: string
  body: string
}

export type Slide = TitleSlide | TimelineSlide | ContentSlide | SummarySlide

export interface Presentation {
  slides: Slide[]
  filename: string
}
