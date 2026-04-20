import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { getTeams } from '../services/api'
import { SectionHeader, Card, ErrorBox, Spinner } from '../components/ui'

const TEAM_COLORS = {
  'Red Bull': '#1E41FF', Mercedes: '#00D2BE', Ferrari: '#DC0000',
  McLaren: '#FF8700', 'Aston Martin': '#006F62', Alpine: '#0090FF',
  AlphaTauri: '#2B4562', 'Alfa Romeo': '#900000', Haas: '#FFFFFF', Williams: '#005AFF',
}

const TEAM_LOGOS = {
  'Red Bull': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Red_Bull_Racing_logo.svg/120px-Red_Bull_Racing_logo.svg.png',
  Mercedes: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Mercedes_AMG_Petronas_F1_Logo_2022.svg/120px-Mercedes_AMG_Petronas_F1_Logo_2022.svg.png',
  Ferrari: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d1/Ferrari-Logo.svg/120px-Ferrari-Logo.svg.png',
  McLaren: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/McLaren_Racing_logo_2021.svg/120px-McLaren_Racing_logo_2021.svg.png',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#E10600] rounded-lg p-3 text-xs">
      <div className="text-white font-bold mb-1">{label}</div>
      {payload.map(p => <div key={p.name} className="text-[#aaa]">{p.name}: <span style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span></div>)}
    </div>
  )
}

export default function TeamAnalysis() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getTeams()
      .then(r => { const t = r.data.teams || []; setTeams(t); setSelected(t[0]) })
      .catch(() => setError('Failed to load team data. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>
  if (error) return <ErrorBox message={error} />

  const chartData = teams.slice(0, 8).map(t => ({
    team: t.team.replace(' ', '\n'),
    Points: Math.round(t.total_points),
    Podiums: t.podiums,
    'Avg Finish': parseFloat(t.avg_finish?.toFixed(1)),
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="Team Analytics" subtitle="Constructor performance, reliability and season trends" />

      {/* Team cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
        {teams.slice(0, 10).map(t => (
          <div key={t.team}
            onClick={() => setSelected(t)}
            className={`f1-card cursor-pointer text-center transition-all ${selected?.team === t.team ? 'border-[#E10600] bg-[#1a0000]/50' : ''}`}>
            {TEAM_LOGOS[t.team] && (
              <img src={TEAM_LOGOS[t.team]} alt={t.team}
                className="w-12 h-8 object-contain mx-auto mb-2"
                onError={e => { e.target.style.display = 'none' }} />
            )}
            <div className="text-white text-xs font-bold truncate">{t.team}</div>
            <div className="text-[#E10600] text-sm font-bold mt-1">{Math.round(t.total_points).toLocaleString()} pts</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Charts */}
        <Card className="lg:col-span-2">
          <h3 className="text-white font-bold mb-4">Total Points Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
              <XAxis dataKey="team" tick={{ fill: '#666', fontSize: 10 }} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Points" radius={[4, 4, 0, 0]}
                fill="#E10600"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Selected team stats */}
        {selected && (
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-3 h-3 rounded-full" style={{ background: TEAM_COLORS[selected.team] || '#E10600' }} />
              <div className="text-white font-bold">{selected.team}</div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Points', value: Math.round(selected.total_points)?.toLocaleString(), color: '#E10600' },
                { label: 'Podiums', value: selected.podiums, color: '#FFD700' },
                { label: 'Top 10 Finishes', value: selected.top10 },
                { label: 'Avg Finish Pos', value: `P${selected.avg_finish?.toFixed(1)}` },
                { label: 'Total Races', value: selected.races },
                { label: 'DNF Rate', value: `${(selected.dnf_rate * 100).toFixed(1)}%`, color: selected.dnf_rate > 0.08 ? '#E10600' : '#00FF87' },
                { label: 'Avg Points/Race', value: selected.avg_points?.toFixed(1) },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-[#111]">
                  <span className="text-[#666] text-sm">{label}</span>
                  <span className="font-bold text-sm" style={{ color: color || '#fff' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Full table */}
      <Card>
        <h3 className="text-white font-bold mb-4">Constructor Standings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#555] border-b border-[#1e1e1e]">
                {['Rank', 'Team', 'Races', 'Podiums', 'Top 10', 'Avg Pos', 'DNF %', 'Avg Pts', 'Total Pts'].map(h => (
                  <th key={h} className={`py-3 px-3 ${h === 'Rank' || h === 'Team' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={t.team}
                  onClick={() => setSelected(t)}
                  className="border-b border-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                  <td className="py-3 px-3 text-[#E10600] font-bold">{i + 1}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: TEAM_COLORS[t.team] || '#E10600' }} />
                      <span className="text-white font-medium">{t.team}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-[#aaa]">{t.races}</td>
                  <td className="py-3 px-3 text-right text-[#FFD700]">{t.podiums}</td>
                  <td className="py-3 px-3 text-right text-[#aaa]">{t.top10}</td>
                  <td className="py-3 px-3 text-right text-[#aaa]">P{t.avg_finish?.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right" style={{ color: t.dnf_rate > 0.08 ? '#E10600' : '#00FF87' }}>
                    {(t.dnf_rate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-[#aaa]">{t.avg_points?.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right text-[#E10600] font-bold">{Math.round(t.total_points)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
