import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { getDrivers, getClusters } from '../services/api'
import { SectionHeader, Card, ErrorBox, Spinner, AiInsightBox, EmptyState } from '../components/ui'

const DRIVER_PHOTOS = {
  Verstappen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Max_Verstappen_2023_1_%28cropped%29.jpg/120px-Max_Verstappen_2023_1_%28cropped%29.jpg',
  Hamilton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lewis_Hamilton_2016_Malaysia_2.jpg/120px-Lewis_Hamilton_2016_Malaysia_2.jpg',
  Leclerc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Charles_Leclerc_2019_Bahrain.jpg/120px-Charles_Leclerc_2019_Bahrain.jpg',
  Norris: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Lando_Norris_2023_Bahrain_crop.jpg/120px-Lando_Norris_2023_Bahrain_crop.jpg',
}

const CLUSTER_COLORS = { 'Top Performers': '#FFD700', 'Midfield Racers': '#E10600', 'Inconsistent': '#FF9500', 'Backmarkers': '#555' }
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#E10600] rounded-lg p-3 text-xs">
      <div className="text-white font-bold mb-1">{label}</div>
      {payload.map(p => <div key={p.name} className="text-[#aaa]">{p.name}: <span className="text-[#E10600]">{p.value}</span></div>)}
    </div>
  )
}

export default function DriverAnalysis() {
  const [drivers, setDrivers] = useState([])
  const [clusters, setClusters] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('leaderboard')

  useEffect(() => {
    Promise.all([
      getDrivers().then(r => { setDrivers(r.data.drivers || []); setSelected(r.data.drivers?.[0]) }),
      getClusters().then(r => setClusters(r.data.clusters || [])),
    ])
      .catch(e => setError('Failed to load driver data. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>
  if (error) return <ErrorBox message={error} />

  const top10 = drivers.slice(0, 10)
  const radarData = selected ? [
    { metric: 'Points', value: Math.min(100, (selected.avg_points / 10) * 100) },
    { metric: 'Finish', value: Math.max(0, 100 - (selected.avg_finish / 20) * 100) },
    { metric: 'Top10%', value: (selected.top10 / Math.max(selected.races, 1)) * 100 },
    { metric: 'Podiums', value: Math.min(100, (selected.podiums / Math.max(selected.races, 1)) * 100 * 5) },
    { metric: 'Races', value: Math.min(100, (selected.races / 200) * 100) },
  ] : []

  const clusterGroups = clusters.reduce((acc, d) => {
    const label = d.cluster_label || `Cluster ${d.cluster}`
    acc[label] = acc[label] || []
    acc[label].push(d)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto">
      <SectionHeader title="Driver Analytics" subtitle="Performance metrics, career stats and K-Means clustering (Unit 4)" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['leaderboard', 'profile', 'clusters'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tab === t ? 'bg-[#E10600] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'}`}>
            {t === 'clusters' ? '🔬 K-Means Clusters' : t === 'profile' ? '👤 Driver Profile' : '🏆 Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className="space-y-5">
          <Card>
            <h3 className="text-white font-bold mb-4">Top 10 Drivers — Points Ranking</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} />
                <YAxis type="category" dataKey="driver" width={90} tick={{ fill: '#aaa', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_points" fill="#E10600" radius={[0, 4, 4, 0]} name="Points" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#555] border-b border-[#1e1e1e]">
                  <th className="text-left py-3 px-3">Rank</th>
                  <th className="text-left py-3 px-3">Driver</th>
                  <th className="text-left py-3 px-3">Team</th>
                  <th className="text-right py-3 px-3">Races</th>
                  <th className="text-right py-3 px-3">Podiums</th>
                  <th className="text-right py-3 px-3">Top10</th>
                  <th className="text-right py-3 px-3">Avg Pos</th>
                  <th className="text-right py-3 px-3">Total Pts</th>
                </tr>
              </thead>
              <tbody>
                {drivers.slice(0, 15).map((d, i) => (
                  <tr key={d.driver} onClick={() => { setSelected(d); setTab('profile') }}
                    className="border-b border-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                    <td className="py-3 px-3 text-[#E10600] font-bold">{i + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {DRIVER_PHOTOS[d.driver] && (
                          <img src={DRIVER_PHOTOS[d.driver]} alt={d.driver}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={e => { e.target.style.display = 'none' }} />
                        )}
                        <span className="text-white font-medium">{d.driver}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#666]">{d.team}</td>
                    <td className="py-3 px-3 text-right text-[#aaa]">{d.races}</td>
                    <td className="py-3 px-3 text-right text-[#FFD700]">{d.podiums}</td>
                    <td className="py-3 px-3 text-right text-[#aaa]">{d.top10}</td>
                    <td className="py-3 px-3 text-right text-[#aaa]">P{d.avg_finish}</td>
                    <td className="py-3 px-3 text-right text-[#E10600] font-bold">{d.total_points?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'profile' && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-4 mb-5">
              {DRIVER_PHOTOS[selected.driver] && (
                <img src={DRIVER_PHOTOS[selected.driver]} alt={selected.driver}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#E10600]"
                  onError={e => { e.target.style.display = 'none' }} />
              )}
              <div>
                <div className="text-2xl font-bold text-white">{selected.driver}</div>
                <div className="text-[#666]">{selected.team}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Points', value: selected.total_points?.toLocaleString() },
                { label: 'Podiums', value: selected.podiums },
                { label: 'Top 10 Finishes', value: selected.top10 },
                { label: 'Avg Finish', value: `P${selected.avg_finish}` },
                { label: 'Races', value: selected.races },
                { label: 'Avg Points/Race', value: selected.avg_points },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#111] rounded-lg p-3">
                  <div className="text-[#E10600] font-bold text-lg" style={{ fontFamily: 'Bebas Neue' }}>{value}</div>
                  <div className="text-[#555] text-xs">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-bold mb-4">Performance Radar</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a2a2a" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#888', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#E10600" fill="#E10600" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <div className="lg:col-span-2">
            <AiInsightBox text={selected.ai_insight || 'Select a driver to see AI-generated insight.'} />
          </div>

          <div className="lg:col-span-2">
            <div className="text-[#555] text-sm font-bold uppercase tracking-wider mb-3">Select Driver</div>
            <div className="flex flex-wrap gap-2">
              {drivers.slice(0, 15).map(d => (
                <button key={d.driver} onClick={() => setSelected(d)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selected.driver === d.driver ? 'bg-[#E10600] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'}`}>
                  {d.driver}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'clusters' && (
        <div className="space-y-5">
          <Card>
            <h3 className="text-white font-bold mb-2">K-Means Driver Clustering (Unit 4)</h3>
            <p className="text-[#666] text-sm mb-5">Drivers clustered into 4 groups based on avg finish, points, team performance & skill metrics using K-Means (k=4)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(clusterGroups).map(([label, drivers]) => (
                <div key={label} className="bg-[#111] rounded-xl p-4 border border-[#2a2a2a]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[label] || '#555' }} />
                    <span className="text-white font-bold text-sm">{label}</span>
                    <span className="text-[#444] text-xs ml-auto">{drivers.length} drivers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {drivers.map(d => (
                      <span key={d.driver} className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#aaa]">{d.driver}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {clusters.length === 0 && <EmptyState message="Cluster data not available. Run the training pipeline first." icon="🔬" />}
        </div>
      )}
    </div>
  )
}
