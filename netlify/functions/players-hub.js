// netlify/functions/players-hub.js
// Aggregated player discovery data for the Far Post players hub.
//
// Returns:
//   {
//     leagues: [{
//       leagueId,
//       leagueName,
//       seasonId,
//       topScorers: [...],
//       topCreators: [...],
//       players: [...]
//     }]
//   }

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';

const LEAGUES = [
  { id: '501', name: 'Premiership' },
  { id: '504', name: 'Championship' },
  { id: '516', name: 'League One' }
];

const GOALS_TYPE = 208;
const ASSISTS_TYPE = 209;
const DIRECTORY_LIMIT = 18;
const SCORERS_LIMIT = 8;
const CREATORS_LIMIT = 5;

async function requestJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function getSeasonId(leagueId) {
  const url = `${BASE}/leagues/${leagueId}?include=currentSeason&api_token=${SPORTMONKS_TOKEN}`;
  const data = await requestJson(url);
  if (!data || !data.data) return null;
  const season = data.data && (data.data.currentseason || data.data.currentSeason);
  return season ? season.id : null;
}

async function getTopScorers(seasonId, typeId, limit) {
  const url =
    `${BASE}/topscorers/seasons/${seasonId}` +
    `?include=player;participant` +
    `&filters=seasonTopscorerTypes:${typeId}` +
    `&api_token=${SPORTMONKS_TOKEN}`;
  const data = await requestJson(url);
  if (!data || !Array.isArray(data.data)) return [];
  return data.data
    .filter(r => Number(r.type_id) === typeId)
    .sort((a, b) => (a.position || 999) - (b.position || 999) || (b.total || 0) - (a.total || 0))
    .slice(0, limit || 10);
}

function playerKey(row) {
  const player = row.player || {};
  const team = row.participant || {};
  return String(player.id || '') + '::' + String(team.id || '');
}

function normaliseRow(row, assistsMap) {
  const player = row.player || {};
  const team = row.participant || {};
  const pid = player.id || null;
  const key = playerKey(row);
  const assistInfo = assistsMap[key] || assistsMap[String(pid)] || {};

  return {
    playerId: pid,
    playerName: player.display_name || player.common_name || player.name || '',
    playerPhoto: player.image_path || null,
    teamId: team.id || null,
    teamName: team.name || '',
    teamCrest: team.image_path || null,
    goals: Number(row.total || 0),
    assists: Number(assistInfo.assists || 0),
    rank: row.position || null,
    assistRank: assistInfo.rank || null
  };
}

function buildAssistsMap(rows) {
  return rows.reduce(function(map, row) {
    const player = row.player || {};
    const key = playerKey(row);
    const value = {
      assists: Number(row.total || 0),
      rank: row.position || null
    };

    if (key !== '::') map[key] = value;
    if (player.id) map[String(player.id)] = value;
    return map;
  }, {});
}

function mergePlayers(goalRows, assistRows) {
  const assistsMap = buildAssistsMap(assistRows);
  const merged = new Map();

  goalRows.forEach(function(row) {
    const data = normaliseRow(row, assistsMap);
    if (!data.playerName) return;
    merged.set(playerKey(row), data);
  });

  assistRows.forEach(function(row) {
    const player = row.player || {};
    const team = row.participant || {};
    const key = playerKey(row);
    if (!merged.has(key)) {
      merged.set(key, {
        playerId: player.id || null,
        playerName: player.display_name || player.common_name || player.name || '',
        playerPhoto: player.image_path || null,
        teamId: team.id || null,
        teamName: team.name || '',
        teamCrest: team.image_path || null,
        goals: 0,
        assists: Number(row.total || 0),
        rank: null,
        assistRank: row.position || null
      });
      return;
    }

    const current = merged.get(key);
    current.assists = Math.max(current.assists || 0, Number(row.total || 0));
    current.assistRank = current.assistRank || row.position || null;
  });

  return Array.from(merged.values())
    .filter(function(player) { return player.playerName; })
    .sort(function(a, b) {
      return (b.goals || 0) - (a.goals || 0) ||
        (b.assists || 0) - (a.assists || 0) ||
        (a.rank || 999) - (b.rank || 999) ||
        a.playerName.localeCompare(b.playerName);
    });
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
        return {
          leagueId: league.id,
          leagueName: league.name,
          seasonId: null,
          topScorers: [],
          topCreators: [],
          players: []
        };
      }

      const [goalRows, assistRows] = await Promise.all([
        getTopScorers(seasonId, GOALS_TYPE, DIRECTORY_LIMIT),
        getTopScorers(seasonId, ASSISTS_TYPE, DIRECTORY_LIMIT)
      ]);
      const assistsMap = buildAssistsMap(assistRows);
      const topScorers = goalRows
        .map(function(row) { return normaliseRow(row, assistsMap); })
        .filter(function(row) { return row.playerName; })
        .slice(0, SCORERS_LIMIT);

      const topCreators = assistRows
        .map(function(row) {
          const player = row.player || {};
          const team = row.participant || {};
          return {
            playerId: player.id || null,
            playerName: player.display_name || player.common_name || player.name || '',
            playerPhoto: player.image_path || null,
            teamId: team.id || null,
            teamName: team.name || '',
            teamCrest: team.image_path || null,
            goals: 0,
            assists: Number(row.total || 0),
            rank: row.position || null
          };
        })
        .filter(function(row) { return row.playerName; })
        .slice(0, CREATORS_LIMIT);

      const players = mergePlayers(goalRows, assistRows);

      return {
        leagueId: league.id,
        leagueName: league.name,
        seasonId: seasonId,
        topScorers: topScorers,
        topCreators: topCreators,
        players: players
      };
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
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
