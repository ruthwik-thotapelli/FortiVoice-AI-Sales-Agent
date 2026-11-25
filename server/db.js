const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'fortivoice.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    product_interest TEXT,
    budget TEXT,
    purchase_timeline TEXT,
    customer_requirements TEXT,
    lead_score INTEGER DEFAULT 0,
    temperature TEXT DEFAULT 'Cold',
    sentiment TEXT DEFAULT 'Neutral',
    qualification_status TEXT DEFAULT 'Unqualified',
    recommended_action TEXT,
    score_breakdown TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id TEXT UNIQUE NOT NULL,
    lead_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    topic TEXT,
    status TEXT DEFAULT 'Confirmed',
    calendar_type TEXT DEFAULT 'Demo Calendar',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL,
    lead_id INTEGER,
    customer_name TEXT,
    language TEXT DEFAULT 'English',
    duration_seconds INTEGER DEFAULT 0,
    transcript TEXT,
    summary TEXT,
    customer_requirements TEXT,
    main_questions TEXT,
    sentiment TEXT,
    lead_score INTEGER,
    recommended_action TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default knowledge base if empty
const count = db.prepare('SELECT count(*) as count FROM knowledge_base').get();
if (count.count === 0) {
  const insertKB = db.prepare(`
    INSERT INTO knowledge_base (category, title, content, keywords)
    VALUES (?, ?, ?, ?)
  `);

  const initialDocs = [
    {
      category: 'Company Profile',
      title: 'About NovaTech Solutions',
      content: 'NovaTech Solutions is an enterprise cloud architecture and cybersecurity firm founded in 2018. We specialize in automated cloud monitoring, AI sales acceleration, SOC 2 compliance automation, and enterprise secure voice platforms. Our global headquarters are in San Francisco with regional engineering hubs in Hyderabad and London.',
      keywords: 'about, company, profile, novatech, founders, mission, headquarters, office, hyderabad, san francisco'
    },
    {
      category: 'Products & Services',
      title: 'CloudGuard Cyber Suite',
      content: 'CloudGuard Cyber Suite provides real-time proactive zero-day threat prevention, automated container isolation, and continuous 24/7 SIEM monitoring. Designed for enterprises managing sensitive workloads in AWS, Azure, and GCP.',
      keywords: 'cloudguard, security, cyber suite, threats, firewall, container, siem, monitoring, aws, azure'
    },
    {
      category: 'Products & Services',
      title: 'OmniVoice AI Sales Platform',
      content: 'OmniVoice AI is an autonomous, ultra-low latency voice agent designed to automate inbound qualification, B2B pipeline generation, instant CRM sync, and appointment scheduling with 99.8% semantic accuracy in English, Telugu, Spanish, and German.',
      keywords: 'omnivoice, voice agent, sales, qualification, ai, inbound, pipeline, crm, appointments, telugu'
    },
    {
      category: 'Pricing',
      title: 'NovaTech Solution Pricing & Tiers',
      content: 'NovaTech offers 3 subscription tiers:\n1. Starter Tier: $1,200/month (up to 2,500 active call minutes, 1 custom voice model, email support).\n2. Professional Tier: $3,500/month (up to 10,000 minutes, multi-lingual support, HubSpot/Salesforce live integrations, priority SLAs).\n3. Enterprise Tier: Custom pricing starting at $8,000/month (unlimited scaling, dedicated VPC on-prem deployment, custom fine-tuned LLMs, dedicated TAM).',
      keywords: 'pricing, cost, tiers, starter, professional, enterprise, subscription, plan, budget, payment'
    },
    {
      category: 'Support Policies',
      title: 'Customer Support and SLA Guarantee',
      content: 'Starter plans include 8x5 standard email support with a 4-hour response SLA. Professional and Enterprise tiers include 24x7x365 dedicated hotline access, private Slack/Teams channel, 15-minute emergency response SLA, and 99.99% uptime guarantee.',
      keywords: 'support, sla, guarantee, warranty, uptime, response time, helpdesk, hours'
    },
    {
      category: 'Appointment Availability',
      title: 'Sales Consultation & Demo Booking Guidelines',
      content: 'Live product demos and executive security briefings are scheduled Monday through Friday from 09:00 AM to 06:00 PM IST / EST. Standard demo slots are 30 minutes in duration. Available slots start on the hour and half-hour.',
      keywords: 'appointments, demo, schedule, consultation, slots, hours, calendar, booking'
    },
    {
      category: 'FAQ',
      title: 'Integration and Compliance FAQ',
      content: 'NovaTech seamlessly integrates with Salesforce, HubSpot, Zoho CRM, Slack, Google Calendar, and Microsoft Outlook via bi-directional Webhooks and REST API. We are SOC 2 Type II certified, ISO 27001 compliant, and GDPR/HIPAA compliant.',
      keywords: 'integration, crm, salesforce, hubspot, zoho, compliance, soc 2, gdpr, hipaa, api'
    }
  ];

  const seedTransaction = db.transaction((docs) => {
    for (const doc of docs) {
      insertKB.run(doc.category, doc.title, doc.content, doc.keywords);
    }
  });
  seedTransaction(initialDocs);
}

