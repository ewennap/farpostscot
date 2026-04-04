// netlify/functions/standings.js
// Sportmonks V3 — league standings
//
// Step 1: GET /v3/football/leagues/{id}?include=currentSeason
//         Extract currentseason.id (lowercase key) from the response.
//
// Step 2: GET /v3/football/standings/seasons/{seasonId}?include=participant;details
//         Stats are in a `details` array on each row, keyed by type_id.

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

    console.log('[standings] GET league', leagueId);
    const leagueRes  = await fetch(leagueUrl);
    const leagueData = await leagueRes.json();

    if (!leagueRes.ok) {
      console.error('[standings] League error:', leagueData.message);
      return { statusCode: 502, body: JSON.stringify({ error: leagueData.message || 'League fetch failed' }) };
    }

    // Sportmonks returns the key as lowercase 'currentseason'
    const currentSeason = leagueData.data?.currentseason;
    const seasonId      = currentSeason?.id;

    if (!seasonId) {
      console.log('[standings] No currentSeason. League data keys:', Object.keys(leagueData.data || {}));
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standings: [] }) };
    }

    console.log('[standings] Season:', seasonId, currentSeason?.name);

    // ── Step 2: fetch standings with details ────────────────────────────────
    const standingsUrl =
      `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=participant;details`;

    console.log('[standings] GET standings for season', seasonId, 'league', leagueId);
    const standingsRes  = await fetch(standingsUrl);
    const standingsData = await standingsRes.json();

    if (!standingsRes.ok) {
      console.error('[standings] Standings error:', standingsData.message);
      return { statusCode: 502, body: JSON.stringify({ error: standingsData.message || 'Standings fetch failed' }) };
    }

    const rows = standingsData.data || [];
    console.log('[standings] Rows returned:', rows.length);
    if (rows.length) {
      // Log the full first row so we can see all field names and details structure
      console.log('[standings] First row FULL:', JSON.stringify(rows[0]));
    }

    if (!rows.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standings: [] }) };
    }

    // Build a helper: extract a value from the details array by type_id
    // Sportmonks V3 standing detail type_ids (common values):
    //   129 = wins total, 130 = draws total, 131 = losses total
    //   132 = goals for, 133 = goals against
    //   34  = games played (alternative)
    function detailVal(details, ...typeIds) {
      if (!Array.isArray(details)) return null;
      for (const tid of typeIds) {
        const entry = details.find(d => d.type_id === tid);
        if (entry != null) return entry.value ?? entry.total ?? null;
      }
      return null;
    }

    const standings = rows
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(row => {
        const details = row.details || [];

        // Try details array first, fall back to direct fields
        const played = detailVal(details, 34, 129)       ?? row.played  ?? row.games_played ?? 0;
        const won    = detailVal(details, 129)            ?? row.won    ?? 0;
        const drawn  = detailVal(details, 130)            ?? row.draw   ?? row.drawn ?? 0;
        const lost   = detailVal(details, 131)            ?? row.lost   ?? 0;
        const gf     = detailVal(details, 132)            ?? row.goals_scored ?? row.goals_for ?? 0;
        const ga     = detailVal(details, 133)            ?? row.goals_against ?? 0;
        const gd     = row.goal_difference ?? (gf - ga);

        // Log type_ids seen on first row so we can correct the mapping if wrong
        if (row.position === 1 && details.length) {
          console.log('[standings] Detail type_ids on row 1:', details.map(d => ({ type_id: d.type_id, value: d.value, total: d.total })));
        }

        return {
          position: row.position,
          team:     row.participant?.name       || '',
          crest:    row.participant?.image_path || null,
          points:   row.points ?? 0,
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
