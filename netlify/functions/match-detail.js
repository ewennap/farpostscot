// netlify/functions/match-detail.js
// Sportmonks V3 API — single fixture detail with events, lineups, participants

const { SPORTMONKS_TOKEN, getMatchDetail } = require('./_match-detail');

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const fixtureId = event.queryStringParameters && event.queryStringParameters.fixtureId;
  if (!fixtureId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'fixtureId is required' }) };
  }

  try {
    console.log(`[match-detail] fixtureId=${fixtureId}`);
    const data = await getMatchDetail(fixtureId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('[match-detail] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Sportmonks error' }) };
  }
};
