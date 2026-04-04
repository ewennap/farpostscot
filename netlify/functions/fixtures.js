// netlify/functions/fixtures.js
// Sportmonks V3 API — upcoming fixtures
// Accepts optional `league` query param: '501', '507', or 'all' (default 'all')
//
// API call:
// GET https://api.sportmonks.com/v3/football/fixtures/between/{fromStr}/{toStr}?api_token={TOKEN}&filters=fixtureLeagues:{LEAGUE_ID}&include=participants;state&per_page=50

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

async function fetchFixturesForLeague(leagueId, fromStr, toStr) {
  const url =
    `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&filters=fixtureLeagues:${leagueId}` +
    `&include=participants;state` +
    `&per_page=50`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sportmonks error for league ${leagueId}: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || []).map(f => ({ ...f, _leagueId: String(leagueId) }));
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token not configured' })
    };
  }

  const leagueParam =
    (event.queryStringParameters && event.queryStringParameters.league) || 'all';

  try {
    // Look forward 30 days
    const today = new Date();
    const to = new Date(today);
    to.setDate(to.getDate() + 30);

    const fromStr = today.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    let raw = [];

    if (leagueParam === 'all') {
      // Two parallel fetches for 501 and 507
      const [results501, results507] = await Promise.all([
        fetchFixturesForLeague('501', fromStr, toStr),
        fetchFixturesForLeague('507', fromStr, toStr)
      ]);
      raw = [...results501, ...results507];
    } else {
      raw = await fetchFixturesForLeague(leagueParam, fromStr, toStr);
    }

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
          date: f.starting_at ? new Date(f.starting_at).toISOString() : null,
          home: {
            name: home.name || 'Home',
            short: home.short_code || home.name || 'Home'
          },
          away: {
            name: away.name || 'Away',
            short: away.short_code || away.name || 'Away'
          }
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify({ fixtures })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
