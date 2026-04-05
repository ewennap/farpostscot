// netlify/functions/club-summary.js
// Aggregated club page payload — fixtures, standings, top scorers
//
// Query params:
//   teamId   (required) — Sportmonks participant ID
//   leagueId (required) — 501 | 504 | 507 | 510 | 516
//
// Returns:
//   { team, form, results, fixtures, standings, topScorers }

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';

const LEAGUE_NAMES = {
  '501': 'Premiership',
  '504': 'Championship',
  '507': 'Scottish Cup',
  '510': 'League Cup',
  '516': 'League One'
};

// Cups don't have standings/top scorers in the conventional sense
const LEAGUE_COMPETITIONS = new Set(['501', '504', '516']);
const FINISHED_STATES = new Set(['FT', 'AET', 'PEN']);

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function normaliseState(fix) {
  const s = fix.state || {};
  return String(s.short || s.short_name || s.state || s.developer_name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function parseScore(scores) {
  const relevant = (scores || []).filter(
    s => s && (s.description === 'CURRENT' || s.description === 'FT')
  );
  const homeEntry = relevant.find(s => s.score?.participant === 'home');
  const awayEntry = relevant.find(s => s.score?.participant === 'away');
  return {
    home: homeEntry?.score?.goals ?? '-',
    away: awayEntry?.score?.goals ?? '-'
  };
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const qs = event.queryStringParameters || {};
  const { teamId, leagueId } = qs;

  if (!teamId || !leagueId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'teamId and leagueId are required' })
    };
  }

  const isLeague = LEAGUE_COMPETITIONS.has(leagueId);

  // Wide fixture window: 90 days back → 45 days forward
  const now = new Date();
  const past = new Date(now); past.setDate(past.getDate() - 90);
  const future = new Date(now); future.setDate(future.getDate() + 45);

  const teamFixturesUrl =
    `${BASE}/fixtures/between/${fmtDate(past)}/${fmtDate(future)}/${teamId}` +
    `?include=participants;scores;state` +
    `&api_token=${SPORTMONKS_TOKEN}` +
    `&per_page=100`;

  const leagueUrl =
    `${BASE}/leagues/${leagueId}` +
    `?include=currentSeason` +
    `&api_token=${SPORTMONKS_TOKEN}`;

  console.log(`[club-summary] teamId=${teamId} leagueId=${leagueId} isLeague=${isLeague}`);

  let fixtureData, leagueData;
  try {
    [fixtureData, leagueData] = await Promise.all([
      fetch(teamFixturesUrl).then(r => r.json()),
      fetch(leagueUrl).then(r => r.json())
    ]);
  } catch (err) {
    console.error('[club-summary] Initial fetch error:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: 'Upstream fetch failed' }) };
  }

  if (fixtureData.message) {
    console.error('[club-summary] Fixtures API error:', fixtureData.message);
  }

  // Sportmonks returns currentseason (lowercase) for this endpoint
  const currentSeason = leagueData?.data?.currentseason || leagueData?.data?.currentSeason;
  const seasonId = currentSeason?.id;

  console.log(`[club-summary] seasonId=${seasonId}`);

  // ── Standings + Top Scorers (parallel, needs seasonId) ────────────────────
  let standings = [];
  let topScorers = [];

  if (seasonId) {
    const standingsUrl =
      `${BASE}/standings/seasons/${seasonId}` +
      `?include=participant;details` +
      `&api_token=${SPORTMONKS_TOKEN}`;

    const scorersUrl = isLeague
      ? `${BASE}/topscorers/seasons/${seasonId}` +
        `?include=player;participant` +
        `&filters=seasonTopscorerTypes:208` +
        `&api_token=${SPORTMONKS_TOKEN}`
      : null;

    try {
      const requests = [fetch(standingsUrl).then(r => r.json())];
      if (scorersUrl) requests.push(fetch(scorersUrl).then(r => r.json()));

      const [standingsJson, scorersJson] = await Promise.all(requests);

      // Process standings — mirror standings.js logic exactly
      function detailVal(details, ...typeIds) {
        if (!Array.isArray(details)) return null;
        for (const tid of typeIds) {
          const entry = details.find(d => d.type_id === tid);
          if (entry != null) return entry.value ?? entry.total ?? null;
        }
        return null;
      }

      standings = (standingsJson?.data || [])
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(row => {
          const details = row.details || [];
          const played  = detailVal(details, 129) ?? row.played  ?? row.games_played ?? 0;
          const won     = detailVal(details, 130) ?? row.won    ?? 0;
          const drawn   = detailVal(details, 131) ?? row.draw   ?? row.drawn ?? 0;
          const lost    = detailVal(details, 132) ?? row.lost   ?? 0;
          const gf      = detailVal(details, 133) ?? row.goals_scored ?? row.goals_for ?? 0;
          const ga      = detailVal(details, 134) ?? row.goals_against ?? 0;
          const gd      = row.goal_difference ?? (gf - ga);
          return {
            position:  row.position,
            teamId:    row.participant_id,
            team:      row.participant?.name       || '',
            crest:     row.participant?.image_path || null,
            points:    row.points ?? 0,
            played, won, drawn, lost, gf, ga, gd
          };
        });

      // Process top scorers — but keep only scorers for the requested club
      if (scorersJson && Array.isArray(scorersJson.data)) {
        topScorers = scorersJson.data
          .filter(row => Number(row.type_id) === 208)
          .filter(row => {
            const participant = row.participant || row.team || {};
            return String(participant.id) === String(teamId);
          })
          .sort((a, b) => (a.position || 999) - (b.position || 999) || (b.total || 0) - (a.total || 0))
          .slice(0, 5)
          .map(row => {
            const player      = row.player      || {};
            const participant = row.participant  || row.team || {};
            return {
              playerName: player.display_name || player.common_name || player.name || 'Unnamed scorer',
              teamName:   participant.name        || '',
              teamId:     participant.id,
              teamCrest:  participant.image_path  || null,
              goals:      Number(row.total || 0)
            };
          })
          .filter(row => row.goals > 0 && (row.playerName || row.teamName));
      }
    } catch (err) {
      console.error('[club-summary] Standings/scorers error:', err.message);
      // Non-fatal — return empty arrays
    }
  }

  // ── Process team fixtures ──────────────────────────────────────────────────
  const allFixtures = fixtureData?.data || [];
  console.log(`[club-summary] Raw fixtures for team: ${allFixtures.length}`);

  let teamName  = null;
  let teamCrest = null;

  const processed = allFixtures.map(fix => {
    const participants = fix.participants || [];
    const home = participants.find(p => p?.meta?.location === 'home') || participants[0] || {};
    const away = participants.find(p => p?.meta?.location === 'away') || participants[1] || {};

    // Capture team identity from first fixture that includes them
    if (!teamName) {
      const me = participants.find(p => String(p.id) === String(teamId));
      if (me) { teamName = me.name; teamCrest = me.image_path || null; }
    }

    const state      = normaliseState(fix);
    const isFinished = FINISHED_STATES.has(state);
    const score      = parseScore(fix.scores);

    const requestedIsHome = String(home.id) === String(teamId);
    let result = null;
    if (isFinished && score.home !== '-' && score.away !== '-') {
      const mine   = requestedIsHome ? score.home : score.away;
      const theirs = requestedIsHome ? score.away : score.home;
      result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
    }

    return {
      id:    fix.id,
      date:  fix.starting_at || null,
      state,
      isFinished,
      requestedIsHome,
      result,
      home: { id: home.id, name: home.name || '', short: home.short_code || '', crest: home.image_path || null },
      away: { id: away.id, name: away.name || '', short: away.short_code || '', crest: away.image_path || null },
      score
    };
  });

  const completed = processed
    .filter(f => f.isFinished)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcoming = processed
    .filter(f => !f.isFinished && f.date && new Date(f.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Find club row in standings
  const teamStanding = standings.find(s => String(s.teamId) === String(teamId));

  console.log(`[club-summary] completed=${completed.length} upcoming=${upcoming.length} standings=${standings.length}`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
    },
    body: JSON.stringify({
      team: {
        id:         teamId,
        name:       teamName,
        crest:      teamCrest,
        leagueId,
        leagueName: LEAGUE_NAMES[leagueId] || 'Unknown',
        position:   teamStanding?.position || null
      },
      form:       completed.slice(0, 5),
      results:    completed.slice(0, 5),
      fixtures:   upcoming.slice(0, 5),
      standings,
      topScorers
    })
  };
};
