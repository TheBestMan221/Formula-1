import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Target, Zap, Map, User, Users, BarChart2, Activity, ChevronRight } from 'lucide-react'
import { getHealth } from '../services/api'
import { Spinner } from '../components/ui'

const FEATURES = [
  { to: '/predict', icon: TrendingUp, title: 'Race Prediction', desc: 'Predict top-10, podium & position using RF, SVM, Logistic Regression', color: '#E10600' },
  { to: '/pole', icon: Target, title: 'Pole Position', desc: 'Classify pole position probability using ensemble classifiers', color: '#FFD700' },
  { to: '/simulate', icon: Zap, title: 'Monte Carlo Sim', desc: 'Run 1000 simulations for win/podium probability distributions', color: '#00D2FF' },
  { to: '/strategy', icon: Map, title: 'Strategy Engine', desc: 'Optimal pit stop windows & tyre compound recommendations', color: '#00FF87' },
  { to: '/drivers', icon: User, title: 'Driver Analytics', desc: 'Performance metrics, Elo ratings & K-Means clustering', color: '#FF9500' },
  { to: '/teams', icon: Users, title: 'Team Analytics', desc: 'Constructor standings, reliability & team performance trends', color: '#C0C0C0' },
  { to: '/models', icon: BarChart2, title: 'ML Performance', desc: 'Accuracy, F1, MAE, R² for all 8 trained models', color: '#9B59B6' },
]

const STATS = [
  { label: 'Training Records', value: '2,200+' },
  { label: 'ML Models', value: '8' },
  { label: 'Simulations', value: '1,000' },
  { label: 'Features', value: '15+' },
]

export default function Home() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHealth()
      .then((r) => setHealth(r.data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-10 p-10 bg-gradient-to-br from-[#1a0000] via-[#0f0f0f] to-[#0a0a2a] border border-[#2a2a2a]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E10600]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFD700]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#E10600] animate-pulse" />
            <span className="text-[#E10600] text-xs font-bold tracking-widest uppercase">Machine Learning System</span>
          </div>

          <h1 className="text-5xl md:text-7xl text-white mb-4" style={{ fontFamily: 'Bebas Neue', letterSpacing: '0.04em' }}>
            F1 RACE{' '}
            <span className="gradient-text">PREDICTION</span>
            <br />& STRATEGY AI
          </h1>

          <p className="text-[#888] text-lg max-w-2xl mb-8 leading-relaxed">
            A complete ML system using Random Forest, SVM, Ridge Regression, Logistic Regression,
            Naive Bayes, K-Means & Monte Carlo simulation to predict and strategise Formula 1 races.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/predict" className="f1-btn flex items-center gap-2">
              <TrendingUp size={18} /> Start Predicting
            </Link>
            <Link to="/simulate" className="border border-[#E10600] text-[#E10600] px-6 py-3 rounded-lg font-bold hover:bg-[#E10600]/10 transition-all flex items-center gap-2">
              <Zap size={18} /> Run Simulation
            </Link>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="mb-8">
        {loading ? (
          <div className="f1-card flex items-center gap-3 p-4">
            <Spinner size={18} />
            <span className="text-[#666] text-sm">Connecting to backend...</span>
          </div>
        ) : health ? (
          <div className="f1-card flex flex-wrap items-center gap-6 p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-bold">API Online</span>
            </div>
            <div className="text-[#666] text-sm">
              Models loaded: <span className="text-white">{health.models_loaded}</span>
            </div>
            <div className="text-[#666] text-sm">
              Records: <span className="text-white">{health.records?.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="f1-card flex items-center gap-3 p-4 border-yellow-800">
            <span className="text-yellow-500">⚠️</span>
            <span className="text-yellow-500 text-sm">
              Backend offline — run: <code className="bg-[#111] px-2 py-0.5 rounded">python backend/app.py</code>
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map((s) => (
          <div key={s.label} className="f1-card text-center">
            <div className="metric-value">{s.value}</div>
            <div className="text-[#666] text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <h2 className="text-2xl text-white mb-5" style={{ fontFamily: 'Bebas Neue' }}>SYSTEM MODULES</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {FEATURES.map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} className="f1-card group flex flex-col gap-3 hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '22', border: `1px solid ${color}44` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <ChevronRight size={16} className="text-[#444] group-hover:text-[#E10600] transition-colors" />
            </div>
            <div>
              <div className="text-white font-bold text-base">{title}</div>
              <div className="text-[#666] text-sm mt-1 leading-relaxed">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Syllabus alignment */}
      <div className="f1-card">
        <h2 className="text-xl text-white mb-4" style={{ fontFamily: 'Bebas Neue' }}>ML SYLLABUS ALIGNMENT</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { unit: 'Unit 1', topic: 'Data Processing', items: ['Preprocessing', 'Feature Engineering', 'Label Encoding', 'StandardScaler'] },
            { unit: 'Unit 2', topic: 'Classification', items: ['Logistic Regression', 'Decision Tree', 'Random Forest', 'SVM', 'Naive Bayes'] },
            { unit: 'Unit 3', topic: 'Regression', items: ['Linear Regression', 'Ridge Regression', 'Lasso Regression'] },
            { unit: 'Unit 4', topic: 'Unsupervised', items: ['K-Means Clustering', 'Driver Profiling', 'Cluster Visualisation'] },
          ].map(({ unit, topic, items }) => (
            <div key={unit} className="bg-[#111] rounded-xl p-4 border border-[#222]">
              <div className="text-[#E10600] text-xs font-bold uppercase tracking-wider mb-1">{unit}</div>
              <div className="text-white font-bold text-sm mb-3">{topic}</div>
              {items.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[#888] text-xs mb-1">
                  <span className="w-1 h-1 rounded-full bg-[#E10600]" />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
