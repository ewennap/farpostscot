// netlify/functions/results.js
// Sportmonks V3 API — recent results
//
// API call:
// GET https://api.sportmonks.com/v3/football/fixtures/between/{from}/{to}?api_token={TOKEN}&filters=fixtureLeagues:{ID}&include=participants;state;scores&per_page=50

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

exports.handler = async function (event) {
  console.log('[results] SPORTMONKS_TOKEN set:', !!SPORTMONKS_TOKEN);

  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SPORTMONKS_TOKEN environment variable not set' })
    };
  }

  const leagueId = (event.queryStringParameters && event.queryStringParameters.league) || '501';

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

  console.log('[results] Fetching:', url.replace(SPORTMONKS_TOKEN, 'TOKEN_REDACTED'));

  try {
    const response = await fetch(url);
    console.log('[results] Response status:', response.status);

    const data = await response.json();
    console.log('[results] data.data length:', (data.data || []).length);
    if (data.message) console.log('[results] API message:', data.message);

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Sportmonks error: ${response.status}`, detail: data.message || '' })
      };
    }

    const validStates = ['FT', 'AET', 'LIVE', '1H', '2H', 'HT', 'PEN'];

    const fixtures = (data.data || [])
      .filter(f => validStates.includes(f.state?.short || ''))
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 30)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};
        const ftScore = (f.scores || []).find(s => s.description === 'CURRENT' || s.description === 'FT');

        return {
          id: f.id,
          leagueId: String(leagueId),
          state: f.state?.short || '',
          date: f.starting_at || null,
          home: { name: home.name || 'Home', short: home.short_code || home.name || 'Home' },
          away: { name: away.name || 'Away', short: away.short_code || away.name || 'Away' },
          score: {
            home: ftScore?.score?.home ?? '-',
            away: ftScore?.score?.away ?? '-'
          }
        };
      });

    console.log('[results] Returning fixtures:', fixtures.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ fixtures })
    };
  } catch (error) {
    console.error('[results] Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
