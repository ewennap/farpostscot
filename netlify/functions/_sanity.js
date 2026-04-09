const SANITY_PROJECT_ID = 't11tx9if';
const SANITY_DATASET = 'production';
const SANITY_TOKEN = process.env.SANITY_TOKEN;

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

async function runSanityQuery(query, params) {
  if (!SANITY_TOKEN) {
    throw new Error('SANITY_TOKEN_NOT_CONFIGURED');
  }

  const url = new URL(`https://${SANITY_PROJECT_ID}.api.sanity.io/v2023-05-03/data/query/${SANITY_DATASET}`);
  url.searchParams.set('query', query);

  Object.entries(params || {}).forEach(function ([key, value]) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${SANITY_TOKEN}` }
  });
  const data = await response.json();

  if (!response.ok) {
    const message = data && data.error && data.error.description
      ? data.error.description
      : 'Sanity query failed';
    throw new Error(message);
  }

  return data && data.result ? data.result : null;
}

module.exports = {
  SANITY_TOKEN,
  json,
  runSanityQuery
};
