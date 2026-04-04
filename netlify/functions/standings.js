// netlify/functions/standings.js
// Sportmonks V3 — league standings
//
// Step 1: GET /v3/football/leagues/{id}?include=currentSeason
//         Extract currentSeason.id from the response.
//
// Step 2: GET /v3/football/standings/seasons/{seasonId}?include=participant
//         Fetch standings. Stats are on direct row fields in V3
//         (won, draw, lost, goals_scored, goals_against, goal_difference).

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const leagueId = (event.queryStringParameters?.league) || '501';

  try {
    // ── Step 1: get current season via league endpoint ──────────────────────
    const leagueUrl =
      `https://api.sportmonks.com/v3/football/leagues/${leagueId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=currentSeason`;

    console.log('[standings] GET league', leagueId, 'with currentSeason');
    const leagueRes  = await fetch(leagueUrl);
    const leagueData = await leagueRes.json();

    if (!leagueRes.ok) {
      console.error('[standings] League error:', leagueData.message);
      return { statusCode: 502, body: JSON.stringify({ error: leagueData.message || 'League fetch failed' }) };
    }

    const seasonId = leagueData.data?.currentSeason?.id;
    const seasonName = leagueData.data?.currentSeason?.name;

    if (!seasonId) {
      console.log('[standings] No currentSeason found. League data:', JSON.stringify(leagueData.data));
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standings: [] }) };
    }

    console.log('[standings] Current season:', seasonId, seasonName);

    // ── Step 2: fetch standings ─────────────────────────────────────────────
    const standingsUrl =
      `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=participant`;

    console.log('[standings] GET standings for season', seasonId);
    const standingsRes  = await fetch(standingsUrl);
    const standingsData = await standingsRes.json();

    if (!standingsRes.ok) {
      console.error('[standings] Standings error:', standingsData.message);
      return { statusCode: 502, body: JSON.stringify({ error: standingsData.message || 'Standings fetch failed' }) };
    }

    const rows = standingsData.data || [];
    console.log('[standings] Rows returned:', rows.length);
    if (rows.length) console.log('[standings] First row:', JSON.stringify(rows[0]));

    if (!rows.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standings: [] }) };
    }

    // V3 standings rows carry stats as direct fields
    const standings = rows
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(row => {
        const played = row.played         ?? row.games_played ?? 0;
        const won    = row.won            ?? 0;
        const drawn  = row.draw           ?? row.drawn ?? 0;
        const lost   = row.lost           ?? 0;
        const gf     = row.goals_scored   ?? row.goals_for ?? 0;
        const ga     = row.goals_against  ?? 0;
        const gd     = row.goal_difference ?? (gf - ga);

        return {
          position:  row.position,
          team:      row.participant?.name       || '',
          crest:     row.participant?.image_path || null,
          points:    row.points ?? 0,
          played, won, drawn, lost, gf, ga, gd
        };
      });

    console.log('[standings] Returning', standings.length, 'rows');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
      body: JSON.stringify({ standings })
    };

  } catch (err) {
    console.error('[standings] Unexpected error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
