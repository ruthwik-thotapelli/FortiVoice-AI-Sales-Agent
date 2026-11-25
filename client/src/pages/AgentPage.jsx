import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send, PhoneOff, Globe,
  ShieldAlert, Sparkles, CheckCircle2, AlertCircle, Calendar,
  Flame, Thermometer, Snowflake, Clock, User, Building, Mail
} from 'lucide-react';
import { sendChat, summarizeCall, bookAppointment, getAvailability } from '../api';

export default function AgentPage() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle'); // idle, listening, thinking, speaking
  const [language, setLanguage] = useState('English');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! Welcome to NovaTech Solutions. I am your autonomous AI sales specialist. How can I help power your business today?",
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [leadDraft, setLeadDraft] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    product_interest: 'OmniVoice AI Sales Platform',
    budget: '',
    purchase_timeline: '',
    customer_requirements: ''
  });
  const [qualification, setQualification] = useState({
    score: 30,
    temperature: 'Cold',
    sentiment: 'Neutral',
    qualification_status: 'Unqualified',
    recommended_action: 'Initiate requirements discovery',
    breakdown: { reasons: ['Initial conversation phase'] }
  });
  const [retrievedContext, setRetrievedContext] = useState([]);
  const [mode, setMode] = useState('DEMO_MODE');
  const [bookingModal, setBookingModal] = useState({ open: false, date: '2026-11-28', slots: [], selectedSlot: '' });
  const [callDuration, setCallDuration] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Session duration timer
  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isSessionActive]);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'Telugu' ? 'te-IN' : 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setLiveTranscript(interim);
        if (final.trim()) {
          setLiveTranscript('');
          handleSendMessage(final.trim());
        }
      };

      recognition.onerror = (e) => {
        console.warn('SpeechRecognition error:', e.error);
        if (e.error === 'not-allowed') {
          setAgentStatus('idle');
        }
      };

      recognition.onend = () => {
        if (isSessionActive && agentStatus === 'listening') {
          try {
            recognition.start();
          } catch (err) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language, isSessionActive]);

  const toggleSession = () => {
    if (!isSessionActive) {
      setIsSessionActive(true);
      setAgentStatus('listening');
      setCallDuration(0);
      speakText(messages[0].text);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Voice rec start ignored:', e);
        }
      }
    } else {
      endSession();
    }
  };

  const endSession = async () => {
    setIsSessionActive(false);
    setAgentStatus('idle');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Trigger call summary generation and persistence
    try {
      await summarizeCall({
        transcript: messages,
        leadDraft,
        language,
        durationSeconds: callDuration
      });
      alert('Voice session ended. Call summary and qualified lead have been persisted to the CRM!');
    } catch (err) {
      console.error('Failed to summarize call:', err);
    }
  };

  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'Telugu' ? 'te-IN' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setAgentStatus('speaking');
    utterance.onend = () => {
      if (isSessionActive) {
        setAgentStatus('listening');
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      } else {
        setAgentStatus('idle');
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setInputText('');
    setLiveTranscript('');
    
    // Add user message
    const newMessages = [...messages, { sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
    setMessages(newMessages);

    setAgentStatus('thinking');
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      const response = await sendChat({
        message: text,
        conversationHistory: newMessages,
        language,
        leadDraft
      });

      const { reply, mode: respMode, retrievedContext: ctx, leadData, qualification: qual, appointmentIntent } = response.data;

      setMode(respMode);
      if (ctx) setRetrievedContext(ctx);
      if (leadData) setLeadDraft(leadData);
      if (qual) setQualification(qual);

      // Add AI reply
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      speakText(reply);

      // Check if user requested appointment booking
      if (appointmentIntent?.isRequested) {
        openBookingModal(appointmentIntent.preferredDate || '2026-11-28');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "I encountered a minor network issue. Please ask again or type below.",
        time: 'Just now'
      }]);
      setAgentStatus('idle');
    }
  };

  const openBookingModal = async (date) => {
    try {
      const res = await getAvailability(date);
      setBookingModal({
        open: true,
        date,
        slots: res.data.slots || [],
        selectedSlot: res.data.slots?.find(s => s.available)?.time || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const confirmBooking = async () => {
    try {
      const res = await bookAppointment({
        customer_name: leadDraft.name || 'Prospect Client',
        customer_email: leadDraft.email || 'client@example.com',
        customer_phone: leadDraft.phone || '',
        preferred_date: bookingModal.date,
        preferred_time: bookingModal.selectedSlot,
        topic: `NovaTech Enterprise Demo (${leadDraft.product_interest || 'OmniVoice AI'})`
      });

      setBookingModal(prev => ({ ...prev, open: false }));
      const confirmationMsg = `Appointment successfully confirmed! Booking Reference ID: ${res.data.appointment_id} for ${bookingModal.date} at ${bookingModal.selectedSlot}. A calendar invite has been dispatched.`;
      
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: confirmationMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(confirmationMsg);
    } catch (err) {
      alert(err.message || 'Slot already booked or invalid');
    }
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-130px)] fade-in">
      {/* LEFT/CENTER: Conversation & Voice Interface */}
      <div className="lg:col-span-8 flex flex-col glass rounded-2xl p-5 border border-indigo-900/40 relative">
        {/* Top Agent Controls Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-indigo-900/30 gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${
              agentStatus === 'speaking' ? 'bg-indigo-400 animate-ping' :
              agentStatus === 'listening' ? 'bg-emerald-400 animate-pulse' :
              agentStatus === 'thinking' ? 'bg-yellow-400 animate-bounce' : 'bg-slate-500'
            }`} />
            <div>
              <span className="text-sm font-semibold text-slate-100">Nova — AI Sales Rep</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-indigo-950/80 border border-indigo-800/50 text-indigo-300">
                Status: {agentStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              mode === 'LIVE_AI' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-yellow-950/60 border-yellow-500/40 text-yellow-300'
            }`}>
              {mode === 'LIVE_AI' ? '● Live OpenAI' : '✦ Interactive Demo Mode'}
            </span>

            {/* Language Selection */}
            <div className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-xl">
              <Globe size={13} className="text-slate-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="English" className="bg-slate-900">English</option>
                <option value="Telugu" className="bg-slate-900">Telugu (తెలుగు)</option>
              </select>
            </div>

            {/* Voice toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? "Mute Voice Output" : "Enable Voice Output"}
              className="p-1.5 rounded-lg glass hover:bg-indigo-500/10 text-slate-300"
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-400" />}
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none'
                  : 'glass text-slate-200 border border-indigo-900/40 rounded-bl-none'
              }`}>
                <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between gap-4">
                  <span>{m.sender === 'user' ? 'Customer' : 'Nova (NovaTech AI)'}</span>
                  <span>{m.time}</span>
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}

          {liveTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 italic animate-pulse">
                Hearing: {liveTranscript}...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Controls & Input */}
        <div className="pt-3 border-t border-indigo-900/30 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSession}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl ${
                isSessionActive
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse glow-purple'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white glow-purple'
              }`}
            >
              {isSessionActive ? (
                <>
                  <PhoneOff size={18} /> End Call ({formatTimer(callDuration)})
                </>
              ) : (
                <>
                  <Mic size={18} /> Start Voice Call
                </>
              )}
            </button>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isSessionActive ? "Speak or type your requirement..." : "Type a message or press 'Start Voice Call'..."}
                className="flex-1 glass rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Fallback available: Web Speech STT/TTS or text input supported anytime.</span>
            <button
              onClick={() => openBookingModal('2026-11-28')}
              className="text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Calendar size={12} /> Book Appointment Directly
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Real-time Lead Qualification & Context Inspector */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
        {/* Lead Score & Temperature Card */}
        <div className="glass rounded-2xl p-5 border border-indigo-900/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              Live Qualification Engine
            </h3>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              qualification.temperature === 'Hot' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              qualification.temperature === 'Warm' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {qualification.temperature} ({qualification.score}/100)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                qualification.score >= 75 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                qualification.score >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${qualification.score}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="glass p-2 rounded-xl">
              <span className="text-slate-500 block text-[10px]">Sentiment</span>
              <span className="font-semibold text-slate-200">{qualification.sentiment}</span>
            </div>
            <div className="glass p-2 rounded-xl">
              <span className="text-slate-500 block text-[10px]">Status</span>
              <span className="font-semibold text-slate-200">{qualification.qualification_status}</span>
            </div>
          </div>

          <div className="bg-indigo-950/40 border border-indigo-900/30 rounded-xl p-3 text-xs">
            <span className="text-indigo-400 font-semibold block mb-1">Recommended Action:</span>
            <p className="text-slate-300">{qualification.recommended_action}</p>
          </div>
        </div>

        {/* Lead Captured Fields */}
        <div className="glass rounded-2xl p-5 border border-indigo-900/40">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Extracted Lead Attributes</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-200">{leadDraft.name || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Company</span>
              <span className="font-medium text-slate-200">{leadDraft.company || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-200">{leadDraft.email || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Budget</span>
              <span className="font-medium text-slate-200">{leadDraft.budget || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Timeline</span>
              <span className="font-medium text-slate-200">{leadDraft.purchase_timeline || '—'}</span>
            </div>
          </div>
        </div>

        {/* Retrieved RAG Context Ground Truth */}
        <div className="glass rounded-2xl p-5 border border-indigo-900/40 flex-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            RAG Ground Truth Sourced
          </h4>
          {retrievedContext.length > 0 ? (
            <div className="space-y-2">
              {retrievedContext.map((c, i) => (
                <div key={i} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-indigo-400 font-bold block">{c.category} · {c.title}</span>
                  <p className="text-slate-300 mt-1 line-clamp-3">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-600">Context will be retrieved dynamically upon conversation turns.</p>
          )}
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {bookingModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl max-w-md w-full p-6 border border-indigo-500/30 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="text-indigo-400" /> Confirm Sales Consultation
              </h3>
              <button
                onClick={() => setBookingModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an available 30-minute slot with NovaTech Solutions Enterprise Engineering.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Date</label>
              <input
                type="date"
                value={bookingModal.date}
                onChange={(e) => openBookingModal(e.target.value)}
                className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Available Slots</label>
              <div className="grid grid-cols-2 gap-2">
                {bookingModal.slots.map(s => (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setBookingModal(prev => ({ ...prev, selectedSlot: s.time }))}
                    className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                      !s.available ? 'opacity-30 bg-slate-900 border-slate-800 line-through cursor-not-allowed' :
                      bookingModal.selectedSlot === s.time ? 'bg-indigo-600 text-white border-indigo-500 font-bold glow-purple' :
                      'glass text-slate-300 border-slate-800 hover:border-indigo-500/40'
                    }`}
                  >
                    {s.time} {s.available ? '' : '(Booked)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setBookingModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2 rounded-xl glass text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmBooking}
                disabled={!bookingModal.selectedSlot}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white glow-purple"
              >
                Confirm Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
