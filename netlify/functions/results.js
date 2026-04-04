// netlify/functions/results.js
// Sportmonks V3 API — recent results (completed/live fixtures)
//
// API call:
// GET https://api.sportmonks.com/v3/football/fixtures/between/{fromStr}/{toStr}?api_token={TOKEN}&filters=fixtureLeagues:{LEAGUE_ID}&include=participants;state;scores&per_page=50

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token not configured' })
    };
  }

  const leagueId = (event.queryStringParameters && event.queryStringParameters.league) || '501';

  try {
    // Look back 30 days
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);

    const fromStr = from.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];

    const url =
      `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=fixtureLeagues:${leagueId}` +
      `&include=participants;state;scores` +
      `&per_page=50`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Sportmonks error: ${response.status}`);
    }

    const data = await response.json();

    // State short codes considered completed or live
    const validStates = ['FT', 'AET', 'LIVE', '1H', '2H', 'HT', 'PEN'];

    const fixtures = (data.data || [])
      .filter(f => validStates.includes(f.state?.short || ''))
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 30)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};

        const ftScore = (f.scores || []).find(
          s => s.description === 'CURRENT' || s.description === 'FT'
        );

        return {
          id: f.id,
          leagueId: String(leagueId),
          state: f.state?.short || '',
          date: f.starting_at ? new Date(f.starting_at).toISOString() : null,
          home: {
            name: home.name || 'Home',
            short: home.short_code || home.name || 'Home'
          },
          away: {
            name: away.name || 'Away',
            short: away.short_code || away.name || 'Away'
          },
          score: {
            home: ftScore?.score?.home ?? '-',
            away: ftScore?.score?.away ?? '-'
          }
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
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
