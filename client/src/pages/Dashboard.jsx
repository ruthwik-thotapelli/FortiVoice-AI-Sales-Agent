import { useState, useEffect } from 'react'
import { Users, Phone, Calendar, TrendingUp, Flame, Thermometer, Snowflake, Zap, ArrowUpRight, Clock, Star } from 'lucide-react'
import { getAnalytics } from '../api'

const StatCard = ({ icon: Icon, label, value, sub, color, glow }) => (
  <div className={`glass rounded-2xl p-5 ${glow} transition-all hover:scale-[1.02] duration-200`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <ArrowUpRight size={14} className="text-slate-600" />
    </div>
    <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
    <div className="text-xs font-medium text-slate-400">{label}</div>
    {sub && <div className="text-[10px] text-slate-600 mt-1">{sub}</div>}
  </div>
)

const TempBadge = ({ temp }) => {
  const cfg = {
    Hot: { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    Warm: { icon: Thermometer, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    Cold: { icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  }[temp] || { icon: Thermometer, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
  const { icon: Icon, color, bg } = cfg
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${bg} ${color}`}>
      <Icon size={10} /> {temp}
    </span>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalytics().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading analytics…</p>
      </div>
    </div>
  )

  const s = data?.summary || {}

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Sales Intelligence Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">NovaTech Solutions · Real-time AI pipeline overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Phone} label="Total Calls" value={s.totalCalls ?? 0} sub="All time conversations" color="bg-indigo-600" glow="glow-purple" />
        <StatCard icon={Users} label="Qualified Leads" value={s.qualifiedLeads ?? 0} sub={`of ${s.totalLeads ?? 0} total leads`} color="bg-violet-600" glow="" />
        <StatCard icon={Calendar} label="Appointments" value={s.appointmentsBooked ?? 0} sub="Confirmed bookings" color="bg-blue-600" glow="glow-blue" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={s.conversionRate ?? '0%'} sub="Leads qualified %" color="bg-emerald-600" glow="" />
      </div>

      {/* Lead Temperature + Recent Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Temperature Breakdown */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="text-orange-400" />
            <span className="text-sm font-semibold text-slate-200">Lead Temperature</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Hot', count: s.hotLeads ?? 0, color: 'bg-orange-500', text: 'text-orange-400' },
              { label: 'Warm', count: s.warmLeads ?? 0, color: 'bg-yellow-500', text: 'text-yellow-400' },
              { label: 'Cold', count: s.coldLeads ?? 0, color: 'bg-blue-500', text: 'text-blue-400' },
            ].map(({ label, count, color, text }) => {
              const pct = s.totalLeads > 0 ? Math.round((count / s.totalLeads) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={text + ' font-medium'}>{label}</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Star size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Recent Leads</span>
          </div>
          <div className="space-y-2">
            {(data?.recentLeads || []).slice(0, 4).map(lead => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-indigo-600/60">
                    {(lead.name || '?')[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{lead.name}</p>
                    <p className="text-[10px] text-slate-500">{lead.company || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TempBadge temp={lead.temperature} />
                  <span className="text-xs font-bold text-indigo-300">{lead.lead_score}</span>
                </div>
              </div>
            ))}
            {(!data?.recentLeads || data.recentLeads.length === 0) && (
              <p className="text-xs text-slate-600 py-4 text-center">No leads yet. Start a voice session to generate leads.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Appointments + Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">Upcoming Appointments</span>
          </div>
          <div className="space-y-2">
            {(data?.upcomingAppointments || []).slice(0, 4).map(apt => (
              <div key={apt.id} className="flex items-center gap-3 py-2 border-b border-slate-800/40 last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-300 bg-blue-900/40 flex-shrink-0">
                  {apt.preferred_time?.split(' ')[0]}
                  <br />
                  <span className="text-[8px]">{apt.preferred_time?.split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{apt.customer_name}</p>
                  <p className="text-[10px] text-slate-500">{apt.preferred_date} · {apt.preferred_time}</p>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">{apt.status}</span>
              </div>
            ))}
            {(!data?.upcomingAppointments || data.upcomingAppointments.length === 0) && (
              <p className="text-xs text-slate-600 py-4 text-center">No upcoming appointments</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-purple-400" />
            <span className="text-sm font-semibold text-slate-200">Recent Calls</span>
          </div>
          <div className="space-y-2">
            {(data?.recentCalls || []).slice(0, 4).map(call => (
              <div key={call.id} className="flex items-center gap-3 py-2 border-b border-slate-800/40 last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-900/40 flex-shrink-0">
                  <Phone size={12} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{call.customer_name || 'Anonymous'}</p>
                  <p className="text-[10px] text-slate-500">{call.call_id} · {call.language}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  call.sentiment === 'Positive' ? 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30' :
                  call.sentiment === 'Negative' ? 'text-red-400 bg-red-900/20 border-red-800/30' :
                  'text-slate-400 bg-slate-800/40 border-slate-700/30'
                }`}>{call.sentiment}</span>
              </div>
            ))}
            {(!data?.recentCalls || data.recentCalls.length === 0) && (
              <p className="text-xs text-slate-600 py-4 text-center">No calls yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Demo notice */}
      <div className="glass rounded-xl p-3 border border-indigo-500/20 flex items-center gap-3">
        <Zap size={14} className="text-yellow-400 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-yellow-300">Demo records</span> are pre-seeded in the database for demonstration. All new data you generate via the Live Agent is real and persisted.
        </p>
      </div>
    </div>
  )
}
