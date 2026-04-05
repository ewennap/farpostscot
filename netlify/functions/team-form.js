// netlify/functions/team-form.js
// Returns the last 5 completed results for a given team

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const FINISHED_STATES  = ['FT', 'AET', 'Pen.', 'PEN', 'ABAN'];

exports.handler = async function (event) {
  console.log('[team-form] queryStringParameters:', JSON.stringify(event.queryStringParameters));

  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const teamId = event.queryStringParameters && event.queryStringParameters.teamId;
  if (!teamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'teamId is required' }) };
  }

  const url =
    `https://api.sportmonks.com/v3/football/fixtures` +
    `?filters=fixtureTeams:${teamId}` +
    `&include=participants;scores;state` +
    `&api_token=${SPORTMONKS_TOKEN}` +
    `&per_page=50`;

  console.log(`[team-form] teamId=${teamId}`);
  console.log('[team-form] URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const response = await fetch(url);
    const data     = await response.json();

    console.log(`[team-form] status=${response.status} count=${(data.data || []).length}`);

    if (!response.ok) {
      console.error('[team-form] Error body:', JSON.stringify(data));
      return { statusCode: 500, body: JSON.stringify({ error: data.message || 'Sportmonks error' }) };
    }

    const results = (data.data || [])
      .filter(f => FINISHED_STATES.includes(f.state && f.state.short))
      .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
      .slice(0, 5)
      .map(f => {
        const parts    = f.participants || [];
        const home     = parts.find(p => p.meta && p.meta.location === 'home') || parts[0] || {};
        const away     = parts.find(p => p.meta && p.meta.location === 'away') || parts[1] || {};
        const ftScores = (f.scores || []).filter(s => s.description === 'CURRENT' || s.description === 'FT');
        const homeScore = ftScores.find(s => s.score && s.score.participant === 'home');
        const awayScore = ftScores.find(s => s.score && s.score.participant === 'away');
        const hGoals   = homeScore && homeScore.score ? homeScore.score.goals : null;
        const aGoals   = awayScore && awayScore.score ? awayScore.score.goals : null;
        const teamIdNum = parseInt(teamId, 10);
        const isHome   = home.id === teamIdNum;
        const teamGoals = isHome ? hGoals : aGoals;
        const oppGoals  = isHome ? aGoals : hGoals;
        const result    = teamGoals == null || oppGoals == null ? null
                        : teamGoals > oppGoals ? 'W'
                        : teamGoals < oppGoals ? 'L' : 'D';
        return {
          date:  f.starting_at || null,
          home:  { id: home.id, name: home.name || '', crest: home.image_path || null },
          away:  { id: away.id, name: away.name || '', crest: away.image_path || null },
          score: { home: hGoals != null ? hGoals : '-', away: aGoals != null ? aGoals : '-' },
          result
        };
      })
      .reverse(); // oldest first for left-to-right display

    console.log(`[team-form] returning ${results.length} results`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ results })
    };
  } catch (err) {
    console.error('[team-form] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
