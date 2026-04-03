// netlify/functions/podcast.js
// Proxies Acast RSS feed server-side to avoid CORS issues in the browser

const FEED_URL = 'https://feeds.acast.com/public/shows/across-the-tiers';

exports.handler = async function(event) {
  try {
    const response = await fetch(FEED_URL);

    if (!response.ok) {
      throw new Error(`Feed error: ${response.status}`);
    }

    const xml = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300'
      },
      body: xml
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
