import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[API Error]', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export const predictRace = (data) => api.post('/predict', data)
export const simulateRace = (data) => api.post('/simulate', data)
export const getStrategy = (data) => api.post('/strategy', data)
export const getDrivers = () => api.get('/drivers')
export const getTeams = () => api.get('/teams')
export const getModelPerformance = () => api.get('/models/performance')
export const getClusters = () => api.get('/clusters')
export const getTracks = () => api.get('/tracks')
export const getHealth = () => api.get('/health')

export default api

export const getGenAIStatus = () => api.get('/genai/status')
export const getRegistry = () => api.get('/registry')
export const getExperiments = () => api.get('/experiments')
export const streamPredict = (data) => fetch(`${BASE_URL}/predict/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})
