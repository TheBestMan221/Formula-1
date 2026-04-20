import { useState } from 'react'
import { getStrategy } from '../services/api'
import { SectionHeader, Card, Select, Input, TyreBadge, RiskBadge, AiInsightBox, ErrorBox, Spinner } from '../components/ui'

const TRACKS = [
  { value: 'Bahrain', label: 'Bahrain (57 laps)' },
  { value: 'Monaco', label: 'Monaco (78 laps)' },
  { value: 'Britain', label: 'Britain (52 laps)' },
  { value: 'Italy', label: 'Italy (53 laps)' },
  { value: 'Singapore', label: 'Singapore (62 laps)' },
  { value: 'Japan', label: 'Japan (53 laps)' },
  { value: 'Spain', label: 'Spain (66 laps)' },
]
const LAPS_MAP = { Bahrain: 57, Monaco: 78, Britain: 52, Italy: 53, Singapore: 62, Japan: 53, Spain: 66, Abu: 58 }
const WEATHER = ['Dry', 'Wet', 'Mixed']

function StrategyCard({ strategy, highlight }) {
  if (!strategy) return null
  return (
    <div className={`rounded-xl p-5 border transition-all ${highlight ? 'border-[#E10600] bg-[#1a0000]/50' : 'border-[#2a2a2a] bg-[#111]'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-white font-bold text-base">{strategy.name}</div>
          {highlight && <div className="text-[#E10600] text-xs font-bold mt-1 uppercase tracking-wider">⭐ Recommended</div>}
        </div>
        <RiskBadge level={strategy.risk_level} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {strategy.tyre_sequence?.map((t, i) => (
          <div key={i} className="flex items-center gap-1">
            <TyreBadge compound={t} />
            {i < strategy.tyre_sequence.length - 1 && <span className="text-[#444]">→</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
          <div className="text-[#E10600] font-bold text-xl" style={{ fontFamily: 'Bebas Neue' }}>
            {strategy.pit_stops}
          </div>
          <div className="text-[#555] text-xs">Pit Stops</div>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
          <div className="text-[#FFD700] font-bold text-xl" style={{ fontFamily: 'Bebas Neue' }}>
            {strategy.pit_windows?.join(', ')}
          </div>
          <div className="text-[#555] text-xs">Pit Laps</div>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
          <div className="text-white font-bold text-xl" style={{ fontFamily: 'Bebas Neue' }}>
            {strategy.estimated_time_loss}s
          </div>
          <div className="text-[#555] text-xs">Time Loss</div>
        </div>
      </div>
    </div>
  )
}

export default function StrategyPage() {
  const [track, setTrack] = useState('Bahrain')
  const [weather, setWeather] = useState('Dry')
  const [position, setPosition] = useState(5)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    const totalLaps = LAPS_MAP[track] || 57
    try {
      const res = await getStrategy({ track, weather, total_laps: totalLaps, driver_position: position })
      setResult(res.data)
    } catch (e) {
      setError('Strategy fetch failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader title="Race Strategy Engine" subtitle="ML-powered pit stop timing and tyre compound recommendations" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <h2 className="text-white font-bold mb-4">Race Setup</h2>
          <div className="space-y-4">
            <Select label="Track" value={track} onChange={setTrack} options={TRACKS} />
            <Select label="Weather" value={weather} onChange={setWeather} options={WEATHER} />
            <Input label="Current Position" value={position} onChange={setPosition} type="number" min={1} max={20} />

            <div className="bg-[#111] rounded-lg p-3 text-xs text-[#666] leading-relaxed">
              Strategy is computed using tyre degradation models, pit stop time loss, and position-based tactical logic. Rule-based engine with ML feature integration.
            </div>

            <button onClick={handleSubmit} disabled={loading} className="f1-btn w-full flex items-center justify-center gap-2">
              {loading ? <><Spinner size={18} /> Computing...</> : '🗺️ Get Strategy'}
            </button>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          {error && <ErrorBox message={error} />}

          {!result && !loading && (
            <Card className="flex items-center justify-center h-64 text-[#444]">
              <div className="text-center">
                <div className="text-4xl mb-3">🗺️</div>
                <div>Select track and get strategy</div>
              </div>
            </Card>
          )}

          {loading && <Card className="flex items-center justify-center h-64"><Spinner size={40} /></Card>}

          {result && (
            <>
              {/* Recommended */}
              <StrategyCard strategy={result.recommended_strategy} highlight />

              {/* Alternative */}
              {result.alternative_strategy && (
                <>
                  <div className="text-[#555] text-sm font-bold uppercase tracking-wider">Alternative Options</div>
                  {result.all_strategies?.slice(1, 3).map((s, i) => (
                    <StrategyCard key={i} strategy={s} />
                  ))}
                </>
              )}

              {/* Tactical Notes */}
              {result.tactical_notes?.length > 0 && (
                <Card>
                  <h3 className="text-white font-bold mb-4">Tactical Notes</h3>
                  <div className="space-y-2">
                    {result.tactical_notes.map((note, i) => (
                      <div key={i} className="text-[#aaa] text-sm bg-[#111] rounded-lg px-4 py-3 leading-relaxed">
                        {note}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {result.ai_insight && <AiInsightBox text={result.ai_insight} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
