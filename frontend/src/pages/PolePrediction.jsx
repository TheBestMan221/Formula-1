import { useState } from 'react'
import { predictRace } from '../services/api'
import { SectionHeader, Card, Select, Input, ProbBar, ErrorBox, Spinner, AiInsightBox } from '../components/ui'

const DRIVERS = ['Verstappen','Hamilton','Leclerc','Norris','Sainz','Perez','Russell','Alonso','Bottas','Ricciardo','Gasly','Ocon','Stroll','Magnussen','Tsunoda']
const TEAMS = ['Red Bull','Mercedes','Ferrari','McLaren','Aston Martin','Alpine','AlphaTauri','Alfa Romeo','Haas','Williams']
const TRACKS = ['Bahrain','Saudi Arabia','Australia','Monaco','Spain','Britain','Italy','Singapore','Japan','Abu Dhabi']
const WEATHER = ['Dry','Wet','Mixed']

export default function PolePrediction() {
  const [driver, setDriver] = useState('Verstappen')
  const [team, setTeam] = useState('Red Bull')
  const [track, setTrack] = useState('Bahrain')
  const [weather, setWeather] = useState('Dry')
  const [qualiTime, setQualiTime] = useState(82.5)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await predictRace({
        driver, team, track, weather,
        grid_position: 1, qualifying_position: 1,
        qualifying_time: qualiTime, tyre_compound: 'Soft', pit_stops: 1
      })
      setResult(res.data)
    } catch (e) {
      setError('Prediction failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const poleProb = result?.pole_probability ?? 0

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader title="Pole Position Predictor" subtitle="Classify pole position probability using Random Forest ensemble model" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <h2 className="text-white font-bold mb-5">Qualifying Setup</h2>
          <div className="space-y-4">
            <Select label="Driver" value={driver} onChange={setDriver} options={DRIVERS} />
            <Select label="Team" value={team} onChange={setTeam} options={TEAMS} />
            <Select label="Track" value={track} onChange={setTrack} options={TRACKS} />
            <Select label="Weather" value={weather} onChange={setWeather} options={WEATHER} />
            <Input label="Best Q3 Lap Time (s)" value={qualiTime} onChange={setQualiTime} type="number" step={0.001} min={60} max={120} />
            <button onClick={handleSubmit} disabled={loading} className="f1-btn w-full flex items-center justify-center gap-2">
              {loading ? <><Spinner size={18} /> Analysing...</> : '🎯 Predict Pole'}
            </button>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-5">
          {error && <ErrorBox message={error} />}

          {!result && !loading && (
            <Card className="flex items-center justify-center h-64 text-[#444]">
              <div className="text-center">
                <div className="text-4xl mb-3">🎯</div>
                <div>Set qualifying params and predict</div>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center h-64">
              <Spinner size={40} />
            </Card>
          )}

          {result && (
            <>
              {/* Pole gauge */}
              <Card>
                <div className="text-center mb-6">
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e1e" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#E10600" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 50 * poleProb / 100} ${2 * Math.PI * 50}`}
                        strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-[#FFD700]" style={{ fontFamily: 'Bebas Neue' }}>{poleProb}%</div>
                      <div className="text-[#666] text-xs">Pole Prob</div>
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-white">{driver}</div>
                  <div className="text-[#666] text-sm">{team} · {track}</div>

                  <div className="inline-block mt-3 px-4 py-2 rounded-full border text-sm font-bold"
                    style={{
                      borderColor: poleProb > 60 ? '#FFD700' : poleProb > 35 ? '#E10600' : '#555',
                      color: poleProb > 60 ? '#FFD700' : poleProb > 35 ? '#E10600' : '#888',
                      background: poleProb > 60 ? '#FFD70011' : poleProb > 35 ? '#E1060011' : 'transparent'
                    }}>
                    {poleProb > 60 ? '🏆 Strong Pole Contender' : poleProb > 35 ? '⚡ Possible Pole' : '🔵 Unlikely Pole'}
                  </div>
                </div>

                <ProbBar label="Pole Probability" value={poleProb} color="#FFD700" />
                {result.predictions?.['Random Forest'] && (
                  <ProbBar label="Top 10 Probability" value={result.predictions['Random Forest'].top10_probability ?? 0} />
                )}
              </Card>

              {/* Context */}
              <Card>
                <h3 className="text-white font-bold mb-4">Qualifying Analysis</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-[#1e1e1e]">
                    <span className="text-[#666]">Lap Time</span>
                    <span className="text-white font-mono">{qualiTime}s</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#1e1e1e]">
                    <span className="text-[#666]">Weather Impact</span>
                    <span className={weather === 'Wet' ? 'text-blue-400' : weather === 'Mixed' ? 'text-yellow-400' : 'text-green-400'}>
                      {weather === 'Wet' ? 'High uncertainty' : weather === 'Mixed' ? 'Moderate' : 'Optimal'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#1e1e1e]">
                    <span className="text-[#666]">Model</span>
                    <span className="text-white">Random Forest Classifier</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#666]">Verdict</span>
                    <span className="font-bold" style={{ color: poleProb > 50 ? '#00FF87' : '#E10600' }}>
                      {poleProb > 50 ? 'POLE FAVOURITE' : 'NOT FAVOURITE'}
                    </span>
                  </div>
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
