// netlify/functions/results.js
// Sportmonks V3 API — recent results
//
// Leagues (501, 504, 516): /between/{from}/{to}?filters=fixtureLeagues:{id}&include=...;round
// Cups (507, 510):         /fixtures?filters=fixtureLeagues:{id}&include=...
//   (cups reject the /between/ endpoint with 422, and don't support the round include)

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const CUPS = ['507', '510'];

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const leagueId = String((event.queryStringParameters && event.queryStringParameters.league) || '501');
  const isCup = CUPS.includes(leagueId);

  // Cups use the general fixtures endpoint (no date range — /between/ returns 422)
  // Leagues use /between/ with a 30-day window + round include
  let url;
  if (isCup) {
    url =
      `https://api.sportmonks.com/v3/football/fixtures` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=fixtureLeagues:${leagueId}` +
      `&include=participants;state;scores` +
      `&per_page=100`;
  } else {
    const today = new Date();
    const from  = new Date(today);
    from.setDate(from.getDate() - 30);
    const fromStr = from.toISOString().split('T')[0];
    const toStr   = today.toISOString().split('T')[0];
    url =
      `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=fixtureLeagues:${leagueId}` +
      `&include=participants;state;scores;round` +
      `&per_page=100`;
  }

  console.log(`[results] league=${leagueId} isCup=${isCup}`);
  console.log('[results] URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const response = await fetch(url);
    const data     = await response.json();

    console.log(`[results] status=${response.status} count=${(data.data || []).length}`);
    if (!response.ok) {
      console.error('[results] Error body:', JSON.stringify(data));
      return { statusCode: 502, body: JSON.stringify({ error: data.message || 'Sportmonks error' }) };
    }

    if (data.data?.[0]) {
      console.log('[results] First fixture date:', data.data[0].starting_at, 'state:', data.data[0].state?.short);
    }

    const fixtures = (data.data || [])
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 30)
      .map(f => {
        const parts    = f.participants || [];
        const home     = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away     = parts.find(p => p.meta?.location === 'away') || parts[1] || {};
        const ftScores = (f.scores || []).filter(s => s.description === 'CURRENT' || s.description === 'FT');
        const homeScore = ftScores.find(s => s.score?.participant === 'home');
        const awayScore = ftScores.find(s => s.score?.participant === 'away');

        // Only expose round name for non-cup leagues (cups don't include it;
        // leagues get matchday numbers which we suppress in the UI)
        const round = (!isCup && f.round?.name) ? f.round.name : null;

        return {
          id:      f.id,
          leagueId,
          state:   f.state?.short_name || f.state?.developer_name || '',
          state_id: f.state?.id || null,
          date:    f.starting_at || null,
          round,
          home: { id: home.id || null, name: home.name || 'Home', short: home.short_code || home.name || 'Home', crest: home.image_path || null },
          away: { id: away.id || null, name: away.name || 'Away', short: away.short_code || away.name || 'Away', crest: away.image_path || null },
          score: {
            home: homeScore?.score?.goals ?? '-',
            away: awayScore?.score?.goals ?? '-'
          }
        };
      });

    console.log('[results] Returning:', fixtures.length, 'fixtures');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': isCup ? 'no-store' : 'public, max-age=60' },
      body: JSON.stringify({ fixtures })
    };
  } catch (err) {
    console.error('[results] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
