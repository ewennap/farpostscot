// netlify/functions/content-feed.js
// Purpose-built editorial feed for listing pages.

const SANITY_PROJECT_ID = 't11tx9if';
const SANITY_DATASET = 'production';
const SANITY_TOKEN = process.env.SANITY_TOKEN;

const OPINION_CATEGORIES = ['opinion', 'analysis', 'feature', 'interview'];
const MAX_LIMIT = 24;

function json(statusCode, body, cacheControl) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl || 'public, max-age=60'
    },
    body: JSON.stringify(body)
  };
}

function safeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function filterFor(section, category) {
  if (section === 'news') {
    return '_type=="post"';
  }

  if (section === 'opinions') {
    if (category && category !== 'all') {
      if (!OPINION_CATEGORIES.includes(category)) return null;
      return `_type=="post"&&category=="${category}"`;
    }
    return `_type=="post"&&category in ["opinion","analysis","feature","interview"]`;
  }

  return null;
}

exports.handler = async function (event) {
  if (!SANITY_TOKEN) {
    return json(500, { error: 'Sanity token not configured', posts: [], total: 0 }, 'no-store');
  }

  const qs = event.queryStringParameters || {};
  const section = String(qs.section || '').trim();
  const category = String(qs.category || 'all').trim().toLowerCase();
  const offset = safeInteger(qs.offset, 0);
  const requestedLimit = safeInteger(qs.limit, 9);
  const limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

  const filter = filterFor(section, category);
  if (!filter) {
    return json(400, { error: 'Unsupported content feed request', posts: [], total: 0 }, 'no-store');
  }

  const end = offset + limit;
  const query = `{
    "total": count(*[${filter}]),
    "posts": *[${filter}]|order(publishedAt desc)[${offset}...${end}]{
      _id,
      title,
      category,
      excerpt,
      author,
      publishedAt,
      mainImage
    }
  }`;

  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2023-05-03/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${SANITY_TOKEN}` }
    });
    const data = await response.json();

    if (!response.ok) {
      console.error('[content-feed] Sanity error:', response.status, data && data.error);
      return json(502, { error: 'Editorial feed unavailable', posts: [], total: 0 }, 'no-store');
    }

    const result = data && data.result ? data.result : {};
    return json(200, {
      posts: Array.isArray(result.posts) ? result.posts : [],
      total: Number(result.total || 0)
    });
  } catch (error) {
    console.error('[content-feed] Error:', error.message);
    return json(500, { error: 'Editorial feed unavailable', posts: [], total: 0 }, 'no-store');
  }
};
