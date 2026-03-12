import { Link, useLocation } from 'react-router-dom'

const GSK_ORANGE = '#E87722'
/** Dark orange to match GSK theme – clearly orange, not black */
const SIDEBAR_BG = '#9C4A1A'
const nav = [{ to: '/', label: 'Governance PPT' }]

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation()
  const logoUrl = `${import.meta.env.BASE_URL}gsk-logo.svg?v=2`

  if (!open) {
    return (
      <aside
        className="w-14 flex flex-col items-center shrink-0 py-4 border-r border-slate-200"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-lg text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: GSK_ORANGE }}
          title="Open panel"
          aria-label="Open panel"
        >
          <span className="text-lg leading-none">▶</span>
        </button>
        <div className="mt-4 h-8 flex items-center justify-center">
          <img src={logoUrl} alt="GSK" className="h-6 w-6 object-contain" />
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="w-56 flex flex-col min-h-screen shrink-0 transition-[width]"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="h-8 flex items-center min-w-0">
            <img src={logoUrl} alt="GSK" className="h-7" />
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: GSK_ORANGE }}
            title="Close panel"
            aria-label="Close panel"
          >
            <span className="text-sm leading-none">◀</span>
          </button>
        </div>
        <div className="h-0.5 w-10 rounded-full mb-2" style={{ backgroundColor: GSK_ORANGE }} />
        <h1 className="font-semibold text-lg text-white">Governance Timeline</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Dashboard</p>
      </div>
      <nav className="p-2 flex-1">
        {nav.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'text-white'
                : 'text-slate-300 hover:text-white'
            }`}
            style={location.pathname === to ? { backgroundColor: GSK_ORANGE } : {}}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 text-xs border-t" style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.12)' }}>
        PM governance-quality timelines
      </div>
    </aside>
  )
}
