// netlify/functions/players-hub.js
// Aggregated player discovery data — top scorers and assists across Scottish league competitions
//
// Returns:
//   { leagues: [{ leagueId, leagueName, seasonId, topScorers: [{ playerId, playerName, playerPhoto, teamId, teamName, teamCrest, goals, assists, rank }] }] }

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';

const LEAGUES = [
  { id: '501', name: 'Premiership' },
  { id: '504', name: 'Championship' },
  { id: '516', name: 'League One' }
];

const GOALS_TYPE = 208;
const ASSISTS_TYPE = 209;

async function getSeasonId(leagueId) {
  const url = `${BASE}/leagues/${leagueId}?include=currentSeason&api_token=${SPORTMONKS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const season = data.data && (data.data.currentseason || data.data.currentSeason);
  return season ? season.id : null;
}

async function getTopScorers(seasonId, typeId, limit) {
  const url =
    `${BASE}/topscorers/seasons/${seasonId}` +
    `?include=player;participant` +
    `&filters=seasonTopscorerTypes:${typeId}` +
    `&api_token=${SPORTMONKS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.data)) return [];
  return data.data
    .filter(r => Number(r.type_id) === typeId)
    .sort((a, b) => (a.position || 999) - (b.position || 999) || (b.total || 0) - (a.total || 0))
    .slice(0, limit || 10);
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagues: [] })
    };
  }

  try {
    const leagues = await Promise.all(LEAGUES.map(async function (league) {
      const seasonId = await getSeasonId(league.id);
      if (!seasonId) {
        return { leagueId: league.id, leagueName: league.name, seasonId: null, topScorers: [] };
      }

      const [goalRows, assistRows] = await Promise.all([
        getTopScorers(seasonId, GOALS_TYPE, 10),
        getTopScorers(seasonId, ASSISTS_TYPE, 20)
      ]);

      // Build assists lookup by player ID
      const assistsMap = {};
      assistRows.forEach(function (r) {
        const pid = r.player && r.player.id;
        if (pid) assistsMap[String(pid)] = Number(r.total || 0);
      });

      const topScorers = goalRows
        .map(function (row) {
          const player = row.player || {};
          const team = row.participant || {};
          const pid = player.id || null;
          return {
            playerId: pid,
            playerName: player.display_name || player.common_name || player.name || '',
            playerPhoto: player.image_path || null,
            teamId: team.id || null,
            teamName: team.name || '',
            teamCrest: team.image_path || null,
            goals: Number(row.total || 0),
            assists: pid ? (assistsMap[String(pid)] || 0) : 0,
            rank: row.position || null
          };
        })
        .filter(function (r) { return r.playerName; });

      return { leagueId: league.id, leagueName: league.name, seasonId: seasonId, topScorers: topScorers };
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ leagues: leagues })
    };
  } catch (err) {
    console.error('[players-hub] Error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagues: [] })
    };
  }
};
