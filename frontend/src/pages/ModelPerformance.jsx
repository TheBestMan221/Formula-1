import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getModelPerformance } from '../services/api'
import { SectionHeader, Card, ErrorBox, Spinner } from '../components/ui'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#E10600] rounded-lg p-3 text-xs">
      <div className="text-white font-bold mb-1">{label}</div>
      {payload.map(p => <div key={p.name} className="text-[#aaa]">{p.name}: <span className="text-[#E10600]">{p.value}</span></div>)}
    </div>
  )
}

function MetricBar({ label, value, max = 1, color = '#E10600' }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#aaa]">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function CMDisplay({ matrix }) {
  if (!matrix || !matrix.length) return null
  const labels = ['Not Top10', 'Top10']
  return (
    <div>
      <div className="text-[#666] text-xs mb-2">Confusion Matrix</div>
      <div className="inline-grid" style={{ gridTemplateColumns: 'auto repeat(2, 64px)', gap: '2px' }}>
        <div />
        {labels.map(l => <div key={l} className="text-[#555] text-xs text-center py-1">{l}</div>)}
        {matrix.map((row, i) => (
          <>
            <div key={`label-${i}`} className="text-[#555] text-xs pr-2 flex items-center">{labels[i]}</div>
            {row.map((val, j) => (
              <div key={j}
                className="h-12 flex items-center justify-center text-sm font-bold rounded"
                style={{
                  background: i === j ? '#E10600' : '#1a1a1a',
                  color: i === j ? '#fff' : '#666',
                }}>
                {val}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  )
}

export default function ModelPerformance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('classification')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getModelPerformance()
      .then(r => {
        setData(r.data)
        const firstCls = Object.keys(r.data.classification || {})[0]
        setSelected(firstCls)
      })
      .catch(() => setError('Model performance not available. Run: python ml_pipeline/train.py'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>
  if (error) return (
    <div className="max-w-4xl mx-auto">
      <SectionHeader title="ML Model Performance" subtitle="Accuracy, F1, Confusion Matrix for all models" />
      <ErrorBox message={error} />
      <Card className="mt-4">
        <h3 className="text-white font-bold mb-3">Quick Start</h3>
        <div className="space-y-2 text-sm text-[#888]">
          <div className="font-mono bg-[#111] px-4 py-2 rounded">cd f1-ml-project</div>
          <div className="font-mono bg-[#111] px-4 py-2 rounded">pip install -r requirements.txt</div>
          <div className="font-mono bg-[#111] px-4 py-2 rounded">python ml_pipeline/data_ingestion.py</div>
          <div className="font-mono bg-[#111] px-4 py-2 rounded">python ml_pipeline/feature_engineering.py</div>
          <div className="font-mono bg-[#111] px-4 py-2 rounded">python ml_pipeline/train.py</div>
          <div className="font-mono bg-[#111] px-4 py-2 rounded">python backend/app.py</div>
        </div>
      </Card>
    </div>
  )

  const cls = data?.classification || {}
  const reg = data?.regression || {}

  const clsChartData = Object.entries(cls).map(([name, m]) => ({
    name: name.replace(' Regression', '').replace(' Classifier', ''),
    Accuracy: m.accuracy,
    'F1 Score': m.f1_score,
    Precision: m.precision,
    Recall: m.recall,
  }))

  const regChartData = Object.entries(reg).map(([name, m]) => ({
    name: name.replace(' Regression', ''),
    'R² Score': m.r2_score,
    MAE: m.mae,
    RMSE: m.rmse,
  }))

  const selectedMetrics = tab === 'classification' ? cls[selected] : reg[selected]

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="ML Model Performance" subtitle="Comprehensive evaluation of all 8 trained models — Units 2, 3, 4" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['classification', '📊 Classification (Unit 2)'], ['regression', '📈 Regression (Unit 3)']].map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setSelected(Object.keys(k === 'classification' ? cls : reg)[0]) }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === k ? 'bg-[#E10600] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model selector */}
        <Card className="lg:col-span-1">
          <h3 className="text-white font-bold mb-4">
            {tab === 'classification' ? 'Classification Models' : 'Regression Models'}
          </h3>
          <div className="space-y-2">
            {Object.keys(tab === 'classification' ? cls : reg).map(name => {
              const m = (tab === 'classification' ? cls : reg)[name]
              const mainMetric = tab === 'classification' ? m.accuracy : m.r2_score
              return (
                <button key={name} onClick={() => setSelected(name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${selected === name ? 'bg-[#E10600] text-white' : 'bg-[#111] text-[#aaa] hover:bg-[#1a1a1a]'}`}>
                  <span className="font-medium">{name}</span>
                  <span className="font-bold">{mainMetric}</span>
                </button>
              )
            })}
          </div>

          {/* Summary info */}
          <div className="mt-4 bg-[#111] rounded-lg p-3 text-xs text-[#666] leading-relaxed">
            {tab === 'classification'
              ? 'Target: Top-10 finish (binary). Trained on 80% of 2,200+ race records. Evaluated on held-out 20% test set.'
              : 'Target: Predicted finish position (1–20). Regression task. R² measures variance explained by model.'}
          </div>
        </Card>

        {/* Metrics detail */}
        <Card className="lg:col-span-2">
          <h3 className="text-white font-bold mb-5">{selected}</h3>
          {selectedMetrics && (
            tab === 'classification' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MetricBar label="Accuracy" value={selectedMetrics.accuracy} />
                  <MetricBar label="F1 Score" value={selectedMetrics.f1_score} color="#FFD700" />
                  <MetricBar label="Precision" value={selectedMetrics.precision} color="#00D2FF" />
                  <MetricBar label="Recall" value={selectedMetrics.recall} color="#00FF87" />
                  {selectedMetrics.roc_auc && (
                    <MetricBar label="ROC AUC" value={selectedMetrics.roc_auc} color="#9B59B6" />
                  )}
                </div>
                <div>
                  <CMDisplay matrix={selectedMetrics.confusion_matrix} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'R² Score', value: selectedMetrics.r2_score, color: '#00FF87', desc: 'Variance explained' },
                    { label: 'MAE', value: selectedMetrics.mae, color: '#FFD700', desc: 'Mean Absolute Error' },
                    { label: 'RMSE', value: selectedMetrics.rmse, color: '#E10600', desc: 'Root Mean Sq Error' },
                  ].map(({ label, value, color, desc }) => (
                    <div key={label} className="bg-[#111] rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold mb-1" style={{ color, fontFamily: 'Bebas Neue' }}>{value}</div>
                      <div className="text-white text-sm font-medium">{label}</div>
                      <div className="text-[#555] text-xs mt-1">{desc}</div>
                    </div>
                  ))}
                </div>
                <MetricBar label="R² Score (higher = better, max 1.0)" value={selectedMetrics.r2_score} color="#00FF87" />
                <MetricBar label="MAE Normalized (lower = better)" value={1 - selectedMetrics.mae / 20} color="#FFD700" />
              </div>
            )
          )}
        </Card>
      </div>

      {/* Comparison chart */}
      <Card className="mt-6">
        <h3 className="text-white font-bold mb-4">
          {tab === 'classification' ? 'Classification Model Comparison' : 'Regression Model Comparison'}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={tab === 'classification' ? clsChartData : regChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
            <YAxis tick={{ fill: '#666', fontSize: 11 }} domain={[0, 1]} />
            <Tooltip content={<CustomTooltip />} />
            {tab === 'classification' ? (
              <>
                <Bar dataKey="Accuracy" fill="#E10600" radius={[4, 4, 0, 0]} />
                <Bar dataKey="F1 Score" fill="#FFD700" radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="R² Score" fill="#00FF87" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* MLOps note */}
      <Card className="mt-4">
        <h3 className="text-white font-bold mb-3">MLOps Pipeline (DVC)</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {['data_ingestion', 'feature_engineering', 'preprocessing', 'training', 'evaluation'].map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="bg-[#111] border border-[#E10600]/30 px-3 py-2 rounded-lg text-[#aaa] font-mono text-xs">{stage}</div>
              {i < 4 && <span className="text-[#333]">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[#555] text-xs">Managed via DVC (dvc.yaml). Run: <span className="font-mono text-[#888]">dvc repro</span> to execute full pipeline.</div>
      </Card>
    </div>
  )
}
