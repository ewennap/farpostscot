// netlify/functions/results.js
// Proxies Scottish Premiership results from Sportmonks API
// Keeps API token server-side and out of the browser

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const PREM_ID = 501; // Scottish Premiership league ID

exports.handler = async function(event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token not configured' })
    };
  }

  try {
    // Get results from last 7 days
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 7);

    const fromStr = from.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];

    const url = `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=fixtureLeagues:${PREM_ID}` +
      `&include=participants;state;scores` +
      `&per_page=20`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Sportmonks error: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only completed or live fixtures
    const liveStates = ['FT', 'AET', 'LIVE', '1H', '2H', 'HT'];
    const fixtures = (data.data || [])
      .filter(f => liveStates.includes(f.state?.short || ''))
      .slice(0, 8)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};
        const ftScore = (f.scores || []).find(s => s.description === 'CURRENT' || s.description === 'FT');

        return {
          id: f.id,
          state: f.state?.short || '',
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