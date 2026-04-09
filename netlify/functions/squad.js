// netlify/functions/squad.js
// Sportmonks V3 API — squad for a given team
// GET /v3/football/squads/teams/{teamId}?include=player

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

const POSITION_MAP = {
  24: 'goalkeepers', 25: 'goalkeepers',
  26: 'defenders',   27: 'defenders',
  28: 'midfielders', 29: 'midfielders',
  30: 'attackers',   31: 'attackers'
};

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const teamId = event.queryStringParameters && event.queryStringParameters.teamId;
  if (!teamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'teamId is required' }) };
  }

  const url =
    `https://api.sportmonks.com/v3/football/squads/teams/${teamId}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&include=player`;

  console.log(`[squad] teamId=${teamId}`);
  console.log('[squad] URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('[squad] API error:', response.status, data.message);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
        body: JSON.stringify({ goalkeepers: [], defenders: [], midfielders: [], attackers: [] })
      };
    }

    // /squads/teams returns data as an array directly
    const squad = Array.isArray(data.data) ? data.data : [];
    if (!squad.length) {
      console.log('[squad] No squad data returned');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
        body: JSON.stringify({ goalkeepers: [], defenders: [], midfielders: [], attackers: [] })
      };
    }

    const groups = { goalkeepers: [], defenders: [], midfielders: [], attackers: [] };

    squad.forEach(function (member) {
      const player = member.player || member;
      const positionId = member.position_id || player.position_id || null;
      const group = POSITION_MAP[positionId] || null;

      const entry = {
        id: player.id || member.player_id || null,
        display_name: player.display_name || player.name || player.common_name || null,
        position_id: positionId,
        jersey_number: member.jersey_number != null ? member.jersey_number : (player.jersey_number != null ? player.jersey_number : null),
        image_path: player.image_path || null
      };

      if (group) {
        groups[group].push(entry);
      }
    });

    // Sort each group by jersey_number ascending, nulls last
    Object.keys(groups).forEach(function (key) {
      groups[key].sort(function (a, b) {
        if (a.jersey_number == null && b.jersey_number == null) return 0;
        if (a.jersey_number == null) return 1;
        if (b.jersey_number == null) return -1;
        return a.jersey_number - b.jersey_number;
      });
    });

    console.log('[squad] Returning groups:', Object.keys(groups).map(k => k + ':' + groups[k].length).join(', '));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify(groups)
    };
  } catch (err) {
    console.error('[squad] Unexpected error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ goalkeepers: [], defenders: [], midfielders: [], attackers: [] })
    };
  }
};
