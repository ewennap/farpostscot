// netlify/functions/fixtures.js
// Proxies upcoming Scottish Premiership fixtures from Sportmonks API
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
    // Get fixtures for next 14 days
    const today = new Date();
    const to = new Date(today);
    to.setDate(to.getDate() + 14);

    const fromStr = today.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const url = `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=fixtureLeagues:${PREM_ID}` +
      `&include=participants;state` +
      `&per_page=20`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Sportmonks error: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only upcoming fixtures
    const fixtures = (data.data || [])
      .filter(f => f.state?.short === 'NS')
      .slice(0, 10)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};

        const date = new Date(f.starting_at);
        const dateStr = date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
        const timeStr = date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          id: f.id,
          date: dateStr,
          time: timeStr,
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
        'Cache-Control': 'public, max-age=300' // cache for 5 minutes
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