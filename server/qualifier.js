/**
 * Explainable Lead Scoring and Qualification Engine
 * Follows BANT (Budget, Authority, Need, Timeline) framework adapted for voice sales.
 */
function qualifyLead(leadData) {
  let budgetScore = 0;
  let timelineScore = 0;
  let authorityScore = 0;
  let needScore = 0;

  const reasons = [];

  // 1. Budget Assessment (Max 30 points)
  const budget = (leadData.budget || '').toLowerCase();
  if (budget.includes('enterprise') || budget.includes('10,000') || budget.includes('8,000') || budget.includes('5,000') || budget.includes('high')) {
    budgetScore = 30;
    reasons.push('High enterprise budget allocated ($5k+/mo).');
  } else if (budget.includes('3,500') || budget.includes('2,000') || budget.includes('3,000') || budget.includes('medium')) {
    budgetScore = 22;
    reasons.push('Approved mid-market budget ($2k-$4k/mo).');
  } else if (budget.includes('1,200') || budget.includes('1,000') || budget.includes('starter')) {
    budgetScore = 14;
    reasons.push('Starter tier budget ($1k-$2k/mo).');
  } else if (budget.length > 0) {
    budgetScore = 8;
    reasons.push('Limited or exploratory budget mentioned.');
  } else {
    budgetScore = 0;
    reasons.push('Budget not yet disclosed.');
  }

  // 2. Timeline Assessment (Max 25 points)
  const timeline = (leadData.purchase_timeline || '').toLowerCase();
  if (timeline.includes('immediately') || timeline.includes('urgent') || timeline.includes('asap') || timeline.includes('this week') || timeline.includes('30 days') || timeline.includes('month')) {
    timelineScore = 25;
    reasons.push('Immediate or 30-day purchasing urgency.');
  } else if (timeline.includes('1-3 months') || timeline.includes('quarter') || timeline.includes('next month')) {
    timelineScore = 18;
    reasons.push('Target purchase within current business quarter.');
  } else if (timeline.includes('6 months') || timeline.includes('exploring') || timeline.includes('future')) {
    timelineScore = 10;
    reasons.push('Long-term exploratory evaluation (6+ months).');
  } else if (timeline.length > 0) {
    timelineScore = 10;
    reasons.push('Timeline provided.');
  } else {
    timelineScore = 0;
    reasons.push('Timeline undisclosed.');
  }

  // 3. Authority & Contact Details (Max 20 points)
  let contactPoints = 0;
  if (leadData.name && leadData.name.trim().length > 1) contactPoints += 5;
  if (leadData.company && leadData.company.trim().length > 1) contactPoints += 5;
  if (leadData.email && leadData.email.includes('@')) contactPoints += 5;
  if (leadData.phone && leadData.phone.trim().length > 6) contactPoints += 5;
  authorityScore = contactPoints;
  if (authorityScore >= 15) {
    reasons.push('Full enterprise decision maker contact details captured.');
  } else if (authorityScore > 0) {
    reasons.push('Partial contact information provided.');
  }

  // 4. Need & Product Match (Max 25 points)
  const reqs = (leadData.customer_requirements || '').toLowerCase();
  const prod = (leadData.product_interest || '').toLowerCase();
  if (prod.includes('omnivoice') || prod.includes('voice') || prod.includes('cloudguard') || prod.includes('security')) {
    needScore += 12;
  }
  if (reqs.length > 20) {
    needScore += 13;
    reasons.push('Specific technical use case and requirement articulated.');
  } else if (reqs.length > 0) {
    needScore += 6;
  }

  const totalScore = Math.min(100, budgetScore + timelineScore + authorityScore + needScore);

  // Temperature & Sentiment
  let temperature = 'Cold';
  let qualification_status = 'Unqualified';
  let recommended_action = 'Nurture via automated email campaign';

  if (totalScore >= 75) {
    temperature = 'Hot';
    qualification_status = 'Qualified';
    recommended_action = 'Direct executive booking with Senior Solutions Architect & Send Contract';
  } else if (totalScore >= 50) {
    temperature = 'Warm';
    qualification_status = 'Qualified';
    recommended_action = 'Schedule 20-min product walkthrough & share technical whitepaper';
  } else {
    temperature = 'Cold';
    qualification_status = 'Unqualified';
    recommended_action = 'Enrol in product release newsletter and low-touch nurture drip';
  }

  let sentiment = 'Neutral';
  const fullText = (JSON.stringify(leadData) + ' ' + (leadData.customer_requirements || '')).toLowerCase();
  if (fullText.includes('great') || fullText.includes('interested') || fullText.includes('impressive') || fullText.includes('love') || fullText.includes('yes') || fullText.includes('excited')) {
    sentiment = 'Positive';
  } else if (fullText.includes('concern') || fullText.includes('expensive') || fullText.includes('doubt') || fullText.includes('no') || fullText.includes('issue')) {
    sentiment = 'Negative';
  }

  return {
    score: totalScore,
    temperature,
    sentiment,
    qualification_status,
    recommended_action,
    breakdown: {
      budgetScore,
      timelineScore,
      authorityScore,
      needScore,
      reasons
    }
  };
}

module.exports = { qualifyLead };
