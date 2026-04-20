import { useState } from 'react'
import { predictRace } from '../services/api'
import {
  SectionHeader, Card, Select, Input, AiInsightBox, ProbBar, ErrorBox, Spinner, TyreBadge
} from '../components/ui'

const DRIVERS = ['Verstappen','Hamilton','Leclerc','Norris','Sainz','Perez','Russell','Alonso','Bottas','Ricciardo','Gasly','Ocon','Stroll','Magnussen','Tsunoda','Zhou','Sargeant','Albon','Hulkenberg']
const TEAMS = ['Red Bull','Mercedes','Ferrari','McLaren','Aston Martin','Alpine','AlphaTauri','Alfa Romeo','Haas','Williams']
const TRACKS = ['Bahrain','Saudi Arabia','Australia','Azerbaijan','Miami','Monaco','Spain','Canada','Austria','Britain','Hungary','Belgium','Netherlands','Italy','Singapore','Japan','Qatar','USA','Mexico','Brazil','Abu Dhabi']
const WEATHER = ['Dry','Wet','Mixed']
const TYRES = ['Soft','Medium','Hard']

const DRIVER_WIKI = {
  Verstappen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Max_Verstappen_2023_1_%28cropped%29.jpg/200px-Max_Verstappen_2023_1_%28cropped%29.jpg',
  Hamilton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lewis_Hamilton_2016_Malaysia_2.jpg/200px-Lewis_Hamilton_2016_Malaysia_2.jpg',
  Leclerc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Charles_Leclerc_2019_Bahrain.jpg/200px-Charles_Leclerc_2019_Bahrain.jpg',
  Norris: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Lando_Norris_2023_Bahrain_crop.jpg/200px-Lando_Norris_2023_Bahrain_crop.jpg',
}

export default function RacePrediction() {
  const [form, setForm] = useState({
    driver: 'Verstappen', team: 'Red Bull', track: 'Bahrain',
    grid_position: 1, qualifying_position: 1, qualifying_time: 83.2,
    weather: 'Dry', tyre_compound: 'Medium', pit_stops: 2,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await predictRace(form)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Prediction failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const driverImg = DRIVER_WIKI[form.driver]
  const rfPred = result?.predictions?.['Random Forest']
  const ridgePred = result?.predictions?.['Ridge Regression']

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="Race Prediction" subtitle="Predict top-10 finish, podium probability & finishing position" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg text-white font-bold mb-5">Race Parameters</h2>

          {/* Driver photo */}
          {driverImg && (
            <div className="mb-5 flex justify-center">
              <img src={driverImg} alt={form.driver} className="w-24 h-24 rounded-full object-cover border-2 border-[#E10600]"
                onError={(e) => { e.target.style.display = 'none' }} />
            </div>
          )}

          <div className="space-y-4">
            <Select label="Driver" value={form.driver} onChange={set('driver')} options={DRIVERS} />
            <Select label="Team" value={form.team} onChange={set('team')} options={TEAMS} />
            <Select label="Track" value={form.track} onChange={set('track')} options={TRACKS} />
            <Select label="Weather" value={form.weather} onChange={set('weather')} options={WEATHER} />
            <Select label="Starting Tyre" value={form.tyre_compound} onChange={set('tyre_compound')} options={TYRES} />
            <Input label="Grid Position" value={form.grid_position} onChange={set('grid_position')} type="number" min={1} max={20} />
            <Input label="Qualifying Time (s)" value={form.qualifying_time} onChange={set('qualifying_time')} type="number" step={0.001} />
            <Input label="Pit Stops" value={form.pit_stops} onChange={set('pit_stops')} type="number" min={1} max={4} />

            <button onClick={handleSubmit} disabled={loading} className="f1-btn w-full flex items-center justify-center gap-2">
              {loading ? <><Spinner size={18} /> Predicting...</> : '🏁 Predict Race'}
            </button>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          {error && <ErrorBox message={error} />}

          {!result && !loading && (
            <Card className="flex items-center justify-center h-64 text-[#444]">
              <div className="text-center">
                <div className="text-4xl mb-3">🏎️</div>
                <div>Configure race parameters and click Predict</div>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size={40} className="mx-auto mb-4" />
                <div className="text-[#666]">Running ML models...</div>
              </div>
            </Card>
          )}

          {result && (
            <>
              {/* Main result */}
              <Card>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl">🏆</div>
                  <div>
                    <div className="text-2xl font-bold text-white">{result.driver}</div>
                    <div className="text-[#666] text-sm">{result.team} · {result.track} · {form.weather}</div>
                  </div>
                  <div className="ml-auto"><TyreBadge compound={form.tyre_compound} /></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  {rfPred && (
                    <>
                      <div className="bg-[#111] rounded-xl p-4 text-center">
                        <div className="metric-value">{rfPred.top10_probability ?? '—'}%</div>
                        <div className="text-[#666] text-xs mt-1">Top 10 Probability</div>
                        <div className="text-[#444] text-xs">Random Forest</div>
                      </div>
                      <div className="bg-[#111] rounded-xl p-4 text-center">
                        <div className="metric-value" style={{ color: rfPred.top10_prediction ? '#00FF87' : '#E10600' }}>
                          {rfPred.top10_prediction ? 'YES' : 'NO'}
                        </div>
                        <div className="text-[#666] text-xs mt-1">Top 10 Predicted</div>
                      </div>
                    </>
                  )}
                  {ridgePred && (
                    <div className="bg-[#111] rounded-xl p-4 text-center">
                      <div className="metric-value" style={{ color: '#FFD700' }}>P{ridgePred.predicted_position}</div>
                      <div className="text-[#666] text-xs mt-1">Predicted Position</div>
                      <div className="text-[#444] text-xs">Ridge Regression</div>
                    </div>
                  )}
                </div>

                {result.pole_probability !== undefined && (
                  <div className="mb-5">
                    <ProbBar label="Pole Position Probability" value={result.pole_probability} color="#FFD700" />
                  </div>
                )}
              </Card>

              {/* All model predictions */}
              <Card>
                <h3 className="text-white font-bold mb-4">All Model Predictions</h3>
                <div className="space-y-3">
                  {Object.entries(result.predictions || {}).map(([model, preds]) => (
                    <div key={model} className="flex items-center justify-between bg-[#111] rounded-lg px-4 py-3">
                      <span className="text-[#aaa] text-sm">{model}</span>
                      <div className="flex gap-4 text-sm">
                        {preds.top10_probability !== undefined && (
                          <span className="text-[#E10600] font-bold">{preds.top10_probability}% Top10</span>
                        )}
                        {preds.predicted_position !== undefined && (
                          <span className="text-[#FFD700] font-bold">P{preds.predicted_position}</span>
                        )}
                        {preds.top10_prediction !== undefined && (
                          <span className={preds.top10_prediction ? 'text-green-400' : 'text-red-400'}>
                            {preds.top10_prediction ? '✓ Top10' : '✗ Out'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* AI Insight */}
              {result.ai_insight && <AiInsightBox text={result.ai_insight} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
