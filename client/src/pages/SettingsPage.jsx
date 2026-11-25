import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Server, Key, Volume2, Globe, Cpu } from 'lucide-react';
import { getHealth } from '../api';

export default function SettingsPage() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealth().then(r => setHealth(r.data)).catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">System Configuration & Security</h2>
        <p className="text-sm text-slate-500">Autonomous voice agent parameters, LLM connectivity, and security controls</p>
      </div>

      {/* System Status Banner */}
      <div className="glass rounded-2xl p-5 border border-indigo-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-200">Server Health & Runtime</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            {health?.status || 'Active'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Engine Mode</span>
            <span className="font-bold text-indigo-400">{health?.mode || 'DEMO_MODE'}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Database</span>
            <span className="font-bold text-slate-200">{health?.database || 'SQLite (WAL)'}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Voice Languages</span>
            <span className="font-bold text-slate-200">English, Telugu</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Version</span>
            <span className="font-bold text-slate-200">{health?.version || '1.0.0'}</span>
          </div>
        </div>
      </div>

      {/* Security & Scalability Settings */}
      <div className="glass rounded-2xl p-6 border border-indigo-900/40 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" /> Enterprise Security Controls
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">API Rate Limiting</div>
              <div className="text-slate-500">120 requests per minute per IP via express-rate-limit</div>
            </div>
            <span className="text-emerald-400 font-bold">Enabled</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Input Validation & Sanitization</div>
              <div className="text-slate-500">Parameterized SQLite queries protecting against SQL Injection</div>
            </div>
            <span className="text-emerald-400 font-bold">Protected</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">API Key Privacy</div>
              <div className="text-slate-500">OpenAI API keys never exposed to browser client bundle</div>
            </div>
            <span className="text-emerald-400 font-bold">Enforced</span>
          </div>
        </div>
      </div>

      {/* Mode Explanation */}
      <div className="glass rounded-2xl p-6 border border-indigo-900/40 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Cpu size={16} className="text-indigo-400" /> Live AI Mode vs Interactive Scripted Demo Mode
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The application contains an automatic dual-mode fallback:
        </p>
        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
          <li>
            <strong className="text-slate-200">Live AI Mode:</strong> When <code className="text-indigo-400">OPENAI_API_KEY</code> is present in <code className="text-indigo-400">.env</code>, conversational queries query the real OpenAI model grounded on RAG context.
          </li>
          <li>
            <strong className="text-slate-200">Interactive Demo Mode:</strong> When no API key is provided, a deterministic sales dialogue engine responds realistically in English or Telugu, extracts leads, qualifies BANT criteria, checks slots, and records appointments without failure.
          </li>
        </ul>
      </div>
    </div>
  );
}
