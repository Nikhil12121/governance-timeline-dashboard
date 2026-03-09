import { Link, useLocation } from 'react-router-dom'

const nav = [{ to: '/', label: 'Governance PPT' }]

export function Sidebar() {
  const location = useLocation()
  return (
    <aside className="w-56 bg-slate-900 text-slate-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-slate-700">
        <img src="/gsk-logo.svg" alt="GSK" className="h-8 mb-2" />
        <h1 className="font-semibold text-lg text-white">Governance Timeline</h1>
        <p className="text-xs text-slate-400 mt-0.5">Dashboard</p>
      </div>
      <nav className="p-2 flex-1">
        {nav.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 text-xs text-slate-500 border-t border-slate-700">
        PM governance-quality timelines
      </div>
    </aside>
  )
}
