// netlify/functions/test-goalkeeper.js
// TEMPORARY — diagnostic function to inspect goalkeeper stat types
// Safe to delete once goalkeeper stats integration is confirmed.

const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;
const BASE = 'https://api.sportmonks.com/v3/football';

exports.handler = async function () {
  if (!SPORTMONKS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SPORTMONKS_TOKEN not set' }) };
  }

  // Step 1: resolve current season ID for league 501
  const leagueRes = await fetch(`${BASE}/leagues/501?include=currentSeason&api_token=${SPORTMONKS_TOKEN}`);
  const leagueData = await leagueRes.json();
  const season = leagueData.data && (leagueData.data.currentseason || leagueData.data.currentSeason);
  const seasonId = season ? season.id : null;

  if (!seasonId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not resolve season ID', leagueData })
    };
  }

  // Step 2: fetch topscorers for type 194 (clean sheets)
  const url =
    `${BASE}/topscorers/seasons/${seasonId}` +
    `?include=player;participant` +
    `&filters=seasonTopscorerTypes:194` +
    `&per_page=25` +
    `&api_token=${SPORTMONKS_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ seasonId, status: res.status, data })
  };
};
