// netlify/functions/match-detail.js
// Sportmonks V3 API — single fixture detail with events, lineups, participants

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const fixtureId = event.queryStringParameters && event.queryStringParameters.fixtureId;
  if (!fixtureId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'fixtureId is required' }) };
  }

  const url =
    `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&include=events;lineups;participants;scores;state`;

  console.log(`[match-detail] fixtureId=${fixtureId}`);
  console.log('[match-detail] URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('[match-detail] Error body:', JSON.stringify(data));
      return { statusCode: 500, body: JSON.stringify({ error: data.message || 'Sportmonks error' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('[match-detail] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
