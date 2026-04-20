import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { simulateRace } from '../services/api'
import { SectionHeader, Card, Select, Input, AiInsightBox, ErrorBox, Spinner, PositionBadge } from '../components/ui'

const TRACKS = ['Bahrain','Saudi Arabia','Australia','Monaco','Spain','Canada','Britain','Italy','Singapore','Japan','Abu Dhabi']
const WEATHER = ['Dry','Wet','Mixed']

const COLORS = ['#E10600','#FFD700','#00D2FF','#00FF87','#FF9500','#9B59B6','#1ABC9C','#E74C3C','#3498DB','#F39C12']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#E10600] rounded-lg p-3 text-sm">
      <div className="text-white font-bold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="text-[#aaa]">{p.name}: <span className="text-[#E10600]">{p.value}%</span></div>
      ))}
    </div>
  )
}

export default function RaceSimulation() {
  const [track, setTrack] = useState('Bahrain')
  const [weather, setWeather] = useState('Dry')
  const [nSims, setNSims] = useState(1000)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeChart, setActiveChart] = useState('win')

  const handleSimulate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await simulateRace({ track, weather, n_simulations: nSims })
      setResult(res.data)
    } catch (e) {
      setError('Simulation failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result?.results?.slice(0, 10).map((r, i) => ({
    driver: r.driver,
    'Win %': r.win_probability,
    'Podium %': r.podium_probability,
    'Top10 %': r.top10_probability,
    color: COLORS[i % COLORS.length]
  }))

  const metricKey = { win: 'Win %', podium: 'Podium %', top10: 'Top10 %' }[activeChart]

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="Monte Carlo Race Simulation" subtitle={`Run up to 1000 simulations to compute win/podium/top-10 probabilities`} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <h2 className="text-white font-bold mb-4">Simulation Setup</h2>
          <div className="space-y-4">
            <Select label="Track" value={track} onChange={setTrack} options={TRACKS} />
            <Select label="Weather" value={weather} onChange={setWeather} options={WEATHER} />
            <Input label="Simulations" value={nSims} onChange={setNSims} type="number" min={100} max={1000} step={100} />

            <div className="bg-[#111] rounded-lg p-3 text-xs text-[#666] leading-relaxed">
              Monte Carlo method: each simulation samples from driver/team performance distributions with added noise. Results converge after ~500 runs.
            </div>

            <button onClick={handleSimulate} disabled={loading} className="f1-btn w-full flex items-center justify-center gap-2">
              {loading ? <><Spinner size={18} /> Running {nSims} sims...</> : `⚡ Simulate ${nSims} Races`}
            </button>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-5">
          {error && <ErrorBox message={error} />}

          {!result && !loading && (
            <Card className="flex items-center justify-center h-64 text-[#444]">
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <div>Configure and run simulation</div>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size={40} className="mx-auto mb-4" />
                <div className="text-[#666]">Running {nSims} Monte Carlo simulations...</div>
                <div className="text-[#444] text-sm mt-1">Sampling from performance distributions</div>
              </div>
            </Card>
          )}

          {result && (
            <>
              {/* Winner highlight */}
              <Card>
                <div className="flex items-center gap-5">
                  <div className="text-5xl">🏆</div>
                  <div>
                    <div className="text-[#888] text-sm uppercase tracking-wider mb-1">Simulation Winner</div>
                    <div className="text-3xl font-bold text-white">{result.metadata?.winner}</div>
                    <div className="text-[#E10600] font-bold">{result.metadata?.winner_win_prob}% win probability</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[#444] text-xs">{result.n_simulations?.toLocaleString()} simulations</div>
                    <div className="text-[#666] text-sm">{result.track} · {result.weather}</div>
                  </div>
                </div>
              </Card>

              {/* Chart */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Probability Distribution</h3>
                  <div className="flex gap-2">
                    {['win', 'podium', 'top10'].map((k) => (
                      <button key={k} onClick={() => setActiveChart(k)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeChart === k ? 'bg-[#E10600] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'}`}>
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="driver" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={metricKey} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Driver table */}
              <Card>
                <h3 className="text-white font-bold mb-4">Full Driver Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#555] border-b border-[#1e1e1e]">
                        <th className="text-left py-2 px-2">Pos</th>
                        <th className="text-left py-2 px-2">Driver</th>
                        <th className="text-right py-2 px-2">Win %</th>
                        <th className="text-right py-2 px-2">Podium %</th>
                        <th className="text-right py-2 px-2">Top10 %</th>
                        <th className="text-right py-2 px-2">Avg Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results?.map((r, i) => (
                        <tr key={r.driver} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                          <td className="py-2 px-2"><PositionBadge pos={i + 1} /></td>
                          <td className="py-2 px-2 text-white font-medium">{r.driver}</td>
                          <td className="py-2 px-2 text-right text-[#E10600] font-bold">{r.win_probability}%</td>
                          <td className="py-2 px-2 text-right text-[#FFD700]">{r.podium_probability}%</td>
                          <td className="py-2 px-2 text-right text-[#aaa]">{r.top10_probability}%</td>
                          <td className="py-2 px-2 text-right text-[#666]">P{r.avg_predicted_position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {result.ai_insight && <AiInsightBox text={result.ai_insight} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
