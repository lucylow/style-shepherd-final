// lib/embeddings.js
// Utility for generating embeddings using OpenAI API
// Used by migration and training data export scripts

const fetch = global.fetch || require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate embeddings for text(s) using OpenAI API
 * @param {string|string[]} texts - Text or array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function embedOpenAI(texts = []) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  const textArray = Array.isArray(texts) ? texts : [texts];

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Change if you prefer another model
        input: textArray,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Embedding API error: ${res.status} ${txt}`);
    }

    const json = await res.json();
    const embeddings = json.data.map((d) => d.embedding);

    return Array.isArray(texts) ? embeddings : embeddings[0];
  } catch (error) {
    console.error('OpenAI embedding API error:', error);
    throw error;
  }
}

/**
 * Calculate dot product of two vectors
 */
function dot(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}

/**
 * Calculate norm (magnitude) of a vector
 */
function norm(a) {
  return Math.sqrt(dot(a, a));
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSim(a, b) {
  const denominator = norm(a) * norm(b);
  if (denominator === 0) {
    return 0;
  }
  return dot(a, b) / (denominator + 1e-12);
}

module.exports = { embedOpenAI, cosineSim, dot, norm };

