const { retrieveContext } = require('./rag');
const { qualifyLead } = require('./qualifier');

/**
 * Intelligent Agent engine with real LLM support and deterministic, realistic Scripted Demo Mode.
 */
class AgentEngine {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  isLiveMode() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  /**
   * Process a conversation step
   */
  async processMessage({ message, conversationHistory = [], language = 'English', leadDraft = {} }) {
    // 1. RAG context lookup
    const retrievedDocs = retrieveContext(message, 3);
    const contextString = retrievedDocs.map(d => `[${d.category} - ${d.title}]: ${d.content}`).join('\n\n');

    // 2. Extract or update lead fields from user message
    const updatedLead = this.extractLeadInfo(message, leadDraft);
    const qualification = qualifyLead(updatedLead);

    // 3. Generate response: Real LLM if API Key exists, otherwise robust interactive demo engine
    let replyText = '';
    let appointmentIntent = this.detectAppointmentIntent(message);

    if (this.isLiveMode()) {
      try {
        replyText = await this.callLLM(message, conversationHistory, contextString, language, updatedLead);
      } catch (err) {
        console.warn('LLM call failed, falling back to smart demo responder:', err.message);
        replyText = this.generateSmartDemoReply(message, conversationHistory, contextString, language, updatedLead, appointmentIntent);
      }
    } else {
      replyText = this.generateSmartDemoReply(message, conversationHistory, contextString, language, updatedLead, appointmentIntent);
    }

    return {
      reply: replyText,
      mode: this.isLiveMode() ? 'LIVE_AI' : 'DEMO_MODE',
      retrievedContext: retrievedDocs,
      leadData: updatedLead,
      qualification,
      appointmentIntent
    };
  }

  detectAppointmentIntent(text) {
    const lower = text.toLowerCase();
    const hasBookingKeyword = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('demo') || lower.includes('call with') || lower.includes('slot');
    
    // Check for potential date/time indications
    let preferredDate = null;
    let preferredTime = null;

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      preferredDate = tomorrow.toISOString().split('T')[0];
    } else if (lower.includes('friday')) {
      preferredDate = '2026-11-28';
    } else if (lower.includes('monday')) {
      preferredDate = '2026-12-01';
    }

