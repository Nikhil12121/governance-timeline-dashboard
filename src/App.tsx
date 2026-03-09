import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TimelineProvider } from '@/context/TimelineContext'
import { PresentationProvider } from '@/context/PresentationContext'
import { Layout } from '@/components/layout/Layout'
import { GovernancePPTPage } from '@/pages/GovernancePPTPage'

export default function App() {
  return (
    <BrowserRouter>
      <TimelineProvider>
        <PresentationProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<GovernancePPTPage />} />
            </Route>
          </Routes>
        </PresentationProvider>
      </TimelineProvider>
    </BrowserRouter>
  )
}
