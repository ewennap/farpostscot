// netlify/functions/match-briefing.js
// Sportmonks V3 API — match briefing payload

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const GOALS_TOPSCORER_TYPE = 208;
const FINISHED_STATES = new Set(['FT', 'AET', 'PEN']);

function json(statusCode, body, cacheControl) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl || 'public, max-age=60'
    },
    body: JSON.stringify(body)
  };
}

function normalizeStateShort(state) {
  return String(
    (state && (state.short || state.short_name || state.state || state.developer_name || state.name)) || ''
  ).toUpperCase().trim();
}

function getParticipantByLocation(participants, location, fallbackIndex) {
  return (participants || []).find(function (participant) {
    return participant && participant.meta && participant.meta.location === location;
  }) || (participants || [])[fallbackIndex] || {};
}

function getScoreBySide(scores, side) {
  const fullTimeScores = (scores || []).filter(function (score) {
    return score && (score.description === 'CURRENT' || score.description === 'FT');
  });

  const sideScore = fullTimeScores.find(function (score) {
    return score && score.score && score.score.participant === side;
  });

  return sideScore && sideScore.score && sideScore.score.goals != null ? sideScore.score.goals : null;
}

function toIsoDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(label + ' failed: ' + response.status + ' ' + (data && data.message ? data.message : ''));
  }

  return data;
}

async function fetchFixture(fixtureId) {
  const url =
    `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&include=events;lineups;participants;scores;state;statistics`;

  console.log('[match-briefing] fixture URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));
  const data = await fetchJson(url, 'fixture');
  return data && data.data ? data.data : null;
}

async function fetchTeamForm(teamId) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 365);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  const url =
    `https://api.sportmonks.com/v3/football/fixtures/between/${fromStr}/${toStr}/${teamId}` +
    `?include=participants;scores;state` +
    `&api_token=${SPORTMONKS_TOKEN}` +
    `&order=desc` +
    `&per_page=50`;

  console.log('[match-briefing] form URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));
  const data = await fetchJson(url, 'team form');

  return (data.data || [])
    .filter(function (fixture) {
      return FINISHED_STATES.has(normalizeStateShort(fixture && fixture.state));
    })
    .sort(function (a, b) {
      return new Date(b.starting_at) - new Date(a.starting_at);
    })
    .slice(0, 5)
    .map(function (fixture) {
      const participants = fixture.participants || [];
      const scores = fixture.scores || [];
      const home = getParticipantByLocation(participants, 'home', 0);
      const away = getParticipantByLocation(participants, 'away', 1);
      const homeScore = getScoreBySide(scores, 'home');
      const awayScore = getScoreBySide(scores, 'away');
      const requestedTeamIsHome = String(home.id) === String(teamId);
      const opponent = requestedTeamIsHome ? away : home;
      const scored = requestedTeamIsHome ? homeScore : awayScore;
      const conceded = requestedTeamIsHome ? awayScore : homeScore;

      let result = 'D';
      if (scored != null && conceded != null) {
        if (scored > conceded) result = 'W';
        else if (scored < conceded) result = 'L';
      }

      return {
        opponent: opponent.name || '',
        opponentCrest: opponent.image_path || null,
        scored: scored != null ? scored : 0,
        conceded: conceded != null ? conceded : 0,
        result,
        date: toIsoDate(fixture.starting_at)
      };
    });
}

async function fetchTopScorers(leagueId) {
  const leagueUrl =
    `https://api.sportmonks.com/v3/football/leagues/${leagueId}` +
    `?include=currentSeason` +
    `&api_token=${SPORTMONKS_TOKEN}`;

  const leagueData = await fetchJson(leagueUrl, 'league');
  const currentSeason = leagueData.data && (leagueData.data.currentseason || leagueData.data.currentSeason);
  const seasonId = currentSeason && currentSeason.id;

  if (!seasonId) return [];

  const scorersUrl =
    `https://api.sportmonks.com/v3/football/topscorers/seasons/${seasonId}` +
    `?include=player;participant` +
    `&filters=seasonTopscorerTypes:${GOALS_TOPSCORER_TYPE}` +
    `&api_token=${SPORTMONKS_TOKEN}`;

  const scorersData = await fetchJson(scorersUrl, 'top scorers');

  return (scorersData.data || [])
    .filter(function (row) {
      return Number(row.type_id) === GOALS_TOPSCORER_TYPE;
    })
    .sort(function (a, b) {
      return (a.position || 999) - (b.position || 999) || (b.total || 0) - (a.total || 0);
    })
    .slice(0, 5)
    .map(function (row) {
      const player = row.player || {};
      const participant = row.participant || row.team || {};

      return {
        participant_id: participant.id || null,
        teamName: participant.name || '',
        teamCrest: participant.image_path || null,
        playerName: player.display_name || player.common_name || player.name || '',
        goals: safeNumber(row.total),
        rank: row.position || null
      };
    })
    .filter(function (row) {
      return row.playerName || row.teamName;
    });
}

