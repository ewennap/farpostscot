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

  // Cups: use fixed season start so we always capture the full season's results
  // League Cup Final 2025 was 14 Dec 2025; Scottish Cup runs Aug–May
  const CUPS = ['507', '510'];
  const isCup = CUPS.includes(String(leagueId));

  const today = new Date();
  const toStr = today.toISOString().split('T')[0];
  // Cups: go back to 1 Aug 2025 (season start); leagues: 30 days
  const fromStr = isCup ? '2025-08-01' : (() => {
    const d = new Date(today); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  })();

  console.log(`[results] league=${leagueId} isCup=${isCup} from=${fromStr} to=${toStr}`);

  const url =
    `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&filters=fixtureLeagues:${leagueId}` +
    `&include=participants;state;scores${isCup ? '' : ';round'}` +
    `&per_page=100`;

  console.log('[results] Fetching:', url.replace(SPORTMONKS_TOKEN, 'TOKEN_REDACTED'));

  try {
    const response = await fetch(url);
    console.log('[results] Response status:', response.status);

    const data = await response.json();
    const rawCount = (data.data || []).length;
    console.log(`[results] league=${leagueId} raw fixture count: ${rawCount}`);
    if (data.message) console.log('[results] API message:', data.message);
    if (data.pagination) console.log('[results] pagination:', JSON.stringify(data.pagination));

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Sportmonks error: ${response.status}`, detail: data.message || '' })
      };
    }

    // Log first fixture in full to inspect the real data structure
    if (data.data && data.data[0]) {
      console.log('[results] First fixture raw:', JSON.stringify(data.data[0], null, 2));
    }

    // No state filtering — return all fixtures so we can inspect the raw structure
    const fixtures = (data.data || [])
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 30)
      .map(f => {
        const parts = f.participants || [];
        const home = parts.find(p => p.meta?.location === 'home') || parts[0] || {};
        const away = parts.find(p => p.meta?.location === 'away') || parts[1] || {};
        const ftScores = (f.scores || []).filter(s => s.description === 'CURRENT' || s.description === 'FT');
        const homeScore = ftScores.find(s => s.score?.participant === 'home');
        const awayScore = ftScores.find(s => s.score?.participant === 'away');

        return {
          id: f.id,
          leagueId: String(leagueId),
          state: f.state?.short || '',
          date: f.starting_at || null,
          round: f.round?.name || null,
          home: { name: home.name || 'Home', short: home.short_code || home.name || 'Home', crest: home.image_path || null },
          away: { name: away.name || 'Away', short: away.short_code || away.name || 'Away', crest: away.image_path || null },
          score: {
            home: homeScore?.score?.goals ?? '-',
            away: awayScore?.score?.goals ?? '-'
          }
        };
      });

    console.log('[results] Returning fixtures:', fixtures.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': isCup ? 'no-store' : 'public, max-age=60' },
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
