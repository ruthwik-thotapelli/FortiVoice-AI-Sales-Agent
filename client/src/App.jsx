import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AgentPage from './pages/AgentPage'
import LeadsPage from './pages/LeadsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import CallHistoryPage from './pages/CallHistoryPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/calls" element={<CallHistoryPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