function buildFixtureSummary(fixture, homeTeam, awayTeam) {
  return {
    id: fixture && fixture.id ? fixture.id : null,
    name: homeTeam.name && awayTeam.name ? homeTeam.name + ' vs ' + awayTeam.name : '',
    date: toIsoDate(fixture && fixture.starting_at),
    venue:
      (fixture && fixture.venue && fixture.venue.name) ||
      (fixture && fixture.venue_name) ||
      (fixture && fixture.details && fixture.details.venue_name) ||
      '',
    state: normalizeStateShort(fixture && fixture.state),
    homeScore: fixture ? getScoreBySide(fixture.scores || [], 'home') : null,
    awayScore: fixture ? getScoreBySide(fixture.scores || [], 'away') : null
  };
}

function buildTeamSummary(team, form) {
  return {
    id: team && team.id ? team.id : null,
    name: (team && team.name) || '',
    crest: (team && team.image_path) || null,
    form: Array.isArray(form) ? form : []
  };
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return json(500, { error: 'Sportmonks token not configured' }, 'no-store');
  }

  const fixtureId = event.queryStringParameters && event.queryStringParameters.fixtureId;
  if (!fixtureId) {
    return json(400, { error: 'fixtureId query parameter is required' }, 'no-store');
  }

  let fixture = null;
  let topScorers = [];
  let homeForm = [];
  let awayForm = [];

  try {
    const fixturePromise = fetchFixture(fixtureId);
    const topScorersPromise = fetchTopScorers('501').catch(function (error) {
      console.error('[match-briefing] top scorers error:', error.message);
      return [];
    });

    fixture = await fixturePromise;

    if (fixture) {
      const participants = fixture.participants || [];
      const homeTeam = getParticipantByLocation(participants, 'home', 0);
      const awayTeam = getParticipantByLocation(participants, 'away', 1);

      const formResults = await Promise.allSettled([
        homeTeam.id ? fetchTeamForm(homeTeam.id) : Promise.resolve([]),
        awayTeam.id ? fetchTeamForm(awayTeam.id) : Promise.resolve([])
      ]);

      homeForm = formResults[0].status === 'fulfilled' ? formResults[0].value : [];
      awayForm = formResults[1].status === 'fulfilled' ? formResults[1].value : [];

      if (formResults[0].status === 'rejected') {
        console.error('[match-briefing] home form error:', formResults[0].reason && formResults[0].reason.message);
      }
      if (formResults[1].status === 'rejected') {
        console.error('[match-briefing] away form error:', formResults[1].reason && formResults[1].reason.message);
      }

      topScorers = await topScorersPromise;

      return json(200, {
        fixture: buildFixtureSummary(fixture, homeTeam, awayTeam),
        homeTeam: buildTeamSummary(homeTeam, homeForm),
        awayTeam: buildTeamSummary(awayTeam, awayForm),
        events: Array.isArray(fixture.events) ? fixture.events : [],
        statistics: Array.isArray(fixture.statistics) ? fixture.statistics : [],
        topScorers: Array.isArray(topScorers) ? topScorers : []
      });
    }
  } catch (error) {
    console.error('[match-briefing] fixture error:', error.message);
  }

  return json(200, {
    fixture: {
      id: fixtureId ? Number(fixtureId) || null : null,
      name: '',
      date: '',
      venue: '',
      state: '',
      homeScore: null,
      awayScore: null
    },
    homeTeam: { id: null, name: '', crest: null, form: [] },
    awayTeam: { id: null, name: '', crest: null, form: [] },
    events: [],
    statistics: [],
    topScorers: []
  });
};