// Seed demo leads if empty
const leadCount = db.prepare('SELECT count(*) as count FROM leads').get();
if (leadCount.count === 0) {
  const insertLead = db.prepare(`
    INSERT INTO leads (name, company, email, phone, product_interest, budget, purchase_timeline, customer_requirements, lead_score, temperature, sentiment, qualification_status, recommended_action, score_breakdown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialLeads = [
    {
      name: 'Aditya Varma',
      company: 'Apex FinTech Corp',
      email: 'aditya.varma@apexfin.com',
      phone: '+91 98480 22334',
      product_interest: 'OmniVoice AI Sales Platform',
      budget: '$5,000/month',
      purchase_timeline: 'Within 30 days',
      customer_requirements: 'Needs bilingual voice qualification in English and Telugu for loan applicant verification.',
      lead_score: 92,
      temperature: 'Hot',
      sentiment: 'Positive',
      qualification_status: 'Qualified',
      recommended_action: 'Send Enterprise Contract & Book Technical Architecture Deep-dive',
      score_breakdown: JSON.stringify({ budgetScore: 30, timelineScore: 25, authorityScore: 20, needScore: 17 })
    },
    {
      name: 'Sarah Jenkins',
      company: 'Nexus Health Systems',
      email: 'sjenkins@nexushealth.org',
      phone: '+1 415 555 7890',
      product_interest: 'CloudGuard Cyber Suite',
      budget: '$2,500/month',
      purchase_timeline: '1-3 months',
      customer_requirements: 'Looking for HIPAA compliant container security monitoring across AWS EKS.',
      lead_score: 75,
      temperature: 'Warm',
      sentiment: 'Positive',
      qualification_status: 'Qualified',
      recommended_action: 'Schedule 30-min security architecture walkthrough',
      score_breakdown: JSON.stringify({ budgetScore: 20, timelineScore: 20, authorityScore: 18, needScore: 17 })
    },
    {
      name: 'Karthik Rao',
      company: 'Rao Logistics',
      email: 'karthik@raologistics.in',
      phone: '+91 99887 66554',
      product_interest: 'OmniVoice AI Sales Platform',
      budget: 'Under $1,000/month',
      purchase_timeline: 'Exploring / 6+ months',
      customer_requirements: 'Early stage evaluation for automated dispatch call updates.',
      lead_score: 42,
      temperature: 'Cold',
      sentiment: 'Neutral',
      qualification_status: 'Unqualified',
      recommended_action: 'Add to product newsletter nurture drip',
      score_breakdown: JSON.stringify({ budgetScore: 10, timelineScore: 10, authorityScore: 12, needScore: 10 })
    }
  ];

  for (const l of initialLeads) {
    insertLead.run(
      l.name, l.company, l.email, l.phone, l.product_interest,
      l.budget, l.purchase_timeline, l.customer_requirements,
      l.lead_score, l.temperature, l.sentiment, l.qualification_status,
      l.recommended_action, l.score_breakdown
    );
  }

  // Seed sample appointment
  db.prepare(`
    INSERT INTO appointments (appointment_id, lead_id, customer_name, customer_email, customer_phone, preferred_date, preferred_time, topic, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'APT-2026-8901', 1, 'Aditya Varma', 'aditya.varma@apexfin.com', '+91 98480 22334',
    '2026-11-28', '11:00 AM', 'Enterprise OmniVoice Architecture & Telugu Voice Demo', 'Confirmed'
  );

  // Seed sample call log
  db.prepare(`
    INSERT INTO call_logs (call_id, lead_id, customer_name, language, duration_seconds, transcript, summary, customer_requirements, main_questions, sentiment, lead_score, recommended_action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CALL-84920', 1, 'Aditya Varma', 'English', 185,
    JSON.stringify([
      { sender: 'ai', text: 'Hello! Welcome to NovaTech Solutions. I am your autonomous sales assistant. How can I help power your business today?' },
      { sender: 'user', text: 'Hi, we are looking for an AI voice agent that can handle customer qualification in English and Telugu.' },
      { sender: 'ai', text: 'NovaTech OmniVoice AI has native support for both English and Telugu with sub-second latency! What kind of call volume and budget do you anticipate?' },
      { sender: 'user', text: 'Our budget is around $5000 a month and we want to roll this out within 30 days.' },
      { sender: 'ai', text: 'That aligns perfectly with our Professional and Enterprise tiers. May I book a quick 30-minute technical demo with our solutions engineer?' }
    ]),
    'Customer Aditya Varma from Apex FinTech inquired regarding bilingual English/Telugu autonomous sales agents. Has an approved budget of $5,000/mo and rapid 30-day timeline. High intent buyer.',
    'OmniVoice AI with English and Telugu language synthesis and CRM sync.',
    'Language latency, integration with banking APIs, enterprise tier pricing.',
    'Positive', 92, 'Send Enterprise Contract & Book Technical Architecture Deep-dive'
  );
}

module.exports = db;
