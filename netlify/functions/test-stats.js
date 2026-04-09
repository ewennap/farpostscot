// netlify/functions/test-stats.js
// TEMPORARY — tests whether Sportmonks returns statistics data on the current plan.
// Hit /.netlify/functions/test-stats to run the check.

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';

exports.handler = async function () {
  console.log('[test-stats] SPORTMONKS_TOKEN set:', !!SPORTMONKS_TOKEN);

  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' })
    };
  }

  // Look back 30 days for completed Scottish Premiership fixtures
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  // Step 1: fetch recent fixtures for league 501
  const listUrl =
    `${BASE}/fixtures/between/${fromStr}/${toStr}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&filters=fixtureLeagues:501` +
    `&per_page=5`;

  console.log('[test-stats] Fetching fixtures:', listUrl.replace(SPORTMONKS_TOKEN, 'TOKEN_REDACTED'));

  let firstFixtureId;
  try {
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    console.log('[test-stats] List status:', listRes.status, 'count:', (listData.data || []).length);
    if (listData.message) console.log('[test-stats] List message:', listData.message);

    const fixtures = listData.data || [];
    if (!fixtures.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No fixtures found in the last 30 days for league 501', listResponse: listData })
      };
    }
    firstFixtureId = fixtures[0].id;
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch fixture list: ${err.message}` })
    };
  }

  // Step 2: fetch the fixture detail with statistics included
  const detailUrl =
    `${BASE}/fixtures/${firstFixtureId}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&include=statistics`;

  console.log('[test-stats] Fetching fixture detail:', detailUrl.replace(SPORTMONKS_TOKEN, 'TOKEN_REDACTED'));

  try {
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();
    console.log('[test-stats] Detail status:', detailRes.status);
    if (detailData.message) console.log('[test-stats] Detail message:', detailData.message);

    const fixture = detailData.data || {};
    const statistics = fixture.statistics || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixtureId: firstFixtureId,
        statisticsCount: statistics.length,
        statistics,
        planMessage: detailData.message || null,
        subscriptionWarnings: detailData.subscription || null
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch fixture detail: ${err.message}` })
    };
  }
};
