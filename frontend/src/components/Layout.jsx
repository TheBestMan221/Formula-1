import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, TrendingUp, Target, Zap, Map, User, Users, BarChart2, Menu, X, Activity, Cpu } from 'lucide-react'

const NAV = [
  { to: '/',        icon: Home,       label: 'Home' },
  { to: '/predict', icon: TrendingUp, label: 'Race Prediction' },
  { to: '/pole',    icon: Target,     label: 'Pole Position' },
  { to: '/simulate',icon: Zap,        label: 'Simulation' },
  { to: '/strategy',icon: Map,        label: 'Strategy' },
  { to: '/drivers', icon: User,       label: 'Drivers' },
  { to: '/teams',   icon: Users,      label: 'Teams' },
  { to: '/models',  icon: BarChart2,  label: 'ML Models' },
  { to: '/mlops',   icon: Cpu,        label: 'MLOps', highlight: true },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111] border-r border-[#1e1e1e] transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:block flex-shrink-0
      `}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e1e1e]">
          <div className="w-8 h-8 bg-[#E10600] rounded-full flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none" style={{ fontFamily: 'Bebas Neue' }}>F1 PREDICT</div>
            <div className="text-[#666] text-xs">ML + MLOps System</div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? 'bg-[#E10600] text-white shadow-lg shadow-red-900/30'
                  : highlight ? 'text-[#E10600] hover:bg-[#E10600]/10 border border-[#E10600]/20'
                  : 'text-[#999] hover:text-white hover:bg-[#1a1a1a]'}
              `}>
              <Icon size={17} />
              {label}
              {highlight && <span className="ml-auto text-xs bg-[#E10600]/20 text-[#E10600] px-1.5 py-0.5 rounded font-bold">NEW</span>}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1e1e1e]">
          <div className="f1-card p-3 text-center">
            <div className="text-[#E10600] text-xs font-bold">FULL MLOPS STACK</div>
            <div className="text-[#555] text-xs mt-1">DVC · Registry · Experiments</div>
            <div className="text-[#444] text-xs">GenAI · Docker · CI/CD</div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] bg-[#0f0f0f] sticky top-0 z-30">
          <button onClick={() => setOpen(!open)} className="lg:hidden text-white">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E10600] animate-pulse" />
            <span className="text-[#666] text-sm">F1 ML Prediction · MLOps · GenAI</span>
          </div>
          <div className="text-[#E10600] text-xs font-bold bg-[#1a0000] px-3 py-1 rounded-full border border-[#E10600]/30">
            LIVE v2.0
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
