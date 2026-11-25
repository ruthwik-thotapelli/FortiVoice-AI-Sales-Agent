require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const agent = require('./agent');
const { retrieveContext } = require('./rag');
const { qualifyLead } = require('./qualifier');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Health & System Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'FortiVoice AI Sales Server',
    version: '1.0.0',
    mode: agent.isLiveMode() ? 'LIVE_AI' : 'DEMO_MODE',
    database: 'SQLite (WAL mode)',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 1. AI CONVERSATION & AGENT ENDPOINTS
// ==========================================

app.post('/api/chat', async (req, res, next) => {
  try {
    const { message, conversationHistory = [], language = 'English', leadDraft = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const response = await agent.processMessage({
      message,
      conversationHistory,
      language,
      leadDraft
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Auto-generate call summary after call ends
app.post('/api/chat/summarize', async (req, res, next) => {
  try {
    const { transcript = [], leadDraft = {}, language = 'English', durationSeconds = 0 } = req.body;

    const qualification = qualifyLead(leadDraft);
    const callId = 'CALL-' + Math.floor(10000 + Math.random() * 90000);

    const questionsAsked = transcript
      .filter(t => t.sender === 'user' && t.text.includes('?'))
      .map(t => t.text)
      .slice(0, 3)
      .join(' | ') || 'Inquired on pricing, enterprise SLAs, and bilingual voice capability';

    const customerSummary = `Call conducted in ${language}. Lead expressed interest in ${leadDraft.product_interest || 'OmniVoice AI'}. Budget: ${leadDraft.budget || 'To be finalized'}, Timeline: ${leadDraft.purchase_timeline || '30 days'}. Lead qualified as ${qualification.temperature} with a score of ${qualification.score}/100.`;

    // Save call log to database
    const stmt = db.prepare(`
      INSERT INTO call_logs (
        call_id, customer_name, language, duration_seconds, transcript,
        summary, customer_requirements, main_questions, sentiment,
        lead_score, recommended_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      callId,
      leadDraft.name || 'Anonymous Prospect',
      language,
      durationSeconds,
      JSON.stringify(transcript),
      customerSummary,
      leadDraft.customer_requirements || 'Enterprise sales automation',
      questionsAsked,
      qualification.sentiment,
      qualification.score,
      qualification.recommended_action
    );

    res.json({
      success: true,
      callId,
      summary: customerSummary,
      qualification,
      questionsAsked
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. LEADS & CRM ENDPOINTS
// ==========================================

app.get('/api/leads', (req, res, next) => {
  try {
    const { search, temperature } = req.query;
    let query = 'SELECT * FROM leads';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(name LIKE ? OR company LIKE ? OR email LIKE ? OR product_interest LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (temperature && temperature !== 'All') {
      conditions.push('temperature = ?');
      params.push(temperature);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const leads = db.prepare(query).all(...params);
    res.json(leads);
  } catch (err) {
    next(err);
  }
});

app.post('/api/leads', (req, res, next) => {
  try {
    const lead = req.body;
    if (!lead.name) {
      return res.status(400).json({ error: 'Lead name is required.' });
    }

    const qualification = qualifyLead(lead);

    const stmt = db.prepare(`
      INSERT INTO leads (
        name, company, email, phone, product_interest, budget,
        purchase_timeline, customer_requirements, lead_score,
        temperature, sentiment, qualification_status, recommended_action,
        score_breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      lead.name,
      lead.company || '',
      lead.email || '',
      lead.phone || '',
      lead.product_interest || 'OmniVoice AI Sales Platform',
      lead.budget || '',
      lead.purchase_timeline || '',
      lead.customer_requirements || '',
      qualification.score,
      qualification.temperature,
      qualification.sentiment,
      qualification.qualification_status,
      qualification.recommended_action,
      JSON.stringify(qualification.breakdown)
    );

    const createdLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(createdLead);
  } catch (err) {
    next(err);
  }
});

app.put('/api/leads/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, product_interest, budget, purchase_timeline, customer_requirements, temperature, qualification_status, recommended_action } = req.body;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const updatedLeadData = {
      name: name ?? existing.name,
      company: company ?? existing.company,
      email: email ?? existing.email,
      phone: phone ?? existing.phone,
      product_interest: product_interest ?? existing.product_interest,
      budget: budget ?? existing.budget,
      purchase_timeline: purchase_timeline ?? existing.purchase_timeline,
      customer_requirements: customer_requirements ?? existing.customer_requirements
    };

    const qualification = qualifyLead(updatedLeadData);

    const stmt = db.prepare(`
      UPDATE leads SET
        name = ?, company = ?, email = ?, phone = ?, product_interest = ?,
        budget = ?, purchase_timeline = ?, customer_requirements = ?,
        lead_score = ?, temperature = ?, qualification_status = ?,
        recommended_action = ?, score_breakdown = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      updatedLeadData.name,
      updatedLeadData.company,
      updatedLeadData.email,
      updatedLeadData.phone,
      updatedLeadData.product_interest,
      updatedLeadData.budget,
      updatedLeadData.purchase_timeline,
      updatedLeadData.customer_requirements,
      qualification.score,
      temperature || qualification.temperature,
      qualification_status || qualification.qualification_status,
      recommended_action || qualification.recommended_action,
      JSON.stringify(qualification.breakdown),
      id
    );

    const saved = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/leads/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. APPOINTMENTS ENDPOINTS
// ==========================================

// Get available slots for a given date
app.get('/api/appointments/availability', (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD).' });
    }

    const standardSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM',
      '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ];

    // Find already booked slots on that date
    const booked = db.prepare(`
      SELECT preferred_time FROM appointments
      WHERE preferred_date = ? AND status = 'Confirmed'
    `).all(date).map(b => b.preferred_time);

    const slots = standardSlots.map(time => ({
      time,
      available: !booked.includes(time)
    }));

    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
});

app.get('/api/appointments', (req, res, next) => {
  try {
    const appointments = db.prepare(`
      SELECT a.*, l.company as lead_company
      FROM appointments a
      LEFT JOIN leads l ON a.lead_id = l.id
      ORDER BY a.preferred_date ASC, a.preferred_time ASC
    `).all();
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

app.post('/api/appointments', (req, res, next) => {
  try {
    const { lead_id, customer_name, customer_email, customer_phone, preferred_date, preferred_time, topic } = req.body;

    if (!customer_name || !preferred_date || !preferred_time) {
      return res.status(400).json({ error: 'Customer name, preferred date, and preferred time are required.' });
    }

    // Check double-booking
    const existing = db.prepare(`
      SELECT * FROM appointments
      WHERE preferred_date = ? AND preferred_time = ? AND status = 'Confirmed'
    `).get(preferred_date, preferred_time);

    if (existing) {
      return res.status(409).json({
        error: `Slot ${preferred_time} on ${preferred_date} is already booked. Please choose another available slot.`,
        suggestedNextSlot: '02:00 PM'
      });
    }

    const appointment_id = 'APT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    const stmt = db.prepare(`
      INSERT INTO appointments (
        appointment_id, lead_id, customer_name, customer_email,
        customer_phone, preferred_date, preferred_time, topic, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
    `);

    stmt.run(
      appointment_id,
      lead_id || null,
      customer_name,
      customer_email || '',
      customer_phone || '',
      preferred_date,
      preferred_time,
      topic || 'NovaTech Solutions Enterprise Demo Consultation'
    );

    const created = db.prepare('SELECT * FROM appointments WHERE appointment_id = ?').get(appointment_id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/appointments/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. CALL HISTORY ENDPOINTS
// ==========================================

app.get('/api/calls', (req, res, next) => {
  try {
    const calls = db.prepare('SELECT * FROM call_logs ORDER BY created_at DESC').all();
    const formatted = calls.map(c => ({
      ...c,
      transcript: c.transcript ? JSON.parse(c.transcript) : []
    }));
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

app.get('/api/calls/:id', (req, res, next) => {
  try {
    const call = db.prepare('SELECT * FROM call_logs WHERE id = ? OR call_id = ?').get(req.params.id, req.params.id);
    if (!call) return res.status(404).json({ error: 'Call log not found' });
    call.transcript = call.transcript ? JSON.parse(call.transcript) : [];
    res.json(call);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. KNOWLEDGE BASE (RAG) CRUD ENDPOINTS
// ==========================================

app.get('/api/knowledge-base', (req, res, next) => {
  try {
    const items = db.prepare('SELECT * FROM knowledge_base ORDER BY id DESC').all();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

app.post('/api/knowledge-base', (req, res, next) => {
  try {
    const { category, title, content, keywords } = req.body;
    if (!category || !title || !content) {
      return res.status(400).json({ error: 'Category, title, and content are required fields.' });
    }

    const stmt = db.prepare(`
      INSERT INTO knowledge_base (category, title, content, keywords)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(category, title, content, keywords || '');
    const created = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/knowledge-base/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, title, content, keywords } = req.body;

    const existing = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Knowledge article not found.' });

    db.prepare(`
      UPDATE knowledge_base SET
        category = ?, title = ?, content = ?, keywords = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      category || existing.category,
      title || existing.title,
      content || existing.content,
      keywords !== undefined ? keywords : existing.keywords,
      id
    );

    const updated = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/knowledge-base/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Article not found.' });
    res.json({ success: true, message: 'Article removed from knowledge base.' });
  } catch (err) {
    next(err);
  }
});

// Test retrieval endpoint
app.post('/api/knowledge-base/search', (req, res, next) => {
  try {
    const { query, topK = 3 } = req.body;
    const results = retrieveContext(query, topK);
    res.json({ query, results });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. DASHBOARD ANALYTICS ENDPOINT
// ==========================================

app.get('/api/analytics', (req, res, next) => {
  try {
    const totalCalls = db.prepare('SELECT COUNT(*) as count FROM call_logs').get().count;
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const qualifiedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE qualification_status = 'Qualified'").get().count;
    const appointmentsBooked = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Confirmed'").get().count;

    const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Lead temperatures breakdown
    const hotLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE temperature = 'Hot'").get().count;
    const warmLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE temperature = 'Warm'").get().count;
    const coldLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE temperature = 'Cold'").get().count;

    // Recent activities
    const recentCalls = db.prepare('SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 5').all();
    const recentLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5').all();
    const upcomingAppointments = db.prepare("SELECT * FROM appointments WHERE status = 'Confirmed' ORDER BY preferred_date ASC LIMIT 5").all();

    res.json({
      summary: {
        totalCalls,
        totalLeads,
        qualifiedLeads,
        appointmentsBooked,
        conversionRate: `${conversionRate}%`,
        hotLeads,
        warmLeads,
        coldLeads
      },
      recentCalls: recentCalls.map(c => ({ ...c, transcript: c.transcript ? JSON.parse(c.transcript) : [] })),
      recentLeads,
      upcomingAppointments
    });
  } catch (err) {
    next(err);
  }
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`FortiVoice AI Sales Server running on port ${PORT}`);
  console.log(`Mode: ${agent.isLiveMode() ? 'LIVE_AI' : 'DEMO_MODE (Interactive Scripted Fallback Enabled)'}`);
});
