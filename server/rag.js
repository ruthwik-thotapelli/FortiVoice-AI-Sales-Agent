const db = require('./db');

/**
 * Lightweight BM25 / Keyword Retrieval Engine for Knowledge Base
 * Searches categories, titles, content, and keyword tags.
 */
function retrieveContext(query, topK = 3) {
  if (!query || typeof query !== 'string') return [];

  const tokens = query.toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (tokens.length === 0) {
    return db.prepare('SELECT * FROM knowledge_base LIMIT ?').all(topK);
  }

  const allArticles = db.prepare('SELECT * FROM knowledge_base').all();

  // Score each article based on keyword frequency and field priority
  const scored = allArticles.map(article => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const keywordsLower = (article.keywords || '').toLowerCase();
    const categoryLower = article.category.toLowerCase();

    tokens.forEach(token => {
      // Title match gives highest weight
      if (titleLower.includes(token)) score += 8;
      // Keywords list match
      if (keywordsLower.includes(token)) score += 6;
      // Category match
      if (categoryLower.includes(token)) score += 4;
      // Content body match
      const occurrences = (contentLower.match(new RegExp(`\\b${token}\\b`, 'gi')) || []).length;
      score += Math.min(occurrences * 2, 8);
    });

    return { ...article, score };
  });

  // Filter items with relevant matches and sort descending
  const relevant = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // If no match found, return most general company profile and pricing entries
  if (relevant.length === 0) {
    return db.prepare("SELECT * FROM knowledge_base WHERE category IN ('Company Profile', 'Pricing') LIMIT ?").all(topK);
  }

  return relevant;
}

module.exports = { retrieveContext };
