import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import RacePrediction from './pages/RacePrediction'
import PolePrediction from './pages/PolePrediction'
import RaceSimulation from './pages/RaceSimulation'
import StrategyPage from './pages/StrategyPage'
import DriverAnalysis from './pages/DriverAnalysis'
import TeamAnalysis from './pages/TeamAnalysis'
import ModelPerformance from './pages/ModelPerformance'
import MLOpsDashboard from './pages/MLOpsDashboard'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<RacePrediction />} />
        <Route path="/pole" element={<PolePrediction />} />
        <Route path="/simulate" element={<RaceSimulation />} />
        <Route path="/strategy" element={<StrategyPage />} />
        <Route path="/drivers" element={<DriverAnalysis />} />
        <Route path="/teams" element={<TeamAnalysis />} />
        <Route path="/models" element={<ModelPerformance />} />
        <Route path="/mlops" element={<MLOpsDashboard />} />
      </Routes>
    </Layout>
  )
}
