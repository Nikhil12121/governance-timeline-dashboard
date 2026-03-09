import type { Presentation } from '@/types/presentation'

/**
 * Dummy presentation data – PM can edit all of this in the UI.
 * Matches the kind of content from the Governance PDF (title, timeline, key messages, summary).
 */
export const dummyPresentation: Presentation = {
  filename: 'Governance-Timeline-GSK.pptx',
  slides: [
    {
      type: 'title',
      id: 's1-title',
      title: 'Project Governance – Timeline Overview',
      subtitle: 'Governance-quality timelines | [Your Project Name]',
    },
    {
      type: 'timeline',
      id: 's2-timeline',
      title: 'Governance Timeline',
    },
    {
      type: 'content',
      id: 's3-content',
      title: 'Key messages & objectives',
      bullets: [
        'Standardised, automated way to produce governance-quality timelines.',
        'Flexibility for short- and long-term views for different governance audiences.',
        'Gantt output with ability to add manual context where required.',
        'Fewer tools overall; shared approach for consistency.',
      ],
    },
    {
      type: 'summary',
      id: 's4-summary',
      title: 'Summary',
      body: 'This timeline covers the project phases from Discovery through Build. Key milestones include Requirements sign-off, Design review, IP session checkpoint, and Go-live. Phases: Discovery, Build. Generate or edit this summary in the dashboard before export.',
    },
  ],
}
