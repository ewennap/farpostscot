// netlify/functions/top-scorers.js
// Sportmonks V3 — top scorers by league current season

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const GOALS_TOPSCORER_TYPE = 208;

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }

  const leagueId = String((event.queryStringParameters && event.queryStringParameters.leagueId) || '');
  if (!leagueId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }

  try {
    const leagueUrl =
      `https://api.sportmonks.com/v3/football/leagues/${leagueId}` +
      `?include=currentSeason` +
      `&api_token=${SPORTMONKS_TOKEN}`;

    console.log('[top-scorers] GET league', leagueId);
    const leagueRes = await fetch(leagueUrl);
    const leagueData = await leagueRes.json();

    if (!leagueRes.ok) {
      console.error('[top-scorers] League error:', JSON.stringify(leagueData));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    const currentSeason = leagueData.data && (leagueData.data.currentseason || leagueData.data.currentSeason);
    const seasonId = currentSeason && currentSeason.id;
    if (!seasonId) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    const scorersUrl =
      `https://api.sportmonks.com/v3/football/topscorers/seasons/${seasonId}` +
      `?include=player;participant` +
      `&filters=seasonTopscorerTypes:${GOALS_TOPSCORER_TYPE}` +
      `&api_token=${SPORTMONKS_TOKEN}`;

    console.log('[top-scorers] GET topscorers for season', seasonId, 'league', leagueId);
    const scorersRes = await fetch(scorersUrl);
    const scorersData = await scorersRes.json();

    if (!scorersRes.ok || !Array.isArray(scorersData.data) || !scorersData.data.length) {
      console.error('[top-scorers] Topscorers error or empty:', JSON.stringify(scorersData));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    const topScorers = scorersData.data
      .filter(function (row) {
        return Number(row.type_id) === GOALS_TOPSCORER_TYPE;
      })
      .sort(function (a, b) {
        return (a.position || 999) - (b.position || 999) || (b.total || 0) - (a.total || 0);
      })
      .slice(0, 10)
      .map(function (row) {
        const player = row.player || {};
        const participant = row.participant || row.team || {};

        return {
          playerName: player.display_name || player.common_name || player.name || '',
          teamName: participant.name || '',
          teamCrest: participant.image_path || null,
          goals: Number(row.total || 0)
        };
      })
      .filter(function (row) {
        return row.playerName || row.teamName;
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(topScorers)
    };
  } catch (err) {
    console.error('[top-scorers] Unexpected error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};
