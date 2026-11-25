import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Flame, Thermometer, Snowflake, Trash2, Edit2, ChevronRight, Check } from 'lucide-react';
import { getLeads, createLead, updateLead, deleteLead } from '../api';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filterTemp, setFilterTemp] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '',
    product_interest: 'OmniVoice AI Sales Platform',
    budget: '', purchase_timeline: '', customer_requirements: ''
  });

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await getLeads({ search, temperature: filterTemp });
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [filterTemp, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await updateLead(formData.id, formData);
      } else {
        await createLead(formData);
      }
      setModalOpen(false);
      setFormData({
        name: '', company: '', email: '', phone: '',
        product_interest: 'OmniVoice AI Sales Platform',
        budget: '', purchase_timeline: '', customer_requirements: ''
      });
      loadLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
      loadLeads();
      if (selectedLead?.id === id) setSelectedLead(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Leads & CRM</h2>
          <p className="text-sm text-slate-500">Autonomous qualification records & pipeline status</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                name: '', company: '', email: '', phone: '',
                product_interest: 'OmniVoice AI Sales Platform',
                budget: '', purchase_timeline: '', customer_requirements: ''
              });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold glow-purple transition-all"
          >
            <Plus size={16} /> Add Manual Lead
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-indigo-900/30">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={16} className="text-slate-500 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, email..."
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter size={14} className="text-slate-400" />
          <span className="text-slate-400">Filter Temp:</span>
          {['All', 'Hot', 'Warm', 'Cold'].map(t => (
            <button
              key={t}
              onClick={() => setFilterTemp(t)}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterTemp === t
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'glass text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table & Detail Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${selectedLead ? 'lg:col-span-8' : 'lg:col-span-12'} glass rounded-2xl border border-indigo-900/30 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-indigo-900/30">
                <tr>
                  <th className="p-4">Customer / Company</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Temperature</th>
                  <th className="p-4">Budget & Timeline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {leads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`hover:bg-indigo-600/10 cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id ? 'bg-indigo-600/15' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{lead.name}</div>
                      <div className="text-slate-500">{lead.company || '—'} · {lead.email || '—'}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-sm text-indigo-400">{lead.lead_score}</span>
                      <span className="text-slate-600">/100</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                        lead.temperature === 'Hot' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        lead.temperature === 'Warm' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {lead.temperature}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      <div>{lead.budget || 'Undisclosed'}</div>
                      <div className="text-[10px] text-slate-600">{lead.purchase_timeline || 'Pending'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md font-medium ${
                        lead.qualification_status === 'Qualified' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/40' : 'text-slate-400 bg-slate-800/40'
                      }`}>
                        {lead.qualification_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { setFormData(lead); setModalOpen(true); }}
                          className="p-1.5 glass rounded-lg hover:text-indigo-400"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 glass rounded-lg hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      {loading ? 'Loading leads...' : 'No matching leads found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Lead Detailed Side Card */}
        {selectedLead && (
          <div className="lg:col-span-4 glass rounded-2xl p-5 border border-indigo-900/40 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-indigo-900/30">
              <h3 className="text-sm font-bold text-slate-200">Lead Dossier</h3>
              <button onClick={() => setSelectedLead(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
            </div>

            <div>
              <div className="text-lg font-bold text-white">{selectedLead.name}</div>
              <div className="text-xs text-indigo-400">{selectedLead.company}</div>
              <div className="text-xs text-slate-500">{selectedLead.email} | {selectedLead.phone}</div>
            </div>

            <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/30 text-xs space-y-1">
              <span className="text-slate-400 block font-semibold">Recommended Sales Next Step:</span>
              <p className="text-slate-200">{selectedLead.recommended_action}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-500 uppercase tracking-wider block font-bold text-[10px]">Product Requirement:</span>
              <p className="bg-slate-900/60 p-3 rounded-xl text-slate-300 border border-slate-800">
                {selectedLead.customer_requirements || 'No specific notes recorded.'}
              </p>
            </div>

            <div className="pt-2 text-[10px] text-slate-600">
              Captured At: {new Date(selectedLead.created_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="glass rounded-2xl max-w-lg w-full p-6 border border-indigo-500/30 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {formData.id ? 'Edit Lead Profile' : 'Add New Qualified Lead'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Company</label>
                <input
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Phone</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Budget</label>
                <input
                  placeholder="e.g. $5,000/month"
                  value={formData.budget}
                  onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Timeline</label>
                <input
                  placeholder="e.g. Within 30 days"
                  value={formData.purchase_timeline}
                  onChange={e => setFormData({ ...formData, purchase_timeline: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Requirements</label>
              <textarea
                rows="3"
                value={formData.customer_requirements}
                onChange={e => setFormData({ ...formData, customer_requirements: e.target.value })}
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
                Save Lead
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
