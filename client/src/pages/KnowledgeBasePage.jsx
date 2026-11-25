import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Trash2, Edit2, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { getKB, createKBEntry, updateKBEntry, deleteKBEntry, searchKB } from '../api';

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState([]);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category: 'Products & Services', title: '', content: '', keywords: '' });
  const [loading, setLoading] = useState(true);

  const loadKB = async () => {
    try {
      setLoading(true);
      const res = await getKB();
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKB();
  }, []);

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    try {
      const res = await searchKB(testQuery, 3);
      setTestResults(res.data.results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await updateKBEntry(formData.id, formData);
      } else {
        await createKBEntry(formData);
      }
      setModalOpen(false);
      setFormData({ category: 'Products & Services', title: '', content: '', keywords: '' });
      loadKB();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this knowledge base entry?')) {
      await deleteKBEntry(id);
      loadKB();
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">RAG Knowledge Base</h2>
          <p className="text-sm text-slate-500">Source of truth for autonomous agent retrieval and context grounding</p>
        </div>

        <button
          onClick={() => {
            setFormData({ category: 'Products & Services', title: '', content: '', keywords: '' });
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold glow-purple transition-all"
        >
          <Plus size={16} /> Add Article
        </button>
      </div>

      {/* RAG Interactive Test Bench */}
      <div className="glass rounded-2xl p-5 border border-indigo-500/20">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" /> RAG Semantic & Keyword Retrieval Testbench
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Test what ground truth documents the autonomous voice agent retrieves given a customer question.
        </p>

        <form onSubmit={handleTestSearch} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="e.g. How much does OmniVoice cost? or What are your support response times?"
            className="flex-1 glass rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500/60"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl glow-purple"
          >
            Test Retrieve
          </button>
        </form>

        {testResults && (
          <div className="mt-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top {testResults.length} Retrieved Chunks:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {testResults.map((r, i) => (
                <div key={i} className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/40 text-xs">
                  <div className="flex justify-between items-center text-indigo-400 font-bold mb-1">
                    <span>{r.title}</span>
                    <span className="text-[10px] text-emerald-400">Match score: {r.score}</span>
                  </div>
                  <p className="text-slate-300 line-clamp-4 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map(doc => (
          <div key={doc.id} className="glass rounded-2xl p-5 border border-indigo-900/30 flex flex-col justify-between hover:border-indigo-500/40 transition-all">
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/70 border border-indigo-800/40 text-indigo-300">
                  {doc.category}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setFormData(doc); setModalOpen(true); }}
                    className="p-1 text-slate-400 hover:text-indigo-400"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">{doc.title}</h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                {doc.content}
              </p>
            </div>

            {doc.keywords && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                <span className="font-semibold text-slate-400">Keywords: </span>
                {doc.keywords}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="glass rounded-2xl max-w-lg w-full p-6 border border-indigo-500/30 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {formData.id ? 'Edit Knowledge Article' : 'Add New Knowledge Base Article'}
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="Company Profile" className="bg-slate-900">Company Profile</option>
                <option value="Products & Services" className="bg-slate-900">Products & Services</option>
                <option value="Pricing" className="bg-slate-900">Pricing</option>
                <option value="Support Policies" className="bg-slate-900">Support Policies</option>
                <option value="Appointment Availability" className="bg-slate-900">Appointment Availability</option>
                <option value="FAQ" className="bg-slate-900">FAQ</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Title *</label>
              <input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Content (Ground Truth) *</label>
              <textarea
                required
                rows="5"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Keywords / Search Tags</label>
              <input
                placeholder="comma, separated, tags"
                value={formData.keywords}
                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 glass rounded-xl text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white glow-purple"
              >
                Save Article
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
