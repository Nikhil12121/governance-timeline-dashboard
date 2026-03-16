import type { Presentation } from '@/types/presentation'

/**
 * GSK PM Governance presentation – matches the 6 slide formats from the template photos:
 * 1. Cover (title), 2. Consultation objectives, 3. Asset plan Gantt, 4. Financials + Gantt,
 * 5. Scenarios, 6. Resource demand. Template reference: VIDRU Governance Slide library and guidance - December 2025.pptx (project root).
 */
export const dummyPresentation: Presentation = {
  filename: 'PM-Governance-GSK.pptx',
  slides: [
    {
      type: 'title',
      id: 's1-title',
      title: 'GHIB Board',
      subtitle: '*Only retain the Board relevant for your project',
      boardHeading: 'GHIB Board',
      assetName: '[ASSET- NAME]',
      assetDescriptionLine: '[Project ID]: [Asset name] – [Short description]',
      consultationType: '[Type of consultation]',
      consultationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
      projectId: '[Project ID Code]',
      ownerLine: '[Owner name] on behalf of [Team]',
      financePartner: 'Finance partner: [Name]',
    },
    {
      type: 'consultation-objectives',
      id: 's2-consultation',
      title: 'Why does the Team consult VIDRU Board/ DRB/ PIB *?',
      forDecisionIntro: 'Does VIDRU Board/DRB/PIB* approve….?',
      forDecision: [
        'the proposed scenario and associated timelines? Include level of confidence¹',
        '', '', '', '',
      ],
      forInputIntro: 'Team seeks VIDRU Board /DRB/PIB* input on',
      forInput: ['', '', '', '', ''],
      forAwarenessIntro: 'Team is sharing for awareness:',
      forAwareness: ['', '', '', '', ''],
    },
    {
      type: 'timeline',
      id: 's3-asset-plan',
      title: 'Project name (target)',
      subtitle: 'Asset Plan showing Primary indication and Life Cycle Innovation',
    },
    {
      type: 'financials-gantt',
      id: 's4-financials',
      title: 'Project name (target) - indication',
      subtitle: 'High level project plan to launch with financials',
      financialsYears: ['Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Total (£m)'],
      financialsRows: [
        { label: 'Cumulative EPE/IPE to Key inflection points', values: ['8.2/4.1', '18.5/9.2', '42.0/22.0', '85.0/45.0', '—', '—', '—', '—', '—', '—', '—', '223.5'] },
        { label: 'Gross EPE (£m)', values: ['2.1', '5.4', '12.3', '28.5', '35.2', '18.0', '22.0', '15.0', '12.0', '8.0', '5.0', '163.5'] },
        { label: 'IPE (£m)', values: ['1.2', '4.5', '11.0', '22.0', '28.0', '14.0', '18.0', '12.0', '9.0', '6.0', '4.0', '129.7'] },
        { label: 'Milestone payments (£m)', values: ['5.0', '10', '15', '12.5', '—', '—', '—', '—', '—', '—', '—', '42.5'] },
        { label: 'PTRS %', values: ['23', '45', '62', '—', '—', '—', '—', '—', '—', '—', '—', '—'] },
      ],
    },
    {
      type: 'scenarios',
      id: 's5-scenarios',
      title: 'Project name (target) - indication',
      yearHeaders: ['Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Year', 'Total (£m)'],
      scenarios: [
        {
          name: 'Recommended option',
          launchYear: 'Launch 2026',
          rows: [
            { label: 'Cumulative EPE /IPE (£m)', values: ['8.2/4.1', '18.5/9.2', '42.0/22.0', '85.0/45.0', '125.0/68.0', '165.0/92.0', '195.0/115.0', '218.0/132.0', '235.0/145.0', '258.5'] },
            { label: 'PTRS %', values: ['23', '35', '48', '58', '65', '72', '78', '84', '88', '—'] },
          ],
        },
        {
          name: 'Option 2',
          launchYear: 'Launch 2025',
          rows: [
            { label: 'Cumulative EPE /IPE (£m)', values: ['12.0/6.0', '28.0/14.0', '65.0/35.0', '118.0/62.0', '155.0/85.0', '182.0/98.0', '205.0/108.0', '222.0/118.0', '238.0/125.0', '272.5'] },
            { label: 'PTRS %', values: ['28', '42', '55', '64', '70', '76', '80', '85', '88', '—'] },
          ],
        },
        {
          name: 'Option 3',
          launchYear: 'Launch 2027',
          rows: [
            { label: 'Cumulative EPE /IPE (£m)', values: ['5.0/2.5', '12.0/6.0', '28.0/14.0', '55.0/28.0', '82.0/42.0', '108.0/55.0', '132.0/68.0', '155.0/80.0', '178.0/92.0', '198.5'] },
            { label: 'PTRS %', values: ['18', '28', '38', '48', '55', '62', '68', '74', '78', '—'] },
          ],
        },
      ],
    },
    {
      type: 'resource-demand',
      id: 's6-resource',
      title: '<<Project>>: Resource Demand (FTE and IPE) by Function',
      subtitle: '(Title to reflect asset/project code and project name)',
      columnHeaders: ['R&D Function', 'CY FTE', '1Q', '2Q', '3Q', '4Q', 'CY IPE', '2026', '2027', '2028', 'Project Total', 'Prior Approval'],
      groups: [
        {
          groupName: 'Chief Medical Office',
          rows: [
            { name: 'Epidemiology', values: ['2.5', '0.5', '0.6', '0.7', '0.7', '0.8', '1.2', '3.0', '3.2', '3.5', '9.7', '8.5'] },
            { name: 'Safety', values: ['4.0', '1.0', '1.0', '1.0', '1.0', '1.2', '1.5', '4.5', '5.0', '5.2', '14.7', '12.0'] },
            { name: 'Regulatory', values: ['3.0', '0.8', '0.7', '0.8', '0.7', '0.9', '1.1', '3.2', '3.5', '3.8', '10.5', '9.0'] },
          ],
        },
        {
          groupName: 'Development',
          rows: [
            { name: 'Asia Development', values: ['1.5', '0.3', '0.4', '0.4', '0.4', '0.5', '0.6', '1.8', '2.0', '2.2', '6.0', '5.0'] },
            { name: 'Biostatistics', values: ['6.0', '1.5', '1.5', '1.5', '1.5', '2.0', '2.2', '6.5', '7.0', '7.5', '21.0', '18.0'] },
            { name: 'Clinical Operations', values: ['12.0', '3.0', '3.0', '3.0', '3.0', '3.5', '4.0', '12.0', '13.0', '14.0', '39.0', '34.0'] },
            { name: 'Pipeline Project Management', values: ['2.0', '0.5', '0.5', '0.5', '0.5', '0.6', '0.7', '2.0', '2.2', '2.4', '6.6', '5.5'] },
          ],
        },
        {
          groupName: 'Medicine Development and Supply',
          rows: [
            { name: 'Drug Substance', values: ['5.0', '1.2', '1.3', '1.2', '1.3', '1.5', '1.8', '5.2', '5.5', '6.0', '16.7', '14.0'] },
            { name: 'Drug Product', values: ['4.0', '1.0', '1.0', '1.0', '1.0', '1.2', '1.4', '4.0', '4.2', '4.5', '12.7', '11.0'] },
            { name: 'Clinical Supply', values: ['3.0', '0.8', '0.7', '0.8', '0.7', '0.9', '1.0', '2.8', '3.0', '3.2', '9.0', '7.5'] },
          ],
        },
        {
          groupName: 'Therapy Area',
          rows: [
            { name: 'Clinical Science', values: ['8.0', '2.0', '2.0', '2.0', '2.0', '2.2', '2.5', '7.5', '8.0', '8.5', '24.0', '20.0'] },
            { name: 'Research', values: ['6.0', '1.5', '1.5', '1.5', '1.5', '1.8', '2.0', '6.0', '6.5', '7.0', '19.5', '16.0'] },
            { name: 'xDL', values: ['2.0', '0.5', '0.5', '0.5', '0.5', '0.6', '0.7', '2.0', '2.1', '2.2', '6.3', '5.2'] },
          ],
        },
      ],
      totalRow: ['Total:', '58.0', '14.6', '14.8', '15.1', '15.3', '18.2', '21.0', '64.4', '68.4', '73.5', '206.0', '174.7'],
    },
    {
      type: 'summary',
      id: 's7-summary',
      title: 'Summary',
      body: 'Generate from timeline data using the button above, or type your summary here. This slide is included in the exported PPT.',
    },
  ],
}
