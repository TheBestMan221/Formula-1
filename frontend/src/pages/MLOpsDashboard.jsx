import { useEffect, useState } from 'react'
import { getRegistry, getExperiments, getGenAIStatus, getModelPerformance } from '../services/api'
import { SectionHeader, Card, ErrorBox, Spinner } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#E10600] rounded-lg p-3 text-xs">
      <div className="text-white font-bold mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="text-[#aaa]">
          {p.name}: <span style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function StageBadge({ stage }) {
  const colors = {
    production: 'bg-green-900/60 text-green-400 border-green-700',
    staging: 'bg-yellow-900/60 text-yellow-400 border-yellow-700',
    archived: 'bg-gray-900/60 text-gray-400 border-gray-700',
  }
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${colors[stage] || colors.staging}`}>
      {stage}
    </span>
  )
}

function PipelineFlow() {
  const stages = [
    { name: 'data_ingestion', label: 'Data Ingestion', icon: '📥', desc: 'Generate 44k F1 records' },
    { name: 'feature_engineering', label: 'Feature Eng.', icon: '⚙️', desc: 'Elo, rolling, affinity' },
    { name: 'preprocessing', label: 'Preprocessing', icon: '🔧', desc: 'Encode, scale, split' },
    { name: 'training', label: 'Training', icon: '🤖', desc: '8 ML models trained' },
    { name: 'evaluation', label: 'Evaluation', icon: '📊', desc: 'Metrics & confusion matrix' },
    { name: 'model_registry', label: 'Registry', icon: '📋', desc: 'Version & promote' },
  ]
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {stages.map((s, i) => (
        <div key={s.name} className="flex items-center gap-2">
          <div className="bg-[#111] border border-[#E10600]/40 rounded-xl p-3 text-center min-w-[100px]">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-white text-xs font-bold">{s.label}</div>
            <div className="text-[#555] text-xs mt-0.5">{s.desc}</div>
          </div>
          {i < stages.length - 1 && <span className="text-[#333] text-lg">→</span>}
        </div>
      ))}
    </div>
  )
}

export default function MLOpsPage() {
  const [registry, setRegistry] = useState(null)
  const [experiments, setExperiments] = useState([])
  const [genai, setGenai] = useState(null)
  const [models, setModels] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pipeline')

  useEffect(() => {
    Promise.allSettled([
      getRegistry().then(r => setRegistry(r.data)),
      getExperiments().then(r => setExperiments(r.data.runs || [])),
      getGenAIStatus().then(r => setGenai(r.data)),
      getModelPerformance().then(r => setModels(r.data)),
    ])
      .catch(e => setError('Could not load MLOps data. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>

  // Chart data from experiments
  const expChartData = experiments
    .filter(r => r.type === 'classification' && r.metrics?.f1_score)
    .map(r => ({
      model: r.model?.replace(' Regression', '').replace(' Classifier', ''),
      f1: r.metrics?.f1_score,
      acc: r.metrics?.accuracy,
    }))
    .slice(0, 8)

  const regChartData = experiments
    .filter(r => r.type === 'regression' && r.metrics?.r2_score)
    .map(r => ({
      model: r.model?.replace(' Regression', ''),
      r2: r.metrics?.r2_score,
      mae: r.metrics?.mae,
    }))

  const cls = models?.classification || {}
  const reg = models?.regression || {}

  const modelChartData = Object.entries(cls).map(([name, m]) => ({
    name: name.replace(' Regression', '').replace(' Regression', ''),
    Accuracy: m.accuracy,
    'F1 Score': m.f1_score,
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="MLOps Dashboard" subtitle="DVC pipeline · Experiment tracking · Model registry · GenAI integration" />

      {error && <ErrorBox message={error} />}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          ['pipeline', '🔄 DVC Pipeline'],
          ['registry', '📋 Model Registry'],
          ['experiments', '🧪 Experiments'],
          ['models', '📊 Model Metrics'],
          ['genai', '🤖 GenAI'],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === k ? 'bg-[#E10600] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Pipeline tab ── */}
      {tab === 'pipeline' && (
        <div className="space-y-5">
          <Card>
            <h3 className="text-white font-bold mb-5">DVC Pipeline — Stage Flow</h3>
            <div className="overflow-x-auto pb-2">
              <PipelineFlow />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="text-white font-bold mb-4">Run Pipeline</h3>
              <div className="space-y-2">
                {[
                  { cmd: 'make pipeline', desc: 'Full end-to-end pipeline (recommended)' },
                  { cmd: 'dvc repro', desc: 'Run DVC pipeline with caching' },
                  { cmd: 'make train', desc: 'Train all models only' },
                  { cmd: 'make register', desc: 'Register models to registry' },
                  { cmd: 'dvc metrics show', desc: 'Show tracked metrics' },
                  { cmd: 'dvc dag', desc: 'View pipeline DAG' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="bg-[#0f0f0f] rounded-lg p-3">
                    <code className="text-[#E10600] text-sm font-mono">{cmd}</code>
                    <div className="text-[#555] text-xs mt-1">{desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-white font-bold mb-4">Pipeline Parameters (params.yaml)</h3>
              <div className="space-y-2 text-sm">
                {[
                  { section: 'data', key: 'n_races', value: '2,200', desc: 'Training records' },
                  { section: 'data', key: 'test_size', value: '0.20', desc: 'Hold-out split' },
                  { section: 'classification', key: 'RF n_estimators', value: '200', desc: 'Trees in forest' },
                  { section: 'classification', key: 'DT max_depth', value: '8', desc: 'Tree depth limit' },
                  { section: 'regression', key: 'Ridge alpha', value: '1.0', desc: 'L2 regularisation' },
                  { section: 'regression', key: 'Lasso alpha', value: '0.1', desc: 'L1 regularisation' },
                  { section: 'clustering', key: 'K-Means k', value: '4', desc: 'Number of clusters' },
                  { section: 'simulation', key: 'n_simulations', value: '1,000', desc: 'Monte Carlo runs' },
                ].map(({ section, key, value, desc }) => (
                  <div key={key} className="flex items-center justify-between bg-[#111] rounded-lg px-3 py-2">
                    <div>
                      <span className="text-[#E10600] text-xs">[{section}]</span>
                      <span className="text-[#aaa] ml-2">{key}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{value}</div>
                      <div className="text-[#444] text-xs">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-white font-bold mb-3">CI/CD — GitHub Actions (5 Jobs)</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { job: '🔍 Lint', steps: ['flake8', 'black check', 'params.yaml validate', 'dvc.yaml validate'] },
                { job: '🤖 ML Pipeline', steps: ['Data ingestion', 'Feature engineering', 'Train all 8 models', 'Quality gates', 'Upload artifacts'] },
                { job: '🧪 API Tests', steps: ['Start FastAPI', 'Test /health', 'Test /predict', 'Test /simulate', 'Test GenAI module'] },
                { job: '⚛️ Frontend', steps: ['npm install', 'npm run build', 'Verify bundle', 'Upload artifact'] },
                { job: '📋 Summary', steps: ['Print metrics', 'GitHub summary', 'Report results'] },
              ].map(({ job, steps }) => (
                <div key={job} className="bg-[#111] rounded-xl p-3 border border-[#2a2a2a]">
                  <div className="text-white font-bold text-sm mb-2">{job}</div>
                  {steps.map(s => (
                    <div key={s} className="flex items-center gap-1.5 text-xs text-[#666] mb-1">
                      <span className="text-[#E10600]">▸</span> {s}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Registry tab ── */}
      {tab === 'registry' && (
        <div className="space-y-5">
          {!registry ? (
            <Card className="text-center py-10 text-[#444]">
              <div className="text-3xl mb-3">📋</div>
              <div>Registry not found</div>
              <code className="text-xs text-[#666] mt-2 block">python mlops/model_registry/register_models.py</code>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Registry Version', value: `v${registry.version}` },
                  { label: 'Stage', value: <StageBadge stage={registry.stage} /> },
                  { label: 'Champion Classifier', value: registry.champion?.classification, sub: true },
                  { label: 'Champion Regressor', value: registry.champion?.regression, sub: true },
                ].map(({ label, value, sub }) => (
                  <Card key={label} className="text-center">
                    {typeof value === 'string' ? (
                      <div className={`font-bold ${sub ? 'text-base text-white' : 'text-2xl text-[#E10600]'}`}
                        style={!sub ? { fontFamily: 'Bebas Neue' } : {}}>
                        {value}
                      </div>
                    ) : value}
                    <div className="text-[#666] text-xs mt-1">{label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <h3 className="text-white font-bold mb-4">Champion Model Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="text-[#666] text-xs uppercase tracking-wider mb-3">Classification — {registry.champion?.classification}</div>
                    {Object.entries(registry.champion?.classification_metrics || {}).filter(([k]) => typeof registry.champion.classification_metrics[k] === 'number' && k !== 'confusion_matrix').map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-[#111] text-sm">
                        <span className="text-[#666]">{k}</span>
                        <span className="text-[#E10600] font-bold">{typeof v === 'number' ? v.toFixed(4) : v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[#666] text-xs uppercase tracking-wider mb-3">Regression — {registry.champion?.regression}</div>
                    {Object.entries(registry.champion?.regression_metrics || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-[#111] text-sm">
                        <span className="text-[#666]">{k}</span>
                        <span className="text-[#FFD700] font-bold">{typeof v === 'number' ? v.toFixed(4) : v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-white font-bold mb-4">Model Inventory ({Object.keys(registry.models || {}).length} models)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(registry.models || {}).map(([key, m]) => (
                    <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-lg ${m.exists ? 'bg-green-900/20 border border-green-800/40' : 'bg-red-900/20 border border-red-800/40'}`}>
                      <div>
                        <span className="text-sm font-mono text-white">{m.file}</span>
                        <div className="text-xs text-[#555] mt-0.5">SHA256: {m.sha256}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${m.exists ? 'text-green-400' : 'text-red-400'}`}>
                          {m.exists ? `✅ ${m.size_kb}KB` : '❌ Missing'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {registry.history?.length > 0 && (
                <Card>
                  <h3 className="text-white font-bold mb-4">Version History</h3>
                  <div className="space-y-2">
                    {registry.history.filter(h => h.version > 0).map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#111] rounded-lg px-4 py-3 text-sm">
                        <div className="text-[#aaa]">v{h.version} — {h.champion_cls || 'unknown'}</div>
                        <div className="text-[#555] text-xs">{h.stage} · {h.registered_at?.slice(0, 10)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Experiments tab ── */}
      {tab === 'experiments' && (
        <div className="space-y-5">
          {expChartData.length > 0 && (
            <Card>
              <h3 className="text-white font-bold mb-4">Classification Model Comparison (F1 vs Accuracy)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={expChartData}>
                  <XAxis dataKey="model" tick={{ fill: '#666', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="f1" name="F1 Score" fill="#E10600" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acc" name="Accuracy" fill="#FFD700" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <h3 className="text-white font-bold mb-4">All Experiment Runs ({experiments.length})</h3>
            {experiments.length === 0 ? (
              <div className="text-center py-10 text-[#444]">
                <div className="text-3xl mb-3">🧪</div>
                <div>No runs yet — run: <code className="text-[#666]">make train</code></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#555] border-b border-[#1e1e1e]">
                      {['Model', 'Type', 'Run ID', 'F1/R²', 'Acc/MAE', 'Timestamp'].map(h => (
                        <th key={h} className="text-left py-2 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {experiments.map((r, i) => {
                      const isCls = r.type === 'classification'
                      const primary = isCls ? r.metrics?.f1_score : r.metrics?.r2_score
                      const secondary = isCls ? r.metrics?.accuracy : r.metrics?.mae
                      return (
                        <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                          <td className="py-2 px-3 text-white font-medium">{r.model}</td>
                          <td className="py-2 px-3">
                            <span className={`f1-badge text-xs ${isCls ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'}`}>
                              {r.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#444] font-mono text-xs">{r.run_id}</td>
                          <td className="py-2 px-3 text-[#E10600] font-bold">{primary?.toFixed(4)}</td>
                          <td className="py-2 px-3 text-[#FFD700]">{secondary?.toFixed(4)}</td>
                          <td className="py-2 px-3 text-[#555] text-xs">{r.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Models tab ── */}
      {tab === 'models' && (
        <div className="space-y-5">
          {models && (
            <>
              <Card>
                <h3 className="text-white font-bold mb-4">Classification Models — All Metrics (Unit 2)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#555] border-b border-[#1e1e1e]">
                        {['Model', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC', 'AI Insight'].map(h => (
                          <th key={h} className="text-left py-2 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(cls).map(([name, m]) => (
                        <tr key={name} className="border-b border-[#111] hover:bg-[#111]">
                          <td className="py-3 px-3 text-white font-medium whitespace-nowrap">{name}</td>
                          <td className="py-3 px-3 text-[#E10600] font-bold">{m.accuracy}</td>
                          <td className="py-3 px-3 text-[#aaa]">{m.precision}</td>
                          <td className="py-3 px-3 text-[#aaa]">{m.recall}</td>
                          <td className="py-3 px-3 text-[#FFD700] font-bold">{m.f1_score}</td>
                          <td className="py-3 px-3 text-[#aaa]">{m.roc_auc ?? '—'}</td>
                          <td className="py-3 px-3 text-[#666] text-xs max-w-xs truncate">{m.ai_insight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-white font-bold mb-4">Regression Models — All Metrics (Unit 3)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#555] border-b border-[#1e1e1e]">
                        {['Model', 'MAE', 'MSE', 'RMSE', 'R² Score', 'AI Insight'].map(h => (
                          <th key={h} className="text-left py-2 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reg).map(([name, m]) => (
                        <tr key={name} className="border-b border-[#111] hover:bg-[#111]">
                          <td className="py-3 px-3 text-white font-medium whitespace-nowrap">{name}</td>
                          <td className="py-3 px-3 text-[#E10600]">{m.mae}</td>
                          <td className="py-3 px-3 text-[#aaa]">{m.mse}</td>
                          <td className="py-3 px-3 text-[#aaa]">{m.rmse}</td>
                          <td className="py-3 px-3 text-[#FFD700] font-bold">{m.r2_score}</td>
                          <td className="py-3 px-3 text-[#666] text-xs max-w-xs truncate">{m.ai_insight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {modelChartData.length > 0 && (
                <Card>
                  <h3 className="text-white font-bold mb-4">Classification Performance Bar Chart</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={modelChartData}>
                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#666', fontSize: 11 }} domain={[0, 1]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="Accuracy" fill="#E10600" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="F1 Score" fill="#FFD700" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GenAI tab ── */}
      {tab === 'genai' && (
        <div className="space-y-5">
          <Card>
            <h3 className="text-white font-bold mb-4">GenAI Integration Status</h3>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#E10600]/20 flex items-center justify-center text-2xl">🤖</div>
              <div>
                <div className="text-white font-bold">{genai?.provider || 'Rule-based Engine'}</div>
                <div className="text-[#666] text-sm">Active GenAI Provider</div>
              </div>
              <div className="ml-auto">
                <span className={`f1-badge ${genai?.provider?.includes('OpenAI') ? 'bg-green-900/50 text-green-400 border border-green-700' : genai?.provider?.includes('Anthropic') ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-[#2a2a2a] text-[#888]'}`}>
                  {genai?.provider?.includes('OpenAI') ? 'LIVE AI' : genai?.provider?.includes('Anthropic') ? 'LIVE AI' : 'FALLBACK'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total API Calls', value: genai?.usage?.runs?.length ?? 0 },
                { label: 'Total Tokens Used', value: genai?.usage?.total_tokens?.toLocaleString() ?? 0 },
                { label: 'Capabilities', value: genai?.capabilities?.length ?? 6 },
                { label: 'Streaming', value: 'SSE' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#111] rounded-xl p-4 text-center">
                  <div className="text-[#E10600] font-bold text-xl" style={{ fontFamily: 'Bebas Neue' }}>{value}</div>
                  <div className="text-[#555] text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[#666] text-xs uppercase tracking-wider mb-3">Capabilities</div>
              <div className="flex flex-wrap gap-2">
                {(genai?.capabilities || ['race_summary', 'driver_insight', 'strategy_insight', 'model_insight', 'streaming']).map(c => (
                  <span key={c} className="bg-[#1a1a1a] border border-[#E10600]/30 text-[#aaa] text-xs px-3 py-1 rounded-full font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-bold mb-4">Setup GenAI (enable live AI insights)</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-[#111] rounded-lg p-4">
                <div className="text-[#E10600] font-bold mb-2">Option 1: OpenAI (GPT-4o-mini)</div>
                <code className="text-[#aaa] block">OPENAI_API_KEY=sk-your-key-here</code>
                <div className="text-[#555] text-xs mt-1">Get key: platform.openai.com → API Keys</div>
              </div>
              <div className="bg-[#111] rounded-lg p-4">
                <div className="text-[#FFD700] font-bold mb-2">Option 2: Anthropic Claude</div>
                <code className="text-[#aaa] block">ANTHROPIC_API_KEY=sk-ant-your-key</code>
                <div className="text-[#555] text-xs mt-1">Get key: console.anthropic.com</div>
              </div>
              <div className="bg-[#111] rounded-lg p-4">
                <div className="text-[#aaa] font-bold mb-2">Add to .env file (project root)</div>
                <code className="text-[#666] block text-xs">cp .env.example .env && nano .env</code>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-bold mb-4">GenAI Architecture</h3>
            <div className="space-y-3 text-sm text-[#aaa]">
              {[
                { step: '1', title: 'Request comes in', desc: 'Race prediction / strategy / driver query sent to API' },
                { step: '2', title: 'LLM routing', desc: 'OpenAI → Anthropic → Rule-based fallback chain' },
                { step: '3', title: 'Prompt engineering', desc: 'Context-aware F1 prompt built from structured data' },
                { step: '4', title: 'Response', desc: 'AI commentary returned + optionally streamed via SSE' },
                { step: '5', title: 'Usage tracking', desc: 'Token usage logged to genai_usage.json for cost monitoring' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4 bg-[#111] rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-[#E10600] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                  <div>
                    <div className="text-white font-bold text-sm">{title}</div>
                    <div className="text-[#666] text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
