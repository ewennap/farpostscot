// netlify/functions/sanity-fetch.js
// Proxies GROQ queries to the Sanity API, keeping the token server-side

const SANITY_PROJECT_ID = 't11tx9if';
const SANITY_DATASET = 'production';
const SANITY_TOKEN = process.env.SANITY_TOKEN;

exports.handler = async function(event) {
  if (!SANITY_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SANITY_TOKEN environment variable not set' })
    };
  }

  const query = event.queryStringParameters?.query;
  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing query parameter' })
    };
  }

  try {
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2023-05-03/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${SANITY_TOKEN}` }
    });

    if (!response.ok) {
      throw new Error(`Sanity error: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
