import React, { useState, useEffect } from 'react';
import { Phone, Clock, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { getCalls } from '../api';

export default function CallHistoryPage() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCalls()
      .then(res => {
        setCalls(res.data);
        if (res.data.length > 0) setSelectedCall(res.data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Call History & Transcripts</h2>
        <p className="text-sm text-slate-500">Autonomous voice call records, sentiment breakdown, and summaries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Call Logs Table */}
        <div className="lg:col-span-7 glass rounded-2xl border border-indigo-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-indigo-900/30">
                <tr>
                  <th className="p-4">Call ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Language / Duration</th>
                  <th className="p-4">Sentiment</th>
                  <th className="p-4">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {calls.map(call => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`hover:bg-indigo-600/10 cursor-pointer transition-colors ${
                      selectedCall?.id === call.id ? 'bg-indigo-600/15' : ''
                    }`}
                  >
                    <td className="p-4 font-mono font-bold text-indigo-400">
                      {call.call_id}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{call.customer_name || 'Prospect'}</div>
                      <div className="text-[10px] text-slate-500">{new Date(call.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 text-slate-400">
                      <div>{call.language}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {call.duration_seconds}s
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        call.sentiment === 'Positive' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/40' :
                        call.sentiment === 'Negative' ? 'text-red-400 bg-red-950/40 border border-red-900/40' :
                        'text-slate-400 bg-slate-800/40'
                      }`}>
                        {call.sentiment}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-indigo-300">
                      {call.lead_score || '—'}
                    </td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      {loading ? 'Loading call records...' : 'No voice calls logged yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Call Detail & Transcript Pane */}
        <div className="lg:col-span-5 glass rounded-2xl p-5 border border-indigo-900/40 flex flex-col space-y-4">
          {selectedCall ? (
            <>
              <div className="flex justify-between items-start pb-3 border-b border-indigo-900/30">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Phone size={14} className="text-indigo-400" /> {selectedCall.call_id}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCall.customer_name} · {selectedCall.language}</p>
                </div>
                <span className="text-xs text-indigo-400 font-bold bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                  Score: {selectedCall.lead_score}/100
                </span>
              </div>

              {/* Call Summary Block */}
              <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-xl p-3 text-xs space-y-1">
                <span className="text-indigo-400 font-semibold block flex items-center gap-1">
                  <Sparkles size={12} /> Autonomous AI Call Summary
                </span>
                <p className="text-slate-200 leading-relaxed">{selectedCall.summary}</p>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-500 block font-semibold text-[10px] uppercase">Requirements Identified</span>
                  <p className="text-slate-300">{selectedCall.customer_requirements || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold text-[10px] uppercase">Main Customer Questions</span>
                  <p className="text-slate-300">{selectedCall.main_questions || '—'}</p>
                </div>
              </div>

              {/* Transcript view */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare size={13} /> Full Conversation Transcript
                </span>
                <div className="flex-1 bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2.5 overflow-y-auto max-h-[300px]">
                  {(selectedCall.transcript || []).map((t, idx) => (
                    <div key={idx} className={`text-xs ${t.sender === 'user' ? 'text-indigo-300' : 'text-slate-300'}`}>
                      <span className="font-bold uppercase text-[10px] block text-slate-500">
                        {t.sender === 'user' ? 'Customer' : 'Nova AI'}:
                      </span>
                      <p>{t.text}</p>
                    </div>
                  ))}
                  {(!selectedCall.transcript || selectedCall.transcript.length === 0) && (
                    <p className="text-xs text-slate-600">No transcript lines found for this call.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select a call record to inspect its transcript and AI summary.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
