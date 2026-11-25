import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export const getHealth = () => api.get('/health')
export const getAnalytics = () => api.get('/analytics')
export const sendChat = (payload) => api.post('/chat', payload)
export const summarizeCall = (payload) => api.post('/chat/summarize', payload)
export const getLeads = (params) => api.get('/leads', { params })
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const deleteLead = (id) => api.delete(`/leads/${id}`)
export const getAppointments = () => api.get('/appointments')
export const getAvailability = (date) => api.get('/appointments/availability', { params: { date } })
export const bookAppointment = (data) => api.post('/appointments', data)
export const cancelAppointment = (id) => api.delete(`/appointments/${id}`)
export const getCalls = () => api.get('/calls')
export const getCall = (id) => api.get(`/calls/${id}`)
export const getKB = () => api.get('/knowledge-base')
export const createKBEntry = (data) => api.post('/knowledge-base', data)
export const updateKBEntry = (id, data) => api.put(`/knowledge-base/${id}`, data)
export const deleteKBEntry = (id) => api.delete(`/knowledge-base/${id}`)
export const searchKB = (query, topK = 3) => api.post('/knowledge-base/search', { query, topK })

export default api
