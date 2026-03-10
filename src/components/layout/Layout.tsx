import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const GSK_ORANGE = '#E87722'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <div className="h-1 shrink-0" style={{ backgroundColor: GSK_ORANGE }} aria-hidden />
      <div className="flex flex-1 min-h-0">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
