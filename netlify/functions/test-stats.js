// netlify/functions/test-stats.js
// TEMPORARY — diagnostic function to inspect statistics shape for Scottish Premiership fixtures
// Safe to delete once statistics integration is confirmed working.

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

exports.handler = async function () {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  // Fetch recent fixtures for league 501 (Scottish Premiership) — last 30 days
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  const fixturesUrl =
    `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&filters=fixtureLeagues:501` +
    `&include=state` +
    `&per_page=50`;

  console.log('[test-stats] Fetching fixtures:', fixturesUrl.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const fixturesRes = await fetch(fixturesUrl);
    const fixturesData = await fixturesRes.json();

    if (!fixturesRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Fixtures fetch failed', message: fixturesData.message, status: fixturesRes.status })
      };
    }

    const fixtures = fixturesData.data || [];
    if (fixtures.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No fixtures found for league 501 in the last 30 days', fixturesData })
      };
    }

    const fixtureId = fixtures[0].id;
    console.log('[test-stats] First fixture ID:', fixtureId);

    // Fetch full detail for that fixture including statistics
    const detailUrl =
      `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=statistics`;

    console.log('[test-stats] Fetching detail:', detailUrl.replace(SPORTMONKS_TOKEN, 'TOKEN'));

    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    const statistics = (detailData.data && detailData.data.statistics) || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        fixtureId,
        statisticsCount: statistics.length,
        statistics,
        error: detailData.error || null,
        message: detailData.message || null
      })
    };
  } catch (err) {
    console.error('[test-stats] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
