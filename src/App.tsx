import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TimelineProvider } from '@/context/TimelineContext'
import { PresentationProvider } from '@/context/PresentationContext'
import { Layout } from '@/components/layout/Layout'
import { GovernancePPTPage } from '@/pages/GovernancePPTPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TimelineProvider>
        <PresentationProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<GovernancePPTPage templateId={1} />} />
              <Route path="template-2" element={<GovernancePPTPage templateId={2} />} />
              <Route path="template-3" element={<GovernancePPTPage templateId={3} />} />
            </Route>
          </Routes>
        </PresentationProvider>
      </TimelineProvider>
    </BrowserRouter>
  )
}
