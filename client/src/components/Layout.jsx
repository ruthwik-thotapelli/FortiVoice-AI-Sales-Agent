import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Mic, Users, Calendar, Phone,
  BookOpen, Settings, Menu, X, Bell, Search,
  Zap, ChevronDown, Shield
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent', icon: Mic, label: 'Live Agent' },
  { to: '/leads', icon: Users, label: 'Leads & CRM' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/calls', icon: Phone, label: 'Call History' },
  { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()

  const currentPage = navItems.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #060b18 0%, #0a1628 50%, #060d20 100%)' }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out glass border-r border-indigo-900/30`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-indigo-900/30">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-purple flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-sm font-bold gradient-text leading-tight">FortiVoice AI</div>
              <div className="text-[10px] text-slate-500 leading-tight">Sales Agent v1.0</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group glass-hover ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 glow-purple'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {sidebarOpen && <span>{label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-20 ml-1 px-2.5 py-1 glass rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Powered by badge */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-indigo-900/20">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-900/20">
              <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />
              <span className="text-[10px] text-slate-500">Powered by OpenAI + RAG</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="glass border-b border-indigo-900/30 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-indigo-500/10 transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-200">{currentPage}</h1>
              <p className="text-[11px] text-slate-500">NovaTech Solutions · FortiVoice Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
              <input
                className="pl-9 pr-4 py-2 glass rounded-xl text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/50 w-56"
                placeholder="Search leads, calls…"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-indigo-500/10 transition-colors"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-72 glass rounded-xl shadow-2xl z-50 p-3 fade-in">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Notifications</p>
                  {[
                    { text: 'New Hot Lead: Aditya Varma qualified', time: '2m ago', color: 'text-green-400' },
                    { text: 'Appointment APT-2026-8901 confirmed', time: '15m ago', color: 'text-indigo-400' },
                    { text: 'Call CALL-84920 summary generated', time: '1h ago', color: 'text-blue-400' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-800/50 last:border-0">
                      <span className={`text-[9px] mt-0.5 font-bold ${n.color}`}>●</span>
                      <div>
                        <p className="text-xs text-slate-300">{n.text}</p>
                        <p className="text-[10px] text-slate-600">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <button className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl hover:bg-indigo-500/10 transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                FV
              </div>
              <span className="text-xs text-slate-300 hidden md:block">Admin</span>
              <ChevronDown size={12} className="text-slate-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
