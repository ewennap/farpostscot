// netlify/functions/player-detail.js
// Player profile data — player info, recent team fixtures
//
// Query params:
//   playerId  (required) — Sportmonks player ID
//   teamId    (required) — Sportmonks participant ID (used for fixture lookup)
//   leagueId  (required) — Competition context
//
// Stats (goals/assists) are passed via URL params from the hub and not re-fetched here.
//
// Returns:
//   { player, recentMatches, upcomingFixtures, form }

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';
const GOALS_TYPE = 208;
const ASSISTS_TYPE = 209;

const FINISHED = new Set(['FT', 'AET', 'PEN']);

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

async function requestJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function stateShort(fix) {
  const s = fix.state || {};
  return String(s.short || s.developer_name || s.state || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function parseScores(scores) {
  const relevant = (scores || []).filter(function (s) {
    return s && (s.description === 'CURRENT' || s.description === 'FT');
  });
  const homeEntry = relevant.find(function (s) { return s.score && s.score.participant === 'home'; });
  const awayEntry = relevant.find(function (s) { return s.score && s.score.participant === 'away'; });
  if (!homeEntry || !awayEntry) return null;
  return { hg: homeEntry.score.goals, ag: awayEntry.score.goals };
}

function normFixture(fix, teamId) {
  const state = stateShort(fix);
  const finished = FINISHED.has(state);
  const participants = fix.participants || [];
  const home = participants.find(function (p) { return p.meta && p.meta.location === 'home'; }) || {};
  const away = participants.find(function (p) { return p.meta && p.meta.location === 'away'; }) || {};
  const isHome = String(home.id) === String(teamId);
  const opponent = isHome ? away : home;

  let score = null;
  let result = null;

  if (finished) {
    const parsed = parseScores(fix.scores);
    if (parsed !== null) {
      score = parsed.hg + '-' + parsed.ag;
      const tg = isHome ? parsed.hg : parsed.ag;
      const og = isHome ? parsed.ag : parsed.hg;
      result = tg > og ? 'W' : tg < og ? 'L' : 'D';
    }
  }

  return {
    id: fix.id,
    date: fix.starting_at || fix.date,
    home: { id: home.id, name: home.name, crest: home.image_path },
    away: { id: away.id, name: away.name, crest: away.image_path },
    opponent: { id: opponent.id, name: opponent.name, crest: opponent.image_path },
    isHome: isHome,
    venue: isHome ? 'H' : 'A',
    score: score,
    result: result,
    finished: finished,
    state: state
  };
}

function getCurrentSeasonId(leagueData) {
  const season = leagueData && leagueData.data && (leagueData.data.currentseason || leagueData.data.currentSeason);
  return season ? season.id : null;
}

async function getSeasonStats(playerId, leagueId, providedSeasonId) {
  let seasonId = providedSeasonId || null;

  if (!seasonId && leagueId) {
    const leagueData = await requestJson(
      `${BASE}/leagues/${leagueId}?include=currentSeason&api_token=${SPORTMONKS_TOKEN}`
    );
    seasonId = getCurrentSeasonId(leagueData);
  }

  if (!seasonId) {
    return { seasonId: null, goals: null, assists: null, rank: null, assistRank: null };
  }

  const [goalsData, assistsData] = await Promise.all([
    requestJson(
      `${BASE}/topscorers/seasons/${seasonId}` +
      `?include=player;participant&filters=seasonTopscorerTypes:${GOALS_TYPE}` +
      `&api_token=${SPORTMONKS_TOKEN}`
    ),
    requestJson(
      `${BASE}/topscorers/seasons/${seasonId}` +
      `?include=player;participant&filters=seasonTopscorerTypes:${ASSISTS_TYPE}` +
      `&api_token=${SPORTMONKS_TOKEN}`
    )
  ]);

  const goalRow = Array.isArray(goalsData && goalsData.data)
    ? goalsData.data.find(function(row) { return String(row.player && row.player.id) === String(playerId); })
    : null;
  const assistRow = Array.isArray(assistsData && assistsData.data)
    ? assistsData.data.find(function(row) { return String(row.player && row.player.id) === String(playerId); })
    : null;

  return {
    seasonId: seasonId,
    goals: goalRow ? Number(goalRow.total || 0) : null,
    assists: assistRow ? Number(assistRow.total || 0) : null,
    rank: goalRow ? goalRow.position || null : null,
    assistRank: assistRow ? assistRow.position || null : null
  };
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const qs = event.queryStringParameters || {};
  const playerId = qs.playerId;
  const teamId = qs.teamId;
  const leagueId = qs.leagueId;
  const seasonId = qs.seasonId;

  if (!playerId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'playerId is required' }) };
  }

  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - 80);
  const future = new Date(now);
  future.setDate(future.getDate() + 45);

  try {
    const [playerRes, fixturesRes] = await Promise.all([
      fetch(
        `${BASE}/players/${playerId}` +
        `?include=position;nationality` +
        `&api_token=${SPORTMONKS_TOKEN}`
      ),
      teamId ? fetch(
        `${BASE}/fixtures/between/${fmtDate(past)}/${fmtDate(future)}/${teamId}` +
        `?include=participants;scores;state` +
        `&api_token=${SPORTMONKS_TOKEN}` +
        `&per_page=30`
      ) : Promise.resolve(null)
    ]);

    // Player info
    let player = {};
    if (playerRes.ok) {
      const pd = await playerRes.json();
      const p = pd.data || {};
      const pos = p.position || {};
      const nat = p.nationality || {};
      player = {
        id: p.id || playerId,
        name: p.display_name || p.common_name || p.name || '',
        photo: p.image_path || null,
        position: pos.name || null,
        nationality: nat.name || null,
        dateOfBirth: p.date_of_birth || null,
        height: p.height || null,
        jerseyNumber: p.jersey_number || null
      };
    }

    // Fixtures
    let allFixtures = [];
    if (fixturesRes && fixturesRes.ok) {
      const fd = await fixturesRes.json();
      if (Array.isArray(fd.data)) {
        allFixtures = fd.data.map(function (fix) { return normFixture(fix, teamId); });
      }
    }

    const recentMatches = allFixtures
      .filter(function (f) { return f.finished; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
      .slice(0, 6);

    const upcomingFixtures = allFixtures
      .filter(function (f) { return !f.finished; })
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); })
      .slice(0, 5);

    const form = recentMatches
      .slice(0, 5)
      .map(function (m) { return m.result || 'D'; });

    const stats = await getSeasonStats(playerId, leagueId, seasonId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({
        player: player,
        stats: stats,
        recentMatches: recentMatches,
        upcomingFixtures: upcomingFixtures,
        form: form
      })
    };
  } catch (err) {
    console.error('[player-detail] Error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: {},
        stats: { seasonId: seasonId || null, goals: null, assists: null, rank: null, assistRank: null },
        recentMatches: [],
        upcomingFixtures: [],
        form: []
      })
    };
  }
};
