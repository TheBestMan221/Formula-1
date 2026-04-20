import { Loader2 } from 'lucide-react'

export function Spinner({ size = 24, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-[#E10600] ${className}`} />
}

export function Card({ children, className = '', hover = true }) {
  return (
    <div className={`f1-card ${hover ? 'hover:border-[#E10600]' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, sub, accent = false }) {
  return (
    <Card className="text-center">
      <div className={`text-2xl font-bold ${accent ? 'text-[#FFD700]' : 'text-[#E10600]'}`}
        style={{ fontFamily: 'Bebas Neue' }}>
        {value}
      </div>
      <div className="text-[#aaa] text-sm mt-1">{label}</div>
      {sub && <div className="text-[#666] text-xs mt-1">{sub}</div>}
    </Card>
  )
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="section-header gradient-text">{title}</h1>
      {subtitle && <p className="text-[#888] text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

export function TyreBadge({ compound }) {
  const colors = {
    Soft: 'bg-red-600 text-white',
    Medium: 'bg-yellow-400 text-black',
    Hard: 'bg-gray-200 text-black',
    Intermediate: 'bg-green-500 text-white',
    Wet: 'bg-blue-500 text-white',
  }
  return (
    <span className={`f1-badge ${colors[compound] || 'bg-[#333] text-white'}`}>
      {compound}
    </span>
  )
}

export function PositionBadge({ pos }) {
  const cls = pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : pos === 3 ? 'pos-3' : 'pos-other'
  return <span className={`position-badge ${cls}`}>{pos}</span>
}

export function RiskBadge({ level }) {
  const colors = {
    Low: 'bg-green-900/50 text-green-400 border border-green-800',
    Medium: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
    High: 'bg-orange-900/50 text-orange-400 border border-orange-800',
    'Very High': 'bg-red-900/50 text-red-400 border border-red-800',
  }
  return (
    <span className={`f1-badge ${colors[level] || 'bg-gray-800 text-gray-300'}`}>
      {level} Risk
    </span>
  )
}

export function AiInsightBox({ text, loading }) {
  return (
    <div className="border border-[#E10600]/30 bg-[#1a0000]/50 rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#E10600] animate-pulse" />
        <span className="text-[#E10600] text-xs font-bold uppercase tracking-widest">AI Insight</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-[#666] text-sm">Generating insight...</span>
        </div>
      ) : (
        <p className="text-[#ccc] text-sm leading-relaxed">{text}</p>
      )}
    </div>
  )
}

export function ProbBar({ label, value, color = '#E10600' }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#aaa]">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label className="block text-[#aaa] text-sm mb-2">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors"
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

export function Input({ label, value, onChange, type = 'text', min, max, step }) {
  return (
    <div>
      {label && <label className="block text-[#aaa] text-sm mb-2">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min}
        max={max}
        step={step}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors"
      />
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
      ⚠️ {message || 'Something went wrong. Make sure the backend is running.'}
    </div>
  )
}

export function EmptyState({ message = 'No data available', icon = '📊' }) {
  return (
    <div className="text-center py-16 text-[#555]">
      <div className="text-4xl mb-3">{icon}</div>
      <div>{message}</div>
    </div>
  )
}