    const timeMatches = text.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/);
    if (timeMatches) {
      preferredTime = timeMatches[1].toUpperCase();
    } else if (lower.includes('11 am') || lower.includes('11:00 am')) {
      preferredTime = '11:00 AM';
    } else if (lower.includes('2 pm') || lower.includes('2:00 pm') || lower.includes('afternoon')) {
      preferredTime = '02:00 PM';
    } else if (lower.includes('morning')) {
      preferredTime = '10:00 AM';
    }

    return {
      isRequested: hasBookingKeyword,
      preferredDate,
      preferredTime
    };
  }

  extractLeadInfo(message, currentDraft = {}) {
    const draft = { ...currentDraft };
    const text = message.trim();
    const lower = text.toLowerCase();

    // Extract Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) draft.email = emailMatch[0];

    // Extract Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) draft.phone = phoneMatch[0];

    // Extract Name
    if (lower.startsWith('my name is ') || lower.startsWith("i'm ") || lower.startsWith("i am ")) {
      const parts = text.split(/(?:my name is|i'm|i am)\s+/i);
      if (parts[1]) {
        const potentialName = parts[1].split(/[,.\s\n]/).slice(0, 2).join(' ');
        if (potentialName.length > 2) draft.name = potentialName;
      }
    } else if (!draft.name && /^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(text)) {
      draft.name = text;
    }

    // Extract Company
    if (lower.includes('company') || lower.includes('work at') || lower.includes('from ')) {
      const compMatch = text.match(/(?:from|at|company is)\s+([A-Za-z0-9\s&]+?)(?=[,.]|$)/i);
      if (compMatch && compMatch[1] && compMatch[1].trim().length > 2) {
        draft.company = compMatch[1].trim();
      }
    }

    // Product interest
    if (lower.includes('omnivoice') || lower.includes('voice') || lower.includes('sales agent') || lower.includes('sales')) {
      draft.product_interest = 'OmniVoice AI Sales Platform';
    } else if (lower.includes('cloudguard') || lower.includes('security') || lower.includes('cyber')) {
      draft.product_interest = 'CloudGuard Cyber Suite';
    }

    // Budget
    const budgetMatch = text.match(/\$\s?([0-9,]+(?:\/month|\/mo|\/yr|k)?)/i) || text.match(/([0-9,]+(?:\s*dollars|\s*usd|\s*inr))/i);
    if (budgetMatch) {
      draft.budget = budgetMatch[0];
    } else if (lower.includes('5000') || lower.includes('5k')) {
      draft.budget = '$5,000/month';
    } else if (lower.includes('3500') || lower.includes('3.5k')) {
      draft.budget = '$3,500/month';
    } else if (lower.includes('1200') || lower.includes('starter')) {
      draft.budget = '$1,200/month';
    }

    // Timeline
    if (lower.includes('urgent') || lower.includes('immediately') || lower.includes('asap')) {
      draft.purchase_timeline = 'Immediate';
    } else if (lower.includes('30 days') || lower.includes('this month') || lower.includes('few weeks')) {
      draft.purchase_timeline = 'Within 30 days';
    } else if (lower.includes('1-3 months') || lower.includes('next quarter')) {
      draft.purchase_timeline = '1-3 months';
    } else if (lower.includes('6 months') || lower.includes('exploring')) {
      draft.purchase_timeline = 'Exploring / 6+ months';
    }

    // Customer requirements
    if (text.length > 15 && !draft.customer_requirements) {
      draft.customer_requirements = text;
    } else if (text.length > 20 && draft.customer_requirements && !draft.customer_requirements.includes(text)) {
      draft.customer_requirements += ` | ${text}`;
    }

    return draft;
  }

  generateSmartDemoReply(message, history, context, language, lead, appointmentIntent) {
    const isTelugu = language === 'Telugu' || /[\u0C00-\u0C7F]/.test(message);
    const lower = message.toLowerCase();

    if (isTelugu) {
      if (lower.includes('namaskaram') || lower.includes('hello') || lower.includes('హలో') || lower.includes('నమస్కారం')) {
        return "నమస్కారం! నోవాటెక్ సొల్యూషన్స్ (NovaTech Solutions) కు స్వాగతం. నేను మీ AI సేల్స్ ప్రతినిధిని. మీ వ్యాపారానికి అవసరమైన AI వాయిస్ సేల్స్ లేదా క్లౌడ్ సెక్యూరిటీ వివరాలు తెలుసుకోవడానికి నేను ఎలా సహాయపడగలను?";
      }
      if (lower.includes('ధర') || lower.includes('ఖర్చు') || lower.includes('price') || lower.includes('cost')) {
        return "నోవాటెక్ ఓమ్నీవాయిస్ AI లో మూడు ముఖ్యమైన ప్లాన్స్ ఉన్నాయి: స్టార్టర్ ప్లాన్ నెలకు $1,200, ప్రొఫెషనల్ ప్లాన్ నెలకు $3,500 మరియు ఎంటర్‌ప్రైజ్ ప్లాన్ $8,000 నుండి ప్రారంభమవుతుంది. మీ వ్యాపారానికి నెలకు ఎన్ని కాల్స్ లేదా బడ్జెట్ ఉండవచ్చని భావిస్తున్నారు?";
      }
      if (lower.includes('appointment') || lower.includes('బుక్') || lower.includes('demo') || appointmentIntent.isRequested) {
        return "ఖచ్చితంగా! మా సీనియర్ సొల్యూషన్స్ ఆర్కిటెక్ట్‌తో లైవ్ టెక్నికల్ డెమో షెడ్యూల్ చేస్తాను. మీకు అనువైన తేదీ మరియు సమయం (ఉదాహరణకు రేపు ఉదయం 11:00 AM) తెలియజేయండి.";
      }
      return "ధన్యవాదాలు! మీ అవసరాలు మా నోవాటెక్ ఓమ్నీవాయిస్ AI ప్లాట్‌ఫారమ్‌కు సరిగ్గా సరిపోతాయి. మీ పేరు, కంపెనీ పేరు మరియు కాంటాక్ట్ ఈమెయిల్ చెబితే మా బృందం మరింత సమాచారం పంపుతుంది.";
    }

    // English smart sales script
    if (history.length <= 1 && (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))) {
      return "Hello and welcome to NovaTech Solutions! I'm Nova, your autonomous AI sales specialist. We empower enterprises with next-generation AI voice automation and proactive cloud security. What key business requirements or challenges are you looking to solve today?";
    }

    if (lower.includes('what do you do') || lower.includes('about') || lower.includes('company')) {
      return "NovaTech Solutions is an enterprise cloud architecture and cybersecurity firm founded in 2018. Our flagship platforms are the OmniVoice AI Sales Platform—which automates inbound qualification with sub-second multilingual voice—and CloudGuard Cyber Suite for zero-day cloud protection. Which of these areas interests you most?";
    }

    if (lower.includes('omnivoice') || lower.includes('voice') || lower.includes('sales agent') || lower.includes('product')) {
      return "OmniVoice AI is built specifically for autonomous high-intent B2B sales qualification. It features ultra-low latency conversational streaming, natural multilingual support (including English and Telugu), and real-time CRM synchronization. What kind of call volume or sales workflow are you planning to automate?";
    }

    if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('how much') || lower.includes('plans')) {
      return "Our OmniVoice platform has three clear tiers: Starter at $1,200/month (up to 2,500 call minutes), Professional at $3,500/month (10,000 minutes with bi-lingual Telugu/English support and CRM integrations), and Enterprise starting at $8,000/month with custom LLM tuning and dedicated SLAs. Do you have a specific monthly budget or implementation timeline in mind?";
    }

    if (lower.includes('budget') || lower.includes('5000') || lower.includes('month') || lower.includes('$')) {
      return "That budget range fits our Professional and Enterprise tiers very well! We can definitely support high-concurrency bilingual calls with full enterprise security. How quickly are you planning to deploy this solution?";
    }

    if (appointmentIntent.isRequested || lower.includes('appointment') || lower.includes('schedule') || lower.includes('demo') || lower.includes('slot')) {
      const slotTime = appointmentIntent.preferredTime || '11:00 AM';
      const slotDate = appointmentIntent.preferredDate || 'tomorrow';
      return `I would love to set that up! Our sales engineering team has open slots on weekdays between 9:00 AM and 6:00 PM. Would ${slotDate} at ${slotTime} work well for a comprehensive 30-minute deep-dive? Please share your preferred email to confirm the calendar invite.`;
    }

    if (lead.email || lead.phone || lead.name) {
      return `Thank you ${lead.name ? lead.name : ''}! I have noted your requirements${lead.company ? ' for ' + lead.company : ''}. Based on your criteria, you qualify for our expedited onboarding program. Shall we confirm a 30-minute technical consultation slot for you?`;
    }

    // Default contextual answer using RAG context
    if (context && context.length > 20) {
      return `According to our NovaTech verified documentation: ${context.slice(0, 260)}... To help recommend the exact tier for your team, could you share your company name and expected timeline?`;
    }

    return "Thank you for sharing that. NovaTech Solutions specializes in custom deployments tailored to your exact workflow. Could you let me know your approximate purchase timeline and target budget so I can align the ideal enterprise package for you?";
  }

  async callLLM(message, history, context, language, lead) {
    const systemPrompt = `You are "Nova", an autonomous, professional, and friendly AI Sales Representative for NovaTech Solutions.
Language instruction: Respond strictly in ${language}.

COMPANY KNOWLEDGE BASE (Use this as absolute ground truth. NEVER invent pricing or features outside this context):
${context}

CURRENT LEAD STATE:
${JSON.stringify(lead, null, 2)}

SALES GOAL & RULES:
1. Actively qualify the customer: identify their business requirements, budget, timeline, and decision-maker info.
2. Ask natural, concise follow-up questions (ask for 1 or 2 missing details at a time, never overwhelm the customer).
3. If the customer asks for an appointment or demo, check the guidelines from the knowledge base, suggest a weekday 30-minute slot between 9:00 AM and 6:00 PM, and guide them to confirm.
4. NEVER claim an appointment is officially confirmed in the database until they provide a date and time.
5. If information is not in the knowledge base, honestly state that you will check with the engineering team.
6. Keep replies concise, conversational, and voice-friendly (under 3-4 sentences when possible).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      })),
      { role: 'user', content: message }
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`LLM Error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  }
}

module.exports = new AgentEngine();
