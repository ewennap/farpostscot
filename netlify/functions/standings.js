// netlify/functions/standings.js
// Sportmonks V3 API — league standings
// Accepts optional `league` query param (default '501')
//
// Step 1 — get current season ID:
// GET https://api.sportmonks.com/v3/football/leagues/{leagueId}?api_token={TOKEN}&include=currentSeason
//
// Step 2 — get standings for that season:
// GET https://api.sportmonks.com/v3/football/standings/seasons/{seasonId}?api_token={TOKEN}&include=participant;details.type

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

function findDetail(details, keywords) {
  if (!Array.isArray(details)) return 0;
  for (const d of details) {
    const typeName = (d.type?.name || '').toLowerCase();
    if (keywords.some(kw => typeName.includes(kw))) {
      return d.value ?? 0;
    }
  }
  return 0;
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token not configured' })
    };
  }

  const leagueId =
    (event.queryStringParameters && event.queryStringParameters.league) || '501';

  try {
    // Step 1: get current season ID
    const leagueUrl =
      `https://api.sportmonks.com/v3/football/leagues/${leagueId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=currentSeason`;

    const leagueResponse = await fetch(leagueUrl);

    if (!leagueResponse.ok) {
      throw new Error(`Sportmonks league error: ${leagueResponse.status}`);
    }

    const leagueData = await leagueResponse.json();
    const seasonId = leagueData.data?.currentSeason?.id;

    if (!seasonId) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600'
        },
        body: JSON.stringify({ standings: [] })
      };
    }

    // Step 2: get standings for the current season
    const standingsUrl =
      `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=participant;details.type`;

    const standingsResponse = await fetch(standingsUrl);

    if (!standingsResponse.ok) {
      throw new Error(`Sportmonks standings error: ${standingsResponse.status}`);
    }

    const standingsData = await standingsResponse.json();

    const standings = (standingsData.data || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(row => {
        const details = row.details || [];

        const played = findDetail(details, ['played', 'matches played']);
        const won = findDetail(details, ['won', 'wins']);
        const drawn = findDetail(details, ['drawn', 'draws']);
        const lost = findDetail(details, ['lost', 'losses']);
        const gf = findDetail(details, ['goals for', 'goals scored']);
        const ga = findDetail(details, ['goals against', 'goals conceded']);
        const gd = gf - ga;

        return {
          position: row.position,
          team: row.participant?.name || '',
          points: row.points ?? 0,
          played,
          won,
          drawn,
          lost,
          gf,
          ga,
          gd
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600'
      },
      body: JSON.stringify({ standings })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
