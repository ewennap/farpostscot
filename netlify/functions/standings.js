// netlify/functions/standings.js
// Sportmonks V3 — league standings
//
// Step 1: GET /v3/football/seasons?filters=seasonLeagueId:{leagueId}
//         Find the most recent active season ID.
//
// Step 2: GET /v3/football/standings/seasons/{seasonId}?include=participant;details.type
//         Fetch standings for that season.

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

function findDetail(details, keywords) {
  if (!Array.isArray(details)) return 0;
  for (const d of details) {
    const typeName = (d.type?.name || '').toLowerCase();
    if (keywords.some(kw => typeName.includes(kw))) return d.value ?? 0;
  }
  return 0;
}

exports.handler = async function (event) {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  const leagueId = (event.queryStringParameters?.league) || '501';

  try {
    // ── Step 1: get seasons for this league ──────────────────────────────────
    const seasonsUrl =
      `https://api.sportmonks.com/v3/football/seasons` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&filters=seasonLeagueId:${leagueId}` +
      `&per_page=25`;

    console.log('[standings] Fetching seasons for league', leagueId);
    const seasonsRes  = await fetch(seasonsUrl);
    const seasonsData = await seasonsRes.json();

    if (!seasonsRes.ok) {
      console.error('[standings] Seasons API error:', seasonsData.message);
      return { statusCode: 502, body: JSON.stringify({ error: seasonsData.message || 'Seasons fetch failed' }) };
    }

    const seasons = seasonsData.data || [];
    console.log('[standings] Seasons returned:', seasons.length);
    if (seasons.length) {
      console.log('[standings] First season sample:', JSON.stringify(seasons[0]));
    }

    // Pick the most recent season — sort descending by id (higher = newer)
    const sorted   = seasons.slice().sort((a, b) => b.id - a.id);
    const season   = sorted[0];
    const seasonId = season?.id;

    if (!seasonId) {
      console.log('[standings] No season found for league', leagueId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
        body: JSON.stringify({ standings: [] })
      };
    }

    console.log('[standings] Using season ID:', seasonId, 'name:', season?.name);

    // ── Step 2: fetch standings for that season ──────────────────────────────
    const standingsUrl =
      `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}` +
      `?api_token=${SPORTMONKS_TOKEN}` +
      `&include=participant;details.type`;

    console.log('[standings] Fetching standings for season', seasonId);
    const standingsRes  = await fetch(standingsUrl);
    const standingsData = await standingsRes.json();

    if (!standingsRes.ok) {
      console.error('[standings] Standings API error:', standingsData.message);
      return { statusCode: 502, body: JSON.stringify({ error: standingsData.message || 'Standings fetch failed' }) };
    }

    const rows = standingsData.data || [];
    console.log('[standings] Standings rows returned:', rows.length);
    if (rows.length) {
      console.log('[standings] First row sample:', JSON.stringify(rows[0]));
    }

    const standings = rows
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(row => {
        const details = row.details || [];
        const played  = findDetail(details, ['played', 'matches played', 'games played']);
        const won     = findDetail(details, ['won', 'wins']);
        const drawn   = findDetail(details, ['drawn', 'draw', 'draws']);
        const lost    = findDetail(details, ['lost', 'loss', 'losses']);
        const gf      = findDetail(details, ['goals for', 'goals scored']);
        const ga      = findDetail(details, ['goals against', 'goals conceded']);

        return {
          position: row.position,
          team:     row.participant?.name || '',
          points:   row.points ?? 0,
          played,
          won,
          drawn,
          lost,
          gf,
          ga,
          gd: gf - ga
        };
      });

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
