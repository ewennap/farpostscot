// netlify/functions/team-form.js
// Returns the last 5 completed results for a given team

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const FINISHED_STATES = new Set(['FT', 'AET', 'PEN']);
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
});

function normalizeStateShort(fixture) {
  const state = fixture && fixture.state ? fixture.state : {};
  return String(state.short || state.short_name || state.state || state.developer_name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function isFinishedFixture(fixture) {
  return FINISHED_STATES.has(normalizeStateShort(fixture));
}

function getParticipantByLocation(participants, location, fallbackIndex) {
  return participants.find(function (participant) {
    return participant && participant.meta && participant.meta.location === location;
  }) || participants[fallbackIndex] || {};
}

function getScoreBySide(scores, side) {
  const fullTimeScores = scores.filter(function (score) {
    return score && (score.description === 'CURRENT' || score.description === 'FT');
  });

  const sideScore = fullTimeScores.find(function (score) {
    return score && score.score && score.score.participant === side;
  });

  return sideScore && sideScore.score && sideScore.score.goals != null ? sideScore.score.goals : null;
}

exports.handler = async function (event) {
  console.log('[team-form] queryStringParameters:', JSON.stringify(event.queryStringParameters));

  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const teamId = event.queryStringParameters && event.queryStringParameters.teamId;
  if (!teamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'teamId is required' }) };
  }

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

  console.log(`[team-form] teamId=${teamId}`);
  console.log('[team-form] URL:', url.replace(SPORTMONKS_TOKEN, 'TOKEN'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`[team-form] status=${response.status} count=${(data.data || []).length}`);
    if (data.data && data.data[0]) {
      console.log('[team-form] first fixture sample:', JSON.stringify({
        id: data.data[0].id,
        starting_at: data.data[0].starting_at,
        state: data.data[0].state,
        result_info: data.data[0].result_info,
        participants: (data.data[0].participants || []).map(function (participant) {
          return {
            id: participant.id,
            name: participant.name,
            location: participant.meta && participant.meta.location
          };
        }),
        scores: data.data[0].scores
      }));
    }

    if (!response.ok) {
      console.error('[team-form] Error body:', JSON.stringify(data));
      return { statusCode: 502, body: JSON.stringify({ error: data.message || 'Sportmonks error' }) };
    }

    const results = (data.data || [])
      .filter(isFinishedFixture)
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

        let result = 'D';
        if (homeScore != null && awayScore != null) {
          if (homeScore === awayScore) result = 'D';
          else if ((requestedTeamIsHome && homeScore > awayScore) || (!requestedTeamIsHome && awayScore > homeScore)) result = 'W';
          else result = 'L';
        }

        return {
          requestedTeamId: String(teamId),
          requestedTeamSide: requestedTeamIsHome ? 'home' : 'away',
          date: fixture.starting_at ? DATE_FORMATTER.format(new Date(fixture.starting_at)) : '',
          homeTeamName: home.name || '',
          homeTeamCrest: home.image_path || null,
          awayTeamName: away.name || '',
          awayTeamCrest: away.image_path || null,
          homeScore: homeScore != null ? homeScore : '-',
          awayScore: awayScore != null ? awayScore : '-',
          result
        };
      })
      .reverse();

    console.log(`[team-form] returning ${results.length} results`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(results)
    };
  } catch (err) {
    console.error('[team-form] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
