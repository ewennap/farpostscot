// netlify/functions/results.js
// Sportmonks V3 API — recent results
//
// API call:
// GET https://api.sportmonks.com/v3/football/fixtures/between/{from}/{to}?api_token={TOKEN}&filters=fixtureLeagues:{ID}&include=participants;state;scores&per_page=50
//
// Scores V3 structure: scores[] each has { description, score: { participant: 'home'|'away', goals } }
// The 'CURRENT' description holds the live/final scoreline.

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

function extractScore(scores) {
  const current = (scores || []).filter(s => s.description === 'CURRENT');
  const homeEntry = current.find(s => s.score?.participant === 'home');
  const awayEntry = current.find(s => s.score?.participant === 'away');

  // Fallback: try description '2ND_HALF' or any entry with goals if CURRENT missing
  if (!homeEntry || !awayEntry) {
    const allHome = (scores || []).find(s => s.score?.participant === 'home');
    const allAway = (scores || []).find(s => s.score?.participant === 'away');
    return {
      home: allHome?.score?.goals ?? '-',
      away: allAway?.score?.goals ?? '-'
    };
  }

  return {
    home: homeEntry.score.goals ?? '-',
    away: awayEntry.score.goals ?? '-'
  };
}

exports.handler = async function (event) {
  console.log('[results] SPORTMONKS_TOKEN set:', !!SPORTMONKS_TOKEN);

  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SPORTMONKS_TOKEN environment variable not set' })
    };
  }

  const leagueId = (event.queryStringParameters && event.queryStringParameters.league) || '501';

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

    if (data.data && data.data[0]) {
      console.log('[results] First fixture raw:', JSON.stringify(data.data[0], null, 2));
    }

    const fixtures = (data.data || [])
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 30)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};
        const score = extractScore(f.scores);

        return {
          id: f.id,
          leagueId: String(leagueId),
          state: f.state?.short || '',
          date: f.starting_at || null,
          home: { name: home.name || 'Home', short: home.short_code || home.name || 'Home' },
          away: { name: away.name || 'Away', short: away.short_code || away.name || 'Away' },
          score
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
