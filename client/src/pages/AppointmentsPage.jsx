import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle, Plus, AlertTriangle } from 'lucide-react';
import { getAppointments, bookAppointment, cancelAppointment, getAvailability } from '../api';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2026-11-28');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [topic, setTopic] = useState('Enterprise Voice Architecture Consultation');
  const [loading, setLoading] = useState(true);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (date) => {
    try {
      const res = await getAvailability(date);
      setSlots(res.data.slots || []);
      const firstAvail = res.data.slots?.find(s => s.available)?.time;
      if (firstAvail) setSelectedSlot(firstAvail);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadSlots(selectedDate);
  }, []);

  const handleDateChange = (d) => {
    setSelectedDate(d);
    loadSlots(d);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      await bookAppointment({
        customer_name: customerName,
        customer_email: customerEmail,
        preferred_date: selectedDate,
        preferred_time: selectedSlot,
        topic
      });
      setModalOpen(false);
      setCustomerName('');
      setCustomerEmail('');
      loadAppointments();
      loadSlots(selectedDate);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Cancel this confirmed appointment?')) {
      await cancelAppointment(id);
      loadAppointments();
      loadSlots(selectedDate);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Appointments & Consultations</h2>
          <p className="text-sm text-slate-500">Autonomous calendar bookings with double-booking prevention</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold glow-purple transition-all"
        >
          <Plus size={16} /> Book New Demo Slot
        </button>
      </div>

      {/* Calendar Notice */}
      <div className="glass rounded-xl p-3 border border-indigo-500/20 flex items-center gap-3">
        <CalendarIcon size={16} className="text-indigo-400 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Demo Calendar Sync:</span> Appointments booked through the Voice Agent or manual dashboard are enforced against double-booking and saved with unique tracking IDs.
        </p>
      </div>

      {/* Appointments List */}
      <div className="glass rounded-2xl border border-indigo-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-indigo-900/30">
              <tr>
                <th className="p-4">Appointment ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Schedule (Date & Time)</th>
                <th className="p-4">Topic / Service</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {appointments.map(apt => (
                <tr key={apt.id} className="hover:bg-indigo-600/10 transition-colors">
                  <td className="p-4 font-mono font-bold text-indigo-400">
                    {apt.appointment_id}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{apt.customer_name}</div>
                    <div className="text-slate-500">{apt.customer_email || '—'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-300">{apt.preferred_date}</div>
                    <div className="text-slate-500 flex items-center gap-1">
                      <Clock size={11} /> {apt.preferred_time}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300 max-w-xs truncate">
                    {apt.topic}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                      <CheckCircle size={11} /> {apt.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCancel(apt.id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-red-400 glass rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    {loading ? 'Loading appointments...' : 'No appointments scheduled yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBook} className="glass rounded-2xl max-w-md w-full p-6 border border-indigo-500/30 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-indigo-400" /> Book Demo Appointment
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Name *</label>
              <input
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Email *</label>
              <input
                required
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Consultation Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => handleDateChange(e.target.value)}
                className="w-full glass rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Available 30-min Slots</label>
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => (
                  <button
                    type="button"
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedSlot(s.time)}
                    className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                      !s.available ? 'opacity-30 bg-slate-900 border-slate-800 line-through cursor-not-allowed' :
                      selectedSlot === s.time ? 'bg-indigo-600 text-white border-indigo-500 font-bold' :
                      'glass text-slate-300 border-slate-800 hover:border-indigo-500/40'
                    }`}
                  >
                    {s.time} {s.available ? '' : '(Booked)'}
                  </button>
                ))}
              </div>
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
                disabled={!selectedSlot}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white glow-purple"
              >
                Confirm Appointment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
