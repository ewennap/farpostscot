// netlify/functions/fixtures.js
// Sportmonks V3 API — upcoming fixtures
// Accepts optional `league` query param: '501', '507', or 'all' (default 'all')
//
// API call:
// GET https://api.sportmonks.com/v3/football/fixtures?api_token={TOKEN}&filters=fixtureLeagues:{ID}&include=participants;state&per_page=50&filters[starting_at_between]={from},{to}

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

async function fetchFixturesForLeague(leagueId, fromStr, toStr) {
  const url =
    `https://api.sportmonks.com/v3/football/fixtures` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&filters=fixtureLeagues:${leagueId}` +
    `&include=participants;state` +
    `&per_page=50` +
    `&filters[starting_at_between]=${fromStr},${toStr}`;

  console.log(`[fixtures] Fetching league ${leagueId}:`, url.replace(SPORTMONKS_TOKEN, 'TOKEN_REDACTED'));

  const response = await fetch(url);
  console.log(`[fixtures] League ${leagueId} status:`, response.status);

  const data = await response.json();
  console.log(`[fixtures] League ${leagueId} data.data length:`, (data.data || []).length);
  if (data.message) console.log(`[fixtures] League ${leagueId} message:`, data.message);

  if (!response.ok) {
    throw new Error(`Sportmonks error for league ${leagueId}: ${response.status} — ${data.message || ''}`);
  }

  return (data.data || []).map(f => ({ ...f, _leagueId: String(leagueId) }));
}

exports.handler = async function (event) {
  console.log('[fixtures] SPORTMONKS_TOKEN set:', !!SPORTMONKS_TOKEN);

  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SPORTMONKS_TOKEN environment variable not set' })
    };
  }

  const leagueParam = (event.queryStringParameters && event.queryStringParameters.league) || 'all';

  // Look forward 30 days
  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + 30);
  const fromStr = today.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  try {
    let raw = [];

    if (leagueParam === 'all') {
      const [r501, r507] = await Promise.all([
        fetchFixturesForLeague('501', fromStr, toStr),
        fetchFixturesForLeague('507', fromStr, toStr)
      ]);
      raw = [...r501, ...r507];
    } else {
      raw = await fetchFixturesForLeague(leagueParam, fromStr, toStr);
    }

    console.log('[fixtures] Raw total before filter:', raw.length);

    const fixtures = raw
      .filter(f => f.state?.short === 'NS')
      .sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at))
      .slice(0, 40)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};

        return {
          id: f.id,
          leagueId: f._leagueId || String(leagueParam),
          date: f.starting_at || null,
          home: { name: home.name || 'Home', short: home.short_code || home.name || 'Home' },
          away: { name: away.name || 'Away', short: away.short_code || away.name || 'Away' }
        };
      });

    console.log('[fixtures] Returning fixtures:', fixtures.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ fixtures })
    };
  } catch (error) {
    console.error('[fixtures] Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
